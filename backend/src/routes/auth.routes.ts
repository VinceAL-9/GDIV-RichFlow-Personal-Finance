import { Router } from 'express';
import { signup, login, refreshToken, logout, logoutAll, getProfile } from '../controllers/auth.controller';
import { validateSignup, validateLogin } from '../middleware/validation.middleware';
import { signupLimiter, loginLimiter } from '../middleware/rateLimit.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

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
 * @desc Login user and create session
 * @access Public
 */
router.post('/login', loginLimiter, validateLogin, login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token cookie
 * @access Public (requires refresh token cookie)
 */
router.post('/refresh', refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate session
 * @access Public
 */
router.post('/logout', logout);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout user from all devices
 * @access Private (requires authentication)
 */
router.post('/logout-all', authenticateToken, logoutAll);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private (requires authentication)
 */
router.get('/profile', authenticateToken, getProfile);

export default router;
