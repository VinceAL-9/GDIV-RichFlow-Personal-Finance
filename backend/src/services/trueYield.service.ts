/**
 * True Yield Engine Service
 * 
 * This service handles asset performance analytics including:
 * - Linking assets to income streams and liabilities
 * - Calculating Cap Rate, Cash-on-Cash Return, Debt Service Ratio
 * - Subscription tier-based access control (FREE vs PRO)
 * 
 * Event-sourced: All linking operations generate ASSET_LINKED events
 */

import prisma from '../config/database.config.js';
import { SubscriptionTier } from '../../generated/prisma/client.js';
import { createEvent, TransactionClient } from './event.service.js';
import { ActionType, EntityType } from '../types/event.types.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LinkedIncomeLine {
  id: number;
  name: string;
  amount: number;
  type: string;
}

export interface LinkedLiability {
  id: number;
  name: string;
  value: number;
}

export interface AssetYieldMetrics {
  /** Annual gross income from linked income streams */
  annualGrossIncome: number;
  /** Annual debt service (liability payments) */
  annualDebtService: number;
  /** Net Operating Income (Gross - Operating Expenses proxy) */
  netOperatingIncome: number;
  /** Cap Rate = NOI / Asset Value */
  capRate: number;
  /** Cash-on-Cash Return = Net Cashflow / Equity */
  cashOnCashReturn: number;
  /** Debt Service Coverage Ratio = NOI / Debt Service (null if no debt) */
  debtServiceCoverageRatio: number | null;
  /** Total equity (Asset Value - Liabilities) */
  equity: number;
  /** Net annual cashflow after debt service */
  netAnnualCashflow: number;
}

export interface AssetPerformanceResponse {
  /** Whether user has PRO tier access */
  isPro: boolean;
  /** Asset details */
  asset: {
    id: number;
    name: string;
    value: number;
  };
  /** Linked income streams (always visible) */
  linkedIncomeLines: LinkedIncomeLine[];
  /** Linked liabilities (always visible) */
  linkedLiabilities: LinkedLiability[];
  /** Performance metrics (null for FREE tier) */
  metrics: AssetYieldMetrics | null;
  /** Summary text for UI display */
  summary: {
    performanceLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'locked';
    recommendation: string;
  };
}

export interface LinkAssetToIncomeInput {
  assetId: number;
  incomeLineId: number;
}

export interface LinkAssetToLiabilityInput {
  assetId: number;
  liabilityId: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate performance level based on metrics
 */
function calculatePerformanceLevel(metrics: AssetYieldMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
  const { cashOnCashReturn, debtServiceCoverageRatio, capRate } = metrics;
  
  // If no debt, DSCR is null - treat as excellent for DSCR criteria (no debt is good)
  const effectiveDSCR = debtServiceCoverageRatio ?? Infinity;
  
  // Excellent: >12% CoC, >1.5 DSCR, >8% cap rate
  if (cashOnCashReturn >= 12 && effectiveDSCR >= 1.5 && capRate >= 8) {
    return 'excellent';
  }
  
  // Good: >8% CoC, >1.25 DSCR, >6% cap rate
  if (cashOnCashReturn >= 8 && effectiveDSCR >= 1.25 && capRate >= 6) {
    return 'good';
  }
  
  // Fair: >4% CoC, >1.0 DSCR, >4% cap rate
  if (cashOnCashReturn >= 4 && effectiveDSCR >= 1.0 && capRate >= 4) {
    return 'fair';
  }
  
  return 'poor';
}

/**
 * Generate recommendation based on performance level
 */
function generateRecommendation(level: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (level) {
    case 'excellent':
      return 'This asset is performing exceptionally well. Consider reinvesting returns or acquiring similar assets.';
    case 'good':
      return 'Solid performance. Look for opportunities to reduce operating costs or increase income.';
    case 'fair':
      return 'Average returns. Consider refinancing debt or finding ways to increase income.';
    case 'poor':
      return 'Below target returns. Evaluate if this asset aligns with your financial goals.';
  }
}

// ============================================================================
// Core Service Functions
// ============================================================================

/**
 * Get asset performance with tier-based access control
 * 
 * FREE tier: Returns structure (asset + linked items) but metrics are null
 * PRO tier: Returns full metrics and AI-powered insights
 */
export async function getAssetPerformance(
  userId: number,
  assetId: number
): Promise<AssetPerformanceResponse> {
  // 1. Get user with subscription tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. Get asset with linked income lines and liabilities
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    select: { id: true }
  });

  if (!balanceSheet) {
    throw new Error('Balance sheet not found');
  }

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      bsId: balanceSheet.id
    },
    include: {
      linkedIncomeLines: true,
      linkedLiabilities: true
    }
  });

  if (!asset) {
    throw new Error('Asset not found or does not belong to user');
  }

  // 3. Build linked items response (always visible)
  const linkedIncomeLines: LinkedIncomeLine[] = asset.linkedIncomeLines.map(income => ({
    id: income.id,
    name: income.name,
    amount: Number(income.amount),
    type: income.type
  }));

  const linkedLiabilities: LinkedLiability[] = asset.linkedLiabilities.map(liability => ({
    id: liability.id,
    name: liability.name,
    value: Number(liability.value)
  }));

  const assetValue = Number(asset.value);

  // 4. Check subscription tier
  const isPro = user.subscriptionTier === SubscriptionTier.PRO;

  // 5. For FREE tier, return structure without metrics
  if (!isPro) {
    return {
      isPro: false,
      asset: {
        id: asset.id,
        name: asset.name,
        value: assetValue
      },
      linkedIncomeLines,
      linkedLiabilities,
      metrics: null,
      summary: {
        performanceLevel: 'locked',
        recommendation: 'Upgrade to PRO to unlock detailed performance metrics and AI insights.'
      }
    };
  }

  // 6. For PRO tier, calculate full metrics
  // Annual Gross Income = Sum of all linked income streams (monthly * 12)
  const annualGrossIncome = linkedIncomeLines.reduce((sum, income) => sum + income.amount, 0) * 12;

  // Total linked liabilities
  const totalLinkedLiabilities = linkedLiabilities.reduce((sum, liability) => sum + liability.value, 0);

  // Estimate annual debt service (assuming ~8% annual rate for simplicity)
  // In a real app, this would come from liability details (interest rate, term, etc.)
  const annualDebtService = totalLinkedLiabilities * 0.08;

  // Net Operating Income (assume 70% operating expense ratio for real estate-like assets)
  // NOI = Gross Income - Operating Expenses (not debt)
  const operatingExpenseRatio = 0.30; // 30% of gross income goes to operating expenses
  const netOperatingIncome = annualGrossIncome * (1 - operatingExpenseRatio);

  // Cap Rate = NOI / Asset Value
  const capRate = assetValue > 0 ? (netOperatingIncome / assetValue) * 100 : 0;

  // Equity = Asset Value - Total Linked Liabilities
  const equity = assetValue - totalLinkedLiabilities;

  // Net Annual Cashflow = NOI - Debt Service
  const netAnnualCashflow = netOperatingIncome - annualDebtService;

  // Cash-on-Cash Return = Net Cashflow / Equity
  const cashOnCashReturn = equity > 0 ? (netAnnualCashflow / equity) * 100 : 0;

  // Debt Service Coverage Ratio = NOI / Annual Debt Service
  // Note: When no debt service, return null (JSON can't serialize Infinity)
  const debtServiceCoverageRatio = annualDebtService > 0 
    ? netOperatingIncome / annualDebtService 
    : null;

  const metrics: AssetYieldMetrics = {
    annualGrossIncome,
    annualDebtService,
    netOperatingIncome,
    capRate: Number(capRate.toFixed(2)),
    cashOnCashReturn: Number(cashOnCashReturn.toFixed(2)),
    debtServiceCoverageRatio: debtServiceCoverageRatio !== null ? Number(debtServiceCoverageRatio.toFixed(2)) : null,
    equity,
    netAnnualCashflow
  };

  const performanceLevel = calculatePerformanceLevel(metrics);
  const recommendation = generateRecommendation(performanceLevel);

  return {
    isPro: true,
    asset: {
      id: asset.id,
      name: asset.name,
      value: assetValue
    },
    linkedIncomeLines,
    linkedLiabilities,
    metrics,
    summary: {
      performanceLevel,
      recommendation
    }
  };
}

/**
 * Link an income line to an asset
 * Records ASSET_LINKED_TO_INCOME event for event sourcing
 */
export async function linkIncomeToAsset(
  userId: number,
  input: LinkAssetToIncomeInput
): Promise<void> {
  const { assetId, incomeLineId } = input;

  await prisma.$transaction(async (tx) => {
    // 1. Verify asset belongs to user
    const balanceSheet = await tx.balanceSheet.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!balanceSheet) {
      throw new Error('Balance sheet not found');
    }

    const asset = await tx.asset.findFirst({
      where: {
        id: assetId,
        bsId: balanceSheet.id
      }
    });

    if (!asset) {
      throw new Error('Asset not found or does not belong to user');
    }

    // 2. Verify income line belongs to user
    const incomeStatement = await tx.incomeStatement.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!incomeStatement) {
      throw new Error('Income statement not found');
    }

    const incomeLine = await tx.incomeLine.findFirst({
      where: {
        id: incomeLineId,
        isId: incomeStatement.id
      }
    });

    if (!incomeLine) {
      throw new Error('Income line not found or does not belong to user');
    }

    // 3. Update income line with asset link
    await tx.incomeLine.update({
      where: { id: incomeLineId },
      data: { assetId }
    });

    // 4. Log event for event sourcing
    await createEvent({
      actionType: ActionType.LINK,
      entityType: EntityType.ASSET,
      entitySubtype: 'INCOME_LINK',
      userId,
      entityId: assetId,
      beforeValue: null,
      afterValue: {
        assetId,
        assetName: asset.name,
        incomeLineId,
        incomeLineName: incomeLine.name,
        incomeLineAmount: Number(incomeLine.amount)
      }
    }, tx as unknown as TransactionClient);
  });
}

/**
 * Unlink an income line from an asset
 */
export async function unlinkIncomeFromAsset(
  userId: number,
  incomeLineId: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Verify income line belongs to user and get current link
    const incomeStatement = await tx.incomeStatement.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!incomeStatement) {
      throw new Error('Income statement not found');
    }

    const incomeLine = await tx.incomeLine.findFirst({
      where: {
        id: incomeLineId,
        isId: incomeStatement.id
      },
      include: { LinkedAsset: true }
    });

    if (!incomeLine) {
      throw new Error('Income line not found or does not belong to user');
    }

    if (!incomeLine.assetId) {
      throw new Error('Income line is not linked to any asset');
    }

    const previousAssetId = incomeLine.assetId;
    const previousAssetName = incomeLine.LinkedAsset?.name || 'Unknown';

    // 2. Remove the link
    await tx.incomeLine.update({
      where: { id: incomeLineId },
      data: { assetId: null }
    });

    // 3. Log event
    await createEvent({
      actionType: ActionType.UNLINK,
      entityType: EntityType.ASSET,
      entitySubtype: 'INCOME_UNLINK',
      userId,
      entityId: previousAssetId,
      beforeValue: {
        assetId: previousAssetId,
        assetName: previousAssetName,
        incomeLineId,
        incomeLineName: incomeLine.name,
        incomeLineAmount: Number(incomeLine.amount)
      },
      afterValue: null
    }, tx as unknown as TransactionClient);
  });
}

/**
 * Link a liability to an asset (e.g., mortgage to rental property)
 */
export async function linkLiabilityToAsset(
  userId: number,
  input: LinkAssetToLiabilityInput
): Promise<void> {
  const { assetId, liabilityId } = input;

  await prisma.$transaction(async (tx) => {
    // 1. Verify asset belongs to user
    const balanceSheet = await tx.balanceSheet.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!balanceSheet) {
      throw new Error('Balance sheet not found');
    }

    const asset = await tx.asset.findFirst({
      where: {
        id: assetId,
        bsId: balanceSheet.id
      }
    });

    if (!asset) {
      throw new Error('Asset not found or does not belong to user');
    }

    // 2. Verify liability belongs to user
    const liability = await tx.liability.findFirst({
      where: {
        id: liabilityId,
        bsId: balanceSheet.id
      }
    });

    if (!liability) {
      throw new Error('Liability not found or does not belong to user');
    }

    // 3. Update liability with asset link
    await tx.liability.update({
      where: { id: liabilityId },
      data: { assetId }
    });

    // 4. Log event
    await createEvent({
      actionType: ActionType.LINK,
      entityType: EntityType.ASSET,
      entitySubtype: 'LIABILITY_LINK',
      userId,
      entityId: assetId,
      beforeValue: null,
      afterValue: {
        assetId,
        assetName: asset.name,
        liabilityId,
        liabilityName: liability.name,
        liabilityValue: Number(liability.value)
      }
    }, tx as unknown as TransactionClient);
  });
}

/**
 * Unlink a liability from an asset
 */
export async function unlinkLiabilityFromAsset(
  userId: number,
  liabilityId: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Verify liability belongs to user
    const balanceSheet = await tx.balanceSheet.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (!balanceSheet) {
      throw new Error('Balance sheet not found');
    }

    const liability = await tx.liability.findFirst({
      where: {
        id: liabilityId,
        bsId: balanceSheet.id
      },
      include: { LinkedAsset: true }
    });

    if (!liability) {
      throw new Error('Liability not found or does not belong to user');
    }

    if (!liability.assetId) {
      throw new Error('Liability is not linked to any asset');
    }

    const previousAssetId = liability.assetId;
    const previousAssetName = liability.LinkedAsset?.name || 'Unknown';

    // 2. Remove the link
    await tx.liability.update({
      where: { id: liabilityId },
      data: { assetId: null }
    });

    // 3. Log event
    await createEvent({
      actionType: ActionType.UNLINK,
      entityType: EntityType.ASSET,
      entitySubtype: 'LIABILITY_UNLINK',
      userId,
      entityId: previousAssetId,
      beforeValue: {
        assetId: previousAssetId,
        assetName: previousAssetName,
        liabilityId,
        liabilityName: liability.name,
        liabilityValue: Number(liability.value)
      },
      afterValue: null
    }, tx as unknown as TransactionClient);
  });
}

/**
 * Get all assets with their yield summary for the dashboard
 */
export async function getAssetsWithYieldSummary(userId: number): Promise<{
  isPro: boolean;
  assets: Array<{
    id: number;
    name: string;
    value: number;
    linkedIncomeCount: number;
    linkedLiabilityCount: number;
    hasLinkedItems: boolean;
  }>;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Asset: {
        include: {
          linkedIncomeLines: { select: { id: true } },
          linkedLiabilities: { select: { id: true } }
        }
      }
    }
  });

  if (!balanceSheet) {
    return {
      isPro: user.subscriptionTier === SubscriptionTier.PRO,
      assets: []
    };
  }

  const assets = balanceSheet.Asset.map(asset => ({
    id: asset.id,
    name: asset.name,
    value: Number(asset.value),
    linkedIncomeCount: asset.linkedIncomeLines.length,
    linkedLiabilityCount: asset.linkedLiabilities.length,
    hasLinkedItems: asset.linkedIncomeLines.length > 0 || asset.linkedLiabilities.length > 0
  }));

  return {
    isPro: user.subscriptionTier === SubscriptionTier.PRO,
    assets
  };
}

/**
 * Get available income lines for linking (not yet linked to any asset)
 */
export async function getAvailableIncomeLines(userId: number): Promise<LinkedIncomeLine[]> {
  const incomeStatement = await prisma.incomeStatement.findFirst({
    where: { userId },
    include: {
      IncomeLine: {
        where: { assetId: null }
      }
    }
  });

  if (!incomeStatement) {
    return [];
  }

  return incomeStatement.IncomeLine.map(income => ({
    id: income.id,
    name: income.name,
    amount: Number(income.amount),
    type: income.type
  }));
}

/**
 * Get available liabilities for linking (not yet linked to any asset)
 */
export async function getAvailableLiabilities(userId: number): Promise<LinkedLiability[]> {
  const balanceSheet = await prisma.balanceSheet.findFirst({
    where: { userId },
    include: {
      Liability: {
        where: { assetId: null }
      }
    }
  });

  if (!balanceSheet) {
    return [];
  }

  return balanceSheet.Liability.map(liability => ({
    id: liability.id,
    name: liability.name,
    value: Number(liability.value)
  }));
}
