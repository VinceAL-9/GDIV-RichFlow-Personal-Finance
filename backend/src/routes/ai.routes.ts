import { Router } from 'express';
import { analyzeFinanceController } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/showinformation', authenticateToken, analyzeFinanceController);

export default router;