import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { createStatus, getStatuses, markStatusViewed, muteStatusUser, unmuteStatusUser } from '../controllers/statusController.js';
import { upload } from '../utils/upload.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', auth, asyncHandler(getStatuses));
router.post('/', auth, uploadRateLimiter, (req, res, next) => {
  req.uploadFolder = 'uploads/status';
  next();
}, upload.single('media'), asyncHandler(createStatus));
router.post('/:statusId/view', auth, asyncHandler(markStatusViewed));
router.post('/mute', auth, asyncHandler(muteStatusUser));
router.delete('/mute/:mutedUserId', auth, asyncHandler(unmuteStatusUser));

export default router;
