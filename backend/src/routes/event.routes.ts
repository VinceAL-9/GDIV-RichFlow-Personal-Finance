import { Router } from 'express';
import {
  getEventsHandler,
  getEntityEventsHandler,
  blockEventUpdate,
  blockEventDelete
} from '../controllers/event.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * All event routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/events
 * Get all events for the authenticated user with optional filters
 * Query params: entityType, startDate, endDate, limit, offset
 */
router.get('/', getEventsHandler);

/**
 * GET /api/events/:entityType/:entityId
 * Get all events for a specific entity
 */
router.get('/:entityType/:entityId', getEntityEventsHandler);

/**
 * Block PUT and PATCH requests to events
 * Events are immutable and cannot be updated
 */
router.put('/:id', blockEventUpdate);
router.patch('/:id', blockEventUpdate);

/**
 * Block DELETE requests to events
 * Events are immutable and cannot be deleted
 */
router.delete('/:id', blockEventDelete);

export default router;
