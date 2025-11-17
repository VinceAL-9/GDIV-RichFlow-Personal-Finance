/**
 * Frontend Event Types for Time-Machine Event Logging
 * Matches backend event types
 */

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum EntityType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY'
}

export enum IncomeSubtype {
  EARNED = 'EARNED',        // Employee income
  PORTFOLIO = 'PORTFOLIO',  // Portfolio/investment income
  PASSIVE = 'PASSIVE'       // Passive income
}

export interface EventData {
  name?: string;
  amount?: number;
  value?: number;
  type?: string;
  [key: string]: any;
}

export interface Event {
  id: number;
  timestamp: string; // ISO date string
  actionType: ActionType;
  entityType: EntityType;
  entitySubtype: string | null;
  beforeValue: string | null; // JSON string
  afterValue: string | null;  // JSON string
  userId: number;
  entityId: number;
}

export interface ParsedEvent extends Omit<Event, 'beforeValue' | 'afterValue' | 'timestamp'> {
  beforeValue: EventData | null;
  afterValue: EventData | null;
  timestamp: Date;
}

export interface EventsResponse {
  events: Event[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface EntityEventsResponse {
  events: Event[];
  entityType: EntityType;
  entityId: number;
}

/**
 * Helper function to parse event data from JSON strings
 */
export function parseEvent(event: Event): ParsedEvent {
  return {
    ...event,
    beforeValue: event.beforeValue ? JSON.parse(event.beforeValue) : null,
    afterValue: event.afterValue ? JSON.parse(event.afterValue) : null,
    timestamp: new Date(event.timestamp)
  };
}

/**
 * Helper function to format event for display
 */
export function formatEventDescription(event: ParsedEvent): string {
  const entityName = event.entityType.toLowerCase();
  
  switch (event.actionType) {
    case ActionType.CREATE:
      return `Created ${entityName}: ${event.afterValue?.name || 'Unknown'}`;
    case ActionType.UPDATE:
      return `Updated ${entityName}: ${event.afterValue?.name || 'Unknown'}`;
    case ActionType.DELETE:
      return `Deleted ${entityName}: ${event.beforeValue?.name || 'Unknown'}`;
    default:
      return `${event.actionType} ${entityName}`;
  }
}

/**
 * Helper function to get value change description
 */
export function getValueChange(event: ParsedEvent): string | null {
  if (event.actionType === ActionType.CREATE) {
    const amount = event.afterValue?.amount || event.afterValue?.value;
    return amount ? `+${amount}` : null;
  }
  
  if (event.actionType === ActionType.DELETE) {
    const amount = event.beforeValue?.amount || event.beforeValue?.value;
    return amount ? `-${amount}` : null;
  }
  
  if (event.actionType === ActionType.UPDATE) {
    const beforeAmount = event.beforeValue?.amount || event.beforeValue?.value;
    const afterAmount = event.afterValue?.amount || event.afterValue?.value;
    
    if (beforeAmount !== undefined && afterAmount !== undefined) {
      const diff = afterAmount - beforeAmount;
      return diff > 0 ? `+${diff}` : `${diff}`;
    }
  }
  
  return null;
}
