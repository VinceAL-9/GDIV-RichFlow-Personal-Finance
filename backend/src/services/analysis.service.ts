/**
 * Analysis Service - Orchestration Layer
 * 
 * This service is responsible for data fetching (Prisma queries) and
 * delegating to domain functions for state reconstruction and metrics.
 * 
 * Domain logic has been extracted to:
 * - src/domain/financial/reducers.ts (pure state reducers)
 * - src/domain/financial/metrics.ts (financial calculations)
 */

import prisma from '../config/database.config.js';
import { createEmptyQuadrantTotals, determineIncomeQuadrant } from '../utils/incomeQuadrant.utils.js';
import { getEventsByUser } from './event.service.js';
import { EntityType, ActionType, Event } from '../types/event.types.js';

// Import domain functions
import {
  FinancialState,
  createEmptyState,
  rootReducer,
  reconstructStateFromEvents,
  hydrateStateFromSnapshot,
  serializeStateForSnapshot
} from '../domain/financial/reducers.js';

import {
  FinancialHealth,
  calculateFinancialHealth,
  calculateSnapshotFromState
} from '../domain/financial/metrics.js';

// Re-export types for consumers
export type { FinancialState, FinancialHealth };

/**
 * Get the first day of a month for a given date
 */
function getFirstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Check if two dates represent the same month (year + month)
 */
function isSameMonth(date1: Date, date2: Date): boolean {
  return date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth();
}

/**
 * Ensure monthly checkpoints exist for a user from account creation to now
 * This is a self-healing mechanism that fills gaps in snapshot history
 * to limit event replay depth for long-term users (5+ years of data)
 */
export async function ensureMonthlyCheckpoints(userId: number): Promise<void> {
  // 1. Get user creation date and currency
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { PreferredCurrency: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const userCreatedAt = user.createdAt;
  const now = new Date();

  // 2. Find the latest existing snapshot to use as cursor (optimization)
  const latestSnapshot = await prisma.financialSnapshot.findFirst({
    where: { userId },
    orderBy: { date: 'desc' }
  });

  // Determine the starting point for checkpoint creation
  // Use the month AFTER the latest snapshot, or user creation month if no snapshots
  let cursorDate: Date;
  if (latestSnapshot) {
    const snapshotDate = new Date(latestSnapshot.date);
    // Move to the first of the NEXT month after the snapshot
    cursorDate = new Date(Date.UTC(snapshotDate.getUTCFullYear(), snapshotDate.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  } else {
    // Start from the first of the month of user creation
    cursorDate = getFirstOfMonth(userCreatedAt);
  }

  // 3. Get all existing snapshot dates for this user to avoid duplicates
  const existingSnapshots = await prisma.financialSnapshot.findMany({
    where: { userId },
    select: { date: true }
  });

  const existingSnapshotMonths = new Set(
    existingSnapshots.map((s: any) => {
      const d = new Date(s.date);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    })
  );

  // 4. Calculate the first of the current month as the end boundary
  const currentMonthFirst = getFirstOfMonth(now);

  // If cursor is already past or at current month, no checkpoints needed
  if (cursorDate >= currentMonthFirst) {
    return;
  }

  // 5. Collect missing months
  const missingMonths: Date[] = [];
  let checkDate = new Date(cursorDate);

  while (checkDate < currentMonthFirst) {
    const monthKey = `${checkDate.getUTCFullYear()}-${checkDate.getUTCMonth()}`;
    if (!existingSnapshotMonths.has(monthKey)) {
      missingMonths.push(new Date(checkDate));
    }
    // Move to next month
    checkDate = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  }

  // If no missing months, return early
  if (missingMonths.length === 0) {
    return;
  }

  // 6. Fetch all events for this user (needed for reconstruction)
  const events = await getEventsByUser({ userId, limit: 100000 });
  const typedEvents = events as unknown as Event[];

  // Sort events chronologically
  typedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Determine initial currency
  let initialCurrency = {
    symbol: user.PreferredCurrency?.cur_symbol || '$',
    name: user.PreferredCurrency?.cur_name || 'USD'
  };

  // Check for first currency update event to get original currency
  const firstCurrencyEvent = typedEvents.find(e =>
    e.entityType === EntityType.USER &&
    e.actionType === ActionType.UPDATE &&
    e.beforeValue &&
    (typeof e.beforeValue === 'string' ? JSON.parse(e.beforeValue).currencyCode : (e.beforeValue as any).currencyCode)
  );

  if (firstCurrencyEvent && firstCurrencyEvent.beforeValue) {
    const before = typeof firstCurrencyEvent.beforeValue === 'string'
      ? JSON.parse(firstCurrencyEvent.beforeValue)
      : firstCurrencyEvent.beforeValue;

    if (before.currencyCode) {
      initialCurrency = {
        symbol: before.currencyCode,
        name: before.currencyName || before.currencyCode
      };
    }
  }

  // 7. Use incremental reconstruction for efficiency
  // Find the best starting point (latest snapshot before first missing month)
  let state: FinancialState;
  let eventIndex = 0;

  const baseSnapshot = await prisma.financialSnapshot.findFirst({
    where: {
      userId,
      date: { lt: missingMonths[0]! }
    },
    orderBy: { date: 'desc' }
  });

  if (baseSnapshot) {
    state = hydrateStateFromSnapshot(baseSnapshot.data);
    const snapshotDate = new Date(baseSnapshot.date);

    // Find first event after the base snapshot
    eventIndex = typedEvents.findIndex(e => new Date(e.timestamp) > snapshotDate);
    if (eventIndex === -1) eventIndex = typedEvents.length;
  } else {
    // Start from scratch
    state = createEmptyState(initialCurrency);
  }

  // 8. Iterate through missing months and create snapshots
  const snapshotsToCreate: { userId: number; date: Date; data: any }[] = [];

  for (const targetDate of missingMonths) {
    // Apply events up to this target date
    while (eventIndex < typedEvents.length && new Date(typedEvents[eventIndex]!.timestamp) <= targetDate) {
      state = rootReducer(state, typedEvents[eventIndex]!);
      eventIndex++;
    }

    // Serialize and queue for creation
    snapshotsToCreate.push({
      userId,
      date: targetDate,
      data: serializeStateForSnapshot(state)
    });
  }

  // 9. Batch insert all missing snapshots
  if (snapshotsToCreate.length > 0) {
    await prisma.financialSnapshot.createMany({
      data: snapshotsToCreate,
      skipDuplicates: true
    });
  }
}

/**
 * Get current financial snapshot from database (no event replay)
 */
async function getCurrentFinancialSnapshot(userId: number) {
  // Get user's preferred currency
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { PreferredCurrency: true }
  });

  const currency = {
    symbol: user?.PreferredCurrency?.cur_symbol || '$',
    name: user?.PreferredCurrency?.cur_name || 'USD'
  };

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

  // Construct Current FinancialState object for Health Calculation
  const currentState: FinancialState = {
    assets: new Map(balanceSheet?.Asset.map((a: any) => [a.id, { id: a.id, name: a.name, value: Number(a.value) }]) || []),
    liabilities: new Map(balanceSheet?.Liability.map((l: any) => [l.id, { id: l.id, name: l.name, value: Number(l.value) }]) || []),
    incomeLines: new Map(incomeStatement?.IncomeLine.map((i: any) => [i.id, { id: i.id, name: i.name, amount: Number(i.amount), type: i.type, quadrant: i.quadrant }]) || []),
    expenses: new Map(incomeStatement?.Expense.map((e: any) => [e.id, { id: e.id, name: e.name, amount: Number(e.amount) }]) || []),
    cashSavings: Number(cashSavings?.amount) || 0,
    currency
  };

  // Fetch events to reconstruct past states for trends
  const events = await getEventsByUser({ userId, limit: 100000 });
  const now = new Date();
  const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

  // Cast events to Event[] since we know they match our type
  const typedEvents = events as unknown as Event[];

  const prevMonthState = reconstructStateFromEvents(typedEvents, oneMonthAgo, currency);
  const sixMonthAgoState = reconstructStateFromEvents(typedEvents, sixMonthsAgo, currency);

  const financialHealth = calculateFinancialHealth(currentState, prevMonthState, sixMonthAgoState);

  // Calculate balance sheet totals
  const totalAssets = balanceSheet?.Asset.reduce((sum: number, asset: any) => sum + Number(asset.value), 0) || 0;
  const totalLiabilities = balanceSheet?.Liability.reduce((sum: number, liability: any) => sum + Number(liability.value), 0) || 0;
  const totalCashBalance = Number(cashSavings?.amount) || 0;
  const netWorth = totalAssets - totalLiabilities + totalCashBalance;

  // Income by type (case-insensitive matching)
  const earnedIncome = incomeStatement?.IncomeLine.filter((i: any) => i.type.toUpperCase() === 'EARNED').reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
  const passiveIncome = incomeStatement?.IncomeLine.filter((i: any) => i.type.toUpperCase() === 'PASSIVE').reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
  const portfolioIncome = incomeStatement?.IncomeLine.filter((i: any) => i.type.toUpperCase() === 'PORTFOLIO').reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
  const totalIncome = earnedIncome + passiveIncome + portfolioIncome;

  const totalExpenses = incomeStatement?.Expense.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0) || 0;
  const netCashflow = totalIncome - totalExpenses;

  // Combined passive income (passive + portfolio) for freedom calculations
  // Portfolio income from investments also generates money without active work
  const combinedPassiveIncome = passiveIncome + portfolioIncome;

  // Calculate ratios
  // Passive coverage now includes portfolio income since it also contributes to financial freedom
  const passiveCoverageRatio = totalExpenses > 0 ? (combinedPassiveIncome / totalExpenses) * 100 : 0;
  const savingsRate = totalIncome > 0 ? (netCashflow / totalIncome) * 100 : 0;

  // --- RichFlow Metrics ---

  // 1. Wealth Velocity (Net Worth Change vs Previous Month)
  let wealthVelocity = 0;
  let wealthVelocityPct = 0;

  if (prevMonthState) {
    const prevAssets = Array.from(prevMonthState.assets.values()).reduce((sum, a) => sum + a.value, 0);
    const prevLiabilities = Array.from(prevMonthState.liabilities.values()).reduce((sum, l) => sum + l.value, 0);
    const prevCash = prevMonthState.cashSavings;
    const prevNetWorth = prevAssets - prevLiabilities + prevCash;

    wealthVelocity = netWorth - prevNetWorth;
    if (prevNetWorth !== 0) {
      wealthVelocityPct = (wealthVelocity / Math.abs(prevNetWorth)) * 100;
    } else if (netWorth !== 0) {
      wealthVelocityPct = netWorth > 0 ? 100 : -100;
    }
  }

  // 2. Solvency Ratio (Liabilities / Assets)
  const totalAssetsWithCash = totalAssets + totalCashBalance;
  const solvencyRatio = totalAssetsWithCash > 0 ? (totalLiabilities / totalAssetsWithCash) * 100 : 0;

  // 3. Freedom Gap (Expenses - Combined Passive Income)
  // Portfolio income is included since it also generates income without active work
  const freedomGap = totalExpenses - combinedPassiveIncome;

  // Income quadrant distribution
  const quadrantTotals = createEmptyQuadrantTotals();
  incomeStatement?.IncomeLine?.forEach((line: any) => {
    const bucket = determineIncomeQuadrant(line.type, line.quadrant);
    quadrantTotals[bucket] += Number(line.amount);
  });

  const qEmployee = Number(quadrantTotals.EMPLOYEE);
  const qSelf = Number(quadrantTotals.SELF_EMPLOYED);
  const qBus = Number(quadrantTotals.BUSINESS_OWNER);
  const qInv = Number(quadrantTotals.INVESTOR);

  const incomeQuadrantData = {
    EMPLOYEE: { amount: qEmployee, pct: totalIncome > 0 ? (qEmployee / totalIncome) * 100 : 0 },
    SELF_EMPLOYED: { amount: qSelf, pct: totalIncome > 0 ? (qSelf / totalIncome) * 100 : 0 },
    BUSINESS_OWNER: { amount: qBus, pct: totalIncome > 0 ? (qBus / totalIncome) * 100 : 0 },
    INVESTOR: { amount: qInv, pct: totalIncome > 0 ? (qInv / totalIncome) * 100 : 0 },
    total: totalIncome
  };

  return {
    date: new Date().toISOString().substring(0, 10),
    currency,
    balanceSheet: {
      totalCashBalance: Number(totalCashBalance),
      totalCash: Number(totalCashBalance),
      totalInvestedAssets: Number(totalAssets),
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
    richFlowMetrics: {
      wealthVelocity: Number(wealthVelocity),
      wealthVelocityPct: Number(wealthVelocityPct.toFixed(2)),
      solvencyRatio: Number(solvencyRatio.toFixed(2)),
      freedomGap: Number(freedomGap)
    },
    incomeQuadrant: incomeQuadrantData,
    financialHealth
  };
}

/**
 * Create a financial snapshot for the user at the current time
 * This serves as a checkpoint for faster future calculations
 */
export async function createSnapshot(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { PreferredCurrency: true }
  });

  if (!user) throw new Error('User not found');

  const events = await getEventsByUser({ userId, limit: 100000 });
  const typedEvents = events as unknown as Event[];

  // Sort events
  typedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Determine initial currency
  let initialCurrency = {
    symbol: user.PreferredCurrency?.cur_symbol || '$',
    name: user.PreferredCurrency?.cur_name || 'USD'
  };

  // Check for currency update events
  const firstCurrencyEvent = typedEvents.find(e =>
    e.entityType === EntityType.USER &&
    e.actionType === ActionType.UPDATE &&
    (e.beforeValue && (typeof e.beforeValue === 'string' ? JSON.parse(e.beforeValue).currencyCode : e.beforeValue.currencyCode))
  );

  if (firstCurrencyEvent && firstCurrencyEvent.beforeValue) {
    const before = typeof firstCurrencyEvent.beforeValue === 'string'
      ? JSON.parse(firstCurrencyEvent.beforeValue)
      : firstCurrencyEvent.beforeValue;

    if (before.currencyCode) {
      initialCurrency = {
        symbol: before.currencyCode,
        name: before.currencyName || before.currencyCode
      };
    }
  }

  const now = new Date();
  const state = reconstructStateFromEvents(typedEvents, now, initialCurrency);

  // Serialize state
  const snapshotData = serializeStateForSnapshot(state);

  // Save to DB
  await prisma.financialSnapshot.create({
    data: {
      userId,
      date: now,
      data: snapshotData
    }
  });
}

/**
 * Get financial snapshot - either current state or reconstructed point-in-time state
 * Uses "Snapshot + Delta" pattern: queries for the latest snapshot first,
 * then only fetches events after the snapshot date to reduce memory usage.
 */
export const getFinancialSnapshot = async (userId: number, date?: string) => {
  // If no date specified, return current state from database
  if (!date) {
    return await getCurrentFinancialSnapshot(userId);
  }

  // Parse target date as end-of-day UTC for the provided YYYY-MM-DD
  const targetDate = (() => {
    // If date includes time, use native Date parsing
    if (date.length > 10) return new Date(date);
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return new Date(date);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  })();
  const now = new Date();

  // If target date is in the future or today, return current state
  if (targetDate >= now) {
    return await getCurrentFinancialSnapshot(userId);
  }

  // For historical dates, get user info first
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, PreferredCurrency: true }
  });

  // Determine initial currency (needed for fallback full replay)
  const firstCurrencyEvent = await prisma.event.findFirst({
    where: {
      userId,
      entityType: EntityType.USER,
      actionType: ActionType.UPDATE
    },
    orderBy: { timestamp: 'asc' }
  });

  let initialCurrency = {
    symbol: user?.PreferredCurrency?.cur_symbol || '$',
    name: user?.PreferredCurrency?.cur_name || 'USD'
  };

  if (firstCurrencyEvent && firstCurrencyEvent.beforeValue) {
    const before = typeof firstCurrencyEvent.beforeValue === 'string'
      ? JSON.parse(firstCurrencyEvent.beforeValue)
      : firstCurrencyEvent.beforeValue;

    if (before && before.currencyCode) {
      initialCurrency = {
        symbol: before.currencyCode,
        name: before.currencyName || before.currencyCode
      };
    }
  }

  // ============================================================
  // SNAPSHOT + DELTA PATTERN: Query snapshot FIRST, then fetch
  // only the events we need (delta events after the snapshot).
  // ============================================================

  // Step 1: Find the latest snapshot before or on the target date
  const latestSnapshot = await prisma.financialSnapshot.findFirst({
    where: {
      userId,
      date: { lte: targetDate }
    },
    orderBy: { date: 'desc' }
  });

  let state: FinancialState;
  let allEvents: Event[] = []; // For trend calculations

  if (latestSnapshot) {
    // Step 2a: Hydrate state from snapshot
    state = hydrateStateFromSnapshot(latestSnapshot.data);
    const snapshotDate = new Date(latestSnapshot.date);

    // Step 2b: Fetch ONLY delta events (after snapshot, up to targetDate)
    const deltaEvents = await prisma.event.findMany({
      where: {
        userId,
        timestamp: {
          gt: snapshotDate,
          lte: targetDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Step 2c: Apply delta events to hydrated state
    state = (deltaEvents as unknown as Event[]).reduce(rootReducer, state);

    // For trend calculations, we still need events for past states
    // Fetch events from account creation to targetDate for trend reconstruction
    const queryParams: any = {
      userId,
      endDate: targetDate,
      limit: 100000
    };
    if (user?.createdAt) {
      queryParams.startDate = user.createdAt;
    }
    allEvents = (await getEventsByUser(queryParams)) as unknown as Event[];
  } else {
    // Step 3: No snapshot exists - fall back to full event replay
    const queryParams: any = {
      userId,
      endDate: targetDate,
      limit: 100000
    };
    if (user?.createdAt) {
      queryParams.startDate = user.createdAt;
    }
    allEvents = (await getEventsByUser(queryParams)) as unknown as Event[];
    state = reconstructStateFromEvents(allEvents, targetDate, initialCurrency);
  }

  // Reconstruct past states for trends (needed for financial health calculation)
  const oneMonthAgo = new Date(targetDate); oneMonthAgo.setMonth(targetDate.getMonth() - 1);
  const sixMonthsAgo = new Date(targetDate); sixMonthsAgo.setMonth(targetDate.getMonth() - 6);

  const prevMonthState = reconstructStateFromEvents(allEvents, oneMonthAgo, initialCurrency);
  const sixMonthAgoState = reconstructStateFromEvents(allEvents, sixMonthsAgo, initialCurrency);

  const financialHealth = calculateFinancialHealth(state, prevMonthState, sixMonthAgoState);

  return calculateSnapshotFromState(state, targetDate, financialHealth, prevMonthState);
};

/**
 * Get financial trajectory over time - returns historical snapshots for velocity and freedom tracking
 * This enables visualization of the "Freedom Gap" over time
 */
export const getFinancialTrajectory = async (
  userId: number,
  startDate: string,
  endDate: string,
  interval: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<any[]> => {
  // Self-healing: Ensure monthly checkpoints exist before generating trajectory
  // This limits event replay depth for long-term users (5+ years of data)
  await ensureMonthlyCheckpoints(userId);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const trajectoryPoints: any[] = [];

  // Calculate date intervals based on interval type
  const incrementDate = (date: Date): Date => {
    const newDate = new Date(date);
    switch (interval) {
      case 'daily':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    return newDate;
  };

  // Fetch ALL events from beginning to ensure correct state reconstruction
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { PreferredCurrency: true }
  });

  const queryParams: any = {
    userId,
    endDate: end,
    limit: 100000
  };

  if (user?.createdAt) {
    queryParams.startDate = user.createdAt;
  }

  const events = await getEventsByUser(queryParams);
  const typedEvents = events as unknown as Event[];

  // Ensure events are sorted chronologically
  typedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const initialCurrency = (() => {
    // Default to current if no history
    let currency = user?.PreferredCurrency
      ? { symbol: user.PreferredCurrency.cur_symbol, name: user.PreferredCurrency.cur_name }
      : { symbol: '$', name: 'USD' };

    // Try to find the first currency update to get the original currency
    const firstCurrencyEvent = typedEvents.find(e =>
      e.entityType === EntityType.USER &&
      e.actionType === ActionType.UPDATE &&
      e.beforeValue &&
      (typeof e.beforeValue === 'string' ? JSON.parse(e.beforeValue).currencyCode : e.beforeValue.currencyCode)
    );

    if (firstCurrencyEvent && firstCurrencyEvent.beforeValue) {
      const before = typeof firstCurrencyEvent.beforeValue === 'string'
        ? JSON.parse(firstCurrencyEvent.beforeValue)
        : firstCurrencyEvent.beforeValue;

      if (before.currencyCode) {
        currency = {
          symbol: before.currencyCode,
          name: before.currencyName || before.currencyCode
        };
      }
    }
    return currency;
  })();

  // Initialize state
  let state: FinancialState = createEmptyState(initialCurrency);

  let currentDate = new Date(start);
  let eventIndex = 0;

  // OPTIMIZATION: Check for snapshots
  // Find the latest snapshot before the start date
  const latestSnapshot = await prisma.financialSnapshot.findFirst({
    where: {
      userId,
      date: { lte: start }
    },
    orderBy: { date: 'desc' }
  });

  if (latestSnapshot) {
    state = hydrateStateFromSnapshot(latestSnapshot.data);
    const snapshotDate = new Date(latestSnapshot.date);

    // Find the index of the first event after the snapshot
    eventIndex = typedEvents.findIndex(e => new Date(e.timestamp) > snapshotDate);
    if (eventIndex === -1) eventIndex = typedEvents.length; // No events after snapshot
  }

  // Incremental state reconstruction
  while (currentDate <= end) {
    // Apply new events since last check
    while (eventIndex < typedEvents.length && new Date(typedEvents[eventIndex]!.timestamp) <= currentDate) {
      // Use rootReducer for incremental updates
      state = rootReducer(state, typedEvents[eventIndex]!);
      eventIndex++;
    }

    // Calculate metrics from current state
    const totalAssets = Array.from(state.assets.values()).reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = Array.from(state.liabilities.values()).reduce((sum, liability) => sum + liability.value, 0);
    const totalCash = state.cashSavings;
    const netWorth = totalAssets - totalLiabilities + totalCash;

    const incomeLines = Array.from(state.incomeLines.values());
    const passiveIncome = incomeLines
      .filter(i => i.type.toUpperCase() === 'PASSIVE')
      .reduce((sum, i) => sum + i.amount, 0);
    const portfolioIncome = incomeLines
      .filter(i => i.type.toUpperCase() === 'PORTFOLIO')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalIncome = incomeLines.reduce((sum, i) => sum + i.amount, 0);

    // Combined passive income (passive + portfolio) for freedom calculations
    // Portfolio income from investments also generates money without active work
    const combinedPassiveIncome = passiveIncome + portfolioIncome;

    const totalExpenses = Array.from(state.expenses.values()).reduce((sum, expense) => sum + expense.amount, 0);
    const netCashflow = totalIncome - totalExpenses;

    // Freedom Gap = Monthly Expenses - Combined Passive Income
    // Portfolio income is included since it also generates income without active work
    const freedomGap = totalExpenses - combinedPassiveIncome;

    // Wealth Velocity = Net Cashflow / Net Worth (if positive net worth)
    const wealthVelocity = netWorth > 0 ? (netCashflow / netWorth) : 0;

    // Asset Efficiency = (Passive + Portfolio) / Total Invested Assets
    const assetEfficiency = totalAssets > 0
      ? ((passiveIncome + portfolioIncome) / totalAssets) * 100
      : 0;

    // Income Quadrant Breakdown
    const quadrantTotals = createEmptyQuadrantTotals();
    incomeLines.forEach(line => {
      const bucket = determineIncomeQuadrant(line.type, line.quadrant);
      quadrantTotals[bucket] += line.amount;
    });

    // Derive net worth delta
    let netWorthDelta = 0;
    if (trajectoryPoints.length > 0) {
      const prev = trajectoryPoints[trajectoryPoints.length - 1];
      netWorthDelta = netWorth - prev.netWorth;
    }

    trajectoryPoints.push({
      date: currentDate.toISOString().split('T')[0],
      netWorth,
      netWorthDelta,
      passiveIncome,
      portfolioIncome,
      totalExpenses,
      freedomGap,
      wealthVelocity: wealthVelocity * 100,
      assetEfficiency,
      netCashflow,
      totalIncome,
      incomeQuadrant: quadrantTotals,
      currency: state.currency.symbol
    });

    currentDate = incrementDate(currentDate);
  }

  return trajectoryPoints;
};

// ============================================================================
// Tiered Analysis Engine - Polymorphic Response Based on Subscription
// ============================================================================

import {
  AnalysisResponse,
  StandardSnapshot,
  AdvancedMetrics,
  DebtComposition,
  AssetEfficiency,
  AssetBreakdownItem,
  AssetWithRelations,
  LiabilityWithAssetLink
} from '../types/analysis.types.js';

/**
 * Get analysis snapshot with tier-based response
 * 
 * This function performs a "Topological Sort" of financial data:
 * 1. Fetch assets with their linked income lines and liabilities
 * 2. Classify debt (Good vs Bad) and assets (Productive vs Stagnant)
 * 3. Gate advanced metrics based on subscription tier
 * 
 * @param userId - The user's ID
 * @returns AnalysisResponse with standard data for all, advanced for PRO only
 */
export async function getAnalysisSnapshot(userId: number): Promise<AnalysisResponse> {
  // Step 1: Fetch user with subscription tier and preferred currency
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { PreferredCurrency: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isPro = user.subscriptionTier === 'PRO';
  const currency = {
    symbol: user.PreferredCurrency?.cur_symbol || '$',
    name: user.PreferredCurrency?.cur_name || 'USD'
  };

  // Step 2: Fetch balance sheet with assets including their linked items
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Asset: {
        include: {
          linkedIncomeLines: true,
          linkedLiabilities: true
        }
      },
      Liability: true
    }
  });

  // Step 3: Fetch cash savings
  const cashSavings = await prisma.cashSavings.findFirst({
    where: { userId }
  });

  // Step 4: Fetch income statement for passive income calculation
  const incomeStatement = await prisma.incomeStatement.findFirst({
    where: { userId },
    include: {
      IncomeLine: true,
      Expense: true
    }
  });

  // Extract data with proper typing
  const assets: AssetWithRelations[] = (balanceSheet?.Asset || []).map((asset: {
    id: number;
    name: string;
    value: unknown;
    linkedIncomeLines: Array<{ id: number; name: string; amount: unknown; type: string }>;
    linkedLiabilities: Array<{ id: number; name: string; value: unknown }>;
  }) => ({
    id: asset.id,
    name: asset.name,
    value: Number(asset.value),
    linkedIncomeLines: asset.linkedIncomeLines.map((il: { id: number; name: string; amount: unknown; type: string }) => ({
      id: il.id,
      name: il.name,
      amount: Number(il.amount),
      type: il.type
    })),
    linkedLiabilities: asset.linkedLiabilities.map((ll: { id: number; name: string; value: unknown }) => ({
      id: ll.id,
      name: ll.name,
      value: Number(ll.value)
    }))
  }));

  const liabilities: LiabilityWithAssetLink[] = (balanceSheet?.Liability || []).map((liability: {
    id: number;
    name: string;
    value: unknown;
    assetId: number | null;
  }) => ({
    id: liability.id,
    name: liability.name,
    value: Number(liability.value),
    assetId: liability.assetId
  }));

  const totalCash = Number(cashSavings?.amount) || 0;

  // ========================================================================
  // CLASSIFICATION LOGIC (Topological Sort)
  // ========================================================================

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.value, 0);
  const netWorth = totalAssets - totalLiabilities + totalCash;

  // Build StandardSnapshot (available to all tiers)
  const standard: StandardSnapshot = {
    totalAssets,
    totalLiabilities,
    netWorth,
    totalCash,
    currency,
    asOfDate: new Date().toISOString().split('T')[0]!
  };

  // ========================================================================
  // TIER GATE: FREE users get standard only, PRO users get advanced metrics
  // ========================================================================

  if (!isPro) {
    return {
      standard,
      advanced: null,
      isPro: false,
      tier: 'FREE'
    };
  }

  // ========================================================================
  // PRO-ONLY: Advanced Metrics Calculation
  // ========================================================================

  // --- Debt Classification ---
  // Good Debt: Liability where assetId is NOT null (tied to income-producing asset)
  // Bad Debt: Liability where assetId IS null (consumer debt)
  const goodDebt = liabilities
    .filter(l => l.assetId !== null)
    .reduce((sum, l) => sum + l.value, 0);
  
  const badDebt = liabilities
    .filter(l => l.assetId === null)
    .reduce((sum, l) => sum + l.value, 0);

  const debtComposition: DebtComposition = {
    goodDebt,
    badDebt,
    goodDebtRatio: totalLiabilities > 0 ? (goodDebt / totalLiabilities) * 100 : 0,
    badDebtRatio: totalLiabilities > 0 ? (badDebt / totalLiabilities) * 100 : 0
  };

  // --- Asset Classification ---
  // Productive Asset: Asset where incomeLines.length > 0
  // Stagnant Asset: Asset where incomeLines.length === 0
  const productiveAssets = assets.filter(a => a.linkedIncomeLines.length > 0);
  const stagnantAssets = assets.filter(a => a.linkedIncomeLines.length === 0);

  const productiveAssetsValue = productiveAssets.reduce((sum, a) => sum + a.value, 0);
  const stagnantAssetsValue = stagnantAssets.reduce((sum, a) => sum + a.value, 0);

  const assetEfficiency: AssetEfficiency = {
    productiveAssets: productiveAssetsValue,
    stagnantAssets: stagnantAssetsValue,
    productiveAssetCount: productiveAssets.length,
    stagnantAssetCount: stagnantAssets.length,
    productivityRatio: totalAssets > 0 ? (productiveAssetsValue / totalAssets) * 100 : 0
  };

  // --- Advanced Metrics Calculation ---
  
  // Calculate income totals
  const incomeLines = incomeStatement?.IncomeLine || [];
  const expenses = incomeStatement?.Expense || [];
  
  const totalMonthlyIncome = incomeLines.reduce((sum: number, i: { amount: unknown }) => sum + Number(i.amount), 0);
  const totalMonthlyExpenses = expenses.reduce((sum: number, e: { amount: unknown }) => sum + Number(e.amount), 0);
  
  const passiveIncome = incomeLines
    .filter((i: { type: string }) => i.type.toUpperCase() === 'PASSIVE')
    .reduce((sum: number, i: { amount: unknown }) => sum + Number(i.amount), 0);
  
  const portfolioIncome = incomeLines
    .filter((i: { type: string }) => i.type.toUpperCase() === 'PORTFOLIO')
    .reduce((sum: number, i: { amount: unknown }) => sum + Number(i.amount), 0);
  
  const combinedPassiveIncome = passiveIncome + portfolioIncome;

  // Debt Service Ratio = Total Liabilities / Total Monthly Income
  // (Simplified: using total liability value as proxy for monthly debt service)
  // In a more sophisticated system, this would use actual monthly payment amounts
  const debtServiceRatio = totalMonthlyIncome > 0 
    ? (totalLiabilities * 0.01) / totalMonthlyIncome  // Assume ~1% of debt as monthly service
    : 0;

  // Passive Runway = Cash / (Monthly Expenses - Monthly Passive Income)
  // Returns Infinity if passive income >= expenses (financially free)
  const monthlyGap = totalMonthlyExpenses - combinedPassiveIncome;
  const passiveRunway = monthlyGap <= 0 
    ? Infinity  // Financially free - passive income covers expenses
    : totalCash / monthlyGap;

  // Passive Income Crossover Date Estimation
  // Based on current trajectory, estimate when passive income will equal expenses
  let passiveIncomeCrossoverDate: string | null = null;
  
  if (combinedPassiveIncome >= totalMonthlyExpenses) {
    // Already achieved financial freedom
    passiveIncomeCrossoverDate = null; // Already crossed over
  } else if (combinedPassiveIncome > 0 && productiveAssetsValue > 0) {
    // Estimate based on historical growth (simplified: assume 10% annual passive income growth)
    const monthlyGrowthRate = 0.10 / 12; // 10% annual = ~0.83% monthly
    const monthsToFreedom = monthlyGap > 0 && monthlyGrowthRate > 0
      ? Math.log(totalMonthlyExpenses / combinedPassiveIncome) / Math.log(1 + monthlyGrowthRate)
      : null;
    
    if (monthsToFreedom !== null && monthsToFreedom > 0 && monthsToFreedom < 600) { // Cap at 50 years
      const crossoverDate = new Date();
      crossoverDate.setMonth(crossoverDate.getMonth() + Math.ceil(monthsToFreedom));
      passiveIncomeCrossoverDate = crossoverDate.toISOString().split('T')[0]!;
    }
  }

  // --- Asset Breakdown with True Yield ---
  const assetBreakdown: AssetBreakdownItem[] = assets.map(asset => {
    const linkedIncomeTotal = asset.linkedIncomeLines.reduce((sum, il) => sum + il.amount, 0);
    const linkedLiabilityTotal = asset.linkedLiabilities.reduce((sum, ll) => sum + ll.value, 0);
    
    // True Yield = (Annual Income - Annual Debt Service) / Asset Value * 100
    // Simplified: assume liability value * 5% as annual debt service cost
    const annualIncome = linkedIncomeTotal * 12;
    const annualDebtService = linkedLiabilityTotal * 0.05;
    const trueYield = asset.value > 0 
      ? ((annualIncome - annualDebtService) / asset.value) * 100 
      : 0;

    return {
      assetId: asset.id,
      assetName: asset.name,
      assetValue: asset.value,
      isProductive: asset.linkedIncomeLines.length > 0,
      linkedIncomeTotal,
      linkedIncomeCount: asset.linkedIncomeLines.length,
      linkedLiabilityTotal,
      linkedLiabilityCount: asset.linkedLiabilities.length,
      trueYield
    };
  });

  const advanced: AdvancedMetrics = {
    debtComposition,
    assetEfficiency,
    metrics: {
      debtServiceRatio,
      passiveRunway,
      passiveIncomeCrossoverDate
    },
    assetBreakdown
  };

  return {
    standard,
    advanced,
    isPro: true,
    tier: 'PRO'
  };
}