/**
 * Event Types for Time-Machine Event Logging
 * 
 * These types define immutable financial action events
 */

/**
 * Interface compatible with Prisma's Decimal type
 * Used to avoid direct import of Prisma runtime modules
 */
export interface DecimalLike {
  toNumber(): number;
  toString(): string;
}

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LINK = 'LINK',
  UNLINK = 'UNLINK'
}

export enum EntityType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  CASH_SAVINGS = 'CASH_SAVINGS',
  USER = 'USER'
}

export enum IncomeSubtype {
  EARNED = 'EARNED',        // Employee income
  PORTFOLIO = 'PORTFOLIO',  // Portfolio/investment income
  PASSIVE = 'PASSIVE'       // Passive income
}

export interface EventData {
  name?: string;
  amount?: number | DecimalLike;
  value?: number | DecimalLike;
  type?: string;
  [key: string]: any;
}

export interface CreateEventParams {
  actionType: ActionType;
  entityType: EntityType;
  entitySubtype?: string | null;
  beforeValue?: EventData | null;
  afterValue?: EventData | null;
  userId: number;
  entityId: number;
}

export interface Event {
  id: number;
  timestamp: Date;
  actionType: string;
  entityType: string;
  entitySubtype: string | null;
  beforeValue: any | null;
  afterValue: any | null;
  userId: number;
  entityId: number;
}

export interface EventQueryParams {
  userId?: number;
  entityType?: EntityType;
  entityId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  search?: string;
}
