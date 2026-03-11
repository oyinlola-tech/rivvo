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
  verifyDevice
} from '../controllers/usersController.js';

const router = Router();

router.get('/profile', auth, asyncHandler(getProfile));
router.put('/profile', auth, asyncHandler(updateProfile));
router.put('/keys', auth, asyncHandler(upsertPublicKey));
router.get('/keys/:userId', auth, asyncHandler(getPublicKey));
router.put('/devices/register', auth, asyncHandler(registerDeviceKey));
router.get('/devices', auth, asyncHandler(listDevices));
router.post('/devices/:deviceId/verify', auth, asyncHandler(verifyDevice));

export default router;
