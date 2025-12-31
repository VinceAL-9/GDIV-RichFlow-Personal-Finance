import React from 'react';
import type { AssetPerformanceData, PerformanceLevel } from '../../types/trueYield.types';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/currency.utils';

interface TrueYieldCardProps {
  data: AssetPerformanceData;
  onUpgrade?: () => void;
}

/**
 * Get color classes based on performance level
 */
const getPerformanceColor = (level: PerformanceLevel): string => {
  switch (level) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-green-400';
    case 'fair':
      return 'text-yellow-400';
    case 'poor':
      return 'text-red-400';
    case 'locked':
      return 'text-gray-400';
  }
};

/**
 * Get background gradient based on performance level
 */
const getPerformanceGradient = (level: PerformanceLevel): string => {
  switch (level) {
    case 'excellent':
      return 'from-emerald-500/20 to-green-500/10';
    case 'good':
      return 'from-green-500/20 to-emerald-500/10';
    case 'fair':
      return 'from-yellow-500/20 to-orange-500/10';
    case 'poor':
      return 'from-red-500/20 to-rose-500/10';
    case 'locked':
      return 'from-gray-500/20 to-gray-600/10';
  }
};

/**
 * Format percentage for display
 */
const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  if (!Number.isFinite(value)) return '∞';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * Format ratio for display
 */
const formatRatio = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  if (!Number.isFinite(value)) return '∞';
  return value.toFixed(2);
};

/**
 * TrueYieldCard Component
 * 
 * Displays asset performance metrics for PRO users
 * Shows a blurred/locked view for FREE users with upgrade CTA
 */
const TrueYieldCard: React.FC<TrueYieldCardProps> = ({ data, onUpgrade }) => {
  const { currency } = useCurrency();
  const { isPro, asset, linkedIncomeLines, linkedLiabilities, metrics, summary } = data;

  // Locked/Blurred view for FREE tier
  if (!isPro) {
    return (
      <div className="rf-card relative overflow-hidden">
        {/* Header */}
        <div className="rf-section-header-sm mb-4">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            True Yield Analysis
          </span>
        </div>

        {/* Blurred Content */}
        <div className="relative">
          {/* Placeholder metrics (blurred) */}
          <div className="filter blur-md select-none pointer-events-none">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-[#2a2a2a] rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Cap Rate</div>
                <div className="text-lg font-bold text-emerald-400">+8.5%</div>
              </div>
              <div className="p-3 bg-[#2a2a2a] rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Cash-on-Cash</div>
                <div className="text-lg font-bold text-green-400">+12.3%</div>
              </div>
              <div className="p-3 bg-[#2a2a2a] rounded-lg">
                <div className="text-xs text-gray-400 mb-1">DSCR</div>
                <div className="text-lg font-bold text-emerald-400">1.45</div>
              </div>
              <div className="p-3 bg-[#2a2a2a] rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Net Income</div>
                <div className="text-lg font-bold text-green-400">$24,000</div>
              </div>
            </div>
          </div>

          {/* Lock Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]/80 rounded-lg">
            <div className="p-4 rounded-full bg-linear-to-br from-purple-500/30 to-purple-700/30 mb-3">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium mb-2">PRO Feature</p>
            <p className="text-gray-500 text-sm text-center px-4 mb-4">
              Unlock detailed performance metrics and AI insights
            </p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-6 py-2 bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
              >
                Upgrade to PRO
              </button>
            )}
          </div>
        </div>

        {/* Linked Items Summary (visible to FREE users) */}
        <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
          <p className="text-xs text-gray-500 mb-2">Your linked data is being tracked:</p>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-400">
              <span className="text-emerald-400 font-medium">{linkedIncomeLines.length}</span> income streams
            </span>
            <span className="text-gray-400">
              <span className="text-red-400 font-medium">{linkedLiabilities.length}</span> liabilities
            </span>
          </div>
        </div>
      </div>
    );
  }

  // PRO view with full metrics
  const performanceColor = getPerformanceColor(summary.performanceLevel);
  const performanceGradient = getPerformanceGradient(summary.performanceLevel);

  return (
    <div className={`rf-card bg-linear-to-br ${performanceGradient}`}>
      {/* Header */}
      <div className="rf-section-header-sm mb-4">
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          True Yield Analysis
          <span className="ml-2 px-2 py-0.5 text-xs bg-purple-500/30 rounded-full">PRO</span>
        </span>
      </div>

      {/* Performance Summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{asset.name}</h3>
          <p className="text-sm text-gray-400">
            Value: {formatCurrency(asset.value, currency)}
          </p>
        </div>
        <div className={`text-right ${performanceColor}`}>
          <div className="text-xs uppercase tracking-wide">Performance</div>
          <div className="text-lg font-bold capitalize">{summary.performanceLevel}</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Cap Rate */}
          <div className="p-3 bg-[#1a1a1a]/60 rounded-lg border border-[#2a2a2a]">
            <div className="text-xs text-gray-400 mb-1">Cap Rate</div>
            <div className={`text-lg font-bold ${metrics.capRate >= 6 ? 'text-emerald-400' : metrics.capRate >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {formatPercent(metrics.capRate)}
            </div>
            <div className="text-xs text-gray-500">NOI / Asset Value</div>
          </div>

          {/* Cash-on-Cash Return */}
          <div className="p-3 bg-[#1a1a1a]/60 rounded-lg border border-[#2a2a2a]">
            <div className="text-xs text-gray-400 mb-1">Cash-on-Cash Return</div>
            <div className={`text-lg font-bold ${metrics.cashOnCashReturn >= 8 ? 'text-emerald-400' : metrics.cashOnCashReturn >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {formatPercent(metrics.cashOnCashReturn)}
            </div>
            <div className="text-xs text-gray-500">Net Cashflow / Equity</div>
          </div>

          {/* Debt Service Coverage Ratio */}
          <div className="p-3 bg-[#1a1a1a]/60 rounded-lg border border-[#2a2a2a]">
            <div className="text-xs text-gray-400 mb-1">DSCR</div>
            <div className={`text-lg font-bold ${
              metrics.debtServiceCoverageRatio === null 
                ? 'text-emerald-400' 
                : metrics.debtServiceCoverageRatio >= 1.25 
                  ? 'text-emerald-400' 
                  : metrics.debtServiceCoverageRatio >= 1 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
            }`}>
              {metrics.debtServiceCoverageRatio === null ? 'No Debt' : formatRatio(metrics.debtServiceCoverageRatio)}
            </div>
            <div className="text-xs text-gray-500">NOI / Debt Service</div>
          </div>

          {/* Net Annual Cashflow */}
          <div className="p-3 bg-[#1a1a1a]/60 rounded-lg border border-[#2a2a2a]">
            <div className="text-xs text-gray-400 mb-1">Net Annual Cashflow</div>
            <div className={`text-lg font-bold ${metrics.netAnnualCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(metrics.netAnnualCashflow, currency)}
            </div>
            <div className="text-xs text-gray-500">After debt service</div>
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {metrics && (
        <div className="p-3 bg-[#1a1a1a]/60 rounded-lg border border-[#2a2a2a] mb-4">
          <div className="text-xs text-gray-400 mb-2 font-medium">Financial Breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Annual Gross Income</span>
              <span className="text-emerald-400 font-medium">{formatCurrency(metrics.annualGrossIncome, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Net Operating Income</span>
              <span className="text-green-400 font-medium">{formatCurrency(metrics.netOperatingIncome, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Annual Debt Service</span>
              <span className="text-red-400 font-medium">-{formatCurrency(metrics.annualDebtService, currency)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#2a2a2a]">
              <span className="text-gray-300 font-medium">Equity</span>
              <span className="text-purple-400 font-medium">{formatCurrency(metrics.equity, currency)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Linked Items */}
      <div className="space-y-3 mb-4">
        {/* Linked Income */}
        {linkedIncomeLines.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">Linked Income Streams</div>
            <div className="flex flex-wrap gap-2">
              {linkedIncomeLines.map((income) => (
                <span
                  key={income.id}
                  className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30"
                >
                  {income.name} ({formatCurrency(income.amount, currency)}/mo)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Linked Liabilities */}
        {linkedLiabilities.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">Linked Liabilities</div>
            <div className="flex flex-wrap gap-2">
              {linkedLiabilities.map((liability) => (
                <span
                  key={liability.id}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-md border border-red-500/30"
                >
                  {liability.name} ({formatCurrency(liability.value, currency)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      <div className="p-3 bg-linear-to-r from-purple-500/10 to-purple-700/10 rounded-lg border border-purple-500/20">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <div className="text-xs text-purple-400 font-medium mb-1">AI Insight</div>
            <p className="text-sm text-gray-300">{summary.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrueYieldCard;
