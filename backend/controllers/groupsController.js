import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError, requireFields, isNonEmptyString } from '../utils/validation.js';

const isGroupMember = async (groupId, userId) => {
  const [rows] = await pool.execute(
    `SELECT role, status FROM group_members WHERE group_id = :group_id AND user_id = :user_id LIMIT 1`,
    { group_id: groupId, user_id: userId }
  );
  return rows[0] || null;
};

const countAdmins = async (groupId) => {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM group_members
     WHERE group_id = :group_id AND role IN ('owner', 'admin') AND status = 'active'`,
    { group_id: groupId }
  );
  return Number(row?.total || 0);
};

const ensureGroupConversation = async (groupId, existingConversationId = null) => {
  if (existingConversationId) {
    return existingConversationId;
  }
  const [rows] = await pool.execute(
    `SELECT conversation_id FROM groups WHERE id = :id`,
    { id: groupId }
  );
  if (!rows.length) {
    return null;
  }
  if (rows[0].conversation_id) {
    return rows[0].conversation_id;
  }
  const conversationId = uuid();
  await pool.execute(`INSERT INTO conversations (id) VALUES (:id)`, { id: conversationId });
  await pool.execute(
    `UPDATE groups SET conversation_id = :conversation_id WHERE id = :id`,
    { conversation_id: conversationId, id: groupId }
  );
  await pool.execute(
    `INSERT IGNORE INTO conversation_participants (conversation_id, user_id)
     SELECT :conversation_id, user_id
     FROM group_members
     WHERE group_id = :group_id AND status = 'active'`,
    { conversation_id: conversationId, group_id: groupId }
  );
  return conversationId;
};

const addConversationParticipant = async (conversationId, userId) => {
  if (!conversationId || !userId) return;
  await pool.execute(
    `INSERT IGNORE INTO conversation_participants (conversation_id, user_id)
     VALUES (:conversation_id, :user_id)`,
    { conversation_id: conversationId, user_id: userId }
  );
};

export const createGroup = async (req, res) => {
  const userId = req.user?.id;
  const { name, description, isPrivate } = req.body || {};
  const missing = requireFields(req.body, ['name']);
  if (missing.length) {
    return sendError(res, 400, 'name is required');
  }
  if (!isNonEmptyString(name)) {
    return sendError(res, 400, 'name is required');
  }

  const groupId = uuid();
  const conversationId = uuid();
  await pool.execute(`INSERT INTO conversations (id) VALUES (:id)`, { id: conversationId });
  await pool.execute(
    `INSERT INTO groups (id, conversation_id, owner_id, name, description, is_private)
     VALUES (:id, :conversation_id, :owner_id, :name, :description, :is_private)`,
    {
      id: groupId,
      conversation_id: conversationId,
      owner_id: userId,
      name,
      description: description || null,
      is_private: isPrivate ? 1 : 0
    }
  );

  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role, status)
     VALUES (:group_id, :user_id, 'owner', 'active')`,
    { group_id: groupId, user_id: userId }
  );

  await addConversationParticipant(conversationId, userId);

  return res.status(201).json({ id: groupId, conversationId });
};

export const listGroups = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT g.id, g.name, g.description, g.is_private, g.owner_id, g.avatar, g.banner, gm.role
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = :user_id AND gm.status = 'active'
     ORDER BY g.created_at DESC`,
    { user_id: userId }
  );

  const groups = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isPrivate: Boolean(row.is_private),
    ownerId: row.owner_id,
    avatar: row.avatar || null,
    banner: row.banner || null,
    role: row.role
  }));

  return res.json(groups);
};

export const searchPublicGroups = async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const [rows] = await pool.execute(
    `SELECT id, name, description
     FROM groups
     WHERE is_private = 0 AND name LIKE :query
     ORDER BY created_at DESC
     LIMIT 20`,
    { query: `%${query}%` }
  );
  return res.json(rows);
};

export const getGroup = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const [rows] = await pool.execute(
    `SELECT id, name, description, is_private, owner_id, conversation_id, avatar, banner
     FROM groups
     WHERE id = :id`,
    { id: groupId }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Group not found');
  }
  const membership = await isGroupMember(groupId, userId);
  const conversationId = await ensureGroupConversation(groupId, rows[0].conversation_id);
  if (membership?.status === 'active' && conversationId) {
    await addConversationParticipant(conversationId, userId);
  }
  return res.json({
    ...rows[0],
    isPrivate: Boolean(rows[0].is_private),
    conversationId,
    membership
  });
};

export const listMembers = async (req, res) => {
  const { groupId } = req.params;
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, gm.role, gm.status
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = :group_id
     ORDER BY gm.created_at DESC`,
    { group_id: groupId }
  );
  const members = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status
  }));
  return res.json(members);
};

export const createInvite = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const [groups] = await pool.execute(
    `SELECT id, is_private FROM groups WHERE id = :id`,
    { id: groupId }
  );
  if (!groups.length) {
    return sendError(res, 404, 'Group not found');
  }
  const group = groups[0];
  const membership = await isGroupMember(groupId, userId);
  if (!membership || membership.status !== 'active') {
    return sendError(res, 403, 'Not a group member');
  }

  if (group.is_private) {
    if (!['owner', 'admin'].includes(membership.role)) {
      return sendError(res, 403, 'Only admins can create private invites');
    }
  }

  const token = uuid().replace(/-/g, '');
  const inviteId = uuid();
  await pool.execute(
    `INSERT INTO group_invites (id, group_id, token, created_by, is_private)
     VALUES (:id, :group_id, :token, :created_by, :is_private)`,
    {
      id: inviteId,
      group_id: groupId,
      token,
      created_by: userId,
      is_private: group.is_private ? 1 : 0
    }
  );

  return res.status(201).json({ token, groupId });
};

export const joinByInvite = async (req, res) => {
  const userId = req.user?.id;
  const { token } = req.params;
  const [invites] = await pool.execute(
    `SELECT gi.group_id, g.is_private
     FROM group_invites gi
     JOIN groups g ON g.id = gi.group_id
     WHERE gi.token = :token
     LIMIT 1`,
    { token }
  );
  if (!invites.length) {
    return sendError(res, 404, 'Invite not found');
  }
  const invite = invites[0];

  if (invite.is_private) {
    await pool.execute(
      `INSERT INTO group_join_requests (id, group_id, user_id, status)
       VALUES (:id, :group_id, :user_id, 'pending')
       ON DUPLICATE KEY UPDATE status = 'pending'`,
      { id: uuid(), group_id: invite.group_id, user_id: userId }
    );
    return res.json({ status: 'pending' });
  }

  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role, status)
     VALUES (:group_id, :user_id, 'member', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    { group_id: invite.group_id, user_id: userId }
  );
  const conversationId = await ensureGroupConversation(invite.group_id);
  await addConversationParticipant(conversationId, userId);
  return res.json({ status: 'joined', groupId: invite.group_id });
};

export const joinPublic = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const [groups] = await pool.execute(
    `SELECT id, is_private FROM groups WHERE id = :id`,
    { id: groupId }
  );
  if (!groups.length) {
    return sendError(res, 404, 'Group not found');
  }
  if (groups[0].is_private) {
    return sendError(res, 400, 'Group is private');
  }

  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role, status)
     VALUES (:group_id, :user_id, 'member', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    { group_id: groupId, user_id: userId }
  );
  const conversationId = await ensureGroupConversation(groupId);
  await addConversationParticipant(conversationId, userId);
  return res.json({ status: 'joined' });
};

export const listJoinRequests = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }
  const [rows] = await pool.execute(
    `SELECT jr.id, jr.user_id, u.name, u.email, jr.status, jr.created_at
     FROM group_join_requests jr
     JOIN users u ON u.id = jr.user_id
     WHERE jr.group_id = :group_id AND jr.status = 'pending'
     ORDER BY jr.created_at DESC`,
    { group_id: groupId }
  );
  const requests = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString()
  }));
  return res.json(requests);
};

export const approveJoin = async (req, res) => {
  const userId = req.user?.id;
  const { groupId, requestId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }

  const [rows] = await pool.execute(
    `SELECT user_id FROM group_join_requests WHERE id = :id AND group_id = :group_id`,
    { id: requestId, group_id: groupId }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Request not found');
  }
  const requestUserId = rows[0].user_id;
  await pool.execute(
    `UPDATE group_join_requests
     SET status = 'approved', reviewed_by = :reviewed_by, reviewed_at = NOW()
     WHERE id = :id`,
    { id: requestId, reviewed_by: userId }
  );
  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role, status)
     VALUES (:group_id, :user_id, 'member', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    { group_id: groupId, user_id: requestUserId }
  );
  const conversationId = await ensureGroupConversation(groupId);
  await addConversationParticipant(conversationId, requestUserId);

  return res.json({ message: 'Approved' });
};

export const rejectJoin = async (req, res) => {
  const userId = req.user?.id;
  const { groupId, requestId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }

  await pool.execute(
    `UPDATE group_join_requests
     SET status = 'rejected', reviewed_by = :reviewed_by, reviewed_at = NOW()
     WHERE id = :id`,
    { id: requestId, reviewed_by: userId }
  );
  return res.json({ message: 'Rejected' });
};

export const promoteAdmin = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const { memberId } = req.body || {};
  if (!memberId) {
    return sendError(res, 400, 'memberId is required');
  }
  const membership = await isGroupMember(groupId, userId);
  if (!membership || membership.role !== 'owner') {
    return sendError(res, 403, 'Only owner can promote admins');
  }

  const totalAdmins = await countAdmins(groupId);
  if (totalAdmins >= 11) {
    return sendError(res, 400, 'Group admin limit reached');
  }

  await pool.execute(
    `UPDATE group_members
     SET role = 'admin'
     WHERE group_id = :group_id AND user_id = :user_id`,
    { group_id: groupId, user_id: memberId }
  );
  return res.json({ message: 'Promoted' });
};

export const demoteAdmin = async (req, res) => {
  const userId = req.user?.id;
  const { groupId, memberId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership || membership.role !== 'owner') {
    return sendError(res, 403, 'Only owner can demote admins');
  }

  await pool.execute(
    `UPDATE group_members
     SET role = 'member'
     WHERE group_id = :group_id AND user_id = :user_id AND role = 'admin'`,
    { group_id: groupId, user_id: memberId }
  );
  return res.json({ message: 'Demoted' });
};

export const addMember = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const { memberId } = req.body || {};
  if (!memberId) {
    return sendError(res, 400, 'memberId is required');
  }
  const [groups] = await pool.execute(
    `SELECT id, conversation_id FROM groups WHERE id = :id`,
    { id: groupId }
  );
  if (!groups.length) {
    return sendError(res, 404, 'Group not found');
  }
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }

  const [users] = await pool.execute(
    `SELECT id FROM users WHERE id = :id LIMIT 1`,
    { id: memberId }
  );
  if (!users.length) {
    return sendError(res, 404, 'User not found');
  }

  await pool.execute(
    `INSERT INTO group_members (group_id, user_id, role, status)
     VALUES (:group_id, :user_id, 'member', 'active')
     ON DUPLICATE KEY UPDATE status = 'active'`,
    { group_id: groupId, user_id: memberId }
  );

  const conversationId = await ensureGroupConversation(groupId, groups[0].conversation_id);
  await addConversationParticipant(conversationId, memberId);

  return res.status(201).json({ message: 'Member added' });
};

export const removeMember = async (req, res) => {
  const userId = req.user?.id;
  const { groupId, memberId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }

  const [rows] = await pool.execute(
    `SELECT role FROM group_members WHERE group_id = :group_id AND user_id = :user_id LIMIT 1`,
    { group_id: groupId, user_id: memberId }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Member not found');
  }
  if (rows[0].role === 'owner') {
    return sendError(res, 400, 'Owner cannot be removed');
  }

  await pool.execute(
    `DELETE FROM group_members WHERE group_id = :group_id AND user_id = :user_id`,
    { group_id: groupId, user_id: memberId }
  );

  await pool.execute(
    `DELETE FROM conversation_participants
     WHERE conversation_id = (SELECT conversation_id FROM groups WHERE id = :group_id)
       AND user_id = :user_id`,
    { group_id: groupId, user_id: memberId }
  );

  return res.json({ message: 'Member removed' });
};

export const leaveGroup = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const membership = await isGroupMember(groupId, userId);
  if (!membership) {
    return sendError(res, 404, 'Group membership not found');
  }
  if (membership.role === 'owner') {
    return sendError(res, 400, 'Owner cannot leave the group');
  }

  await pool.execute(
    `DELETE FROM group_members WHERE group_id = :group_id AND user_id = :user_id`,
    { group_id: groupId, user_id: userId }
  );

  await pool.execute(
    `DELETE FROM conversation_participants
     WHERE conversation_id = (SELECT conversation_id FROM groups WHERE id = :group_id)
       AND user_id = :user_id`,
    { group_id: groupId, user_id: userId }
  );

  return res.json({ message: 'Left group' });
};

export const uploadGroupAvatar = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const file = req.file;
  if (!file) {
    return sendError(res, 400, 'Avatar file is required');
  }
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }
  const avatarUrl = `/uploads/groups/avatars/${file.filename}`;
  await pool.execute(
    `UPDATE groups SET avatar = :avatar WHERE id = :id`,
    { avatar: avatarUrl, id: groupId }
  );
  return res.json({ message: 'Group avatar updated', avatar: avatarUrl });
};

export const uploadGroupBanner = async (req, res) => {
  const userId = req.user?.id;
  const { groupId } = req.params;
  const file = req.file;
  if (!file) {
    return sendError(res, 400, 'Banner file is required');
  }
  const membership = await isGroupMember(groupId, userId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return sendError(res, 403, 'Admin access required');
  }
  const bannerUrl = `/uploads/groups/banners/${file.filename}`;
  await pool.execute(
    `UPDATE groups SET banner = :banner WHERE id = :id`,
    { banner: bannerUrl, id: groupId }
  );
  return res.json({ message: 'Group banner updated', banner: bannerUrl });
};
