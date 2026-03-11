import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { getContacts, addContact } from '../controllers/contactsController.js';

const router = Router();

router.get('/', auth, asyncHandler(getContacts));
router.post('/', auth, asyncHandler(addContact));

export default router;
