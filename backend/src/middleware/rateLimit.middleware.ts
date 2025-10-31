import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for signup endpoint
 * Limits each IP to 5 signup attempts per 15 minutes
 */
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 signup attempts per windowMs
  message: { error: 'Too many signup attempts from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for login endpoint
 * Limits each IP to 10 login attempts per 15 minutes
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: { error: 'Too many login attempts from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
