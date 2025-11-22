import React from 'react';
import './Analysis.css';
import Sidebar from '../../components/Sidebar/Sidebar';
import '../../components/Header/Header.css';
import Header from '../../components/Header/Header';
import { useAuth } from '../../context/AuthContext';
import { analysisAPI } from '../../utils/api';
import { formatCurrency as formatCurrencyValue } from '../../utils/currency.utils';

type SnapshotData = {
  date: string;
  balanceSheet: {
    totalCashBalance: number;
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
  incomeQuadrant: {
    EMPLOYEE: number;
    SELF_EMPLOYED: number;
    BUSINESS_OWNER: number;
    INVESTOR: number;
  };
};

type SavedSnapshot = {
  id: string;
  date: string;
  data: SnapshotData;
  currency: { symbol: string; name: string }; // added to persist original currency
};

// --- Historical currency mapping helpers (localStorage) ---
type CurrencyRecord = { date: string; symbol: string; name: string };
const currencyHistoryKey = (userId: string | number | undefined) => `analysis:currencyHistory:user:${userId ?? 'anon'}`;

/**
 * Load currency history (sorted ascending by date)
 */
const loadCurrencyHistory = (userId: string | number | undefined): CurrencyRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(currencyHistoryKey(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(r => r?.date && r?.symbol && r?.name);
  } catch {
    return [];
  }
};

/**
 * Save currency history
 */
const saveCurrencyHistory = (userId: string | number | undefined, records: CurrencyRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(currencyHistoryKey(userId), JSON.stringify(records));
  } catch {}
};

/**
 * Ensure we record the current preferred currency if changed since last record.
 */
const recordCurrentCurrencyIfNeeded = (userId: string | number | undefined, preferredCurrency: any) => {
  if (!preferredCurrency) return;
  const records = loadCurrencyHistory(userId);
  const today = new Date().toISOString().substring(0, 10);
  const last = records[records.length - 1];
  if (!last || last.symbol !== preferredCurrency.cur_symbol) {
    // Append new record (use today's date)
    records.push({
      date: today,
      symbol: preferredCurrency.cur_symbol || '$',
      name: preferredCurrency.cur_name || preferredCurrency.cur_symbol || '$'
    });
    saveCurrencyHistory(userId, records);
  }
};

/**
 * Get currency for a snapshot date using latest record whose date <= snapshotDate.
 * Falls back to last record or provided current currency.
 */
const resolveHistoricalCurrency = (
  userId: string | number | undefined,
  snapshotDate: string,
  currentPreferred: any
): { symbol: string; name: string } => {
  const records = loadCurrencyHistory(userId);
  if (records.length === 0) {
    return {
      symbol: currentPreferred?.cur_symbol || '$',
      name: currentPreferred?.cur_name || currentPreferred?.cur_symbol || '$'
    };
  }
  // Find latest record not after snapshotDate
  const targetTs = new Date(snapshotDate).getTime();
  let chosen: CurrencyRecord | null = null;
  for (const r of records) {
    const rTs = new Date(r.date).getTime();
    if (rTs <= targetTs) {
      if (!chosen || new Date(chosen.date).getTime() < rTs) {
        chosen = r;
      }
    }
  }
  if (chosen) return { symbol: chosen.symbol, name: chosen.name };
  // If all records are after snapshotDate, use earliest
  return { symbol: records[0].symbol, name: records[0].name };
};

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [timelineOpen, setTimelineOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false);
  const [comparisonDate, setComparisonDate] = React.useState('');
  const [snapshotData, setSnapshotData] = React.useState<SnapshotData | null>(null);
  const [savedSnapshots, setSavedSnapshots] = React.useState<SavedSnapshot[]>([]);
  const [comparisonSnapshots, setComparisonSnapshots] = React.useState<SavedSnapshot[]>([]);
  const [isDragOverComparison, setIsDragOverComparison] = React.useState(false);

  const preferredCurrency = user?.preferredCurrency;

  // Record current currency if changed (runs once when user loaded / currency changes)
  React.useEffect(() => {
    recordCurrentCurrencyIfNeeded(user?.id, preferredCurrency);
  }, [user?.id, preferredCurrency]);

  // Determine which currency to use for current displayed snapshot
  const currentSnapshotCurrency = React.useMemo(() => {
    const date = snapshotData?.date || new Date().toISOString().substring(0, 10);
    return resolveHistoricalCurrency(user?.id, date, preferredCurrency);
  }, [snapshotData?.date, preferredCurrency, user?.id]);

  // Historical currency formatter (per snapshot date)
  const formatHistorical = React.useCallback(
    (value: number, date: string) => {
      const histCurrency = resolveHistoricalCurrency(user?.id, date, preferredCurrency);
      return formatCurrencyValue(value, {
        cur_symbol: histCurrency.symbol,
        cur_name: histCurrency.name
      } as any);
    },
    [user?.id, preferredCurrency]
  );

  // Fetch financial snapshot
  const fetchSnapshot = async (date?: string) => {
    try {
      setLoading(true);
      const data = await analysisAPI.getFinancialSnapshot(date);
      setSnapshotData(data);
      // If no date provided, ensure selectedDate is cleared
      if (!date) {
        setSelectedDate('');
      }
    } catch (error) {
      console.error('Failed to fetch snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch (current state)
  React.useEffect(() => {
    fetchSnapshot();
  }, []);

  // Fetch when date changes
  React.useEffect(() => {
    if (selectedDate) {
      console.log('Fetching snapshot for date:', selectedDate);
      fetchSnapshot(selectedDate);
    }
  }, [selectedDate]);

  const handleSaveSnapshot = () => {
    if (!snapshotData) return;
    const histCurrency = resolveHistoricalCurrency(user?.id, snapshotData.date, preferredCurrency);
    const id = `${Date.now()}`;
    setSavedSnapshots(prev => [
      { id, date: snapshotData.date, data: snapshotData, currency: histCurrency },
      ...prev
    ]);
  };

  const handleRemoveSnapshot = (id: string) => {
    setSavedSnapshots(prev => prev.filter(s => s.id !== id));
  };

  const formatPercentage = (value: string) => `${value}%`;

  return (
    <div className="analysis-layout">
      <Header title="Analysis" hideActions />
      <div className="analysis-body">
        <Sidebar />
        <main className="analysis-main" aria-labelledby="analysis-title">
          <div className="analysis-spacer" />
          {loading && (
            <div className="analysis-loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <span>Loading financial history...</span>
            </div>
          )}
          {!loading && (
            <div className="analysis-grid">
              {/* Comparison Section */}
              <section
                className={`analysis-section comparison ${isDragOverComparison ? 'drag-over' : ''}`}
                aria-label="Compare snapshots between dates"
                onDragOver={(e) => { e.preventDefault(); setIsDragOverComparison(true); }}
                onDragLeave={() => setIsDragOverComparison(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverComparison(false);
                  const id = e.dataTransfer.getData('text/snapshot-id');
                  if (!id) return;
                  setComparisonSnapshots(prev => {
                    if (prev.some(s => s.id === id)) return prev;
                    const snap = savedSnapshots.find(s => s.id === id);
                    return snap ? [...prev, snap] : prev;
                  });
                }}
              >
                <div className="section-header">
                  <h2 className="section-heading">Comparison</h2>
                  <span className="section-note">Drag a snapshot note here</span>
                </div>
                <label className="compare-toggle">
                  <input
                    type="checkbox"
                    checked={comparisonEnabled}
                    onChange={(e) => setComparisonEnabled(e.target.checked)}
                  />
                  <span>Enable Date Comparison</span>
                </label>
                {comparisonEnabled && (
                  <div className="comparison-fields">
                    <input
                      type="date"
                      value={comparisonDate}
                      onChange={(e) => setComparisonDate(e.target.value)}
                    />
                    <button
                      className="btn-primary"
                      disabled={!comparisonDate}
                      onClick={async () => {
                        if (comparisonDate) {
                          const data = await analysisAPI.getFinancialSnapshot(comparisonDate);
                          const histCurrency = resolveHistoricalCurrency(user?.id, data.date, preferredCurrency);
                          const id = `${Date.now()}`;
                          setComparisonSnapshots(prev => [...prev, {
                            id,
                            date: data.date,
                            data,
                            currency: histCurrency
                          }]);
                        }
                      }}
                    >
                      Compare
                    </button>
                  </div>
                )}
                <div className="comparison-result">
                  {comparisonSnapshots.length === 0 && 'No comparison snapshots.'}
                  {comparisonSnapshots.length > 0 && (
                    <div className="comparison-snapshots">
                      {comparisonSnapshots.map(cs => (
                        <div key={cs.id} className="comparison-snapshot">
                          <button
                            className="comparison-remove"
                            aria-label="Remove comparison snapshot"
                            onClick={() => setComparisonSnapshots(prev => prev.filter(p => p.id !== cs.id))}
                          >×</button>
                          <div className="comparison-date">{cs.date}</div>
                          <div className="snapshot-metrics">
                            <h4>Balance Sheet</h4>
                            <ul>
                              <li><span>Total Cash:</span> {formatCurrencyValue(cs.data.balanceSheet.totalCashBalance, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Total Assets:</span> {formatCurrencyValue(cs.data.balanceSheet.totalAssets, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Total Liabilities:</span> {formatCurrencyValue(cs.data.balanceSheet.totalLiabilities, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Net Worth:</span> {formatCurrencyValue(cs.data.balanceSheet.netWorth, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                            </ul>
                            <h4>Cashflow</h4>
                            <ul>
                              <li><span>Earned Income:</span> {formatCurrencyValue(cs.data.cashflow.earnedIncome, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Passive Income:</span> {formatCurrencyValue(cs.data.cashflow.passiveIncome, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Portfolio Income:</span> {formatCurrencyValue(cs.data.cashflow.portfolioIncome, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Total Income:</span> {formatCurrencyValue(cs.data.cashflow.totalIncome, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Total Expenses:</span> {formatCurrencyValue(cs.data.cashflow.totalExpenses, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Net Cashflow:</span> {formatCurrencyValue(cs.data.cashflow.netCashflow, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                            </ul>
                            <h4>Ratios</h4>
                            <ul>
                              <li><span>Passive Coverage:</span> {formatPercentage(cs.data.ratios.passiveCoverageRatio)}</li>
                              <li><span>Savings Rate:</span> {formatPercentage(cs.data.ratios.savingsRate)}</li>
                            </ul>
                            <h4>Income Quadrant</h4>
                            <ul>
                              <li><span>Employee:</span> {formatCurrencyValue(cs.data.incomeQuadrant.EMPLOYEE, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Self-Employed:</span> {formatCurrencyValue(cs.data.incomeQuadrant.SELF_EMPLOYED, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Business Owner:</span> {formatCurrencyValue(cs.data.incomeQuadrant.BUSINESS_OWNER, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                              <li><span>Investor:</span> {formatCurrencyValue(cs.data.incomeQuadrant.INVESTOR, { cur_symbol: cs.currency.symbol, cur_name: cs.currency.name } as any)}</li>
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Snapshot Section */}
              <section className="analysis-section snapshot" aria-label="Financial snapshot for selected date">
                <div className="section-header">
                  <h2 className="section-heading">Snapshot</h2>
                  <span className="section-note">Choose date & save sticky notes</span>
                </div>
                <div className="snapshot-timeline-controls">
                  <button
                    className="chip"
                    onClick={() => setTimelineOpen(v => !v)}
                    aria-expanded={timelineOpen}
                  >
                    <span className="calendar-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 2a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1ZM5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Zm2 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4-2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                      </svg>
                    </span>
                    {timelineOpen ? 'Hide Calendar' : 'Timeline'}
                  </button>
                  {timelineOpen && (
                    <div className="timeline-picker">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {selectedDate && (
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedDate('');
                            fetchSnapshot();
                          }}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Reset to Current
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {selectedDate && (
                  <div style={{ 
                    padding: '0.5rem', 
                    marginTop: '0.5rem', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '4px', 
                    fontSize: '0.85rem',
                    color: '#1976d2'
                  }}>
                    📅 Viewing reconstructed state for: <strong>{selectedDate}</strong>
                  </div>
                )}

                {snapshotData && (
                  <>
                    <div className="snapshot-content">
                      <div className="snapshot-section">
                        <h3>Balance Sheet</h3>
                        <div className="snapshot-grid">
                          <div className="snapshot-card">
                            <div className="snapshot-label">Total Cash Balance</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.balanceSheet.totalCashBalance, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Total Assets</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.balanceSheet.totalAssets, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Total Liabilities</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.balanceSheet.totalLiabilities, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Net Worth</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.balanceSheet.netWorth, snapshotData.date)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="snapshot-section">
                        <h3>Cashflow</h3>
                        <div className="snapshot-grid">
                          <div className="snapshot-card">
                            <div className="snapshot-label">Earned Income</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.cashflow.earnedIncome, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Passive Income</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.cashflow.passiveIncome, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Portfolio Income</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.cashflow.portfolioIncome, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Total Income</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.cashflow.totalIncome, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Total Expenses</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.cashflow.totalExpenses, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className={`snapshot-value ${snapshotData.cashflow.direction}`}>
                              {formatHistorical(snapshotData.cashflow.netCashflow, snapshotData.date)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="snapshot-section">
                        <h3>Financial Ratios</h3>
                        <div className="snapshot-grid">
                          <div className="snapshot-card">
                            <div className="snapshot-label">Passive Coverage Ratio</div>
                            <div className="snapshot-value">
                              {formatPercentage(snapshotData.ratios.passiveCoverageRatio)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Savings Rate</div>
                            <div className="snapshot-value">
                              {formatPercentage(snapshotData.ratios.savingsRate)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="snapshot-section">
                        <h3>Income Quadrant Distribution</h3>
                        <div className="snapshot-grid">
                          <div className="snapshot-card">
                            <div className="snapshot-label">Employee</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.incomeQuadrant.EMPLOYEE, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Self-Employed</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.incomeQuadrant.SELF_EMPLOYED, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Business Owner</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.incomeQuadrant.BUSINESS_OWNER, snapshotData.date)}
                            </div>
                          </div>
                          <div className="snapshot-card">
                            <div className="snapshot-label">Investor</div>
                            <div className="snapshot-value">
                              {formatHistorical(snapshotData.incomeQuadrant.INVESTOR, snapshotData.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="snapshot-actions">
                      <button className="btn-primary" onClick={handleSaveSnapshot}>Save Snapshot</button>
                      <div style={{ fontSize: '.6rem', opacity: .7, marginTop: '.4rem' }}>
                        Displaying with historical currency: {currentSnapshotCurrency.symbol} ({currentSnapshotCurrency.name})
                      </div>
                    </div>
                  </>
                )}

                {savedSnapshots.length > 0 && (
                  <div className="sticky-notes">
                    {savedSnapshots.map(note => (
                      <div
                        key={note.id}
                        className="sticky-note"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/snapshot-id', note.id);
                        }}
                      >
                        <button className="note-close" onClick={() => handleRemoveSnapshot(note.id)} aria-label="Remove snapshot">×</button>
                        <div className="note-date">{note.date}</div>
                        <div className="note-summary">
                          <p>Net Worth: {formatCurrencyValue(note.data.balanceSheet.netWorth, { cur_symbol: note.currency.symbol, cur_name: note.currency.name } as any)}</p>
                          <p>Net Cashflow: {formatCurrencyValue(note.data.cashflow.netCashflow, { cur_symbol: note.currency.symbol, cur_name: note.currency.name } as any)}</p>
                          <p style={{ fontSize: '.6rem', opacity: .65 }}>Currency: {note.currency.symbol}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Analysis;
