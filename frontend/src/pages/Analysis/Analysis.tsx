import React, { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { analysisAPI } from '../../utils/api';
import { analysisService } from '../../services/analysis.service';
import { formatCurrency as formatCurrencyValue, getCurrencySymbol } from '../../utils/currency.utils';
import DebtQualityChart from '../../components/Analysis/DebtQualityChart';
import AssetEfficiencyChart from '../../components/Analysis/AssetEfficiencyChart';
import type { AnalysisResponse } from '../../types/analysis.types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  AreaChart, Area, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ComposedChart, ReferenceDot
} from 'recharts';

type SnapshotData = {
  date: string;
  balanceSheet: {
    totalCashBalance: number;
    totalCash: number;
    totalInvestedAssets: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
  cashflow: {
    earnedIncome: number;
    passiveIncome: number;
    portfolioIncome: number;
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    direction: string;
  };
  ratios: {
    passiveCoverageRatio: string;
    savingsRate: string;
  };
  richFlowMetrics: {
    wealthVelocity: number;
    wealthVelocityPct: number;
    solvencyRatio: number;
    freedomGap: number;
  };
  incomeQuadrant: {
    EMPLOYEE: { amount: number; pct: number };
    SELF_EMPLOYED: { amount: number; pct: number };
    BUSINESS_OWNER: { amount: number; pct: number };
    INVESTOR: { amount: number; pct: number };
    total: number;
  };
  financialHealth: {
    runway: number;
    freedomDate: string | null;
    assetEfficiency: number;
    trends: {
      netWorth: number;
      cashflow: number;
    };
  };
  currency: { symbol: string; name: string };
};

type TrajectoryPoint = {
  date: string;
  netWorth: number;
  netWorthDelta: number; // change vs previous point
  passiveIncome: number;
  portfolioIncome: number;
  totalExpenses: number;
  freedomGap: number;
  wealthVelocity: number; // percent form
  assetEfficiency: number;
  netCashflow: number;
  totalIncome: number;
  incomeQuadrant: {
    EMPLOYEE: number;
    SELF_EMPLOYED: number;
    BUSINESS_OWNER: number;
    INVESTOR: number;
  };
  currency: string; // symbol for change markers
};


const QUADRANT_COLORS = {
  EMPLOYEE: '#794cb5', // Purple
  SELF_EMPLOYED: '#eaca6a', // Gold
  BUSINESS_OWNER: '#41d288', // Green
  INVESTOR: '#ff7d7e' // Red
};

// Helper to format freedom date for display
const formatFreedomDate = (freedomDate: string | null): string => {
  if (!freedomDate) return 'Not Projected';

  // Handle special status strings
  const specialStatuses = ['Achieved', 'No Passive Income', 'Insufficient Data', 'Stagnant/Declining', '> 50 Years'];
  if (specialStatuses.includes(freedomDate)) {
    return freedomDate;
  }

  // Try to parse as ISO date (YYYY-MM-DD)
  const dateMatch = freedomDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const date = new Date(freedomDate + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  // Return as-is if we can't parse it
  return freedomDate;
};

const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  trend?: number;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  accentColor?: 'gold' | 'purple' | 'default';
  invertTrendColor?: boolean;
}> = ({ title, value, subValue, trend, className = '', icon, children, accentColor = 'default', invertTrendColor = false }) => {
  const borderColor = accentColor === 'gold' ? 'group-hover:border-[#eaca6a]/30' :
    accentColor === 'purple' ? 'group-hover:border-[#794cb5]/30' :
      'group-hover:border-white/10';

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/5 p-6 transition-all duration-300 hover:bg-zinc-900/70 ${borderColor} ${className}`}>
      <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
          {icon && <div className="text-zinc-500 group-hover:text-white transition-colors">{icon}</div>}
        </div>

        <div className="mt-auto">
          <div className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            {value}
            {trend !== undefined && trend !== null && Math.abs(trend) > 0 && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${(invertTrendColor ? trend < 0 : trend >= 0)
                ? 'bg-[#41d288]/10 text-[#41d288]'
                : 'bg-[#ff7d7e]/10 text-[#ff7d7e]'
                }`}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
          {subValue && <div className="mt-1 text-sm text-zinc-500">{subValue}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [slowSnapshot, setSlowSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const deferredSelectedDate = useDeferredValue(selectedDate);
  const [snapshotData, setSnapshotData] = useState<SnapshotData | null>(null);

  // Tiered Analysis State (for PRO features)
  const [tieredData, setTieredData] = useState<AnalysisResponse | null>(null);
  const [tieredLoading, setTieredLoading] = useState(false);

  // Compare state
  const [showCompare, setShowCompare] = useState(false);
  const [compareStart, setCompareStart] = useState('');
  const [compareEnd, setCompareEnd] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [slowCompare, setSlowCompare] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<{ start: SnapshotData; end: SnapshotData } | null>(null);

  // Trajectory state for velocity and freedom gap visualization
  const [trajectoryStart, setTrajectoryStart] = useState('');
  const [trajectoryEnd, setTrajectoryEnd] = useState('');
  const [trajectoryInterval, setTrajectoryInterval] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [trajectoryLoading, setTrajectoryLoading] = useState(false);
  const [slowTrajectory, setSlowTrajectory] = useState(false);
  const [trajectoryError, setTrajectoryError] = useState<string | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryPoint[]>([]);

  // Abort controllers
  // Request id tracking for cancellation emulation
  const snapshotReqIdRef = useRef(0);
  const compareReqIdRef = useRef(0);
  const trajectoryReqIdRef = useRef(0);

  // Performance constants
  const SLOW_THRESHOLD_MS = 200;

  const formatError = (err: unknown): string => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message || 'Unexpected error';
    try { return JSON.stringify(err); } catch { return 'Unexpected error'; }
  };

  // Mini calendar refs and opener
  const startRef = React.useRef<HTMLInputElement>(null);
  const endRef = React.useRef<HTMLInputElement>(null);
  const openNativePicker = (el: HTMLInputElement | null) => {
    if (!el) return;
    // Prefer the native mini calendar if supported
    const anyEl = el as any;
    if (typeof anyEl.showPicker === 'function') {
      anyEl.showPicker();
    } else {
      // Fallback for browsers without showPicker
      el.focus();
      el.click();
    }
  };

  // Historical currency formatter (for comparison tables with historical data)
  const formatHistorical = React.useCallback(
    (value: number, currencyObj: { symbol: string; name: string }) => {
      return formatCurrencyValue(value, {
        cur_symbol: currencyObj.symbol,
        cur_name: currencyObj.name
      } as any);
    },
    []
  );

  // Current data formatter (uses currency from context)
  const formatCurrent = React.useCallback(
    (value: number) => {
      return formatCurrencyValue(value, currency);
    },
    [currency]
  );

  const fetchSnapshot = async (date?: string) => {
    const reqId = ++snapshotReqIdRef.current;
    setSnapshotError(null);
    setLoading(true);
    setSlowSnapshot(false);
    const startTs = performance.now();
    const slowTimer = setTimeout(() => setSlowSnapshot(true), SLOW_THRESHOLD_MS);
    try {
      const data = await analysisAPI.getFinancialSnapshot(date);
      if (reqId !== snapshotReqIdRef.current) return; // stale
      setSnapshotData(data);
      if (!date) setSelectedDate('');
    } catch (error) {
      setSnapshotError(formatError(error));
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowSnapshot(performance.now() - startTs > SLOW_THRESHOLD_MS);
    }
  };

  // Fetch Tiered Snapshot (for PRO metrics)
  const fetchTieredSnapshot = async (date?: string) => {
    setTieredLoading(true);
    try {
      const data = await analysisService.getTieredSnapshot(date);
      setTieredData(data);
    } catch (error) {
      // Silently fail - tiered data is optional enhancement
      console.warn('Failed to fetch tiered snapshot:', error);
      setTieredData(null);
    } finally {
      setTieredLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
    fetchTieredSnapshot();
  }, [currency]);

  useEffect(() => {
    if (deferredSelectedDate) {
      fetchSnapshot(deferredSelectedDate);
      fetchTieredSnapshot(deferredSelectedDate);
    }
  }, [deferredSelectedDate]);

  // Reset comparison state when toggled off
  useEffect(() => {
    if (!showCompare) {
      setCompareResult(null);
      setCompareStart('');
      setCompareEnd('');
    }
  }, [showCompare]);

  const quadrantData = useMemo(() => {
    if (!snapshotData) return [];
    const { incomeQuadrant } = snapshotData;
    return [
      { name: 'Employee', value: incomeQuadrant.EMPLOYEE.amount, color: QUADRANT_COLORS.EMPLOYEE },
      { name: 'Self-Employed', value: incomeQuadrant.SELF_EMPLOYED.amount, color: QUADRANT_COLORS.SELF_EMPLOYED },
      { name: 'Business Owner', value: incomeQuadrant.BUSINESS_OWNER.amount, color: QUADRANT_COLORS.BUSINESS_OWNER },
      { name: 'Investor', value: incomeQuadrant.INVESTOR.amount, color: QUADRANT_COLORS.INVESTOR },
    ].filter(item => item.value > 0);
  }, [snapshotData]);

  // Helpers for comparison
  const safeDate = (d: string) => new Date(d);
  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const daysBetween = (a: string, b: string) => {
    const da = safeDate(a), db = safeDate(b);
    if (!isValidDate(da) || !isValidDate(db)) return 0;
    return Math.max(0, Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24)));
  };
  const monthsBetween = (a: string, b: string) => {
    const da = safeDate(a), db = safeDate(b);
    if (!isValidDate(da) || !isValidDate(db)) return 0;
    return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
  };

  const fetchCompareReport = async () => {
    if (!compareStart || !compareEnd) return;
    const reqId = ++compareReqIdRef.current;
    setCompareError(null);
    setCompareLoading(true);
    setSlowCompare(false);
    const slowTimer = setTimeout(() => setSlowCompare(true), SLOW_THRESHOLD_MS);
    try {
      const [startSnap, endSnap] = await Promise.all([
        analysisAPI.getFinancialSnapshot(compareStart),
        analysisAPI.getFinancialSnapshot(compareEnd),
      ]);
      if (reqId !== compareReqIdRef.current) return; // stale
      setCompareResult({ start: startSnap, end: endSnap });
    } catch (e) {
      setCompareError(formatError(e));
    } finally {
      clearTimeout(slowTimer);
      setCompareLoading(false);
    }
  };

  const fetchTrajectoryData = async () => {
    if (!trajectoryStart || !trajectoryEnd) return;
    const reqId = ++trajectoryReqIdRef.current;
    setTrajectoryError(null);
    setTrajectoryLoading(true);
    setSlowTrajectory(false);
    const slowTimer = setTimeout(() => setSlowTrajectory(true), SLOW_THRESHOLD_MS);
    try {
      const data = await analysisAPI.getFinancialTrajectory(
        trajectoryStart,
        trajectoryEnd,
        trajectoryInterval
      );
      setTrajectoryData(data);
    } catch (e) {
      setTrajectoryData([]);
    } finally {
      clearTimeout(slowTimer);
      setTrajectoryLoading(false);
    }
  };

  // Default load last 12 months trajectory on mount
  useEffect(() => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    let startStr;
    if (user?.createdAt) {
      const created = new Date(user.createdAt);
      // If created date is valid and in the past
      if (!isNaN(created.getTime()) && created < today) {
        startStr = created.toISOString().split('T')[0];
      }
    }

    // Fallback to 1 year ago if no user creation date or invalid
    if (!startStr) {
      const start = new Date(today);
      start.setFullYear(today.getFullYear() - 1);
      startStr = start.toISOString().split('T')[0];
    }

    setTrajectoryStart(startStr);
    setTrajectoryEnd(endStr);
  }, [user]);
  useEffect(() => {
    if (trajectoryStart && trajectoryEnd) fetchTrajectoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajectoryStart, trajectoryEnd, trajectoryInterval, currency]);

  const compareMetrics = useMemo(() => {
    if (!compareResult) return null;
    const { start, end } = compareResult;

    const periodDays = Math.max(1, daysBetween(compareStart, compareEnd));

    // Net worth & velocity
    const nwStart = start.balanceSheet.netWorth || 0;
    const nwEnd = end.balanceSheet.netWorth || 0;
    const nwDelta = nwEnd - nwStart;
    const nwPct = nwStart !== 0 ? (nwDelta / Math.abs(nwStart)) * 100 : null;
    const nwVelocityPerMonth = (nwDelta / periodDays) * 30; // approx. monthly velocity

    // Financial health evolution
    const runwayStart = start.financialHealth.runway || 0;
    const runwayEnd = end.financialHealth.runway || 0;
    const runwayDelta = runwayEnd - runwayStart;

    const freedomStart = start.financialHealth.freedomDate;
    const freedomEnd = end.financialHealth.freedomDate;
    let freedomChangeText = 'No projection';
    if (freedomStart === 'Achieved' && freedomEnd === 'Achieved') {
      freedomChangeText = 'Achieved → Achieved';
    } else if (freedomStart === 'Achieved' && freedomEnd !== 'Achieved') {
      freedomChangeText = `Achieved → ${formatFreedomDate(freedomEnd)}`;
    } else if (freedomStart !== 'Achieved' && freedomEnd === 'Achieved') {
      freedomChangeText = `${formatFreedomDate(freedomStart)} → Achieved`;
    } else if (freedomStart && freedomEnd) {
      // Check if both are actual dates (not special status strings)
      const specialStatuses = ['No Passive Income', 'Insufficient Data', 'Stagnant/Declining', '> 50 Years'];
      const startIsDate = !specialStatuses.includes(freedomStart) && /^\d{4}-\d{2}-\d{2}$/.test(freedomStart);
      const endIsDate = !specialStatuses.includes(freedomEnd) && /^\d{4}-\d{2}-\d{2}$/.test(freedomEnd);

      if (startIsDate && endIsDate) {
        const m = monthsBetween(freedomStart, freedomEnd);
        freedomChangeText = `${formatFreedomDate(freedomStart)} → ${formatFreedomDate(freedomEnd)} (${m === 0 ? 'no change' : `${m > 0 ? '+' : ''}${m} mo`})`;
      } else {
        freedomChangeText = `${formatFreedomDate(freedomStart)} → ${formatFreedomDate(freedomEnd)}`;
      }
    } else if (freedomStart) {
      freedomChangeText = `${formatFreedomDate(freedomStart)} → No projection`;
    } else if (freedomEnd) {
      freedomChangeText = `No projection → ${formatFreedomDate(freedomEnd)}`;
    }

    const effStart = start.financialHealth.assetEfficiency || 0;
    const effEnd = end.financialHealth.assetEfficiency || 0;
    const effDelta = effEnd - effStart;

    // Balance sheet
    const cashStart = start.balanceSheet.totalCashBalance || 0;
    const cashEnd = end.balanceSheet.totalCashBalance || 0;
    const cashDelta = cashEnd - cashStart;

    const invStart = (start.balanceSheet.totalAssets || 0) - cashStart;
    const invEnd = (end.balanceSheet.totalAssets || 0) - cashEnd;
    const invDelta = invEnd - invStart;

    const debtStart = start.balanceSheet.totalLiabilities || 0;
    const debtEnd = end.balanceSheet.totalLiabilities || 0;
    const debtDelta = debtEnd - debtStart;

    // Cashflow
    const cf = (s: SnapshotData) => ({
      earned: s.cashflow.earnedIncome || 0,
      passive: s.cashflow.passiveIncome || 0,
      portfolio: s.cashflow.portfolioIncome || 0,
      totalIncome: s.cashflow.totalIncome || 0,
      expenses: s.cashflow.totalExpenses || 0,
      net: s.cashflow.netCashflow || 0,
    });
    const cfStart = cf(start);
    const cfEnd = cf(end);
    const cfDelta = {
      earned: cfEnd.earned - cfStart.earned,
      passive: cfEnd.passive - cfStart.passive,
      portfolio: cfEnd.portfolio - cfStart.portfolio,
      totalIncome: cfEnd.totalIncome - cfStart.totalIncome,
      expenses: cfEnd.expenses - cfStart.expenses,
      net: cfEnd.net - cfStart.net,
    };

    // Ratios
    const srStart = parseFloat(start.ratios.savingsRate || '0') || 0;
    const srEnd = parseFloat(end.ratios.savingsRate || '0') || 0;
    const srDelta = srEnd - srStart;

    const pcStart = parseFloat(start.ratios.passiveCoverageRatio || '0') || 0;
    const pcEnd = parseFloat(end.ratios.passiveCoverageRatio || '0') || 0;
    const pcDelta = pcEnd - pcStart;

    // Income quadrant shift
    const sumVals = (iq: SnapshotData['incomeQuadrant']) =>
      (iq.EMPLOYEE?.amount || 0) + (iq.SELF_EMPLOYED?.amount || 0) + (iq.BUSINESS_OWNER?.amount || 0) + (iq.INVESTOR?.amount || 0);
    const iqStart = start.incomeQuadrant;
    const iqEnd = end.incomeQuadrant;
    const totalStart = sumVals(iqStart) || 1;
    const totalEnd = sumVals(iqEnd) || 1;
    const cats: Array<keyof Omit<SnapshotData['incomeQuadrant'], 'total'>> = ['EMPLOYEE', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'INVESTOR'];
    const iqShift = cats.map((k) => {
      const sAmt = iqStart[k].amount || 0;
      const eAmt = iqEnd[k].amount || 0;
      const sPct = (sAmt / totalStart) * 100;
      const ePct = (eAmt / totalEnd) * 100;
      return { key: k, startPct: sPct, endPct: ePct, deltaPct: ePct - sPct };
    });

    return {
      periodDays,
      netWorth: { start: nwStart, end: nwEnd, delta: nwDelta, pct: nwPct, velocityPerMonth: nwVelocityPerMonth },
      health: { runway: { start: runwayStart, end: runwayEnd, delta: runwayDelta }, freedomChangeText, efficiency: { start: effStart, end: effEnd, delta: effDelta } },
      balance: { cash: { start: cashStart, end: cashEnd, delta: cashDelta }, invested: { start: invStart, end: invEnd, delta: invDelta }, liabilities: { start: debtStart, end: debtEnd, delta: debtDelta } },
      cashflow: { start: cfStart, end: cfEnd, delta: cfDelta },
      ratios: { savingsRate: { start: srStart, end: srEnd, delta: srDelta }, passiveCoverage: { start: pcStart, end: pcEnd, delta: pcDelta } },
      iqShift,
      startCurrency: start.currency,
      endCurrency: end.currency,
    };
  }, [compareResult, compareStart, compareEnd]);

  // Trajectory metrics - compute key insights for Freedom Gap visualization
  const processedTrajectory = useMemo(() => {
    if (!trajectoryData || trajectoryData.length === 0) return [];
    // Add percent quadrant evolution & currency change detection
    return trajectoryData.map((p, idx) => {
      const totalIQ = p.incomeQuadrant.EMPLOYEE + p.incomeQuadrant.SELF_EMPLOYED + p.incomeQuadrant.BUSINESS_OWNER + p.incomeQuadrant.INVESTOR || 1;
      const prev = trajectoryData[idx - 1];
      const currencyChanged = prev ? prev.currency !== p.currency : false;
      // Combined passive income (passive + portfolio) for freedom calculations
      const combinedPassiveIncome = p.passiveIncome + p.portfolioIncome;
      return {
        ...p,
        combinedPassiveIncome,
        quadrantPct: {
          EMPLOYEE: (p.incomeQuadrant.EMPLOYEE / totalIQ) * 100,
          SELF_EMPLOYED: (p.incomeQuadrant.SELF_EMPLOYED / totalIQ) * 100,
          BUSINESS_OWNER: (p.incomeQuadrant.BUSINESS_OWNER / totalIQ) * 100,
          INVESTOR: (p.incomeQuadrant.INVESTOR / totalIQ) * 100,
        },
        currencyChanged,
        gapArea: p.totalExpenses > combinedPassiveIncome ? (p.totalExpenses - combinedPassiveIncome) : 0,
        surplusArea: combinedPassiveIncome > p.totalExpenses ? (combinedPassiveIncome - p.totalExpenses) : 0
      };
    });
  }, [trajectoryData]);

  // Trajectory high-level metrics
  const trajectoryMetrics = useMemo(() => {
    if (!trajectoryData || trajectoryData.length === 0) return null;
    const first = trajectoryData[0];
    const last = trajectoryData[trajectoryData.length - 1];

    // Combined passive income (passive + portfolio) for freedom calculations
    const firstCombinedPassive = first.passiveIncome + first.portfolioIncome;
    const lastCombinedPassive = last.passiveIncome + last.portfolioIncome;

    const safeGrowth = (start: number, end: number) => {
      if (start === 0) return end === 0 ? 0 : (end > 0 ? 100 : -100);
      return ((end - start) / Math.abs(start)) * 100;
    };

    const freedomGapChange = last.freedomGap - first.freedomGap;
    const freedomGapTrend = safeGrowth(first.freedomGap, last.freedomGap);

    const velocityChange = last.wealthVelocity - first.wealthVelocity;

    const netWorthChange = last.netWorth - first.netWorth;
    const netWorthGrowthRate = safeGrowth(first.netWorth, last.netWorth);

    // Use combined passive income for passive income metrics
    const passiveIncomeChange = lastCombinedPassive - firstCombinedPassive;
    const passiveIncomeGrowthRate = safeGrowth(firstCombinedPassive, lastCombinedPassive);

    const freedomCrossoverPoint = trajectoryData.find((p, idx) => idx > 0 && p.freedomGap <= 0 && trajectoryData[idx - 1].freedomGap > 0);

    // Calculate recent cashflow trend (last period vs previous period)
    const prevPoint = trajectoryData.length > 1 ? trajectoryData[trajectoryData.length - 2] : null;
    const recentCashflowTrend = prevPoint ? safeGrowth(prevPoint.netCashflow, last.netCashflow) : 0;

    return {
      startDate: first.date,
      endDate: last.date,
      dataPoints: trajectoryData.length,
      freedomGap: { start: first.freedomGap, end: last.freedomGap, change: freedomGapChange, trendPercent: freedomGapTrend, crossoverDate: freedomCrossoverPoint?.date || null },
      wealthVelocity: { start: first.wealthVelocity, end: last.wealthVelocity, change: velocityChange },
      netWorth: { start: first.netWorth, end: last.netWorth, change: netWorthChange, growthRate: netWorthGrowthRate },
      passiveIncome: { start: firstCombinedPassive, end: lastCombinedPassive, change: passiveIncomeChange, growthRate: passiveIncomeGrowthRate },
      recentCashflowTrend
    };
  }, [trajectoryData]);



  // Timeline controller (date picker)
  const timelineController = (
    <div className="time-machine-controller">
      <span className="time-machine-label">Select</span>
      <div className="time-machine-divider" />
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="time-machine-input [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
      />
      {selectedDate && (
        <button onClick={() => { setSelectedDate(''); fetchSnapshot(); }} className="time-machine-reset">Reset</button>
      )}
    </div>
  );

  // Header right content (timeline + compare toggle)
  const headerRight = (
    <div className="analysis-header-right">
      {timelineController}

      <button
        onClick={() => setShowCompare(s => !s)}
        aria-pressed={showCompare}
        className={`compare-button ${showCompare ? 'active' : 'inactive'}`}
        title="Compare two dates"
      >Compare</button>
    </div>
  );

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        className="rounded-md border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm p-3 text-xs shadow-xl min-w-[180px] transition-colors"
        style={{ zIndex: 1000, pointerEvents: 'auto' }}
      >
        <div className="font-semibold text-white mb-1 flex items-center justify-between">
          <span>{new Date(label).toLocaleDateString()}</span>
        </div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-2">
            <span className="text-zinc-400">{p.name}</span>
            <span className="text-white">{typeof p.value === 'number' ? (p.dataKey.includes('Pct') || p.name?.includes('%') || p.dataKey === 'assetEfficiency' || p.dataKey === 'wealthVelocity' ? `${p.value.toFixed(2)}%` : formatCurrencyValue(p.value, currency)) : p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading && !snapshotData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-pulse text-[#eaca6a] text-sm">Loading Financial Data...</div>
          {slowSnapshot && <div className="text-xs text-zinc-500">Fetching snapshot…</div>}
          {snapshotError && <div className="text-xs text-[#ff7d7e]">{snapshotError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden  selection:bg-[#eaca6a]/30">
      <Header 
        title="Analysis" 
        hideActions 
        rightContent={headerRight}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          mobileOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#794cb5]/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#eaca6a]/10 rounded-full blur-[120px] pointer-events-none" />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {(snapshotError || compareError || trajectoryError) && (
              <div className="max-w-7xl mx-auto mb-4 space-y-2">
                {snapshotError && (
                  <div className="rounded-lg border border-[#ff7d7e]/30 bg-[#ff7d7e]/10 px-4 py-2 text-xs text-[#ff7d7e] flex justify-between">
                    <span>Snapshot Error: {snapshotError}</span>
                    <button onClick={() => setSnapshotError(null)} className="text-[#ff7d7e] hover:text-[#ff7d7e]/80">Dismiss</button>
                  </div>
                )}
                {compareError && (
                  <div className="rounded-lg border border-[#ff7d7e]/30 bg-[#ff7d7e]/10 px-4 py-2 text-xs text-[#ff7d7e] flex justify-between">
                    <span>Compare Error: {compareError}</span>
                    <button onClick={() => setCompareError(null)} className="text-[#ff7d7e] hover:text-[#ff7d7e]/80">Dismiss</button>
                  </div>
                )}
                {trajectoryError && (
                  <div className="rounded-lg border border-[#ff7d7e]/30 bg-[#ff7d7e]/10 px-4 py-2 text-xs text-[#ff7d7e] flex justify-between">
                    <span>Trajectory Error: {trajectoryError}</span>
                    <button onClick={() => setTrajectoryError(null)} className="text-[#ff7d7e] hover:text-[#ff7d7e]/80">Dismiss</button>
                  </div>
                )}
              </div>
            )}
            {(slowCompare && compareLoading) && (
              <div className="fixed top-20 right-4 z-50 rounded-full bg-zinc-900/80 border border-[#794cb5]/40 px-3 py-1 text-[10px] text-[#794cb5] shadow-lg">Generating comparison…</div>
            )}
            {(slowTrajectory && trajectoryLoading) && (
              <div className="fixed top-32 right-4 z-50 rounded-full bg-zinc-900/80 border border-[#eaca6a]/40 px-3 py-1 text-[10px] text-[#eaca6a] shadow-lg">Updating trajectory…</div>
            )}
            {showCompare && (
              <div className="max-w-7xl mx-auto mb-6 rounded-2xl bg-zinc-900/70 border border-white/5 p-4 md:p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <h2 className="text-sm md:text-base font-semibold text-white">Compare Two Dates</h2>
                  {compareResult && (
                    <button
                      onClick={() => setCompareResult(null)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    >Clear Report</button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  {/* Start Date */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Start</span>
                    <div className="relative flex-1 md:flex-none">
                      <input
                        ref={startRef}
                        type="date"
                        value={compareStart}
                        onChange={(e) => setCompareStart(e.target.value)}
                        max={compareEnd || new Date().toISOString().split('T')[0]}
                        className="bg-zinc-900/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2 w-full md:w-48 focus:outline-none focus:ring-1 focus:ring-[#794cb5] cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </div>
                    <button
                      onClick={() => openNativePicker(startRef.current)}
                      className="text-xs px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:bg-zinc-800"
                      title="Open calendar"
                    >Pick</button>
                  </div>

                  <div className="text-zinc-600">→</div>

                  {/* End Date */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">End</span>
                    <div className="relative flex-1 md:flex-none">
                      <input
                        ref={endRef}
                        type="date"
                        value={compareEnd}
                        onChange={(e) => setCompareEnd(e.target.value)}
                        min={compareStart || undefined}
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-zinc-900/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2 w-full md:w-48 focus:outline-none focus:ring-1 focus:ring-[#794cb5] cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </div>
                    <button
                      onClick={() => openNativePicker(endRef.current)}
                      className="text-xs px-2 py-1 rounded-md border border-white/10 text-zinc-300 hover:bg-zinc-800"
                      title="Open calendar"
                    >Pick</button>
                  </div>

                  {/* Swap */}
                  <button
                    onClick={() => {
                      if (!compareStart || !compareEnd) return;
                      setCompareStart(compareEnd);
                      setCompareEnd(compareStart);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    title="Swap dates"
                  >Swap</button>

                  {/* Generate Button */}
                  {(() => {
                    const startOk = !!compareStart;
                    const endOk = !!compareEnd;
                    const rangeOk = startOk && endOk && safeDate(compareStart) <= safeDate(compareEnd);
                    return (
                      <button
                        onClick={fetchCompareReport}
                        disabled={!rangeOk || compareLoading}
                        className={`ml-auto md:ml-0 px-4 py-2 rounded-full text-sm transition-all ${rangeOk && !compareLoading
                          ? 'bg-[#794cb5]/20 text-white border border-[#794cb5]/40 hover:bg-[#794cb5]/30 shadow-[0_0_0_2px_rgba(121,76,181,0.25),0_0_18px_rgba(121,76,181,0.55)]'
                          : 'bg-zinc-900/60 text-zinc-500 border border-white/10 cursor-not-allowed'
                          }`}
                        title={rangeOk ? 'Generate comparison report' : 'Pick valid start and end dates'}
                      >
                        {compareLoading ? 'Generating…' : 'Generate Report'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
            {compareMetrics && (
              <div className="max-w-7xl mx-auto mb-6 rounded-2xl bg-zinc-900/60 border border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Comparison Report</h2>
                  <div className="text-xs text-zinc-400">
                    {compareStart} → {compareEnd} • {compareMetrics.periodDays} days
                  </div>
                </div>

                {/* Financial Health Evolution */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5">
                    <div className="text-xs text-zinc-400 uppercase mb-1">Wealth Runway</div>
                    <div className="text-sm">
                      {compareMetrics.health.runway.start} → {compareMetrics.health.runway.end} months{' '}
                      <span className={`${compareMetrics.health.runway.delta >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                        ({compareMetrics.health.runway.delta >= 0 ? '+' : ''}{compareMetrics.health.runway.delta})
                      </span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5">
                    <div className="text-xs text-zinc-400 uppercase mb-1">Freedom Date</div>
                    <div className="text-sm">{compareMetrics.health.freedomChangeText}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5">
                    <div className="text-xs text-zinc-400 uppercase mb-1">Asset Efficiency (ROA)</div>
                    <div className="text-sm">
                      {compareMetrics.health.efficiency.start}% → {compareMetrics.health.efficiency.end}%{' '}
                      <span className={`${compareMetrics.health.efficiency.delta >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                        ({compareMetrics.health.efficiency.delta >= 0 ? '+' : ''}{compareMetrics.health.efficiency.delta} pts)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Worth & Velocity */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 mb-6">
                  <div className="text-xs text-zinc-400 uppercase mb-2">Net Worth & Velocity</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-zinc-400">Start</div>
                      <div className="font-semibold">
                        {formatHistorical(compareMetrics.netWorth.start, compareMetrics.startCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">End</div>
                      <div className="font-semibold">
                        {formatHistorical(compareMetrics.netWorth.end, compareMetrics.endCurrency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Change</div>
                      <div className={`${compareMetrics.netWorth.delta >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'} font-semibold`}>
                        {compareMetrics.netWorth.delta >= 0 ? '+' : ''}
                        {formatHistorical(Math.abs(compareMetrics.netWorth.delta), compareMetrics.endCurrency)}
                        {typeof compareMetrics.netWorth.pct === 'number' && (
                          <span className="text-zinc-400"> ({compareMetrics.netWorth.pct.toFixed(2)}%)</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Velocity ≈ {formatHistorical(compareMetrics.netWorth.velocityPerMonth, compareMetrics.endCurrency)}/mo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Sheet Comparison */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 mb-6">
                  <div className="text-xs text-zinc-400 uppercase mb-2">Balance Sheet</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {[
                      { label: 'Cash', k: 'cash' as const },
                      { label: 'Invested Assets', k: 'invested' as const },
                      { label: 'Total Liabilities', k: 'liabilities' as const },
                    ].map(({ label, k }) => (
                      <div key={k}>
                        <div className="text-zinc-400">{label}</div>
                        <div className="flex items-center gap-2">
                          <span>{formatHistorical(compareMetrics.balance[k].start, compareMetrics.startCurrency)}</span>
                          <span className="text-zinc-500">→</span>
                          <span>{formatHistorical(compareMetrics.balance[k].end, compareMetrics.endCurrency)}</span>
                        </div>
                        <div className={`${compareMetrics.balance[k].delta >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                          {compareMetrics.balance[k].delta >= 0 ? '+' : ''}
                          {formatHistorical(Math.abs(compareMetrics.balance[k].delta), compareMetrics.endCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Period Cashflow Aggregates */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 mb-6">
                  <div className="text-xs text-zinc-400 uppercase mb-2">Period Cashflow Aggregates</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {[
                      { label: 'Earned Income', k: 'earned' as const },
                      { label: 'Passive Income', k: 'passive' as const },
                      { label: 'Portfolio Income', k: 'portfolio' as const },
                      { label: 'Total Expenses', k: 'expenses' as const },
                      { label: 'Total Income', k: 'totalIncome' as const },
                      { label: 'Net Cashflow', k: 'net' as const },
                    ].map(({ label, k }) => (
                      <div key={k}>
                        <div className="text-zinc-400">{label}</div>
                        <div className="flex items-center gap-2">
                          <span>{formatHistorical(compareMetrics.cashflow.start[k], compareMetrics.startCurrency)}</span>
                          <span className="text-zinc-500">→</span>
                          <span>{formatHistorical(compareMetrics.cashflow.end[k], compareMetrics.endCurrency)}</span>
                        </div>
                        <div className={`${compareMetrics.cashflow.delta[k] >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                          {compareMetrics.cashflow.delta[k] >= 0 ? '+' : ''}
                          {formatHistorical(Math.abs(compareMetrics.cashflow.delta[k]), compareMetrics.endCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ratio Performance */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5 mb-6">
                  <div className="text-xs text-zinc-400 uppercase mb-2">Ratio Performance</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {[
                      { label: 'Savings Rate', obj: compareMetrics.ratios.savingsRate },
                      { label: 'Passive Coverage Ratio', obj: compareMetrics.ratios.passiveCoverage },
                    ].map(({ label, obj }) => (
                      <div key={label}>
                        <div className="text-zinc-400">{label}</div>
                        <div>
                          {obj.start}% → {obj.end}%{' '}
                          <span className={`${obj.delta >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                            ({obj.delta >= 0 ? '+' : ''}{obj.delta} pts)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Income Quadrant Shift */}
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-white/5">
                  <div className="text-xs text-zinc-400 uppercase mb-2">Income Quadrant Shift</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    {compareMetrics.iqShift.map((row) => (
                      <div key={row.key}>
                        <div className="text-zinc-400">
                          {row.key === 'EMPLOYEE' ? 'Employee' :
                            row.key === 'SELF_EMPLOYED' ? 'Self-Employed' :
                              row.key === 'BUSINESS_OWNER' ? 'Business Owner' : 'Investor'}
                        </div>
                        <div>
                          {row.startPct.toFixed(1)}% → {row.endPct.toFixed(1)}%{' '}
                          <span className={`${row.deltaPct >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}`}>
                            ({row.deltaPct >= 0 ? '+' : ''}{row.deltaPct.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {snapshotData && (
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">

                {/* Hero: Net Worth */}
                <StatCard
                  title="Net Worth"
                  value={formatCurrent(snapshotData.balanceSheet.netWorth)}
                  trend={snapshotData.financialHealth.trends.netWorth}
                  className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[180px]"
                  accentColor="gold"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  }
                >
                  <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#eaca6a] to-[#794cb5]"
                      style={{ width: `${Math.min(Math.max((snapshotData.balanceSheet.netWorth / (snapshotData.balanceSheet.totalAssets || 1)) * 100, 5), 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-zinc-500 flex justify-between">
                    <div className="flex gap-4 w-full justify-between">
                      <div className="text-xs">
                        <div className="text-zinc-400">Cash</div>
                        <div className="font-semibold text-[#eaca6a]">{formatCurrent(snapshotData.balanceSheet.totalCash)}</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-zinc-400">Assets</div>
                        <div className="font-semibold">{formatCurrent(snapshotData.balanceSheet.totalInvestedAssets)}</div>
                      </div>
                      <div className="text-xs">
                        <div className="text-zinc-400">Liabilities</div>
                        <div className="font-semibold">{formatCurrent(snapshotData.balanceSheet.totalLiabilities)}</div>
                      </div>
                    </div>
                  </div>
                </StatCard>

                {/* Hero: Freedom Date */}
                <StatCard
                  title="Freedom Date"
                  value={
                    snapshotData.financialHealth.freedomDate === 'Achieved' ?
                      <span className="text-[#eaca6a]">ACHIEVED</span> :
                      formatFreedomDate(snapshotData.financialHealth.freedomDate)
                  }
                  subValue={
                    snapshotData.financialHealth.freedomDate !== 'Achieved' && snapshotData.financialHealth.freedomDate ?
                      "Estimated date based on current trajectory" : "Keep building your assets"
                  }
                  className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[180px]"
                  accentColor="purple"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  }
                >
                  {/* Progress Bar / Gauge for "On Track" */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${snapshotData.financialHealth.freedomDate ? 'bg-[#41d288]' : 'bg-zinc-700'}`}
                        style={{ width: `${Math.min(parseFloat(snapshotData.ratios.passiveCoverageRatio), 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${snapshotData.financialHealth.freedomDate !== 'No Passive Income' ? 'text-[#41d288]' : 'text-zinc-600'}`}>
                      {snapshotData.financialHealth.freedomDate === 'No Passive Income' ? 'NEEDS DATA' : 'ON TRACK'}
                    </span>
                  </div>
                </StatCard>

                {/* Cashflow Section */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 grid grid-cols-2 gap-4">
                  <StatCard
                    title="Wealth Velocity"
                    value={
                      <span className={snapshotData.richFlowMetrics.wealthVelocity >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}>
                        {snapshotData.richFlowMetrics.wealthVelocity >= 0 ? '+' : ''}
                        {formatCurrent(snapshotData.richFlowMetrics.wealthVelocity)}
                      </span>
                    }
                    trend={snapshotData.richFlowMetrics.wealthVelocityPct}
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="mt-1 text-xs text-zinc-500">Monthly Net Worth Change</div>
                  </StatCard>

                  <StatCard
                    title="Solvency Ratio"
                    value={`${snapshotData.richFlowMetrics.solvencyRatio}%`}
                    className="col-span-2 md:col-span-1"
                  >
                    <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${snapshotData.richFlowMetrics.solvencyRatio < 30 ? 'bg-[#41d288]' :
                          snapshotData.richFlowMetrics.solvencyRatio < 60 ? 'bg-[#eaca6a]' : 'bg-[#ff7d7e]'
                          }`}
                        style={{ width: `${Math.min(snapshotData.richFlowMetrics.solvencyRatio, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {snapshotData.richFlowMetrics.solvencyRatio < 30 ? 'Safe (<30%)' :
                        snapshotData.richFlowMetrics.solvencyRatio < 60 ? 'Caution (30-60%)' : 'High Risk (>60%)'}
                    </div>
                  </StatCard>

                  <StatCard
                    title="Net Cashflow"
                    value={
                      <span className={snapshotData.cashflow.netCashflow >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}>
                        {formatCurrent(snapshotData.cashflow.netCashflow)}
                      </span>
                    }
                    trend={trajectoryMetrics?.recentCashflowTrend ?? snapshotData.financialHealth.trends.cashflow}
                    className="col-span-2 bg-zinc-900/80"
                    accentColor={snapshotData.cashflow.netCashflow >= 0 ? 'gold' : 'default'}
                  >
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between items-center">
                        <div className="text-zinc-400">Total Income</div>
                        <div className="text-[#41d288] font-semibold">{formatCurrent(snapshotData.cashflow.totalIncome)}</div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-zinc-400">Total Expenses</div>
                        <div className="text-[#ff7d7e] font-semibold">{formatCurrent(snapshotData.cashflow.totalExpenses)}</div>
                      </div>
                      <div className="my-2 h-px bg-white/5" />
                      <div className="text-xs text-zinc-500">
                        Savings Rate: <span className={`${parseFloat(snapshotData.ratios.savingsRate) >= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'} font-bold`}>{snapshotData.ratios.savingsRate}%</span>
                      </div>
                    </div>
                  </StatCard>
                </div>

                {/* Income Quadrant Chart */}
                <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 md:p-6 flex flex-col">
                  <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 md:mb-4">Income Quadrant</h3>

                  <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
                    {/* Chart Container */}
                    <div className="flex flex-col items-center w-full lg:w-[320px] shrink-0">
                      <div className="relative flex items-center justify-center w-full mx-auto h-80" style={{ width: '100%', maxWidth: '100%', height: 320, minHeight: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={quadrantData.length > 0 ? quadrantData : [{ name: 'No Data', value: 1, color: '#27272a' }]}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={110}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {quadrantData.length > 0 ? (
                                quadrantData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" />
                                ))
                              ) : (
                                <Cell fill="#27272a" stroke="none" />
                              )}
                            </Pie>
                            {quadrantData.length > 0 && (
                              <RechartsTooltip
                                cursor={false}
                                contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.95)', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => formatCurrent(value)}
                                wrapperStyle={{ zIndex: 1000 }}
                                position={{ x: 0, y: 0 }}
                              />
                            )}
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text - Hidden on mobile */}
                        <div className="absolute hidden lg:block" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                          <div className="text-center">
                            <div className="text-xs text-zinc-500 mb-1">Total</div>
                            <div className="text-lg font-bold text-white whitespace-nowrap">
                              {formatCurrent(snapshotData.cashflow.totalIncome)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Total below chart on mobile */}
                      <div className="lg:hidden text-center mt-4">
                        <div className="text-xs text-zinc-500 mb-1">Total</div>
                        <div className="text-xl font-bold text-white">
                          {formatCurrent(snapshotData.cashflow.totalIncome)}
                        </div>
                      </div>

                      {/* Legend below chart */}
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {quadrantData.map((entry, index) => (
                          <div key={`legend-${index}`} className="flex items-center gap-2">
                            <div style={{ width: 12, height: 12, backgroundColor: entry.color, borderRadius: '50%' }} />
                            <span className="text-sm text-zinc-300">{entry.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="w-full lg:w-auto lg:min-w-60 lg:max-w-xs">
                      <div className="flex flex-col lg:grid lg:grid-cols-1 gap-3 text-sm mr-4">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ width: 10, height: 10, background: QUADRANT_COLORS.EMPLOYEE, borderRadius: 999 }} className="shrink-0" />
                            <span className="text-zinc-400 truncate">Employee</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold whitespace-nowrap">{formatHistorical(snapshotData.incomeQuadrant.EMPLOYEE.amount, snapshotData.currency)}</div>
                            <div className="text-xs text-zinc-500">{snapshotData.incomeQuadrant.EMPLOYEE.pct.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ width: 10, height: 10, background: QUADRANT_COLORS.SELF_EMPLOYED, borderRadius: 999 }} className="shrink-0" />
                            <span className="text-zinc-400 truncate">Self-Employed</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold whitespace-nowrap">{formatHistorical(snapshotData.incomeQuadrant.SELF_EMPLOYED.amount, snapshotData.currency)}</div>
                            <div className="text-xs text-zinc-500">{snapshotData.incomeQuadrant.SELF_EMPLOYED.pct.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ width: 10, height: 10, background: QUADRANT_COLORS.BUSINESS_OWNER, borderRadius: 999 }} className="shrink-0" />
                            <span className="text-zinc-400 truncate">Business Owner</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold whitespace-nowrap">{formatHistorical(snapshotData.incomeQuadrant.BUSINESS_OWNER.amount, snapshotData.currency)}</div>
                            <div className="text-xs text-zinc-500">{snapshotData.incomeQuadrant.BUSINESS_OWNER.pct.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ width: 10, height: 10, background: QUADRANT_COLORS.INVESTOR, borderRadius: 999 }} className="shrink-0" />
                            <span className="text-zinc-400 truncate">Investor</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold whitespace-nowrap">{formatHistorical(snapshotData.incomeQuadrant.INVESTOR.amount, snapshotData.currency)}</div>
                            <div className="text-xs text-zinc-500">{snapshotData.incomeQuadrant.INVESTOR.pct.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Health Metrics */}
                <StatCard
                  title="Runway"
                  value={`${snapshotData.financialHealth.runway >= 999 ? '∞' : snapshotData.financialHealth.runway} Months`}
                  className="col-span-1"
                />
                <StatCard
                  title="Asset Efficiency"
                  value={`${snapshotData.financialHealth.assetEfficiency}%`}
                  className="col-span-1"
                />
                <StatCard
                  title="Passive Coverage"
                  value={`${snapshotData.ratios.passiveCoverageRatio}%`}
                  className="col-span-1"
                />
                <StatCard
                  title={snapshotData.richFlowMetrics.freedomGap > 0 ? "Freedom Gap" : "Financial Freedom"}
                  value={
                    snapshotData.richFlowMetrics.freedomGap <= 0 ? (
                      <span className="text-[#eaca6a] font-bold">ACHIEVED</span>
                    ) : (
                      <span className="text-[#ff7d7e]">
                        -{formatHistorical(Math.abs(snapshotData.richFlowMetrics.freedomGap), snapshotData.currency)}
                      </span>
                    )
                  }
                  subValue={snapshotData.richFlowMetrics.freedomGap > 0 ? "To Go" : "Passive Income Covers Expenses"}
                  className="col-span-1"
                  accentColor={snapshotData.richFlowMetrics.freedomGap > 0 ? 'default' : 'gold'}
                />

              </div>
            )}

            {/* TIERED ANALYSIS SECTION - PRO Features Grid */}
            {snapshotData && (
              <div className="max-w-7xl mx-auto mb-6">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#eaca6a]" />
                    Advanced Analysis
                  </h2>
                  {tieredData && !tieredData.isPro && (
                    <span className="text-xs text-amber-400/70 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                      Upgrade to unlock
                    </span>
                  )}
                </div>

                {/* Tiered Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Col 1: Debt Quality Chart */}
                  <DebtQualityChart
                    data={tieredData?.advanced ?? null}
                    isPro={tieredData?.isPro ?? false}
                    onUpgrade={() => {
                      // TODO: Implement upgrade navigation
                      console.log('Navigate to upgrade page');
                    }}
                  />

                  {/* Col 2: Asset Efficiency Chart */}
                  <AssetEfficiencyChart
                    data={tieredData?.advanced ?? null}
                    isPro={tieredData?.isPro ?? false}
                    onUpgrade={() => {
                      // TODO: Implement upgrade navigation
                      console.log('Navigate to upgrade page');
                    }}
                  />
                </div>
              </div>
            )}

            {snapshotData && !trajectoryMetrics && !trajectoryLoading && (
              <div className="max-w-7xl mx-auto mb-6 rounded-2xl bg-zinc-900/50 border border-white/5 p-8 text-center">
                <p className="text-zinc-400">No trajectory data available yet. Add financial data to see your progress over time.</p>
              </div>
            )}

            {trajectoryLoading && (
              <div className="max-w-7xl mx-auto mb-6 rounded-2xl bg-zinc-900/50 border border-white/5 p-8 text-center">
                <p className="text-zinc-400">Loading trajectory data...</p>
              </div>
            )}

            {trajectoryMetrics && snapshotData && (
              <>
                <div className="max-w-7xl mx-auto mb-6 rounded-2xl bg-linear-to-br from-zinc-900/80 to-zinc-900/60 border border-[#eaca6a]/20 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#eaca6a] flex items-center gap-2">
                        <span>Financial Velocity & Freedom Trajectory</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Tracking your path to financial freedom: {trajectoryMetrics.startDate} → {trajectoryMetrics.endDate} ({trajectoryMetrics.dataPoints} data points)
                      </p>
                    </div>
                  </div>

                  {/* Key Trajectory Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                      title="Freedom Gap Evolution"
                      value={
                        <span className={trajectoryMetrics.freedomGap.end <= 0 ? 'text-[#41d288]' : 'text-[#ff7d7e]'}>
                          {trajectoryMetrics.freedomGap.end <= 0 ? 0 : formatCurrencyValue(trajectoryMetrics.freedomGap.end, currency)}
                        </span>
                      }
                      subValue={
                        trajectoryMetrics.freedomGap.crossoverDate
                          ? `Freedom achieved on ${trajectoryMetrics.freedomGap.crossoverDate}`
                          : `${trajectoryMetrics.freedomGap.change > 0 ? 'Gap Widening' : 'Gap Closing'}`
                      }
                      trend={trajectoryMetrics.freedomGap.trendPercent}
                      invertTrendColor={true}
                      accentColor="gold"
                    />

                    <StatCard
                      title="Wealth Velocity Shift"
                      value={`${trajectoryMetrics.wealthVelocity.end.toFixed(2)}%`}
                      subValue={`${trajectoryMetrics.wealthVelocity.change >= 0 ? '+' : ''}${trajectoryMetrics.wealthVelocity.change.toFixed(2)}% change`}
                      trend={trajectoryMetrics.wealthVelocity.change}
                    />

                    <StatCard
                      title="Net Worth Growth"
                      value={formatCurrencyValue(trajectoryMetrics.netWorth.change, currency)}
                      subValue={`${trajectoryMetrics.netWorth.growthRate.toFixed(1)}% growth`}
                      trend={trajectoryMetrics.netWorth.growthRate}
                    />

                    <StatCard
                      title="Passive + Portfolio Growth"
                      value={formatCurrencyValue(trajectoryMetrics.passiveIncome.change, currency)}
                      subValue={`${trajectoryMetrics.passiveIncome.growthRate.toFixed(1)}% increase`}
                      trend={trajectoryMetrics.passiveIncome.growthRate}
                      accentColor="purple"
                    />
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                    {/* 1. The Rat Race Escape */}
                    <div className="p-3 md:p-6 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 md:mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#41d288]"></span>
                        The Rat Race Escape
                      </h3>
                      <div className="w-full h-80 chart-container-responsive" style={{ width: '100%', height: 320, minHeight: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <ComposedChart data={processedTrajectory} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                            <defs>
                              <linearGradient id="colorPassive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#41d288" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#41d288" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff7d7e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ff7d7e" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorSurplus" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#41d288" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#41d288" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="#71717a"
                              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              tick={{ fontSize: 10, fill: '#71717a' }}
                              style={{ background: 'none' }}
                            />
                            <YAxis
                              stroke="#71717a"
                              tickFormatter={(val) => `${getCurrencySymbol(currency)}${val / 1000}k`}
                              tick={{ fontSize: 12, fill: '#71717a' }}
                              style={{ background: 'none' }}
                              domain={['auto', 'auto']}
                            />
                            <RechartsTooltip content={<ChartTooltip />} />
                            <Legend iconSize={10} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} verticalAlign="bottom" />
                            <Line type="monotone" dataKey="totalExpenses" name="Expenses" stroke="#ff7d7e" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="combinedPassiveIncome" name="Passive + Portfolio Income" stroke="#41d288" strokeWidth={2} dot={false} />


                            {/* Crossover Point */}
                            {processedTrajectory.map((p, idx) => {
                              const prev = processedTrajectory[idx - 1];
                              if (idx > 0 && p.combinedPassiveIncome >= p.totalExpenses && prev.combinedPassiveIncome < prev.totalExpenses) {
                                return (
                                  <ReferenceDot key={p.date} x={p.date} y={p.combinedPassiveIncome} r={6} fill="#41d288" stroke="#18181b" />
                                );
                              }
                              return null;
                            })}

                            {processedTrajectory.filter(p => p.currencyChanged).map(p => (
                              <ReferenceLine key={`cur-rr-${p.date}`} x={p.date} stroke="#eaca6a" strokeDasharray="4 2" label={{ value: p.currency, position: 'top', fill: '#eaca6a', fontSize: 10 }} />
                            ))}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 2. Net Worth & Velocity */}
                    <div className="p-3 md:p-6 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 md:mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#eaca6a]"></span>
                        Net Worth & Velocity
                      </h3>
                      <div className="w-full h-80 chart-container-responsive" style={{ width: '100%', height: 320, minHeight: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <ComposedChart data={processedTrajectory} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                            <defs>
                              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eaca6a" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#eaca6a" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="#71717a"
                              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              tick={{ fontSize: 10, fill: '#71717a' }}
                              style={{ background: 'none' }}
                            />
                            <YAxis
                              yAxisId="left"
                              stroke="#eaca6a"
                              tickFormatter={(val) => `${getCurrencySymbol(currency)}${val / 1000}k`}
                              tick={{ fontSize: 12, fill: '#eaca6a' }}
                              style={{ background: 'none' }}
                              domain={['auto', 'auto']}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#794cb5"
                              tickFormatter={(val) => `${val.toFixed(1)}%`}
                              tick={{ fontSize: 12 }}
                              domain={['auto', 'auto']}
                            />
                            <RechartsTooltip content={<ChartTooltip />} />
                            <Legend iconSize={10} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} verticalAlign="bottom" />
                            <Line yAxisId="left" type="monotone" dataKey="netWorth" name="Net Worth" stroke="#eaca6a" strokeWidth={2} dot={false} />
                            <Bar yAxisId="right" dataKey="netWorthDelta" name="Wealth Velocity" fill="#794cb5" radius={[4, 4, 0, 0]} />
                            {processedTrajectory.filter(p => p.currencyChanged).map(p => (
                              <ReferenceLine key={`cur-nw-${p.date}`} x={p.date} stroke="#eaca6a" strokeDasharray="4 2" />
                            ))}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 3. Asset Efficiency Trend */}
                    <div className="p-3 md:p-6 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 md:mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#794cb5]"></span>
                        Asset Efficiency (ROA)
                      </h3>
                      <div className="w-full h-80 chart-container-responsive" style={{ width: '100%', height: 320, minHeight: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <LineChart data={processedTrajectory} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                            <defs>
                              <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#794cb5" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#794cb5" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="#71717a"
                              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              tick={{ fontSize: 10, fill: '#71717a' }}
                              style={{ background: 'none' }}
                            />
                            <YAxis
                              stroke="#71717a"
                              tickFormatter={(val) => `${val}%`}
                              tick={{ fontSize: 12, fill: '#71717a' }}
                              style={{ background: 'none' }}
                              domain={['auto', 'auto']}
                            />
                            <RechartsTooltip content={<ChartTooltip />} />
                            <Legend iconSize={10} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} verticalAlign="bottom" />
                            <Line type="monotone" dataKey="assetEfficiency" name="Return on Assets" stroke="#794cb5" strokeWidth={2} dot={false} />
                            {processedTrajectory.filter(p => p.currencyChanged).map(p => (
                              <ReferenceLine key={`cur-roa-${p.date}`} x={p.date} stroke="#eaca6a" strokeDasharray="4 2" />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 4. Quadrant Evolution */}
                    <div className="p-3 md:p-6 rounded-xl bg-zinc-900/50 border border-white/5">
                      <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 md:mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#eaca6a]"></span>
                        Quadrant Evolution
                      </h3>
                      <div className="w-full h-80 chart-container-responsive" style={{ width: '100%', height: 320, minHeight: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <AreaChart data={processedTrajectory} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="#71717a"
                              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                              tick={{ fontSize: 10, fill: '#71717a' }}
                              style={{ background: 'none' }}
                            />
                            <YAxis
                              stroke="#71717a"
                              tickFormatter={(val) => `${val.toFixed(0)}%`}
                              tick={{ fontSize: 12, fill: '#71717a' }}
                              style={{ background: 'none' }}
                              domain={[0, 100]}
                            />
                            <RechartsTooltip content={<ChartTooltip />} />
                            <Legend iconSize={10} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} verticalAlign="bottom" />
                            <Area type="monotone" dataKey="quadrantPct.EMPLOYEE" name="Employee" stackId="1" stroke={QUADRANT_COLORS.EMPLOYEE} fill={QUADRANT_COLORS.EMPLOYEE} />
                            <Area type="monotone" dataKey="quadrantPct.SELF_EMPLOYED" name="Self-Employed" stackId="1" stroke={QUADRANT_COLORS.SELF_EMPLOYED} fill={QUADRANT_COLORS.SELF_EMPLOYED} />
                            <Area type="monotone" dataKey="quadrantPct.BUSINESS_OWNER" name="Business Owner" stackId="1" stroke={QUADRANT_COLORS.BUSINESS_OWNER} fill={QUADRANT_COLORS.BUSINESS_OWNER} />
                            <Area type="monotone" dataKey="quadrantPct.INVESTOR" name="Investor" stackId="1" stroke={QUADRANT_COLORS.INVESTOR} fill={QUADRANT_COLORS.INVESTOR} />
                            {processedTrajectory.filter(p => p.currencyChanged).map(p => (
                              <ReferenceLine key={`cur-iq-${p.date}`} x={p.date} stroke="#eaca6a" strokeDasharray="4 2" />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div >
      </div >
    </div >
  );
};

export default Analysis;
