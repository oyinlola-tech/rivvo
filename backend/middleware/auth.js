import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import pool from '../config/db.js';

const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const [rows] = await pool.execute(
      `SELECT token_version, status FROM users WHERE id = :id LIMIT 1`,
      { id: payload.id }
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
    const userRow = rows[0];
    const tokenVersion = Number(userRow.token_version ?? 0);
    const payloadVersion = Number(payload.tokenVersion ?? 0);
    if (tokenVersion !== payloadVersion) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token expired' });
    }
    if (userRow.status === 'suspended') {
      return res.status(403).json({ error: 'Forbidden', message: 'Account suspended' });
    }
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
};

export default auth;
