import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError, requireFields, isNonEmptyString } from '../utils/validation.js';

const ensureParticipant = async (userId, conversationId) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id = :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );
  return rows.length > 0;
};

const getLastMessages = async (conversationId) => {
  const [rows] = await pool.execute(
    `SELECT id, body, sender_id, iv, is_encrypted, created_at
     FROM messages
     WHERE conversation_id = :conversation_id
     ORDER BY created_at DESC
     LIMIT 10`,
    { conversation_id: conversationId }
  );
  return rows;
};

const insertReportMessages = async (connection, reportId, messages) => {
  for (const msg of messages) {
    await connection.execute(
      `INSERT INTO report_messages (id, report_id, message_id, sender_id, body, iv, is_encrypted, created_at)
       VALUES (:id, :report_id, :message_id, :sender_id, :body, :iv, :is_encrypted, :created_at)`,
      {
        id: uuid(),
        report_id: reportId,
        message_id: msg.id,
        sender_id: msg.sender_id,
        body: msg.body,
        iv: msg.iv || null,
        is_encrypted: msg.is_encrypted ? 1 : 0,
        created_at: msg.created_at
      }
    );
  }
};

const blockUser = async (connection, blockerId, blockedId) => {
  if (blockerId === blockedId) return;
  await connection.execute(
    `INSERT IGNORE INTO blocks (blocker_id, blocked_id)
     VALUES (:blocker_id, :blocked_id)`,
    { blocker_id: blockerId, blocked_id: blockedId }
  );
};

export const reportUser = async (req, res) => {
  const userId = req.user?.id;
  const { reportedUserId, reason, description, conversationId, block } = req.body || {};

  const missing = requireFields(req.body, ['reportedUserId', 'reason']);
  if (missing.length) {
    return sendError(res, 400, 'reportedUserId and reason are required');
  }
  if (!isNonEmptyString(reason)) {
    return sendError(res, 400, 'Reason is required');
  }
  if (reason.trim().length > 255) {
    return sendError(res, 400, 'Reason must be 255 characters or less');
  }
  if (reportedUserId === userId) {
    return sendError(res, 400, 'You cannot report yourself');
  }

  const [userRows] = await pool.execute(
    `SELECT id FROM users WHERE id = :id LIMIT 1`,
    { id: reportedUserId }
  );
  if (!userRows.length) {
    return sendError(res, 404, 'Reported user not found');
  }

  if (conversationId) {
    const isReporterParticipant = await ensureParticipant(userId, conversationId);
    const isReportedParticipant = await ensureParticipant(reportedUserId, conversationId);
    if (!isReporterParticipant || !isReportedParticipant) {
      return sendError(res, 400, 'Conversation is invalid for these users');
    }
  }

  const reportId = uuid();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO reports
       (id, reported_user_id, reported_by_id, reason, description, status, type, conversation_id)
       VALUES (:id, :reported_user_id, :reported_by_id, :reason, :description, 'pending', 'user', :conversation_id)`,
      {
        id: reportId,
        reported_user_id: reportedUserId,
        reported_by_id: userId,
        reason,
        description: description || null,
        conversation_id: conversationId || null
      }
    );

    if (conversationId) {
      const messages = await getLastMessages(conversationId);
      await insertReportMessages(connection, reportId, messages);
    }

    if (block) {
      await blockUser(connection, userId, reportedUserId);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return res.status(201).json({ id: reportId });
};

export const reportMessage = async (req, res) => {
  const userId = req.user?.id;
  const { messageId, reason, description, block } = req.body || {};

  const missing = requireFields(req.body, ['messageId', 'reason']);
  if (missing.length) {
    return sendError(res, 400, 'messageId and reason are required');
  }
  if (!isNonEmptyString(reason)) {
    return sendError(res, 400, 'Reason is required');
  }
  if (reason.trim().length > 255) {
    return sendError(res, 400, 'Reason must be 255 characters or less');
  }

  const [rows] = await pool.execute(
    `SELECT m.id, m.body, m.sender_id, m.iv, m.is_encrypted, m.conversation_id
     FROM messages m
     JOIN conversation_participants cp
       ON cp.conversation_id = m.conversation_id AND cp.user_id = :user_id
     WHERE m.id = :message_id
     LIMIT 1`,
    { user_id: userId, message_id: messageId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Message not found');
  }

  const message = rows[0];
  if (message.sender_id === userId) {
    return sendError(res, 400, 'You cannot report your own message');
  }

  const reportId = uuid();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO reports
       (id, reported_user_id, reported_by_id, reason, description, status, type, reported_message_id, conversation_id)
       VALUES (:id, :reported_user_id, :reported_by_id, :reason, :description, 'pending', 'message', :reported_message_id, :conversation_id)`,
      {
        id: reportId,
        reported_user_id: message.sender_id,
        reported_by_id: userId,
        reason,
        description: description || null,
        reported_message_id: messageId,
        conversation_id: message.conversation_id
      }
    );

    const messages = await getLastMessages(message.conversation_id);
    await insertReportMessages(connection, reportId, messages);

    if (block) {
      await blockUser(connection, userId, message.sender_id);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return res.status(201).json({ id: reportId });
};
