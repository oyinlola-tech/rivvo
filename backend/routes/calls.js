import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getCallHistory, initiateCall } from '../controllers/callsController.js';

const router = Router();

router.get('/history', auth, asyncHandler(getCallHistory));
router.post('/initiate', auth, asyncHandler(initiateCall));

export default router;
