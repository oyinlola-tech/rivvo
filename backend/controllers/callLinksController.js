import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError } from '../utils/validation.js';
import env from '../config/env.js';

export const createCallLink = async (req, res) => {
  const userId = req.user?.id;
  const { type, scope, groupId } = req.body || {};

  if (!['audio', 'video'].includes(type)) {
    return sendError(res, 400, 'type must be audio or video');
  }
  if (!['direct', 'group'].includes(scope)) {
    return sendError(res, 400, 'scope must be direct or group');
  }
  if (scope === 'group' && !groupId) {
    return sendError(res, 400, 'groupId is required for group calls');
  }

  const token = uuid().replace(/-/g, '');
  await pool.execute(
    `INSERT INTO call_links (id, token, created_by, type, scope, group_id)
     VALUES (:id, :token, :created_by, :type, :scope, :group_id)`,
    {
      id: uuid(),
      token,
      created_by: userId,
      type,
      scope,
      group_id: groupId || null
    }
  );

  const base = env.callRoomBaseUrl || 'http://localhost:5173/call/';
  return res.status(201).json({
    token,
    roomUrl: `${base}${token}`,
    joinUrl: `${base}${token}`,
    type,
    scope
  });
};

export const resolveCallLink = async (req, res) => {
  const { token } = req.params;
  const [rows] = await pool.execute(
    `SELECT cl.type, cl.scope, cl.group_id, g.name AS group_name
     FROM call_links cl
     LEFT JOIN groups g ON g.id = cl.group_id
     WHERE cl.token = :token
     LIMIT 1`,
    { token }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Call link not found');
  }
  const row = rows[0];
  return res.json({
    token,
    type: row.type,
    scope: row.scope,
    groupId: row.group_id,
    groupName: row.group_name || null
  });
};
