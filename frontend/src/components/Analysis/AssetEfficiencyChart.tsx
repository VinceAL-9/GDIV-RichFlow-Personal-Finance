import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import LockedAnalysisCard from './LockedAnalysisCard';
import type { AdvancedMetrics } from '../../types/analysis.types';
import type { Currency } from '../../types/currency.types';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrency } from '../../utils/currency.utils';

interface AssetEfficiencyChartProps {
  /** Advanced metrics data (null for FREE users) */
  data: AdvancedMetrics | null;
  /** Whether the user has PRO subscription */
  isPro: boolean;
  /** Optional: Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

// Chart colors
const COLORS = {
  productive: '#3b82f6', // Blue-500
  stagnant: '#6b7280',   // Gray-500
  productiveGradient: ['#3b82f6', '#2563eb'],
  stagnantGradient: ['#6b7280', '#4b5563'],
};

// Phantom/fake data for FREE users
const PHANTOM_DATA = {
  productiveAssets: 180000,
  stagnantAssets: 70000,
  productiveAssetCount: 4,
  stagnantAssetCount: 2,
  productivityRatio: 72,
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
    count: number;
    description: string;
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
          {data.count} asset{data.count !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          {data.description}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Asset Efficiency Bar Chart Component
 * Renders either real or phantom data based on isPro
 */
interface ChartContentProps {
  productiveAssets: number;
  stagnantAssets: number;
  productiveAssetCount: number;
  stagnantAssetCount: number;
  productivityRatio: number;
  currency: Currency | null;
  showTooltip?: boolean;
}

const ChartContent: React.FC<ChartContentProps> = ({
  productiveAssets,
  stagnantAssets,
  productiveAssetCount,
  stagnantAssetCount,
  productivityRatio,
  currency,
  showTooltip = true,
}) => {
  const chartData = useMemo(() => {
    return [
      {
        name: 'Productive',
        value: productiveAssets,
        fill: COLORS.productive,
        count: productiveAssetCount,
        description: 'Assets generating income',
      },
      {
        name: 'Stagnant',
        value: stagnantAssets,
        fill: COLORS.stagnant,
        count: stagnantAssetCount,
        description: 'Assets not generating income',
      },
    ];
  }, [productiveAssets, stagnantAssets, productiveAssetCount, stagnantAssetCount]);

  const totalAssets = productiveAssets + stagnantAssets;
  const stagnantRatio = 100 - productivityRatio;

  // Custom format for Y-axis (abbreviated currency)
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="flex flex-col">
      {/* Bar Chart */}
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={formatYAxis}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
              width={80}
            />
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
            )}
            <Bar 
              dataKey="value" 
              radius={[0, 6, 6, 0]}
              barSize={36}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <StatCard
          label="Productive Assets"
          value={formatCurrency(productiveAssets, currency)}
          subValue={`${productiveAssetCount} asset${productiveAssetCount !== 1 ? 's' : ''}`}
          percentage={productivityRatio}
          color={COLORS.productive}
        />
        <StatCard
          label="Stagnant Assets"
          value={formatCurrency(stagnantAssets, currency)}
          subValue={`${stagnantAssetCount} asset${stagnantAssetCount !== 1 ? 's' : ''}`}
          percentage={stagnantRatio}
          color={COLORS.stagnant}
        />
      </div>

      {/* Total & Efficiency Score */}
      <div className="mt-4 pt-4 border-t border-[#333] flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Assets</p>
          <p className="text-lg font-bold text-white">
            {formatCurrency(totalAssets, currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Efficiency Score</p>
          <div className="flex items-center gap-2">
            <EfficiencyBadge ratio={productivityRatio} />
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 rounded-lg bg-[#2a2a2a]">
        <p className="text-xs text-gray-400">
          {productivityRatio >= 80 ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Excellent! Most of your assets are working for you.</span>
            </span>
          ) : productivityRatio >= 50 ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Good balance. Consider linking income to stagnant assets.</span>
            </span>
          ) : productivityRatio >= 25 ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Room for improvement. Many assets aren&apos;t generating income.</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Most assets are idle. Look for ways to monetize them.</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

/**
 * Stat Card Component
 */
interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  percentage: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, percentage, color }) => (
  <div className="p-3 rounded-lg bg-[#2a2a2a]">
    <div className="flex items-center gap-2 mb-2">
      <div 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: color }}
      />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
    <p className="text-sm font-semibold text-white">{value}</p>
    <div className="flex items-center justify-between mt-1">
      <p className="text-xs text-gray-500">{subValue}</p>
      <p className="text-xs font-medium" style={{ color }}>{percentage.toFixed(1)}%</p>
    </div>
  </div>
);

/**
 * Efficiency Badge Component
 */
interface EfficiencyBadgeProps {
  ratio: number;
}

const EfficiencyBadge: React.FC<EfficiencyBadgeProps> = ({ ratio }) => {
  const getEfficiencyLevel = (r: number) => {
    if (r >= 80) return { label: 'Excellent', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
    if (r >= 60) return { label: 'Good', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' };
    if (r >= 40) return { label: 'Fair', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' };
    if (r >= 20) return { label: 'Low', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' };
    return { label: 'Poor', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
  };

  const level = getEfficiencyLevel(ratio);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold text-white">{ratio.toFixed(0)}%</span>
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${level.color}`}>
        {level.label}
      </span>
    </div>
  );
};

/**
 * AssetEfficiencyChart Component
 * 
 * Displays a bar chart comparing Productive vs Stagnant assets.
 * - Productive Assets: Assets with linked income streams
 * - Stagnant Assets: Assets not generating any income
 * 
 * For FREE users, shows a blurred phantom chart with upgrade prompt.
 */
const AssetEfficiencyChart: React.FC<AssetEfficiencyChartProps> = ({
  data,
  isPro,
  onUpgrade,
}) => {
  const { currency } = useCurrency();

  // Real content for PRO users
  const realContent = data ? (
    <ChartContent
      productiveAssets={data.assetEfficiency.productiveAssets}
      stagnantAssets={data.assetEfficiency.stagnantAssets}
      productiveAssetCount={data.assetEfficiency.productiveAssetCount}
      stagnantAssetCount={data.assetEfficiency.stagnantAssetCount}
      productivityRatio={data.assetEfficiency.productivityRatio}
      currency={currency}
      showTooltip={true}
    />
  ) : (
    <div className="flex items-center justify-center h-52 text-gray-500">
      No data available
    </div>
  );

  // Phantom content for FREE users (fake data to show behind blur)
  const phantomContent = (
    <ChartContent
      productiveAssets={PHANTOM_DATA.productiveAssets}
      stagnantAssets={PHANTOM_DATA.stagnantAssets}
      productiveAssetCount={PHANTOM_DATA.productiveAssetCount}
      stagnantAssetCount={PHANTOM_DATA.stagnantAssetCount}
      productivityRatio={PHANTOM_DATA.productivityRatio}
      currency={currency}
      showTooltip={false}
    />
  );

  return (
    <LockedAnalysisCard
      title="Asset Efficiency"
      isPro={isPro}
      phantomContent={phantomContent}
      featureDescription="Discover which of your assets are working hard and which are sitting idle."
      onUpgrade={onUpgrade}
    >
      {realContent}
    </LockedAnalysisCard>
  );
};

export default AssetEfficiencyChart;
