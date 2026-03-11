import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMinutes * 60 * 1000,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
});

export default authRateLimiter;
