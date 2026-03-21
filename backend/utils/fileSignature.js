import fs from 'fs/promises';
import path from 'path';

const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), 'uploads');

const allowedUploadRoots = new Set([
  'avatars',
  'status',
  'messages',
  'groups/avatars',
  'groups/banners'
]);

const isSafeFileName = (value) => /^[a-zA-Z0-9._-]{1,255}$/.test(value);

const toSafeUploadsRelativePath = (inputPath) => {
  if (!inputPath || typeof inputPath !== 'string') return null;
  if (inputPath.includes('\0')) return null;

  // Normalize slashes for consistent parsing across platforms.
  const raw = inputPath.replace(/\\/g, '/');
  let relative = raw;

  if (path.isAbsolute(inputPath)) {
    relative = path.relative(uploadsRoot, inputPath).replace(/\\/g, '/');
  } else if (raw.startsWith('/uploads/')) {
    relative = raw.replace(/^\/uploads\//, '');
  } else if (raw.startsWith('uploads/')) {
    relative = raw.replace(/^uploads\//, '');
  }

  relative = relative.replace(/^\/+/, '');
  const normalized = path.posix.normalize(relative);
  if (normalized === '.' || normalized === '..') return null;
  if (normalized.startsWith('../')) return null;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const fileName = parts.pop();
  const folder = parts.join('/');

  if (!allowedUploadRoots.has(folder)) return null;
  if (!isSafeFileName(fileName)) return null;

  return { folder, fileName };
};

const resolveUploadsPath = async (filePath) => {
  const safeParts = toSafeUploadsRelativePath(filePath);
  if (!safeParts) return null;
  const resolved = path.join(uploadsRoot, safeParts.folder, safeParts.fileName);
  const realTarget = await fs.realpath(resolved).catch(() => null);
  if (!realTarget) return null;
  const normalizedRoot = uploadsRoot.endsWith(path.sep) ? uploadsRoot : `${uploadsRoot}${path.sep}`;
  if (realTarget !== uploadsRoot && !realTarget.startsWith(normalizedRoot)) return null;
  return realTarget;
};

const readHeader = async (filePath, length = 32) => {
  const realTarget = await resolveUploadsPath(filePath);
  if (!realTarget) {
    throw new Error('Invalid file path');
  }
  const handle = await fs.open(realTarget, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
};

const signatures = [
  {
    mime: 'image/jpeg',
    match: (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  },
  {
    mime: 'image/png',
    match: (buf) =>
      buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mime: 'image/gif',
    match: (buf) => {
      const header = buf.toString('ascii', 0, 6);
      return header === 'GIF87a' || header === 'GIF89a';
    }
  },
  {
    mime: 'image/webp',
    match: (buf) => buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
  },
  {
    mime: 'video/mp4',
    match: (buf) => buf.toString('ascii', 4, 8) === 'ftyp'
  },
  {
    mime: 'audio/mpeg',
    match: (buf) =>
      buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
  },
  {
    mime: 'audio/ogg',
    match: (buf) => buf.toString('ascii', 0, 4) === 'OggS'
  },
  {
    mime: 'audio/wav',
    match: (buf) => buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE'
  },
  {
    mime: 'video/webm',
    match: (buf) => buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
  }
];

export const validateFileSignature = async (filePath, allowedCategory) => {
  if (!filePath) return { ok: false, mime: null };
  const header = await readHeader(filePath);
  const match = signatures.find((sig) => sig.match(header));
  if (!match) return { ok: false, mime: null };
  if (allowedCategory === 'image' && !match.mime.startsWith('image/')) {
    return { ok: false, mime: match.mime };
  }
  if (allowedCategory === 'video' && !match.mime.startsWith('video/')) {
    return { ok: false, mime: match.mime };
  }
  if (allowedCategory === 'imageOrVideo' && !match.mime.startsWith('image/') && !match.mime.startsWith('video/')) {
    return { ok: false, mime: match.mime };
  }
  if (allowedCategory === 'audio' && !match.mime.startsWith('audio/')) {
    if (match.mime === 'video/mp4' || match.mime === 'video/webm') {
      return { ok: true, mime: match.mime };
    }
    return { ok: false, mime: match.mime };
  }
  return { ok: true, mime: match.mime };
};

export const safeUnlink = async (filePath) => {
  try {
    const realTarget = await resolveUploadsPath(filePath);
    if (!realTarget) return;
    await fs.unlink(realTarget);
  } catch {
    // Best-effort only.
  }
};
