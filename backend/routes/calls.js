import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getCallHistory, initiateCall, endCall, updateCallStatus, getCallDetails } from '../controllers/callsController.js';

const router = Router();

router.get('/history', auth, asyncHandler(getCallHistory));
router.get('/:id', auth, asyncHandler(getCallDetails));
router.post('/initiate', auth, asyncHandler(initiateCall));
router.post('/:id/end', auth, asyncHandler(endCall));
router.post('/:id/status', auth, asyncHandler(updateCallStatus));

export default router;
