import prisma from '../config/database.config';
import { createEmptyQuadrantTotals, determineIncomeQuadrant } from '../utils/incomeQuadrant.utils';
import { getEventsByUser } from './event.service';
import { EntityType, ActionType } from '../types/event.types';

/**
 * Represents the reconstructed financial state at a point in time
 */
interface FinancialState {
  assets: Map<number, { id: number; name: string; value: number }>;
  liabilities: Map<number, { id: number; name: string; value: number }>;
  incomeLines: Map<number, { id: number; name: string; amount: number; type: string; quadrant?: string | null }>;
  expenses: Map<number, { id: number; name: string; amount: number }>;
  cashSavings: number;
}

/**
 * Reconstruct financial state by replaying events up to a target date
 * 
 * Expected Behavior:
 * ✅ Query all events from account creation up to target date
 * ✅ Filter events: timestamp <= targetDate
 * ✅ Start with empty state (or initial state)
 * ✅ Replay events in chronological order:
 *    - CREATE events → Add entities
 *    - UPDATE events → Modify entities
 *    - DELETE events → Remove entities
 * ✅ Return reconstructed state for that specific date
 */
async function reconstructFinancialStateAtDate(userId: number, targetDate: Date): Promise<FinancialState> {
  // ✅ Query all events up to the target date (timestamp <= targetDate)
  const events = await getEventsByUser({
    userId,
    endDate: targetDate,
    limit: 100000 // Get all events
  });

  // ✅ Start with empty state (initial state)
  const state: FinancialState = {
    assets: new Map(),
    liabilities: new Map(),
    incomeLines: new Map(),
    expenses: new Map(),
    cashSavings: 0
  };

  // ✅ Sort events chronologically (oldest first) for replay
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Replay each event to reconstruct state
  for (const event of events) {
    const afterValue = event.afterValue ? JSON.parse(event.afterValue) : null;
    const beforeValue = event.beforeValue ? JSON.parse(event.beforeValue) : null;

    switch (event.entityType) {
      case EntityType.ASSET:
        handleAssetEvent(state, event.actionType as ActionType, event.entityId, afterValue, beforeValue);
        break;

      case EntityType.LIABILITY:
        handleLiabilityEvent(state, event.actionType as ActionType, event.entityId, afterValue, beforeValue);
        break;

      case EntityType.INCOME:
        // Skip INCOME_STATEMENT creation events
        if (event.entitySubtype === 'INCOME_STATEMENT') {
          break;
        }
        handleIncomeEvent(state, event.actionType as ActionType, event.entityId, afterValue, beforeValue);
        break;

      case EntityType.EXPENSE:
        handleExpenseEvent(state, event.actionType as ActionType, event.entityId, afterValue, beforeValue);
        break;

      case EntityType.CASH_SAVINGS:
        handleCashSavingsEvent(state, event.actionType as ActionType, afterValue, beforeValue);
        break;
    }
  }

  return state;
}

/**
 * Handle asset events (CREATE, UPDATE, DELETE)
 */
function handleAssetEvent(
  state: FinancialState,
  actionType: ActionType,
  entityId: number,
  afterValue: any,
  beforeValue: any
) {
  switch (actionType) {
    case ActionType.CREATE:
      if (afterValue) {
        state.assets.set(entityId, {
          id: entityId,
          name: afterValue.name,
          value: Number(afterValue.value)
        });
      }
      break;

    case ActionType.UPDATE:
      if (afterValue) {
        state.assets.set(entityId, {
          id: entityId,
          name: afterValue.name,
          value: Number(afterValue.value)
        });
      }
      break;

    case ActionType.DELETE:
      state.assets.delete(entityId);
      break;
  }
}

/**
 * Handle liability events (CREATE, UPDATE, DELETE)
 */
function handleLiabilityEvent(
  state: FinancialState,
  actionType: ActionType,
  entityId: number,
  afterValue: any,
  beforeValue: any
) {
  switch (actionType) {
    case ActionType.CREATE:
      if (afterValue) {
        state.liabilities.set(entityId, {
          id: entityId,
          name: afterValue.name,
          value: Number(afterValue.value)
        });
      }
      break;

    case ActionType.UPDATE:
      if (afterValue) {
        state.liabilities.set(entityId, {
          id: entityId,
          name: afterValue.name,
          value: Number(afterValue.value)
        });
      }
      break;

    case ActionType.DELETE:
      state.liabilities.delete(entityId);
      break;
  }
}

/**
 * Handle income line events (CREATE, UPDATE, DELETE)
 */
function handleIncomeEvent(
  state: FinancialState,
  actionType: ActionType,
  entityId: number,
  afterValue: any,
  beforeValue: any
) {
  switch (actionType) {
    case ActionType.CREATE:
      if (afterValue) {
        state.incomeLines.set(entityId, {
          id: entityId,
          name: afterValue.name,
          amount: Number(afterValue.amount),
          type: afterValue.type,
          quadrant: afterValue.quadrant || null
        });
      }
      break;

    case ActionType.UPDATE:
      if (afterValue) {
        state.incomeLines.set(entityId, {
          id: entityId,
          name: afterValue.name,
          amount: Number(afterValue.amount),
          type: afterValue.type,
          quadrant: afterValue.quadrant || null
        });
      }
      break;

    case ActionType.DELETE:
      state.incomeLines.delete(entityId);
      break;
  }
}

/**
 * Handle expense events (CREATE, UPDATE, DELETE)
 */
function handleExpenseEvent(
  state: FinancialState,
  actionType: ActionType,
  entityId: number,
  afterValue: any,
  beforeValue: any
) {
  switch (actionType) {
    case ActionType.CREATE:
      if (afterValue) {
        state.expenses.set(entityId, {
          id: entityId,
          name: afterValue.name,
          amount: Number(afterValue.amount)
        });
      }
      break;

    case ActionType.UPDATE:
      if (afterValue) {
        state.expenses.set(entityId, {
          id: entityId,
          name: afterValue.name,
          amount: Number(afterValue.amount)
        });
      }
      break;

    case ActionType.DELETE:
      state.expenses.delete(entityId);
      break;
  }
}

/**
 * Handle cash savings events (CREATE, UPDATE)
 */
function handleCashSavingsEvent(
  state: FinancialState,
  actionType: ActionType,
  afterValue: any,
  beforeValue: any
) {
  if (actionType === ActionType.CREATE || actionType === ActionType.UPDATE) {
    if (afterValue && afterValue.amount !== undefined) {
      state.cashSavings = Number(afterValue.amount);
    }
  }
}

/**
 * Calculate financial snapshot from reconstructed state
 */
function calculateSnapshotFromState(state: FinancialState, targetDate: Date) {
  // Calculate balance sheet totals
  const totalAssets = Array.from(state.assets.values()).reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = Array.from(state.liabilities.values()).reduce((sum, liability) => sum + liability.value, 0);
  const totalCashBalance = state.cashSavings;
  const netWorth = totalAssets - totalLiabilities + totalCashBalance;

  // Calculate income by type
  const incomeLines = Array.from(state.incomeLines.values());
  const earnedIncome = incomeLines
    .filter(i => i.type.toUpperCase() === 'EARNED')
    .reduce((sum, i) => sum + i.amount, 0);
  const passiveIncome = incomeLines
    .filter(i => i.type.toUpperCase() === 'PASSIVE')
    .reduce((sum, i) => sum + i.amount, 0);
  const portfolioIncome = incomeLines
    .filter(i => i.type.toUpperCase() === 'PORTFOLIO')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalIncome = earnedIncome + passiveIncome + portfolioIncome;

  // Calculate expenses
  const totalExpenses = Array.from(state.expenses.values()).reduce((sum, expense) => sum + expense.amount, 0);
  const netCashflow = totalIncome - totalExpenses;

  // Calculate ratios
  const passiveCoverageRatio = totalExpenses > 0 ? (passiveIncome / totalExpenses) * 100 : 0;
  const savingsRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

  // Income quadrant distribution
  const quadrantTotals = createEmptyQuadrantTotals();
  incomeLines.forEach(line => {
    const bucket = determineIncomeQuadrant(line.type, line.quadrant);
    quadrantTotals[bucket] += line.amount;
  });

  const incomeQuadrant = {
    EMPLOYEE: Number(quadrantTotals.EMPLOYEE),
    SELF_EMPLOYED: Number(quadrantTotals.SELF_EMPLOYED),
    BUSINESS_OWNER: Number(quadrantTotals.BUSINESS_OWNER),
    INVESTOR: Number(quadrantTotals.INVESTOR)
  };

  return {
    date: targetDate.toISOString().substring(0, 10),
    balanceSheet: {
      totalCashBalance: Number(totalCashBalance),
      totalAssets: Number(totalAssets),
      totalLiabilities: Number(totalLiabilities),
      netWorth: Number(netWorth)
    },
    cashflow: {
      earnedIncome: Number(earnedIncome),
      passiveIncome: Number(passiveIncome),
      portfolioIncome: Number(portfolioIncome),
      totalIncome: Number(totalIncome),
      totalExpenses: Number(totalExpenses),
      netCashflow: Number(netCashflow),
      direction: netCashflow >= 0 ? 'positive' : 'negative'
    },
    ratios: {
      passiveCoverageRatio: passiveCoverageRatio.toFixed(2),
      savingsRate: savingsRate.toFixed(2)
    },
    incomeQuadrant
  };
}

/**
 * Get current financial snapshot from database (no event replay)
 */
async function getCurrentFinancialSnapshot(userId: number) {
  // Get balance sheet data (current state)
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Asset: true,
      Liability: true
    }
  });

  // Get cash savings (current state)
  const cashSavings = await prisma.cashSavings.findFirst({
    where: { userId }
  });

  // Get income statement data (current state)
  const incomeStatement = await prisma.incomeStatement.findFirst({
    where: { userId },
    include: {
      Expense: true,
      IncomeLine: true
    }
  });

  // Calculate balance sheet totals
  const totalAssets = balanceSheet?.Asset.reduce((sum, asset) => sum + Number(asset.value), 0) || 0;
  const totalLiabilities = balanceSheet?.Liability.reduce((sum, liability) => sum + Number(liability.value), 0) || 0;
  const totalCashBalance = Number(cashSavings?.amount) || 0;
  const netWorth = totalAssets - totalLiabilities + totalCashBalance;

  // Income by type (case-insensitive matching)
  const earnedIncome = incomeStatement?.IncomeLine.filter(i => i.type.toUpperCase() === 'EARNED').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const passiveIncome = incomeStatement?.IncomeLine.filter(i => i.type.toUpperCase() === 'PASSIVE').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const portfolioIncome = incomeStatement?.IncomeLine.filter(i => i.type.toUpperCase() === 'PORTFOLIO').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const totalIncome = earnedIncome + passiveIncome + portfolioIncome;

  const totalExpenses = incomeStatement?.Expense.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
  const netCashflow = totalIncome - totalExpenses;

  // Calculate ratios
  const passiveCoverageRatio = totalExpenses > 0 ? (passiveIncome / totalExpenses) * 100 : 0;
  const savingsRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

  // Income quadrant distribution (Robert Kiyosaki's Cashflow Quadrant)
  const quadrantTotals = createEmptyQuadrantTotals();
  incomeStatement?.IncomeLine?.forEach(line => {
    const bucket = determineIncomeQuadrant(line.type, line.quadrant);
    quadrantTotals[bucket] += Number(line.amount);
  });

  const incomeQuadrant = {
    EMPLOYEE: Number(quadrantTotals.EMPLOYEE),
    SELF_EMPLOYED: Number(quadrantTotals.SELF_EMPLOYED),
    BUSINESS_OWNER: Number(quadrantTotals.BUSINESS_OWNER),
    INVESTOR: Number(quadrantTotals.INVESTOR)
  };

  return {
    date: new Date().toISOString().substring(0, 10),
    balanceSheet: {
      totalCashBalance: Number(totalCashBalance),
      totalAssets: Number(totalAssets),
      totalLiabilities: Number(totalLiabilities),
      netWorth: Number(netWorth)
    },
    cashflow: {
      earnedIncome: Number(earnedIncome),
      passiveIncome: Number(passiveIncome),
      portfolioIncome: Number(portfolioIncome),
      totalIncome: Number(totalIncome),
      totalExpenses: Number(totalExpenses),
      netCashflow: Number(netCashflow),
      direction: netCashflow >= 0 ? 'positive' : 'negative'
    },
    ratios: {
      passiveCoverageRatio: passiveCoverageRatio.toFixed(2),
      savingsRate: savingsRate.toFixed(2)
    },
    incomeQuadrant
  };
}

/**
 * Get financial snapshot - either current state or reconstructed point-in-time state
 */
export const getFinancialSnapshot = async (userId: number, date?: string) => {
  // If no date specified, return current state from database
  if (!date) {
    return await getCurrentFinancialSnapshot(userId);
  }

  // Parse target date - set to end of day to include all events on that date
  const targetDate = new Date(date);
  targetDate.setHours(23, 59, 59, 999);

  // For any specified date, reconstruct state from events
  // This ensures consistency and accuracy by replaying all events
  const state = await reconstructFinancialStateAtDate(userId, targetDate);
  return calculateSnapshotFromState(state, targetDate);
};
