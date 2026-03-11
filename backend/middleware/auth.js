import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
  }
};

export default auth;
