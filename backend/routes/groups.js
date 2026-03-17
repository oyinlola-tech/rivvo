import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  createGroup,
  listGroups,
  searchPublicGroups,
  getGroup,
  listMembers,
  createInvite,
  joinByInvite,
  joinPublic,
  listJoinRequests,
  approveJoin,
  rejectJoin,
  promoteAdmin,
  demoteAdmin,
  addMember,
  removeMember,
  leaveGroup,
  uploadGroupAvatar,
  uploadGroupBanner
} from '../controllers/groupsController.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/public', asyncHandler(searchPublicGroups));

router.use(auth);
router.post('/', asyncHandler(createGroup));
router.get('/', asyncHandler(listGroups));
router.get('/:groupId', asyncHandler(getGroup));
router.get('/:groupId/members', asyncHandler(listMembers));
router.post('/:groupId/members', asyncHandler(addMember));
router.delete('/:groupId/members/:memberId', asyncHandler(removeMember));
router.post('/:groupId/leave', asyncHandler(leaveGroup));
router.post('/:groupId/invites', asyncHandler(createInvite));
router.post('/invites/:token/join', asyncHandler(joinByInvite));
router.post('/:groupId/join', asyncHandler(joinPublic));
router.get('/:groupId/requests', asyncHandler(listJoinRequests));
router.post('/:groupId/requests/:requestId/approve', asyncHandler(approveJoin));
router.post('/:groupId/requests/:requestId/reject', asyncHandler(rejectJoin));
router.post('/:groupId/admins', asyncHandler(promoteAdmin));
router.delete('/:groupId/admins/:memberId', asyncHandler(demoteAdmin));
router.post(
  '/:groupId/avatar',
  (req, res, next) => {
    req.uploadFolder = 'uploads/groups/avatars';
    next();
  },
  upload.single('avatar'),
  asyncHandler(uploadGroupAvatar)
);
router.post(
  '/:groupId/banner',
  (req, res, next) => {
    req.uploadFolder = 'uploads/groups/banners';
    next();
  },
  upload.single('banner'),
  asyncHandler(uploadGroupBanner)
);

export default router;
