import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { sendSupportRequest } from '../controllers/supportController.js';

const router = Router();

router.post('/contact', auth, asyncHandler(sendSupportRequest));

export default router;
