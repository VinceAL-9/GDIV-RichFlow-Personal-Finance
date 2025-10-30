import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for signup endpoint
 * Limits each IP to 5 signup attempts per 15 minutes
 */
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 signup attempts per windowMs
  message: 'Too many signup attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
