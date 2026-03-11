import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(new URL('..', import.meta.url)));
const uploadsRoot = path.join(rootDir, 'uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadsRoot);
ensureDir(path.join(uploadsRoot, 'avatars'));
ensureDir(path.join(uploadsRoot, 'status'));
ensureDir(path.join(uploadsRoot, 'messages'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'uploads';
    const dest = path.join(rootDir, folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith('image/') || file.mimetype?.startsWith('video/')) {
    return cb(null, true);
  }
  return cb(new Error('Unsupported file type'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});
