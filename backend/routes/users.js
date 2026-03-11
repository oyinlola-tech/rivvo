import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  upsertPublicKey,
  getPublicKey,
  registerDeviceKey,
  listDevices,
  verifyDevice,
  uploadAvatar
} from '../controllers/usersController.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/profile', auth, asyncHandler(getProfile));
router.put('/profile', auth, asyncHandler(updateProfile));
router.post('/avatar', auth, (req, res, next) => {
  req.uploadFolder = 'uploads/avatars';
  next();
}, upload.single('avatar'), asyncHandler(uploadAvatar));
router.put('/keys', auth, asyncHandler(upsertPublicKey));
router.get('/keys/:userId', auth, asyncHandler(getPublicKey));
router.put('/devices/register', auth, asyncHandler(registerDeviceKey));
router.get('/devices', auth, asyncHandler(listDevices));
router.post('/devices/:deviceId/verify', auth, asyncHandler(verifyDevice));

export default router;
