/**
 * Event Types for Time-Machine Event Logging
 * 
 * These types define immutable financial action events
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
  LIABILITY = 'LIABILITY',
  CASH_SAVINGS = 'CASH_SAVINGS'
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
  beforeValue: string | null;
  afterValue: string | null;
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
}
