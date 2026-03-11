import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';

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
       SELECT m1.conversation_id, m1.body, m1.created_at
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
      text: row.last_text || '',
      timestamp: row.last_timestamp ? new Date(row.last_timestamp).toISOString() : new Date().toISOString(),
      unreadCount: Number(row.unread_count || 0)
    }
  }));

  return res.json(conversations);
};

export const getMessages = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return res.status(404).json({ error: 'Not Found', message: 'Conversation not found' });
  }

  const [rows] = await pool.execute(
    `SELECT id, body, created_at, sender_id
     FROM messages
     WHERE conversation_id = :conversation_id
     ORDER BY created_at ASC`,
    { conversation_id: conversationId }
  );

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const messages = rows.map((row) => ({
    id: row.id,
    text: row.body,
    timestamp: new Date(row.created_at).toISOString(),
    sender: row.sender_id === userId ? 'me' : 'them'
  }));

  return res.json(messages);
};

export const sendMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { message } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'Message is required' });
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return res.status(404).json({ error: 'Not Found', message: 'Conversation not found' });
  }

  const messageId = uuid();
  await pool.execute(
    `INSERT INTO messages (id, conversation_id, sender_id, body)
     VALUES (:id, :conversation_id, :sender_id, :body)`,
    {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      body: message.trim()
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
    text: message.trim(),
    timestamp: new Date().toISOString(),
    sender: 'me',
    senderId: userId
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
