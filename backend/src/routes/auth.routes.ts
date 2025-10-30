import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller';
import { validateSignup, validateLogin } from '../middleware/validation.middleware';
import { signupLimiter, loginLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Debug route to verify router is mounted
router.get('/test', (_req, res) => {
  res.json({ message: 'Auth router is working' });
});

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', signupLimiter, validateSignup, signup);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', loginLimiter, validateLogin, login);

export default router;