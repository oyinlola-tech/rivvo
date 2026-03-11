import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import authRateLimiter from '../middleware/rateLimit.js';
import { login, signup, verifyOtp, resendOtp } from '../controllers/authController.js';

const router = Router();

router.post('/login', authRateLimiter, asyncHandler(login));
router.post('/signup', authRateLimiter, asyncHandler(signup));
router.post('/verify-otp', authRateLimiter, asyncHandler(verifyOtp));
router.post('/resend-otp', authRateLimiter, asyncHandler(resendOtp));

export default router;
