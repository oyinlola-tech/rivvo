import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/usersController.js';

const router = Router();

router.get('/profile', auth, asyncHandler(getProfile));
router.put('/profile', auth, asyncHandler(updateProfile));

export default router;
