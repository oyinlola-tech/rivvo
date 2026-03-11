import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';
import { createToken } from '../services/tokenService.js';
import { sendOtpEmail } from '../services/emailService.js';

const buildUserPayload = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  verified: Boolean(user.verified),
  isModerator: Boolean(user.is_moderator),
  isAdmin: Boolean(user.is_admin),
  avatar: user.avatar || null
});

const getUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = :email LIMIT 1',
    { email }
  );
  return rows[0] || null;
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email and password required' });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Forbidden', message: 'Account suspended' });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  if (!user.verified) {
    return res.status(403).json({ error: 'Forbidden', message: 'Email not verified' });
  }

  const token = createToken(user);
  return res.json({ token, user: buildUserPayload(user) });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email, password, and name required' });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email already in use' });
  }

  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `INSERT INTO users (id, email, password_hash, name, verified, is_moderator, is_admin)
     VALUES (:id, :email, :password_hash, :name, 0, 0, 0)`,
    {
      id: userId,
      email,
      password_hash: passwordHash,
      name
    }
  );

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = uuid();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);

  await pool.execute(
    `INSERT INTO otps (id, user_id, code, expires_at, used)
     VALUES (:id, :user_id, :code, :expires_at, 0)`,
    {
      id: otpId,
      user_id: userId,
      code: otpCode,
      expires_at: expiresAt
    }
  );

  await sendOtpEmail({ to: email, code: otpCode });

  return res.status(201).json({ message: 'OTP sent to email' });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email and OTP required' });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }

  const [otpRows] = await pool.execute(
    `SELECT * FROM otps
     WHERE user_id = :user_id AND code = :code AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    { user_id: user.id, code: otp }
  );

  if (!otpRows.length) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired OTP' });
  }

  await pool.execute('UPDATE otps SET used = 1 WHERE id = :id', { id: otpRows[0].id });
  await pool.execute('UPDATE users SET verified = 1 WHERE id = :id', { id: user.id });

  const verifiedUser = { ...user, verified: 1 };
  const token = createToken(verifiedUser);

  return res.json({ token, user: buildUserPayload(verifiedUser) });
};

export const resendOtp = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Bad Request', message: 'Email required' });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }

  if (user.verified) {
    return res.status(400).json({ error: 'Bad Request', message: 'User already verified' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = uuid();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);

  await pool.execute(
    `INSERT INTO otps (id, user_id, code, expires_at, used)
     VALUES (:id, :user_id, :code, :expires_at, 0)`,
    {
      id: otpId,
      user_id: user.id,
      code: otpCode,
      expires_at: expiresAt
    }
  );

  await sendOtpEmail({ to: email, code: otpCode });

  return res.json({ message: 'OTP sent successfully' });
};
