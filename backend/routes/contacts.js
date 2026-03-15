import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getContacts,
  addContact,
  listContactRequests,
  acceptContactRequest,
  rejectContactRequest
} from '../controllers/contactsController.js';

const router = Router();

router.get('/', auth, asyncHandler(getContacts));
router.post('/', auth, asyncHandler(addContact));
router.get('/requests', auth, asyncHandler(listContactRequests));
router.post('/requests/:requestId/accept', auth, asyncHandler(acceptContactRequest));
router.post('/requests/:requestId/reject', auth, asyncHandler(rejectContactRequest));

export default router;
