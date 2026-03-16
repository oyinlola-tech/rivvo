import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';
import { isUserOnline } from '../services/presenceService.js';
import { sendError, requireFields, isOneOf } from '../utils/validation.js';

export const getCallHistory = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT
        c.id,
        c.type,
        c.status,
        c.duration,
        c.created_at,
        u.id AS user_id,
        u.name,
        u.avatar,
        u.verified,
        u.is_moderator,
        u.is_admin,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
          THEN 1 ELSE 0
        END AS is_verified_badge_active,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
          ELSE 'none'
        END AS badge_status,
        CASE WHEN c.caller_id = :user_id THEN 'outgoing' ELSE 'incoming' END AS direction_calc
     FROM calls c
     JOIN users u
       ON u.id = CASE WHEN c.caller_id = :user_id THEN c.callee_id ELSE c.caller_id END
     WHERE c.caller_id = :user_id OR c.callee_id = :user_id
     ORDER BY c.created_at DESC`,
    { user_id: userId }
  );

  const history = rows.map((row) => {
    const direction = row.status === 'missed' ? 'missed' : row.direction_calc;
    return {
      id: row.id,
      user: {
        id: row.user_id,
        name: row.name,
        avatar: row.avatar || null,
        verified: Boolean(row.verified),
        isVerifiedBadge: Boolean(row.is_verified_badge_active),
        badgeStatus: row.badge_status,
        isModerator: Boolean(row.is_moderator),
        isAdmin: Boolean(row.is_admin),
        online: isUserOnline(row.user_id)
      },
      type: row.type,
      direction,
      timestamp: new Date(row.created_at).toISOString(),
      duration: row.duration ?? undefined
    };
  });

  return res.json(history);
};

export const initiateCall = async (req, res) => {
  const callerId = req.user?.id;
  const { userId, type } = req.body || {};

  const missing = requireFields(req.body, ['userId', 'type']);
  if (missing.length) {
    return sendError(res, 400, 'userId and type required');
  }
  if (!isOneOf(type, ['audio', 'video'])) {
    return sendError(res, 400, 'Invalid call type');
  }

  const [calleeRows] = await pool.execute('SELECT id FROM users WHERE id = :id', { id: userId });
  if (!calleeRows.length) {
    return sendError(res, 404, 'User not found');
  }

  const callId = uuid();
  await pool.execute(
    `INSERT INTO calls (id, caller_id, callee_id, type, status)
     VALUES (:id, :caller_id, :callee_id, :type, 'ongoing')`,
    {
      id: callId,
      caller_id: callerId,
      callee_id: userId,
      type
    }
  );

  const roomUrl = `${env.callRoomBaseUrl}${callId}`;

  const io = req.app.get('io');
  if (io) {
    const [callerRows] = await pool.execute(
      `SELECT
          id,
          name,
          avatar,
          verified,
          is_moderator,
          is_admin,
          CASE
            WHEN is_verified_badge = 1 AND verified_badge_expires_at > NOW()
            THEN 1 ELSE 0
          END AS is_verified_badge_active
       FROM users
       WHERE id = :id
       LIMIT 1`,
      { id: callerId }
    );
    const caller = callerRows?.[0];
    io.to(`user:${userId}`).emit('incoming_call', {
      callId,
      fromUserId: callerId,
      fromUser: caller
        ? {
            id: caller.id,
            name: caller.name,
            avatar: caller.avatar || null,
            verified: Boolean(caller.verified),
            isVerifiedBadge: Boolean(caller.is_verified_badge_active),
            isModerator: Boolean(caller.is_moderator),
            isAdmin: Boolean(caller.is_admin)
          }
        : null,
      type
    });
  }

  return res.status(201).json({ callId, roomUrl, type });
};

export const getCallDetails = async (req, res) => {
  const callId = req.params.id;
  const userId = req.user?.id;
  if (!callId) {
    return sendError(res, 400, 'Call ID is required');
  }
  const [rows] = await pool.execute(
    `SELECT id, type, caller_id, callee_id
     FROM calls
     WHERE id = :id
     LIMIT 1`,
    { id: callId }
  );
  const call = rows[0];
  if (!call || (call.caller_id !== userId && call.callee_id !== userId)) {
    return sendError(res, 404, 'Call not found');
  }
  return res.json({ callId: call.id, type: call.type, scope: 'direct' });
};

export const endCall = async (req, res) => {
  const userId = req.user?.id;
  const callId = req.params.id;
  if (!callId) {
    return sendError(res, 400, 'Call id is required');
  }

  const [rows] = await pool.execute(
    `SELECT id, created_at, status, caller_id, callee_id
     FROM calls
     WHERE id = :id
     LIMIT 1`,
    { id: callId }
  );
  const call = rows[0];
  if (!call || (call.caller_id !== userId && call.callee_id !== userId)) {
    return sendError(res, 404, 'Call not found');
  }

  if (call.status !== 'ongoing') {
    return sendError(res, 400, 'Call already ended');
  }

  await pool.execute(
    `UPDATE calls
     SET status = 'completed',
         duration = TIMESTAMPDIFF(SECOND, created_at, NOW())
     WHERE id = :id`,
    { id: callId }
  );

  const io = req.app.get('io');
  if (io) {
    const otherUserId = call.caller_id === userId ? call.callee_id : call.caller_id;
    if (otherUserId) {
      io.to(`user:${otherUserId}`).emit('call:ended', { callId });
    }
  }

  return res.json({ message: 'Call ended' });
};

export const updateCallStatus = async (req, res) => {
  const userId = req.user?.id;
  const callId = req.params.id;
  const { status } = req.body || {};

  if (!callId) {
    return sendError(res, 400, 'Call id is required');
  }
  if (!isOneOf(status, ['completed', 'missed'])) {
    return sendError(res, 400, 'Invalid status');
  }

  const [rows] = await pool.execute(
    `SELECT id, status, caller_id, callee_id
     FROM calls
     WHERE id = :id
     LIMIT 1`,
    { id: callId }
  );
  const call = rows[0];
  if (!call || (call.caller_id !== userId && call.callee_id !== userId)) {
    return sendError(res, 404, 'Call not found');
  }
  if (call.status !== 'ongoing') {
    return sendError(res, 400, 'Call already ended');
  }

  if (status === 'completed') {
    await pool.execute(
      `UPDATE calls
       SET status = 'completed',
           duration = TIMESTAMPDIFF(SECOND, created_at, NOW())
       WHERE id = :id`,
      { id: callId }
    );
    const io = req.app.get('io');
    if (io) {
      const otherUserId = call.caller_id === userId ? call.callee_id : call.caller_id;
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('call:ended', { callId });
      }
    }
  } else {
    await pool.execute(
      `UPDATE calls
       SET status = 'missed',
           duration = NULL
       WHERE id = :id`,
      { id: callId }
    );
  }

  return res.json({ message: 'Call status updated' });
};
