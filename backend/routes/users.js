import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  getPublicProfile,
  upsertPublicKey,
  getPublicKey,
  registerDeviceKey,
  listDevices,
  verifyDevice,
  uploadAvatar,
  searchUsers,
  getStorageUsage
} from '../controllers/usersController.js';
import { upload } from '../utils/upload.js';
import { validateFileSignature, safeUnlink } from '../utils/fileSignature.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/profile', auth, asyncHandler(getProfile));
router.put('/profile', auth, asyncHandler(updateProfile));
router.get('/storage', auth, asyncHandler(getStorageUsage));
router.get('/:userId/public', auth, asyncHandler(getPublicProfile));
router.post('/avatar', auth, uploadRateLimiter, (req, res, next) => {
  req.uploadFolder = 'uploads/avatars';
  next();
}, upload.single('avatar'), asyncHandler(async (req, res, next) => {
  if (req.file) {
    const result = await validateFileSignature(req.file.path, 'image');
    if (!result.ok) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: 'Invalid image file' });
    }
  }
  return next();
}), asyncHandler(uploadAvatar));
router.put('/keys', auth, asyncHandler(upsertPublicKey));
router.get('/keys/:userId', auth, asyncHandler(getPublicKey));
router.put('/devices/register', auth, asyncHandler(registerDeviceKey));
router.get('/devices', auth, asyncHandler(listDevices));
router.post('/devices/:deviceId/verify', auth, asyncHandler(verifyDevice));
router.get('/search', auth, asyncHandler(searchUsers));

export default router;
