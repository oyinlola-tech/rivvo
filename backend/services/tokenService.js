import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const isBadgeActive = (user) => {
  const rawFlag = user.isVerifiedBadge ?? user.is_verified_badge;
  if (!rawFlag) return false;
  const expiresAt = user.verified_badge_expires_at ?? user.verifiedBadgeExpiresAt;
  if (!expiresAt) return false;
  return new Date(expiresAt) > new Date();
};

export const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username || null,
      verified: Boolean(user.verified),
      isVerifiedBadge: isBadgeActive(user),
      verifiedBadgeExpiresAt: user.verified_badge_expires_at ?? user.verifiedBadgeExpiresAt ?? null,
      isModerator: Boolean(user.is_moderator ?? user.isModerator),
      isAdmin: Boolean(user.is_admin ?? user.isAdmin),
      tokenVersion: Number(user.token_version ?? user.tokenVersion ?? 0)
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: env.jwt.issuer,
      audience: env.jwt.audience
    }
  );
