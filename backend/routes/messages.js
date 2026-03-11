import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  getConversationPeer
} from '../controllers/messagesController.js';

const router = Router();

router.get('/conversations', auth, asyncHandler(getConversations));
router.get('/conversations/:id', auth, asyncHandler(getMessages));
router.post('/conversations/:id', auth, asyncHandler(sendMessage));
router.post('/conversations/:id/read', auth, asyncHandler(markConversationRead));
router.get('/conversations/:id/peer', auth, asyncHandler(getConversationPeer));

export default router;
