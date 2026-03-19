import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getContacts,
  addContact,
  listContactRequests,
  getContactRequestUnreadCount,
  markContactRequestsRead,
  acceptContactRequest,
  rejectContactRequest,
  toggleFavorite,
  blockContact,
  unblockContact
} from '../controllers/contactsController.js';

const router = Router();

router.get('/', auth, asyncHandler(getContacts));
router.post('/', auth, asyncHandler(addContact));
router.get('/requests', auth, asyncHandler(listContactRequests));
router.get('/requests/unread-count', auth, asyncHandler(getContactRequestUnreadCount));
router.post('/requests/mark-read', auth, asyncHandler(markContactRequestsRead));
router.post('/requests/:requestId/accept', auth, asyncHandler(acceptContactRequest));
router.post('/requests/:requestId/reject', auth, asyncHandler(rejectContactRequest));
router.post('/:userId/favorite', auth, asyncHandler(toggleFavorite));
router.post('/:userId/block', auth, asyncHandler(blockContact));
router.post('/:userId/unblock', auth, asyncHandler(unblockContact));

export default router;
