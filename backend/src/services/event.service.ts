import prisma from '../config/database.config.js';
import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import {
  CreateEventParams,
  EventQueryParams,
  ActionType,
  EntityType,
  EventData
} from '../types/event.types.js';
import { validateEventPayload } from '../domain/schemas/event.schema.js';

// Transaction client type for use in prisma.$transaction
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Create an immutable event log
 * This function should be called automatically whenever a financial action occurs
 * @param params - Event creation parameters
 * @param tx - Optional transaction client for atomic operations
 */
export async function createEvent(
  params: CreateEventParams,
  tx?: TransactionClient
) {
  const db = tx ?? prisma;

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

    // Validate payloads against Zod schemas (pass actionType for LINK/UNLINK)
    if (beforeValue !== null && beforeValue !== undefined) {
      validateEventPayload(entityType, beforeValue, actionType as ActionType);
    }
    if (afterValue !== null && afterValue !== undefined) {
      validateEventPayload(entityType, afterValue, actionType as ActionType);
    }

    const event = await db.event.create({
      data: {
        actionType,
        entityType,
        entitySubtype: entitySubtype || null,
        beforeValue: beforeValue ?? Prisma.DbNull,
        afterValue: afterValue ?? Prisma.DbNull,
        userId,
        entityId
      } as any
    });

    return event;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error instanceof Error ? error : new Error('Failed to create event log');
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
    offset = 0,
    search
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

  if (search) {
    where.OR = [
      { entityType: { contains: search, mode: 'insensitive' } },
      { actionType: { contains: search, mode: 'insensitive' } },
      // Search within JSON 'name' field
      {
        afterValue: {
          path: ['name'],
          string_contains: search
        }
      },
      {
        beforeValue: {
          path: ['name'],
          string_contains: search
        }
      }
    ];
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
export async function getEventCount(userId: number, entityType?: EntityType, search?: string): Promise<number> {
  const where: any = { userId };

  if (entityType) {
    where.entityType = entityType;
  }

  if (search) {
    where.OR = [
      { entityType: { contains: search, mode: 'insensitive' } },
      { actionType: { contains: search, mode: 'insensitive' } },
      {
        afterValue: {
          path: ['name'],
          string_contains: search
        }
      },
      {
        beforeValue: {
          path: ['name'],
          string_contains: search
        }
      }
    ];
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
 * @param tx - Optional transaction client for atomic operations
 */
export async function logAssetEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData,
  tx?: TransactionClient
) {
  return await createEvent(
    {
      actionType,
      entityType: EntityType.ASSET,
      entitySubtype: null,
      beforeValue: beforeValue || null,
      afterValue: afterValue || null,
      userId,
      entityId
    },
    tx
  );
}

/**
 * Helper function to log liability events
 * @param tx - Optional transaction client for atomic operations
 */
export async function logLiabilityEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData,
  tx?: TransactionClient
) {
  return await createEvent(
    {
      actionType,
      entityType: EntityType.LIABILITY,
      entitySubtype: null,
      beforeValue: beforeValue || null,
      afterValue: afterValue || null,
      userId,
      entityId
    },
    tx
  );
}

/**
 * Helper function to log cash savings events
 */
export async function logCashSavingsEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  return await createEvent({
    actionType,
    entityType: EntityType.CASH_SAVINGS,
    entitySubtype: null,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

/**
 * Helper function to log user account events
 */
export async function logUserEvent(
  actionType: ActionType,
  userId: number,
  entityId: number,
  beforeValue?: EventData,
  afterValue?: EventData
) {
  return await createEvent({
    actionType,
    entityType: EntityType.USER,
    entitySubtype: null,
    beforeValue: beforeValue || null,
    afterValue: afterValue || null,
    userId,
    entityId
  });
}

// NOTE: Intentionally NO update or delete functions for events
// Events are immutable and can only be created and read
