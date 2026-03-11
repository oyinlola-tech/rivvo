import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      verified: Boolean(user.verified),
      isModerator: Boolean(user.is_moderator ?? user.isModerator),
      isAdmin: Boolean(user.is_admin ?? user.isAdmin)
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
