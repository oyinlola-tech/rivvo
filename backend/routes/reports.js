import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { reportUser, reportMessage } from '../controllers/reportsController.js';

const router = Router();

router.use(auth);
router.post('/users', asyncHandler(reportUser));
router.post('/messages', asyncHandler(reportMessage));

export default router;
