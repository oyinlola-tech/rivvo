import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  registerDevice,
  unregisterDevice
} from '../controllers/notificationsController.js';

const router = Router();

router.use(auth);
router.get('/', asyncHandler(getNotifications));
router.post('/read-all', asyncHandler(markAllAsRead));
router.post('/:notificationId/read', asyncHandler(markAsRead));
router.delete('/:notificationId', asyncHandler(deleteNotification));
router.get('/preferences', asyncHandler(getPreferences));
router.patch('/preferences', asyncHandler(updatePreferences));
router.post('/devices', asyncHandler(registerDevice));
router.delete('/devices/:deviceId', asyncHandler(unregisterDevice));

export default router;
