import pool from '../config/db.js';

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
    return res.status(404).json({ error: 'Not Found', message: 'User not found' });
  }
  return res.json(buildUserPayload(user));
};

export const updateProfile = async (req, res) => {
  const userId = req.user?.id;
  const { name, avatar } = req.body || {};

  if (!name && avatar === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nothing to update' });
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
