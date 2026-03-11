import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';
import { sendError, isNonEmptyString } from '../utils/validation.js';

const ensureParticipant = async (userId, conversationId) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id = :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );
  return rows.length > 0;
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
        u.is_moderator,
        lm.body AS last_text,
        lm.created_at AS last_timestamp,
        lm.is_encrypted AS last_encrypted,
        cp1.last_read_at AS last_read_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> :user_id
            AND (cp1.last_read_at IS NULL OR m.created_at > cp1.last_read_at)
        ) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp1
       ON cp1.conversation_id = c.id AND cp1.user_id = :user_id
     JOIN conversation_participants cp2
       ON cp2.conversation_id = c.id AND cp2.user_id <> :user_id
     JOIN users u ON u.id = cp2.user_id
     LEFT JOIN (
       SELECT m1.conversation_id, m1.body, m1.created_at, m1.is_encrypted
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
      isModerator: Boolean(row.is_moderator)
    },
    lastMessage: {
      text: row.last_encrypted ? 'Encrypted message' : row.last_text || '',
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
    `SELECT id, body, created_at, sender_id, read_at, is_encrypted, iv
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
         AND read_at IS NULL`,
      { conversation_id: conversationId, user_id: userId }
    );
  }

  const messages = rows.map((row) => ({
    id: row.id,
    text: row.body,
    timestamp: new Date(row.created_at).toISOString(),
    sender: row.sender_id === userId ? 'me' : 'them',
    senderId: row.sender_id,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    encrypted: Boolean(row.is_encrypted),
    iv: row.iv || null
  }));

  return res.json({
    messages,
    serverTime: new Date().toISOString()
  });
};

export const sendMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { message, ciphertext, iv, encrypted } = req.body || {};

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

  const messageId = uuid();
  await pool.execute(
    `INSERT INTO messages (id, conversation_id, sender_id, body, iv, is_encrypted)
     VALUES (:id, :conversation_id, :sender_id, :body, :iv, :is_encrypted)`,
    {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      body: finalMessage.trim(),
      iv: iv || null,
      is_encrypted: encrypted ? 1 : 0
    }
  );

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const [participantRows] = await pool.execute(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const otherUserId = participantRows[0]?.user_id;
  const payload = {
    id: messageId,
    text: finalMessage.trim(),
    timestamp: new Date().toISOString(),
    sender: 'me',
    senderId: userId,
    readAt: null,
    encrypted: Boolean(encrypted),
    iv: iv || null
  };

  const io = req.app.get('io');
  if (io && otherUserId) {
    io.to(`user:${otherUserId}`).emit('new_message', {
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
       AND read_at IS NULL`,
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

export const getConversationPeer = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.avatar, u.verified, u.is_moderator, uk.public_key
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
    isModerator: Boolean(peer.is_moderator),
    publicKey: peer.public_key || null
  });
};
