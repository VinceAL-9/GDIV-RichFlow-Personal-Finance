/**
 * Event Validation Schemas
 * 
 * Strict Zod schemas for validating beforeValue/afterValue JSON payloads
 * in the Event model, based on EntityType and ActionType.
 */

import { z } from 'zod';
import { EntityType, ActionType } from '../../types/event.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Decimal-compatible number schema
// Prisma Decimal objects are serialized as strings or objects, so we accept both
// ─────────────────────────────────────────────────────────────────────────────

const monetaryValueSchema = z.union([
    z.number().nonnegative(),
    // Prisma Decimal object (has toNumber method)
    z.object({}).passthrough(),
    // String representation of number
    z.string().refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number string'),
]);

// ─────────────────────────────────────────────────────────────────────────────
// Entity-specific payload schemas (for CREATE/UPDATE/DELETE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asset event payload: { name, value }
 */
export const AssetEventDataSchema = z.object({
    name: z.string().min(1, 'Asset name is required'),
    value: monetaryValueSchema,
});

/**
 * Liability event payload: { name, value }
 */
export const LiabilityEventDataSchema = z.object({
    name: z.string().min(1, 'Liability name is required'),
    value: monetaryValueSchema,
});

/**
 * Expense event payload: { name, amount }
 */
export const ExpenseEventDataSchema = z.object({
    name: z.string().min(1, 'Expense name is required'),
    amount: monetaryValueSchema,
});

/**
 * Income event payload: { name, amount, type, quadrant? }
 */
export const IncomeEventDataSchema = z.object({
    name: z.string().min(1, 'Income name is required'),
    amount: monetaryValueSchema,
    type: z.string().min(1, 'Income type is required'),
    quadrant: z.string().optional().nullable(),
});

/**
 * Cash Savings event payload: { amount }
 */
export const CashSavingsEventDataSchema = z.object({
    amount: monetaryValueSchema,
});

/**
 * User event payload: flexible for preference changes
 */
export const UserEventDataSchema = z.object({
    preferredCurrencyId: z.number().int().positive().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
}).passthrough(); // Allow additional fields for future user-related events

// ─────────────────────────────────────────────────────────────────────────────
// LINK/UNLINK event payload schemas (for True Yield Engine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asset-Income link event payload
 */
export const AssetIncomeLinkEventDataSchema = z.object({
    assetId: z.number().int().positive(),
    assetName: z.string().min(1),
    incomeLineId: z.number().int().positive(),
    incomeLineName: z.string().min(1),
    incomeLineAmount: z.number(),
});

/**
 * Asset-Liability link event payload
 */
export const AssetLiabilityLinkEventDataSchema = z.object({
    assetId: z.number().int().positive(),
    assetName: z.string().min(1),
    liabilityId: z.number().int().positive(),
    liabilityName: z.string().min(1),
    liabilityValue: z.number(),
});

/**
 * Combined link event schema (accepts either income or liability link)
 */
export const LinkEventDataSchema = z.union([
    AssetIncomeLinkEventDataSchema,
    AssetLiabilityLinkEventDataSchema,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Schema registry by EntityType (for CRUD operations)
// ─────────────────────────────────────────────────────────────────────────────

const eventDataSchemaMap: Record<EntityType, z.ZodSchema> = {
    [EntityType.ASSET]: AssetEventDataSchema,
    [EntityType.LIABILITY]: LiabilityEventDataSchema,
    [EntityType.EXPENSE]: ExpenseEventDataSchema,
    [EntityType.INCOME]: IncomeEventDataSchema,
    [EntityType.CASH_SAVINGS]: CashSavingsEventDataSchema,
    [EntityType.USER]: UserEventDataSchema,
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation function
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult<T> {
    success: true;
    data: T;
}

export interface ValidationError {
    success: false;
    error: string;
}

/**
 * Validates an event payload against the schema for the given EntityType and ActionType.
 * 
 * @param entityType - The type of entity (ASSET, LIABILITY, etc.)
 * @param payload - The payload to validate (beforeValue or afterValue)
 * @param actionType - Optional action type (LINK/UNLINK use different schemas)
 * @returns Parsed payload if valid, or throws descriptive error
 */
export function validateEventPayload<T = unknown>(
    entityType: EntityType,
    payload: unknown,
    actionType?: ActionType
): T {
    // Use link-specific schema for LINK/UNLINK actions
    if (actionType === ActionType.LINK || actionType === ActionType.UNLINK) {
        const result = LinkEventDataSchema.safeParse(payload);
        
        if (!result.success) {
            const errorMessages = result.error.issues
                .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
                .join('; ');
            throw new Error(`Invalid ${actionType} event payload: ${errorMessages}`);
        }
        
        return result.data as T;
    }
    
    // Use standard entity schema for CRUD operations
    const schema = eventDataSchemaMap[entityType];

    if (!schema) {
        throw new Error(`No validation schema found for entity type: ${entityType}`);
    }

    const result = schema.safeParse(payload);

    if (!result.success) {
        const errorMessages = result.error.issues
            .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
        throw new Error(`Invalid ${entityType} event payload: ${errorMessages}`);
    }

    return result.data as T;
}

/**
 * Validates event payloads without throwing, returns result object instead.
 * Useful when you want to handle validation errors gracefully.
 */
export function safeValidateEventPayload<T = unknown>(
    entityType: EntityType,
    payload: unknown,
    actionType?: ActionType
): ValidationResult<T> | ValidationError {
    try {
        const data = validateEventPayload<T>(entityType, payload, actionType);
        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown validation error'
        };
    }
}

// Export types for external use
export type AssetEventData = z.infer<typeof AssetEventDataSchema>;
export type LiabilityEventData = z.infer<typeof LiabilityEventDataSchema>;
export type ExpenseEventData = z.infer<typeof ExpenseEventDataSchema>;
export type IncomeEventData = z.infer<typeof IncomeEventDataSchema>;
export type CashSavingsEventData = z.infer<typeof CashSavingsEventDataSchema>;
export type UserEventData = z.infer<typeof UserEventDataSchema>;
export type AssetIncomeLinkEventData = z.infer<typeof AssetIncomeLinkEventDataSchema>;
export type AssetLiabilityLinkEventData = z.infer<typeof AssetLiabilityLinkEventDataSchema>;
export type LinkEventData = z.infer<typeof LinkEventDataSchema>;
