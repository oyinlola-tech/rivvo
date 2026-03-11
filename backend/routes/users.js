import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getProfile, updateProfile, upsertPublicKey, getPublicKey } from '../controllers/usersController.js';

const router = Router();

router.get('/profile', auth, asyncHandler(getProfile));
router.put('/profile', auth, asyncHandler(updateProfile));
router.put('/keys', auth, asyncHandler(upsertPublicKey));
router.get('/keys/:userId', auth, asyncHandler(getPublicKey));

export default router;
