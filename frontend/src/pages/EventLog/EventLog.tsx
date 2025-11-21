import React, { useEffect, useMemo, useState } from 'react';
import './EventLog.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { incomeAPI, assetsAPI, liabilitiesAPI, expensesAPI } from '../../utils/api';

type EventType = 'Income' | 'Expense' | 'Asset' | 'Liability';

interface FinancialEvent {
  id: string;
  timestamp: string;
  type: EventType;
  description: string;
  valueChange: number;
}

const EventLog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // Parallel fetch of financial data
        const [incomeLinesRaw, assetsRaw, liabilitiesRaw, expensesRaw] = await Promise.all([
          incomeAPI.getIncomeLines().catch(() => []),
          assetsAPI.getAssets().catch(() => []),
          liabilitiesAPI.getLiabilities().catch(() => []),
          expensesAPI.getExpenses().catch(() => []),
        ]);

        const incomeLines = Array.isArray(incomeLinesRaw) ? incomeLinesRaw : [];
        const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
        const liabilities = Array.isArray(liabilitiesRaw) ? liabilitiesRaw : [];
        const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];

        const buildTimestamp = (item: any): string => {
          // Prefer createdAt or updatedAt if present; fallback to now
          return item?.createdAt || item?.updatedAt || new Date().toISOString();
        };

        const synthesized: FinancialEvent[] = [];

        // Fixed first event: user registration
        const registrationTs = user?.createdAt || user?.created_at || user?.created || new Date().toISOString();
        synthesized.push({
          id: 'start',
            timestamp: registrationTs,
          type: 'Asset',
          description: 'Starting Balance',
          valueChange: 0,
        });

        // Income (Earned, Portfolio, Passive) all treated as type 'Income'
        for (const line of incomeLines) {
          const amount = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount);
          if (isNaN(amount)) continue;
          const prefix =
            line.type === 'Earned'
              ? 'Added Income'
              : line.type === 'Portfolio'
              ? 'Added Portfolio'
              : line.type === 'Passive'
              ? 'Added Passive'
              : 'Added Income';
          synthesized.push({
            id: `income-${line.id}`,
            timestamp: buildTimestamp(line),
            type: 'Income',
            description: `${prefix}: ${line.name}`,
            valueChange: Math.abs(amount), // positive
          });
        }

        // Assets
        for (const a of assets) {
          const value = typeof a.value === 'number' ? a.value : parseFloat(a.value);
          if (isNaN(value)) continue;
          synthesized.push({
            id: `asset-${a.id}`,
            timestamp: buildTimestamp(a),
            type: 'Asset',
            description: `Added Asset: ${a.name}`,
            valueChange: Math.abs(value), // positive
          });
        }

        // Liabilities (negative)
        for (const l of liabilities) {
          const value = typeof l.value === 'number' ? l.value : parseFloat(l.value);
          if (isNaN(value)) continue;
          synthesized.push({
            id: `liability-${l.id}`,
            timestamp: buildTimestamp(l),
            type: 'Liability',
            description: `Logged Liability: ${l.name}`,
            valueChange: -Math.abs(value), // negative
          });
        }

        // Expenses (negative)
        for (const e of expenses) {
          const amount = typeof e.amount === 'number' ? e.amount : parseFloat(e.amount);
          if (isNaN(amount)) continue;
          synthesized.push({
            id: `expense-${e.id}`,
            timestamp: buildTimestamp(e),
            type: 'Expense',
            description: `Logged Expense: ${e.name}`,
            valueChange: -Math.abs(amount), // negative
          });
        }

        // Sort chronological with registration first (ascending by timestamp)
        synthesized.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setEvents(synthesized);
      } catch (err: any) {
        setError(err?.message || 'Failed to build event log');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [user]);

  const filtered = useMemo(() => {
    return events
      .filter(ev => {
        // Exclude Starting Balance from type-filtered views unless "All"
        if (ev.id === 'start' && typeFilter !== 'All') return false;
        if (typeFilter !== 'All' && ev.type !== typeFilter) return false;
        if (startDate && new Date(ev.timestamp) < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date(ev.timestamp) > end) return false;
        }
        if (search) {
          const s = search.toLowerCase();
          return (ev.description + ' ' + ev.type).toLowerCase().includes(s);
        }
        return true;
      });
  }, [events, typeFilter, startDate, endDate, search]);

  const highlight = (text: string) => {
    if (!search) return text;
    const lc = text.toLowerCase();
    const s = search.toLowerCase();
    const parts: (string | JSX.Element)[] = [];
    let idx = 0;
    while (true) {
      const found = lc.indexOf(s, idx);
      if (found === -1) {
        parts.push(text.slice(idx));
        break;
      }
      if (found > idx) parts.push(text.slice(idx, found));
      parts.push(
        <span key={found} className="ev-highlight">
          {text.slice(found, found + s.length)}
        </span>
      );
      idx = found + s.length;
    }
    return <>{parts}</>;
  };

  const clearFilters = () => {
    setTypeFilter('All');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  return (
    <div className="event-log-page">
      <div className="event-log-header">
        <button
          type="button"
          className="event-log-back-btn"
          onClick={() => navigate('/dashboard')}
          aria-label="Back to Dashboard"
        >
          Back to Dashboard
        </button>
        <h1 className="event-log-title">Financial Event Log</h1>
        <div className="event-log-filters">
          <div className="filter-group">
            <label>Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
              <option value="All">All</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-row">
              <input
                type="text"
                placeholder="Search description or type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                className="clear-btn"
                onClick={clearFilters}
                disabled={!search && !startDate && !endDate && typeFilter === 'All'}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="event-log-body">
        {loading && <div className="status-msg">Loading events...</div>}
        {!loading && error && <div className="status-msg">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="status-empty">No matching events.</div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <table className="event-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Description</th>
                <th className="col-change">Change</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => {
                const ts = new Date(ev.timestamp);
                // Updated to always show + or - explicitly
                const changeFmt =
                  (ev.valueChange >= 0 ? '+' : '-') + Math.abs(ev.valueChange).toLocaleString();
                return (
                  <tr key={ev.id} className={`row-${ev.type.toLowerCase()}`}>
                    <td>
                      <div className="ts-main">{ts.toLocaleString()}</div>
                      <div className="ts-sub">{ts.toISOString()}</div>
                    </td>
                    <td className="type-cell">
                      {/* Hide type badge for Starting Balance row */}
                      {ev.id !== 'start' ? (
                        <span className={`badge badge-${ev.type.toLowerCase()}`}>{ev.type}</span>
                      ) : (
                        null
                      )}
                    </td>
                    <td className="desc-cell">{highlight(ev.description)}</td>
                    <td className={`change-cell ${ev.valueChange >= 0 ? 'pos' : 'neg'}`}>
                      {changeFmt}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EventLog;
