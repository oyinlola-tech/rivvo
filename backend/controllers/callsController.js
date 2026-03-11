import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';
import { isUserOnline } from '../services/presenceService.js';

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
        name: row.name,
        avatar: row.avatar || null,
        verified: Boolean(row.verified),
        isModerator: Boolean(row.is_moderator),
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

  if (!userId || !type) {
    return res.status(400).json({ error: 'Bad Request', message: 'userId and type required' });
  }

  const [calleeRows] = await pool.execute('SELECT id FROM users WHERE id = :id', { id: userId });
  if (!calleeRows.length) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
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
    io.to(`user:${userId}`).emit('incoming_call', {
      callId,
      fromUserId: callerId,
      type
    });
  }

  return res.status(201).json({ callId, roomUrl });
};
