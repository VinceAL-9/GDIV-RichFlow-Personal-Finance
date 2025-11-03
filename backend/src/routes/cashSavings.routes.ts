import { Router } from 'express';
import { getCashSavingsHandler, updateCashSavingsHandler } from '../controllers/cashSavings.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Cash Savings Routes
 * All routes require authentication
 */

// GET /api/cash-savings - Get cash savings for authenticated user
router.get('/', authenticateToken, getCashSavingsHandler);

// PUT /api/cash-savings - Update cash savings amount
router.put('/', authenticateToken, updateCashSavingsHandler);

export default router;
