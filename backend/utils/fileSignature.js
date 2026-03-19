import fs from 'fs/promises';
import path from 'path';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const resolveUploadsPath = async (filePath) => {
  if (!filePath || typeof filePath !== 'string') return null;
  // Only allow a simple filename (no path separators).
  if (filePath.includes('/') || filePath.includes('\\')) return null;
  const safeName = path.basename(filePath);
  if (!safeName || safeName !== filePath) return null;
  const resolved = path.join(uploadsRoot, safeName);
  const realTarget = await fs.realpath(resolved).catch(() => null);
  if (!realTarget) return null;
  if (!realTarget.startsWith(uploadsRoot)) return null;
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
