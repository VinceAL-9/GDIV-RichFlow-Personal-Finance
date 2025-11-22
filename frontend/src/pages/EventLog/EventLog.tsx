import * as React from 'react';
import { JSX, useEffect, useMemo, useState } from 'react';
import './EventLog.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { incomeAPI, assetsAPI, liabilitiesAPI, expensesAPI, eventsAPI } from '../../utils/api';

type EventType = 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'CASH_SAVINGS';

interface BackendEvent {
  id: number;
  timestamp: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: EventType;
  entitySubtype: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  userId: number;
  entityId: number;
}

interface FinancialEvent {
  id: string;
  timestamp: string;
  type: EventType;
  description: string;
  valueChange: number;
}

// Helpers for snapshot + removed events persistence (per user)
type Snapshot = {
  incomes: Record<string, { subtype: 'Earned' | 'Portfolio' | 'Passive'; amount: number }>;
  expenses: Record<string, { amount: number }>;
  liabilities: Record<string, { value: number }>;
};

const parseNum = (v: any) => (typeof v === 'number' ? v : parseFloat(v));

const usePerUserKeys = (user: any) => {
  const uid = (user && (user.id || user.userId || user.uid)) || 'anon';
  return {
    removedKey: `eventlog:removed:user:${uid}`,
    snapKey: `eventlog:snapshot:user:${uid}`,
    deletedKey: `eventlog:deleted:user:${uid}`, // added
  };
};

const loadRemovedEvents = (key: string): FinancialEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const saveRemovedEvents = (key: string, events: FinancialEvent[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(events));
  } catch {}
};

// Added deleted events helpers
const loadDeletedIds = (key: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
};

const saveDeletedIds = (key: string, ids: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {}
};

const loadSnapshot = (key: string): Snapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
};

const saveSnapshot = (key: string, snap: Snapshot) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(snap));
  } catch {}
};

  actionType: string;
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
    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch events from backend
        const response = await eventsAPI.getEvents({ limit: 1000 });
        const backendEvents: BackendEvent[] = response.events || [];

        // Transform backend events to display format
        const transformedEvents: FinancialEvent[] = [];

        // Add starting balance event
        const registrationTs = (user as any)?.createdAt || (user as any)?.created_at || (user as any)?.created || new Date().toISOString();
        transformedEvents.push({
          id: 'start',
          timestamp: registrationTs,
          type: 'ASSET',
          description: 'Starting Balance',
          valueChange: 0,
          actionType: 'CREATE',
        });

        // Transform each backend event
        for (const event of backendEvents) {
          const afterData = event.afterValue ? JSON.parse(event.afterValue) : null;
          const beforeData = event.beforeValue ? JSON.parse(event.beforeValue) : null;
          
          let description = '';
          let valueChange = 0;
          
          // Build description based on action type and entity type
          if (event.actionType === 'CREATE') {
            const name = afterData?.name || 'Unknown';
            const amount = afterData?.amount || afterData?.value || 0;
            
            if (event.entityType === 'INCOME') {
              const subtype = event.entitySubtype || afterData?.type || 'Income';
              description = `Added ${subtype} Income: ${name}`;
              valueChange = Math.abs(amount);
            } else if (event.entityType === 'EXPENSE') {
              description = `Logged Expense: ${name}`;
              valueChange = -Math.abs(amount);
            } else if (event.entityType === 'ASSET') {
              description = `Added Asset: ${name}`;
              valueChange = Math.abs(amount);
            } else if (event.entityType === 'LIABILITY') {
              description = `Logged Liability: ${name}`;
              valueChange = -Math.abs(amount);
            } else if (event.entityType === 'CASH_SAVINGS') {
              description = `Updated Cash Savings`;
              valueChange = Math.abs(amount);
            }
          } else if (event.actionType === 'UPDATE') {
            const name = afterData?.name || beforeData?.name || 'Unknown';
            const afterAmount = afterData?.amount || afterData?.value || 0;
            const beforeAmount = beforeData?.amount || beforeData?.value || 0;
            const diff = afterAmount - beforeAmount;
            
            if (event.entityType === 'INCOME') {
              const subtype = event.entitySubtype || afterData?.type || 'Income';
              description = `Updated ${subtype} Income: ${name}`;
              valueChange = diff;
            } else if (event.entityType === 'EXPENSE') {
              description = `Updated Expense: ${name}`;
              valueChange = -Math.abs(diff);
            } else if (event.entityType === 'ASSET') {
              description = `Updated Asset: ${name}`;
              valueChange = diff;
            } else if (event.entityType === 'LIABILITY') {
              description = `Updated Liability: ${name}`;
              valueChange = -diff;
            } else if (event.entityType === 'CASH_SAVINGS') {
              description = `Updated Cash Savings`;
              valueChange = diff;
            }
          } else if (event.actionType === 'DELETE') {
            const name = beforeData?.name || 'Unknown';
            const amount = beforeData?.amount || beforeData?.value || 0;
            
            if (event.entityType === 'INCOME') {
              const subtype = event.entitySubtype || beforeData?.type || 'Income';
              description = `Removed ${subtype} Income: ${name}`;
              valueChange = -Math.abs(amount);
            } else if (event.entityType === 'EXPENSE') {
              description = `Removed Expense: ${name}`;
              valueChange = Math.abs(amount); // Removing expense is positive
            } else if (event.entityType === 'ASSET') {
              description = `Removed Asset: ${name}`;
              valueChange = -Math.abs(amount);
            } else if (event.entityType === 'LIABILITY') {
              description = `Removed Liability: ${name}`;
              valueChange = Math.abs(amount); // Removing liability is positive
            }
          }

          transformedEvents.push({
            id: `event-${event.id}`,
            timestamp: event.timestamp,
            type: event.entityType,
            description,
            valueChange,
            actionType: event.actionType,
          });
        }

        // Sort chronologically (ascending by timestamp)
        transformedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setEvents(transformedEvents);
      } catch (err: any) {
        setError(err?.message || 'Failed to load event log');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
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
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="CASH_SAVINGS">Cash Savings</option>
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
                        <span className={`badge badge-${ev.type.toLowerCase().replace('_', '-')}`}>
                          {ev.type.replace('_', ' ')}
                        </span>
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
