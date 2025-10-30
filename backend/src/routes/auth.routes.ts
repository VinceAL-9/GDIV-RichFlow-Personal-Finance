import { Router } from 'express';
import { signup } from '../controllers/auth.controller';
import { validateSignup } from '../middleware/validation.middleware';
import { signupLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', signupLimiter, validateSignup, signup);

export default router;
