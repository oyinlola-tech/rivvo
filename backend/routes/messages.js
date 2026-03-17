import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { messageRateLimiter, uploadRateLimiter } from '../middleware/rateLimit.js';
import {
  getConversations,
  getMessages,
  getConversationPreview,
  sendMessage,
  markConversationRead,
  getConversationPeer,
  viewOnceMessage,
  uploadAttachment,
  getOrCreateConversation,
  editMessage,
  deleteMessage
} from '../controllers/messagesController.js';
import { uploadAttachments } from '../utils/upload.js';

const router = Router();

router.get('/conversations', auth, asyncHandler(getConversations));
router.get('/conversations/:id', auth, asyncHandler(getMessages));
router.get('/conversations/:id/preview', auth, asyncHandler(getConversationPreview));
router.post('/conversations/with/:userId', auth, asyncHandler(getOrCreateConversation));
router.post('/conversations/:id', auth, messageRateLimiter, asyncHandler(sendMessage));
router.patch('/conversations/:id/messages/:messageId', auth, asyncHandler(editMessage));
router.delete('/conversations/:id/messages/:messageId', auth, asyncHandler(deleteMessage));
router.post(
  '/conversations/:id/attachments',
  auth,
  uploadRateLimiter,
  (req, res, next) => {
    req.uploadFolder = 'uploads/messages';
    next();
  },
  uploadAttachments.single('file'),
  asyncHandler(uploadAttachment)
);
router.post('/conversations/:id/read', auth, asyncHandler(markConversationRead));
router.post('/conversations/:id/view-once/:messageId', auth, asyncHandler(viewOnceMessage));
router.get('/conversations/:id/peer', auth, asyncHandler(getConversationPeer));

export default router;
