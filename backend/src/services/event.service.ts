import prisma from '../config/database.config';
import {
  CreateEventParams,
  EventQueryParams,
  ActionType,
  EntityType,
  EventData
} from '../types/event.types';

/**
 * Create an immutable event log
 * This function should be called automatically whenever a financial action occurs
 */
export async function createEvent(params: CreateEventParams) {
  try {
    const {
      actionType,
      entityType,
      entitySubtype,
      beforeValue,
      afterValue,
      userId,
      entityId
    } = params;

    // Serialize values to JSON strings
    const beforeValueJson = beforeValue ? JSON.stringify(beforeValue) : null;
    const afterValueJson = afterValue ? JSON.stringify(afterValue) : null;

    const event = await prisma.event.create({
      data: {
        actionType,
        entityType,
        entitySubtype: entitySubtype || null,
        beforeValue: beforeValueJson,
        afterValue: afterValueJson,
        userId,
        entityId
      }
    });

    return event;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event log');
  }
}

/**
 * Get events for a specific user with optional filters
 */
export async function getEventsByUser(params: EventQueryParams) {
  const {
    userId,
    entityType,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = params;

  if (!userId) {
    throw new Error('userId is required');
  }

  const where: any = {
    userId
  };

  if (entityType) {
    where.entityType = entityType;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = startDate;
    }
    if (endDate) {
      where.timestamp.lte = endDate;
    }
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: {
      timestamp: 'desc'
    },
    take: limit,
    skip: offset
  });

  return events;
}

/**
 * Get events for a specific entity (e.g., all events for a specific income line)
 */
export async function getEventsByEntity(params: EventQueryParams) {
  const {
    userId,
    entityType,
    entityId,
    limit = 100,
    offset = 0
  } = params;

  if (!userId || !entityType || !entityId) {
    throw new Error('userId, entityType, and entityId are required');
  }

  const events = await prisma.event.findMany({
    where: {
      userId,
      entityType,
      entityId
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: limit,
    skip: offset
  });

  return events;
}

/**
 * Get total count of events for a user
 */
export async function getEventCount(userId: number, entityType?: EntityType): Promise<number> {
  const where: any = { userId };
  
  if (entityType) {
    where.entityType = entityType;
  }

  return await prisma.event.count({ where });
}

/**
 * Helper function to log income events
 */
export async function logIncomeEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  const subtype = afterValue?.type || beforeValue?.type || null;
  
  return await createEvent({
    actionType,
    entityType: EntityType.INCOME,
    entitySubtype: subtype,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

/**
 * Helper function to log expense events
 */
export async function logExpenseEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  return await createEvent({
    actionType,
    entityType: EntityType.EXPENSE,
    entitySubtype: null,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

/**
 * Helper function to log asset events
 */
export async function logAssetEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  return await createEvent({
    actionType,
    entityType: EntityType.ASSET,
    entitySubtype: null,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

/**
 * Helper function to log liability events
 */
export async function logLiabilityEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  return await createEvent({
    actionType,
    entityType: EntityType.LIABILITY,
    entitySubtype: null,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

// NOTE: Intentionally NO update or delete functions for events
// Events are immutable and can only be created and read
