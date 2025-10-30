import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

/**
 * Central route aggregator
 * All feature routes are registered here
 */
router.use('/auth', authRoutes);

export default router;
