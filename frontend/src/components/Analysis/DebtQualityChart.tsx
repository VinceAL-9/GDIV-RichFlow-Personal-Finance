import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import LockedAnalysisCard from './LockedAnalysisCard';
import type { AdvancedMetrics } from '../../types/analysis.types';
import type { Currency } from '../../types/currency.types';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/currency.utils';

interface DebtQualityChartProps {
  /** Advanced metrics data (null for FREE users) */
  data: AdvancedMetrics | null;
  /** Whether the user has PRO subscription */
  isPro: boolean;
  /** Optional: Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

// Chart colors
const COLORS = {
  goodDebt: '#10b981', // Emerald-500 (Green)
  badDebt: '#ef4444',  // Red-500
  goodDebtGradient: ['#10b981', '#059669'],
  badDebtGradient: ['#ef4444', '#dc2626'],
};

// Phantom/fake data for FREE users
const PHANTOM_DATA = {
  goodDebt: 60000,
  badDebt: 40000,
  goodDebtRatio: 60,
  badDebtRatio: 40,
};

/**
 * Custom Tooltip Component
 */
interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    fill: string;
    percentage: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currency: Currency | null;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, currency }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-sm font-medium text-white mb-1">{data.name}</p>
        <p className="text-sm text-gray-400">
          {formatCurrency(data.value, currency)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.percentage.toFixed(1)}% of total debt
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Debt Quality Pie Chart Component
 * Renders either real or phantom data based on isPro
 */
interface ChartContentProps {
  goodDebt: number;
  badDebt: number;
  goodDebtRatio: number;
  badDebtRatio: number;
  currency: Currency | null;
  showTooltip?: boolean;
}

const ChartContent: React.FC<ChartContentProps> = ({
  goodDebt,
  badDebt,
  goodDebtRatio,
  badDebtRatio,
  currency,
  showTooltip = true,
}) => {
  const chartData = useMemo(() => {
    const totalDebt = goodDebt + badDebt;
    
    // Handle zero debt case
    if (totalDebt === 0) {
      return [{ name: 'No Debt', value: 1, fill: '#374151', percentage: 100 }];
    }

    return [
      { 
        name: 'Good Debt', 
        value: goodDebt, 
        fill: COLORS.goodDebt, 
        percentage: goodDebtRatio 
      },
      { 
        name: 'Bad Debt', 
        value: badDebt, 
        fill: COLORS.badDebt, 
        percentage: badDebtRatio 
      },
    ];
  }, [goodDebt, badDebt, goodDebtRatio, badDebtRatio]);

  const totalDebt = goodDebt + badDebt;

  return (
    <div className="flex flex-col items-center">
      {/* Pie Chart */}
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
            {showTooltip && (
              <Tooltip content={<CustomTooltip currency={currency} />} />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <LegendItem 
          color={COLORS.goodDebt} 
          label="Good Debt" 
          value={formatCurrency(goodDebt, currency)}
          percentage={goodDebtRatio}
        />
        <LegendItem 
          color={COLORS.badDebt} 
          label="Bad Debt" 
          value={formatCurrency(badDebt, currency)}
          percentage={badDebtRatio}
        />
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-[#333] w-full text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Debt</p>
        <p className="text-lg font-bold text-white">
          {formatCurrency(totalDebt, currency)}
        </p>
      </div>

      {/* Insight */}
      {totalDebt > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[#2a2a2a] w-full">
          <p className="text-xs text-gray-400">
            {goodDebtRatio >= 70 ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Excellent! Your debt is mostly leveraged for assets.</span>
              </span>
            ) : goodDebtRatio >= 50 ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Balanced debt composition. Consider reducing bad debt.</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>High bad debt ratio. Focus on paying down consumer debt.</span>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Legend Item Component
 */
interface LegendItemProps {
  color: string;
  label: string;
  value: string;
  percentage: number;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, value, percentage }) => (
  <div className="flex items-center gap-2">
    <div 
      className="w-3 h-3 rounded-full" 
      style={{ backgroundColor: color }}
    />
    <div className="text-left">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
      <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
    </div>
  </div>
);

/**
 * DebtQualityChart Component
 * 
 * Displays a pie chart showing the breakdown of Good Debt vs Bad Debt.
 * - Good Debt: Liabilities linked to income-producing assets
 * - Bad Debt: Consumer debt not tied to any asset
 * 
 * For FREE users, shows a blurred phantom chart with upgrade prompt.
 */
const DebtQualityChart: React.FC<DebtQualityChartProps> = ({
  data,
  isPro,
  onUpgrade,
}) => {
  const { currency } = useCurrency();

  // Real content for PRO users
  const realContent = data ? (
    <ChartContent
      goodDebt={data.debtComposition.goodDebt}
      badDebt={data.debtComposition.badDebt}
      goodDebtRatio={data.debtComposition.goodDebtRatio}
      badDebtRatio={data.debtComposition.badDebtRatio}
      currency={currency}
      showTooltip={true}
    />
  ) : (
    <div className="flex items-center justify-center h-48 text-gray-500">
      No data available
    </div>
  );

  // Phantom content for FREE users (fake data to show behind blur)
  const phantomContent = (
    <ChartContent
      goodDebt={PHANTOM_DATA.goodDebt}
      badDebt={PHANTOM_DATA.badDebt}
      goodDebtRatio={PHANTOM_DATA.goodDebtRatio}
      badDebtRatio={PHANTOM_DATA.badDebtRatio}
      currency={currency}
      showTooltip={false}
    />
  );

  return (
    <LockedAnalysisCard
      title="Debt Quality Analysis"
      isPro={isPro}
      phantomContent={phantomContent}
      featureDescription="See how your debt is distributed between productive leverage and consumer debt."
      onUpgrade={onUpgrade}
    >
      {realContent}
    </LockedAnalysisCard>
  );
};

export default DebtQualityChart;
