/**
 * True Yield Engine Types
 * Types for asset performance metrics and linking functionality
 */

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
  /** Net Operating Income (Gross - Operating Expenses) */
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

export type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'locked';

export interface AssetPerformanceData {
  /** Whether user has PRO tier access */
  isPro: boolean;
  /** Asset details */
  asset: {
    id: number;
    name: string;
    value: number;
  };
  /** Linked income streams */
  linkedIncomeLines: LinkedIncomeLine[];
  /** Linked liabilities */
  linkedLiabilities: LinkedLiability[];
  /** Performance metrics (null for FREE tier) */
  metrics: AssetYieldMetrics | null;
  /** Summary for UI display */
  summary: {
    performanceLevel: PerformanceLevel;
    recommendation: string;
  };
}

export interface AssetYieldSummary {
  id: number;
  name: string;
  value: number;
  linkedIncomeCount: number;
  linkedLiabilityCount: number;
  hasLinkedItems: boolean;
}

export interface AssetsYieldSummaryResponse {
  isPro: boolean;
  assets: AssetYieldSummary[];
}

export type SubscriptionTier = 'FREE' | 'PRO';
