import pool from '../config/db.js';
import { sendError, isNonEmptyString } from '../utils/validation.js';

const buildUserPayload = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  verified: Boolean(user.verified),
  isModerator: Boolean(user.is_moderator),
  isAdmin: Boolean(user.is_admin),
  avatar: user.avatar || null
});

export const getProfile = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = :id LIMIT 1', {
    id: userId
  });
  const user = rows[0];
  if (!user) {
    return sendError(res, 404, 'User not found');
  }
  return res.json(buildUserPayload(user));
};

export const updateProfile = async (req, res) => {
  const userId = req.user?.id;
  const { name, avatar } = req.body || {};

  if (!isNonEmptyString(name) && avatar === undefined) {
    return sendError(res, 400, 'Nothing to update');
  }

  await pool.execute(
    `UPDATE users
     SET name = COALESCE(:name, name),
         avatar = COALESCE(:avatar, avatar)
     WHERE id = :id`,
    {
      id: userId,
      name: name || null,
      avatar: avatar || null
    }
  );

  return res.json({ message: 'Profile updated successfully' });
};

export const uploadAvatar = async (req, res) => {
  const userId = req.user?.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Bad Request', message: 'Avatar file is required' });
  }

  const avatarUrl = `/uploads/avatars/${file.filename}`;
  await pool.execute('UPDATE users SET avatar = :avatar WHERE id = :id', {
    id: userId,
    avatar: avatarUrl
  });

  return res.json({ message: 'Avatar updated', avatar: avatarUrl });
};

export const upsertPublicKey = async (req, res) => {
  const userId = req.user?.id;
  const { publicKey } = req.body || {};

  if (!publicKey) {
    return res.status(400).json({ error: 'Bad Request', message: 'publicKey is required' });
  }

  await pool.execute(
    `INSERT INTO user_keys (user_id, public_key)
     VALUES (:user_id, :public_key)
     ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`,
    { user_id: userId, public_key: publicKey }
  );

  return res.json({ message: 'Public key saved' });
};

export const getPublicKey = async (req, res) => {
  const { userId } = req.params;
  const [rows] = await pool.execute('SELECT public_key FROM user_keys WHERE user_id = :user_id', {
    user_id: userId
  });

  if (!rows.length) {
    return res.status(404).json({ error: 'Not Found', message: 'Public key not found' });
  }

  return res.json({ userId, publicKey: rows[0].public_key });
};

export const registerDeviceKey = async (req, res) => {
  const userId = req.user?.id;
  const { deviceId, publicKey, deviceName } = req.body || {};

  if (!deviceId || !publicKey) {
    return res.status(400).json({ error: 'Bad Request', message: 'deviceId and publicKey are required' });
  }

  await pool.execute(
    `INSERT INTO device_keys (device_id, user_id, public_key, device_name, verified_at)
     VALUES (:device_id, :user_id, :public_key, :device_name, NULL)
     ON DUPLICATE KEY UPDATE
       public_key = VALUES(public_key),
       device_name = VALUES(device_name),
       verified_at = NULL`,
    {
      device_id: deviceId,
      user_id: userId,
      public_key: publicKey,
      device_name: deviceName || null
    }
  );

  return res.json({ message: 'Device key registered' });
};

export const listDevices = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT device_id, device_name, verified_at, created_at
     FROM device_keys
     WHERE user_id = :user_id
     ORDER BY created_at DESC`,
    { user_id: userId }
  );

  const devices = rows.map((row) => ({
    deviceId: row.device_id,
    deviceName: row.device_name,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(devices);
};

export const verifyDevice = async (req, res) => {
  const userId = req.user?.id;
  const { deviceId } = req.params;

  await pool.execute(
    `UPDATE device_keys
     SET verified_at = NOW()
     WHERE device_id = :device_id AND user_id = :user_id`,
    { device_id: deviceId, user_id: userId }
  );

  return res.json({ message: 'Device verified' });
};
