import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';
import { createToken } from '../services/tokenService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { sendError, requireFields, isEmail, isNonEmptyString, isPhone, normalizePhone } from '../utils/validation.js';

const buildUserPayload = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone || null,
  name: user.name,
  verified: Boolean(user.verified),
  isModerator: Boolean(user.is_moderator),
  isAdmin: Boolean(user.is_admin),
  avatar: user.avatar || null
});

const getUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE LOWER(email) = :email LIMIT 1',
    { email: email.toLowerCase() }
  );
  return rows[0] || null;
};

const getUserByPhone = async (phone) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE phone = :phone LIMIT 1',
    { phone }
  );
  return rows[0] || null;
};

const getUserById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = :id LIMIT 1', { id });
  return rows[0] || null;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createRefreshToken = () => crypto.randomBytes(48).toString('hex');

const refreshTokenExpiresAt = () =>
  new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

const issueAuthTokens = async (user, req) => {
  const refreshToken = createRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = refreshTokenExpiresAt();

  await pool.execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (:id, :user_id, :token_hash, :expires_at, :user_agent, :ip_address)`,
    {
      id: uuid(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: req.get('user-agent') || null,
      ip_address: req.ip || null
    }
  );

  const accessToken = createToken(user);
  return { accessToken, refreshToken };
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  const missing = requireFields(req.body, ['email', 'password']);
  if (missing.length) {
    return sendError(res, 400, 'Email and password required');
  }
  if (!isEmail(email)) {
    return sendError(res, 400, 'Email is invalid');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return sendError(res, 401, 'Invalid credentials');
  }

  if (user.status === 'suspended') {
    return sendError(res, 403, 'Account suspended');
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return sendError(res, 401, 'Invalid credentials');
  }

  if (!user.verified) {
    return sendError(res, 403, 'Email not verified');
  }

  const { accessToken, refreshToken } = await issueAuthTokens(user, req);
  return res.json({ token: accessToken, refreshToken, user: buildUserPayload(user) });
};

export const signup = async (req, res) => {
  const { email, password, name, phone } = req.body || {};
  const missing = requireFields(req.body, ['email', 'password', 'name', 'phone']);
  if (missing.length) {
    return sendError(res, 400, 'Email, password, name, and phone required');
  }
  if (!isEmail(email)) {
    return sendError(res, 400, 'Email is invalid');
  }
  if (!isNonEmptyString(name)) {
    return sendError(res, 400, 'Name is required');
  }
  if (!isPhone(phone)) {
    return sendError(res, 400, 'Phone number is invalid');
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  const normalizedPhone = normalizePhone(phone);
  const existing = await getUserByEmail(email);
  if (existing) {
    return sendError(res, 400, 'Email already in use');
  }
  const existingPhone = await getUserByPhone(normalizedPhone);
  if (existingPhone) {
    return sendError(res, 400, 'Phone number already in use');
  }

  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = uuid();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO users (id, email, phone, password_hash, name, verified, is_moderator, is_admin)
       VALUES (:id, :email, :phone, :password_hash, :name, 0, 0, 0)`,
      {
        id: userId,
        email,
        phone: normalizedPhone,
        password_hash: passwordHash,
        name
      }
    );

    await connection.execute(
      `INSERT INTO otps (id, user_id, code, expires_at, used)
       VALUES (:id, :user_id, :code, :expires_at, 0)`,
      {
        id: otpId,
        user_id: userId,
        code: otpCode,
        expires_at: expiresAt
      }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await sendOtpEmail({ to: email, code: otpCode });

  return res.status(201).json({ message: 'OTP sent to email' });
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  const missing = requireFields(req.body, ['email', 'otp']);
  if (missing.length) {
    return sendError(res, 400, 'Email and OTP required');
  }
  if (!isEmail(email)) {
    return sendError(res, 400, 'Email is invalid');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const [otpRows] = await pool.execute(
    `SELECT * FROM otps
     WHERE user_id = :user_id AND code = :code AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    { user_id: user.id, code: otp }
  );

  if (!otpRows.length) {
    return sendError(res, 400, 'Invalid or expired OTP');
  }

  await pool.execute('UPDATE otps SET used = 1 WHERE id = :id', { id: otpRows[0].id });
  await pool.execute('UPDATE users SET verified = 1 WHERE id = :id', { id: user.id });

  const verifiedUser = { ...user, verified: 1 };
  const { accessToken, refreshToken } = await issueAuthTokens(verifiedUser, req);

  return res.json({ token: accessToken, refreshToken, user: buildUserPayload(verifiedUser) });
};

export const resendOtp = async (req, res) => {
  const { email } = req.body || {};
  const missing = requireFields(req.body, ['email']);
  if (missing.length) {
    return sendError(res, 400, 'Email required');
  }
  if (!isEmail(email)) {
    return sendError(res, 400, 'Email is invalid');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  if (user.verified) {
    return sendError(res, 400, 'User already verified');
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

export const refresh = async (req, res) => {
  const { refreshToken } = req.body || {};
  const missing = requireFields(req.body, ['refreshToken']);
  if (missing.length) {
    return sendError(res, 400, 'Refresh token required');
  }

  const tokenHash = hashToken(refreshToken);
  const [rows] = await pool.execute(
    `SELECT * FROM refresh_tokens WHERE token_hash = :token_hash LIMIT 1`,
    { token_hash: tokenHash }
  );
  const stored = rows[0];
  if (!stored || stored.revoked_at || new Date(stored.expires_at) <= new Date()) {
    return sendError(res, 401, 'Refresh token invalid or expired');
  }

  const user = await getUserById(stored.user_id);
  if (!user || user.status === 'suspended') {
    return sendError(res, 401, 'Refresh token invalid');
  }

  await pool.execute(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(), last_used_at = NOW()
     WHERE id = :id`,
    { id: stored.id }
  );

  const { accessToken, refreshToken: nextRefreshToken } = await issueAuthTokens(user, req);
  return res.json({ token: accessToken, refreshToken: nextRefreshToken, user: buildUserPayload(user) });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body || {};
  const missing = requireFields(req.body, ['refreshToken']);
  if (missing.length) {
    return sendError(res, 400, 'Refresh token required');
  }

  const tokenHash = hashToken(refreshToken);
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :token_hash`,
    { token_hash: tokenHash }
  );

  return res.json({ message: 'Logged out' });
};
