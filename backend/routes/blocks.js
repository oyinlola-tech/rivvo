import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/blocksController.js';

const router = Router();

router.use(auth);
router.get('/', asyncHandler(getBlockedUsers));
router.post('/', asyncHandler(blockUser));
router.delete('/:blockedUserId', asyncHandler(unblockUser));

export default router;
