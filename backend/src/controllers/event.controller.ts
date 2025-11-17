import { Request, Response, NextFunction } from 'express';
import {
  getEventsByUser,
  getEventsByEntity,
  getEventCount
} from '../services/event.service';
import { EntityType } from '../types/event.types';

/**
 * Get all events for the authenticated user
 * @route GET /api/events
 * Query params: entityType, startDate, endDate, limit, offset
 */
export async function getEventsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Parse query parameters
    const entityType = req.query.entityType as EntityType | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    // Validate entity type if provided
    if (entityType && !Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entity type. Must be one of: INCOME, EXPENSE, ASSET, LIABILITY'
      });
    }

    const events = await getEventsByUser({
      userId,
      ...(entityType && { entityType }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      limit,
      offset
    });

    const totalCount = await getEventCount(userId, entityType);

    return res.status(200).json({
      events,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + events.length < totalCount
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get events for a specific entity
 * @route GET /api/events/:entityType/:entityId
 */
export async function getEntityEventsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entityType = req.params.entityType as EntityType;
    const entityId = parseInt(String(req.params.entityId), 10);

    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    // Validate entity type
    if (!Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entity type. Must be one of: INCOME, EXPENSE, ASSET, LIABILITY'
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const events = await getEventsByEntity({
      userId,
      entityType,
      entityId,
      limit,
      offset
    });

    return res.status(200).json({
      events,
      entityType,
      entityId
    });
  } catch (error) {
    console.error('Get entity events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Block any attempt to update events
 * Events are immutable and cannot be modified
 */
export async function blockEventUpdate(req: Request, res: Response) {
  return res.status(403).json({
    error: 'Events are immutable and cannot be updated'
  });
}

/**
 * Block any attempt to delete events
 * Events are immutable and cannot be deleted
 */
export async function blockEventDelete(req: Request, res: Response) {
  return res.status(403).json({
    error: 'Events are immutable and cannot be deleted'
  });
}
