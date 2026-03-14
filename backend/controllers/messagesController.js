import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';
import { sendError, isNonEmptyString } from '../utils/validation.js';
import fs from 'fs';
import path from 'path';

const ensureParticipant = async (userId, conversationId) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id = :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );
  return rows.length > 0;
};

const findConversationWith = async (userId, otherUserId) => {
  const [rows] = await pool.execute(
    `SELECT cp1.conversation_id AS id
     FROM conversation_participants cp1
     JOIN conversation_participants cp2
       ON cp2.conversation_id = cp1.conversation_id
     WHERE cp1.user_id = :user_id AND cp2.user_id = :other_user_id
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  return rows[0]?.id || null;
};

export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, 401, 'Unauthorized');
  }
  const [rows] = await pool.execute(
    `SELECT
        c.id AS conversation_id,
        u.id AS user_id,
        u.name,
        u.avatar,
        u.verified,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
          THEN 1 ELSE 0
        END AS is_verified_badge_active,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
          ELSE 'none'
        END AS badge_status,
        u.is_moderator,
        u.is_admin,
        lm.body AS last_text,
        lm.created_at AS last_timestamp,
        lm.is_encrypted AS last_encrypted,
        lm.view_once AS last_view_once,
        cp1.last_read_at AS last_read_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> :user_id
            AND (
              (m.view_once = 1 AND m.view_once_viewed_at IS NULL)
              OR (m.view_once = 0 AND (cp1.last_read_at IS NULL OR m.created_at > cp1.last_read_at))
            )
        ) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp1
       ON cp1.conversation_id = c.id AND cp1.user_id = :user_id
     JOIN conversation_participants cp2
       ON cp2.conversation_id = c.id AND cp2.user_id <> :user_id
     JOIN users u ON u.id = cp2.user_id
     LEFT JOIN (
       SELECT m1.conversation_id, m1.body, m1.created_at, m1.is_encrypted, m1.view_once
       FROM messages m1
       JOIN (
         SELECT conversation_id, MAX(created_at) AS max_created
         FROM messages
         GROUP BY conversation_id
       ) mm
         ON mm.conversation_id = m1.conversation_id AND mm.max_created = m1.created_at
     ) lm ON lm.conversation_id = c.id
     ORDER BY IFNULL(lm.created_at, c.created_at) DESC`,
    { user_id: userId }
  );

  const conversations = rows.map((row) => ({
    id: row.conversation_id,
    user: {
      id: row.user_id,
      name: row.name,
      avatar: row.avatar || null,
      online: isUserOnline(row.user_id),
      verified: Boolean(row.verified),
      isVerifiedBadge: Boolean(row.is_verified_badge_active),
      badgeStatus: row.badge_status,
      isModerator: Boolean(row.is_moderator),
      isAdmin: Boolean(row.is_admin)
    },
    lastMessage: {
      text: row.last_view_once
        ? 'View once message'
        : row.last_encrypted
          ? 'Encrypted message'
          : row.last_text || '',
      timestamp: row.last_timestamp ? new Date(row.last_timestamp).toISOString() : null,
      unreadCount: Number(row.unread_count || 0)
    }
  }));

  return res.json(conversations);
};

export const getMessages = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const since = req.query.since ? new Date(req.query.since) : null;
  const markRead = req.query.markRead !== 'false';
  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const params = { conversation_id: conversationId };
  let sinceFilter = '';
  if (since && !Number.isNaN(since.getTime())) {
    params.since = since;
    sinceFilter = ' AND created_at > :since';
  }

  const [rows] = await pool.execute(
    `SELECT id, body, created_at, sender_id, read_at, is_encrypted, iv, view_once, view_once_viewed_at
     FROM messages
     WHERE conversation_id = :conversation_id${sinceFilter}
     ORDER BY created_at ASC`,
    params
  );

  if (markRead) {
    await pool.execute(
      `UPDATE conversation_participants
       SET last_read_at = NOW()
       WHERE conversation_id = :conversation_id AND user_id = :user_id`,
      { conversation_id: conversationId, user_id: userId }
    );

    await pool.execute(
      `UPDATE messages
       SET read_at = NOW()
       WHERE conversation_id = :conversation_id
         AND sender_id <> :user_id
         AND read_at IS NULL
         AND view_once = 0`,
      { conversation_id: conversationId, user_id: userId }
    );
  }

  const messages = rows
    .filter((row) => !(row.view_once && row.sender_id !== userId && row.view_once_viewed_at))
    .map((row) => ({
      id: row.id,
      text: row.body,
      timestamp: new Date(row.created_at).toISOString(),
      sender: row.sender_id === userId ? 'me' : 'them',
      senderId: row.sender_id,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      encrypted: Boolean(row.is_encrypted),
      iv: row.iv || null,
      viewOnce: Boolean(row.view_once),
      viewOnceViewedAt: row.view_once_viewed_at
        ? new Date(row.view_once_viewed_at).toISOString()
        : null
    }));

  return res.json({
    messages,
    serverTime: new Date().toISOString()
  });
};

export const sendMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { message, ciphertext, iv, encrypted, viewOnce } = req.body || {};

  const finalMessage = ciphertext || message;
  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }
  if (!isNonEmptyString(finalMessage)) {
    return sendError(res, 400, 'Message is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [participantRows] = await pool.execute(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const otherUserId = participantRows[0]?.user_id;
  if (otherUserId) {
    const [blockRows] = await pool.execute(
      `SELECT 1 FROM blocks
       WHERE (blocker_id = :user_id AND blocked_id = :other_user_id)
          OR (blocker_id = :other_user_id AND blocked_id = :user_id)
       LIMIT 1`,
      { user_id: userId, other_user_id: otherUserId }
    );
    if (blockRows.length) {
      return sendError(res, 403, 'Messaging is blocked');
    }
  }

  const messageId = uuid();
  await pool.execute(
    `INSERT INTO messages (id, conversation_id, sender_id, body, iv, is_encrypted, view_once)
     VALUES (:id, :conversation_id, :sender_id, :body, :iv, :is_encrypted, :view_once)`,
    {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      body: finalMessage.trim(),
      iv: iv || null,
      is_encrypted: encrypted ? 1 : 0,
      view_once: viewOnce ? 1 : 0
    }
  );

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const recipientId = otherUserId;
  const payload = {
    id: messageId,
    text: finalMessage.trim(),
    timestamp: new Date().toISOString(),
    sender: 'me',
    senderId: userId,
    readAt: null,
    encrypted: Boolean(encrypted),
    iv: iv || null,
    viewOnce: Boolean(viewOnce),
    viewOnceViewedAt: null
  };

  const io = req.app.get('io');
  if (io && recipientId) {
    io.to(`user:${recipientId}`).emit('new_message', {
      conversationId,
      message: { ...payload, sender: 'them' }
    });
    io.to(`conversation:${conversationId}`).emit('new_message', {
      conversationId,
      message: { ...payload, sender: 'them' }
    });
  }

  return res.status(201).json(payload);
};

export const getOrCreateConversation = async (req, res) => {
  const userId = req.user?.id;
  const { userId: otherUserId } = req.params;

  if (!otherUserId) {
    return sendError(res, 400, 'userId is required');
  }
  if (otherUserId === userId) {
    return sendError(res, 400, 'Cannot create conversation with yourself');
  }

  const [blockRows] = await pool.execute(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = :user_id AND blocked_id = :other_user_id)
        OR (blocker_id = :other_user_id AND blocked_id = :user_id)
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  if (blockRows.length) {
    return sendError(res, 403, 'Messaging is blocked');
  }

  const existing = await findConversationWith(userId, otherUserId);
  if (existing) {
    return res.json({ id: existing });
  }

  const conversationId = uuid();
  await pool.execute(`INSERT INTO conversations (id) VALUES (:id)`, { id: conversationId });
  await pool.execute(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     VALUES (:conversation_id, :user_id), (:conversation_id, :other_user_id)`,
    { conversation_id: conversationId, user_id: userId, other_user_id: otherUserId }
  );

  return res.status(201).json({ id: conversationId });
};

export const markConversationRead = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  await pool.execute(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = :conversation_id
       AND sender_id <> :user_id
       AND read_at IS NULL
       AND view_once = 0`,
    { conversation_id: conversationId, user_id: userId }
  );

  const [participantRows] = await pool.execute(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const otherUserId = participantRows[0]?.user_id;
  const io = req.app.get('io');
  if (io && otherUserId) {
    io.to(`user:${otherUserId}`).emit('read_receipt', {
      conversationId,
      readerId: userId,
      readAt: new Date().toISOString()
    });
  }

  return res.json({ message: 'Conversation marked as read' });
};

export const viewOnceMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const messageId = req.params.messageId;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  await pool.execute(
    `UPDATE messages
     SET view_once_viewed_at = NOW(), read_at = NOW()
     WHERE id = :id AND conversation_id = :conversation_id AND sender_id <> :user_id`,
    { id: messageId, conversation_id: conversationId, user_id: userId }
  );

  const [participantRows] = await pool.execute(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const otherUserId = participantRows[0]?.user_id;
  const io = req.app.get('io');
  if (io && otherUserId) {
    io.to(`user:${otherUserId}`).emit('view_once_viewed', {
      conversationId,
      messageId,
      readAt: new Date().toISOString()
    });
  }

  return res.json({ message: 'View-once message viewed' });
};

export const getConversationPeer = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.avatar, u.verified,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
              THEN 1 ELSE 0
            END AS is_verified_badge_active,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
              ELSE 'none'
            END AS badge_status,
            u.is_moderator, u.is_admin, uk.public_key
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN user_keys uk ON uk.user_id = u.id
     WHERE cp.conversation_id = :conversation_id AND cp.user_id <> :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Peer not found');
  }

  const peer = rows[0];
  return res.json({
    id: peer.id,
    name: peer.name,
    avatar: peer.avatar || null,
    verified: Boolean(peer.verified),
    isVerifiedBadge: Boolean(peer.is_verified_badge_active),
    badgeStatus: peer.badge_status,
    isModerator: Boolean(peer.is_moderator),
    isAdmin: Boolean(peer.is_admin),
    publicKey: peer.public_key || null
  });
};

const allowedAttachmentMimes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'video/mp4',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg'
]);

const allowedAttachmentKinds = new Set(['media', 'document', 'audio', 'voice']);

export const uploadAttachment = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { fileType, fileName, kind } = req.body || {};
  const normalizedType = typeof fileType === 'string' ? fileType.toLowerCase() : '';

  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  if (!req.file) {
    return sendError(res, 400, 'File is required');
  }

  if (!normalizedType || !allowedAttachmentMimes.has(normalizedType)) {
    fs.unlink(req.file.path, () => {});
    return sendError(res, 400, 'Unsupported file type');
  }

  if (kind && !allowedAttachmentKinds.has(kind)) {
    fs.unlink(req.file.path, () => {});
    return sendError(res, 400, 'Unsupported attachment kind');
  }

  const relativePath = `/uploads/messages/${path.basename(req.file.path)}`;

  return res.status(201).json({
    url: relativePath,
    size: req.file.size,
    fileType: normalizedType,
    fileName: fileName || req.file.originalname || 'attachment',
    kind: kind || 'document'
  });
};
