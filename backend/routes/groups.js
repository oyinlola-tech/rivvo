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
  addMember
} from '../controllers/groupsController.js';

const router = Router();

router.get('/public', asyncHandler(searchPublicGroups));

router.use(auth);
router.post('/', asyncHandler(createGroup));
router.get('/', asyncHandler(listGroups));
router.get('/:groupId', asyncHandler(getGroup));
router.get('/:groupId/members', asyncHandler(listMembers));
router.post('/:groupId/members', asyncHandler(addMember));
router.post('/:groupId/invites', asyncHandler(createInvite));
router.post('/invites/:token/join', asyncHandler(joinByInvite));
router.post('/:groupId/join', asyncHandler(joinPublic));
router.get('/:groupId/requests', asyncHandler(listJoinRequests));
router.post('/:groupId/requests/:requestId/approve', asyncHandler(approveJoin));
router.post('/:groupId/requests/:requestId/reject', asyncHandler(rejectJoin));
router.post('/:groupId/admins', asyncHandler(promoteAdmin));
router.delete('/:groupId/admins/:memberId', asyncHandler(demoteAdmin));

export default router;
