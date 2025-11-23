import * as React from 'react';
import { JSX, useEffect, useMemo, useState } from 'react';
import './EventLog.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventsAPI } from '../../utils/api';

type EventType = 'Income' | 'Expense' | 'Asset' | 'Liability' | 'Removed' | 'Cash';

interface FinancialEvent {
  id: string;
  timestamp: string;
  type: EventType;
  description: string;
  valueChange: number;
}

const parseNum = (v: any) => (typeof v === 'number' ? v : parseFloat(v));

const usePerUserKeys = (user: any) => {
  const uid = (user && (user.id || user.userId || user.uid)) || 'anon';
  return {
    removedKey: `eventlog:removed:user:${uid}`,
    deletedKey: `eventlog:deleted:user:${uid}`,
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

// Map server entity types to display types
const mapEntityType = (entityType: string, actionType?: string): EventType => {
  switch ((entityType || '').toUpperCase()) {
    case 'INCOME':
      return actionType === 'DELETE' ? 'Removed' : 'Income';
    case 'EXPENSE':
      return actionType === 'DELETE' ? 'Removed' : 'Expense';
    case 'ASSET':
      return actionType === 'DELETE' ? 'Removed' : 'Asset';
    case 'LIABILITY':
      return actionType === 'DELETE' ? 'Removed' : 'Liability';
    case 'CASH_SAVINGS':
      return 'Cash';
    default:
      return 'Removed';
  }
};

// Compute signed value change based on entity and action
const computeValueChange = (
  entityType: string,
  actionType: string,
  beforeValue?: any,
  afterValue?: any
): number => {
  const et = (entityType || '').toUpperCase();
  const at = (actionType || '').toUpperCase();
  const pick = (obj: any) =>
    obj && (typeof obj.amount === 'number' || typeof obj.amount === 'string'
      ? parseNum(obj.amount)
      : typeof obj.value === 'number' || typeof obj.value === 'string'
      ? parseNum(obj.value)
      : 0);

  if (at === 'DELETE') {
    const v = pick(beforeValue);
    if (et === 'EXPENSE' || et === 'LIABILITY') return Math.abs(v); // removal reduces outflow/liability
    if (et === 'INCOME' || et === 'ASSET') return -Math.abs(v); // removal loses income/asset
    return 0;
  }
  // CREATE/UPDATE reflects current afterValue impact
  const v = pick(afterValue);
  if (et === 'EXPENSE' || et === 'LIABILITY') return -Math.abs(v);
  if (et === 'INCOME' || et === 'ASSET' || et === 'CASH_SAVINGS') return Math.abs(v);
  return 0;
};

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

  const { removedKey, deletedKey } = usePerUserKeys(user);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Delete handler
  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDeletedIds(deletedKey, next);
      // If it was a persisted removed event, purge from that storage too
      const persistedRemoved = loadRemovedEvents(removedKey);
      if (persistedRemoved.some(ev => ev.id === id)) {
        const remaining = persistedRemoved.filter(ev => ev.id !== id);
        saveRemovedEvents(removedKey, remaining);
      }
      return next;
    });
  };

  useEffect(() => {
    // Initialize deleted IDs on mount
    setDeletedIds(loadDeletedIds(deletedKey));
  }, [deletedKey]);

  useEffect(() => {
    const loadFromApi = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {};
        if (startDate) params.startDate = startDate; // backend accepts ISO/DATE
        if (endDate) params.endDate = endDate;       // inclusive handled backend-side
        // apply entity type filter if not All
        if (typeFilter !== 'All') {
          const map: Record<string, string> = {
            Income: 'INCOME',
            Expense: 'EXPENSE',
            Asset: 'ASSET',
            Liability: 'LIABILITY',
            Removed: '',
            Cash: 'CASH_SAVINGS',
          };
          if (map[typeFilter]) params.entityType = map[typeFilter];
        }

        const data = await eventsAPI.getEvents(params);
        const apiEvents: any[] = Array.isArray(data?.events) ? data.events : [];

        const transformed: FinancialEvent[] = apiEvents.map((ev: any) => {
          const afterValue = ev.afterValue ? JSON.parse(ev.afterValue) : undefined;
          const beforeValue = ev.beforeValue ? JSON.parse(ev.beforeValue) : undefined;
          const type = mapEntityType(ev.entityType, ev.actionType);
          const valueChange = computeValueChange(ev.entityType, ev.actionType, beforeValue, afterValue);

          let desc = '';
          const name = (afterValue?.name || beforeValue?.name || '').toString();
          const prefix = ev.actionType === 'DELETE' ? 'Removed' : ev.actionType === 'UPDATE' ? 'Updated' : 'Created';
          switch ((ev.entityType || '').toUpperCase()) {
            case 'INCOME': desc = `${prefix}: Income${name ? ' - ' + name : ''}`; break;
            case 'EXPENSE': desc = `${prefix}: Expense${name ? ' - ' + name : ''}`; break;
            case 'ASSET': desc = `${prefix}: Asset${name ? ' - ' + name : ''}`; break;
            case 'LIABILITY': desc = `${prefix}: Liability${name ? ' - ' + name : ''}`; break;
            case 'CASH_SAVINGS': desc = `${prefix}: Cash Savings`; break;
            case 'USER': desc = `Account Created`; break;
            default: desc = `${prefix}: ${ev.entityType}`;
          }

          return {
            id: String(ev.id),
            timestamp: ev.timestamp,
            type,
            description: desc,
            valueChange,
          } as FinancialEvent;
        });

        // Keep any locally persisted "Removed" events if present
        const existingRemoved = loadRemovedEvents(removedKey);

        // Filter out locally deleted ids
        const localDeleted = loadDeletedIds(deletedKey);
        const merged = [...transformed, ...existingRemoved].filter(ev => !localDeleted.has(ev.id));

        merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setEvents(merged);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadFromApi();
  }, [typeFilter, startDate, endDate, deletedKey, removedKey]);

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
              <option value="Removed">Removed</option>
              <option value="Cash">Cash</option>
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
                      {(() => {
                        const sym = user?.preferredCurrency?.cur_symbol || '$';
                        // keep explicit sign (+/-) and prepend currency symbol
                        const abs = Math.abs(ev.valueChange).toLocaleString();
                        return (ev.id === 'start')
                          ? `${sym}${abs}`
                          : `${ev.valueChange >= 0 ? '+' : '-'}${sym}${abs}`;
                      })()}
                    </td>
                    <td>
                      {ev.id !== 'start' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="clear-btn"
                          style={{ padding: '0.3rem 0.6rem' }}
                          title="Delete log"
                        >
                          ×
                        </button>
                      )}
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
