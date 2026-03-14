import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMinutes * 60 * 1000,
  max: env.rateLimit.authMax,
  keyGenerator: (req) => {
    const identifier =
      req.body?.identifier ||
      req.body?.email ||
      req.body?.phone ||
      req.body?.username ||
      '';
    return `${req.ip}:${String(identifier).toLowerCase()}`;
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMinutes * 60 * 1000,
  max: env.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false
});
