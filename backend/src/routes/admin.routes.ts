import { Router } from 'express';
import { getUsers, getUser, deleteUser } from '../controllers/admin.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route GET /api/admin/users
 * @desc Get all users
 * @access Private (Admin only)
 */
router.get('/users', authenticateToken, requireAdmin, getUsers);

/**
 * @route GET /api/admin/users/:id
 * @desc Get a single user by ID
 * @access Private (Admin only)
 */
router.get('/users/:id', authenticateToken, requireAdmin, getUser);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user by ID
 * @access Private (Admin only)
 */
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
