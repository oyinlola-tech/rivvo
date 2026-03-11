import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getCallHistory, initiateCall, endCall } from '../controllers/callsController.js';

const router = Router();

router.get('/history', auth, asyncHandler(getCallHistory));
router.post('/initiate', auth, asyncHandler(initiateCall));
router.post('/:id/end', auth, asyncHandler(endCall));

export default router;
