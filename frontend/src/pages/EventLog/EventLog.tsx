import * as React from 'react';
import { JSX, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventLogsAPI } from '../../utils/api';

type EventType = 'Income' | 'Expense' | 'Asset' | 'Liability' | 'Cash' | 'User';

interface FinancialEvent {
  id: string;
  timestamp: string;
  type: EventType;
  description: string;
  valueChange: number;
  currencySymbol: string;
}

const parseNum = (v: any) => (typeof v === 'number' ? v : parseFloat(v));

const parseJsonIfNeeded = (val: any) => {
  if (!val) return undefined;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// Map server entity types to display types
const mapEntityType = (entityType: string, actionType?: string): EventType => {
  switch ((entityType || '').toUpperCase()) {
    case 'INCOME':
      return 'Income';
    case 'EXPENSE':
      return 'Expense';
    case 'ASSET':
      return 'Asset';
    case 'LIABILITY':
      return 'Liability';
    case 'CASH_SAVINGS':
      return 'Cash';
    case 'USER':
      return 'User';
    default:
      return 'User';
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
        : typeof obj.incomeLineAmount === 'number' || typeof obj.incomeLineAmount === 'string'
          ? parseNum(obj.incomeLineAmount)
          : typeof obj.liabilityValue === 'number' || typeof obj.liabilityValue === 'string'
            ? parseNum(obj.liabilityValue)
            : 0);

  // LINK/UNLINK events - show the linked amount
  if (at === 'LINK') {
    const v = pick(afterValue);
    return Math.abs(v); // Positive to show linked value
  }
  if (at === 'UNLINK') {
    const v = pick(beforeValue);
    return -Math.abs(v); // Negative to show unlinked value
  }

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

const ITEMS_PER_PAGE = 50;

const EventLog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencySegments, setCurrencySegments] = useState<{ startDate: number; symbol: string }[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const observer = useRef<IntersectionObserver | null>(null);
  const lastEventElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadEvents(false);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch currency history to determine historical symbols
  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        // Fetch all USER events to determine currency history
        const data = await eventLogsAPI.getEvents({ entityType: 'USER', limit: 1000 });
        const userEvents = (data?.events || []).filter((e: any) =>
          e.actionType === 'UPDATE' &&
          e.afterValue && parseJsonIfNeeded(e.afterValue).currencyCode
        );

        userEvents.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const segments: { startDate: number; symbol: string }[] = [];
        const currentSymbol = user.preferredCurrency?.cur_symbol || '$';

        if (userEvents.length > 0) {
          // Before first change
          const first = userEvents[0];
          const firstBefore = parseJsonIfNeeded(first.beforeValue);
          segments.push({
            startDate: 0,
            symbol: firstBefore?.currencyCode || '$'
          });

          // After each change
          userEvents.forEach((ev: any) => {
            const after = parseJsonIfNeeded(ev.afterValue);
            segments.push({
              startDate: new Date(ev.timestamp).getTime(),
              symbol: after.currencyCode
            });
          });
        } else {
          // No history, use current
          segments.push({ startDate: 0, symbol: currentSymbol });
        }

        setCurrencySegments(segments);
      } catch (err) {
        setCurrencySegments([{ startDate: 0, symbol: user?.preferredCurrency?.cur_symbol || '$' }]);
      } finally {
        setHistoryLoaded(true);
      }
    };

    fetchHistory();
  }, [user]);

  const loadEvents = async (isReset: boolean = false) => {
    if (!historyLoaded) return;

    const currentOffset = isReset ? 0 : offset;
    if (isReset) {
      setLoading(true);
      setEvents([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params: any = {
        limit: ITEMS_PER_PAGE,
        offset: currentOffset
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (debouncedSearch) params.search = debouncedSearch;

      if (typeFilter !== 'All') {
        const map: Record<string, string> = {
          Income: 'INCOME',
          Expense: 'EXPENSE',
          Asset: 'ASSET',
          Liability: 'LIABILITY',
          Cash: 'CASH_SAVINGS',
          User: 'USER',
        };
        if (map[typeFilter]) params.entityType = map[typeFilter];
      }

      const data = await eventLogsAPI.getEvents(params);
      const apiEvents: any[] = Array.isArray(data?.events) ? data.events : [];

      const transformed: FinancialEvent[] = apiEvents.map((ev: any) => {
        const afterValue = parseJsonIfNeeded(ev.afterValue);
        const beforeValue = parseJsonIfNeeded(ev.beforeValue);
        const type = mapEntityType(ev.entityType, ev.actionType);
        const valueChange = computeValueChange(ev.entityType, ev.actionType, beforeValue, afterValue);

        let desc = '';
        const name = (afterValue?.name || beforeValue?.name || '').toString();
        const actionUpper = (ev.actionType || '').toUpperCase();
        const entityUpper = (ev.entityType || '').toUpperCase();

        // Handle LINK/UNLINK events specially
        if (actionUpper === 'LINK' || actionUpper === 'UNLINK') {
          const linkPrefix = actionUpper === 'LINK' ? 'Linked' : 'Unlinked';
          const assetName = afterValue?.assetName || beforeValue?.assetName || 'Asset';
          const entitySubtype = (ev.entitySubtype || afterValue?.entitySubtype || '').toUpperCase();
          
          if (entitySubtype === 'INCOME_LINK' || afterValue?.incomeLineName) {
            const incomeName = afterValue?.incomeLineName || beforeValue?.incomeLineName || 'Income';
            desc = `${linkPrefix}: "${incomeName}" ${actionUpper === 'LINK' ? 'to' : 'from'} "${assetName}"`;
          } else if (entitySubtype === 'LIABILITY_LINK' || afterValue?.liabilityName) {
            const liabilityName = afterValue?.liabilityName || beforeValue?.liabilityName || 'Liability';
            desc = `${linkPrefix}: "${liabilityName}" ${actionUpper === 'LINK' ? 'to' : 'from'} "${assetName}"`;
          } else {
            desc = `${linkPrefix}: Item ${actionUpper === 'LINK' ? 'to' : 'from'} "${assetName}"`;
          }
        } else {
          const prefix = actionUpper === 'DELETE' ? 'Removed' : actionUpper === 'UPDATE' ? 'Updated' : 'Created';
          switch (entityUpper) {
            case 'INCOME': desc = `${prefix}: Income${name ? ' - ' + name : ''}`; break;
            case 'EXPENSE': desc = `${prefix}: Expense${name ? ' - ' + name : ''}`; break;
            case 'ASSET': desc = `${prefix}: Asset${name ? ' - ' + name : ''}`; break;
            case 'LIABILITY': desc = `${prefix}: Liability${name ? ' - ' + name : ''}`; break;
            case 'CASH_SAVINGS': desc = `${prefix}: Cash Savings`; break;
            case 'USER':
              if (actionUpper === 'UPDATE' && afterValue?.currencyCode) {
                desc = `Currency Changed: ${beforeValue?.currencyCode || '?'} → ${afterValue.currencyCode}`;
              } else {
                desc = `Account Created`;
              }
              break;
            default: desc = `${prefix}: ${ev.entityType}`;
          }
        }

        // Determine historical currency symbol
        const evTime = new Date(ev.timestamp).getTime();
        let symbol = '$';
        for (const seg of currencySegments) {
          if (seg.startDate <= evTime) {
            symbol = seg.symbol;
          } else {
            break;
          }
        }

        return {
          id: String(ev.id),
          timestamp: ev.timestamp,
          type,
          description: desc,
          valueChange,
          currencySymbol: symbol,
        } as FinancialEvent;
      });

      setEvents(prev => isReset ? transformed : [...prev, ...transformed]);
      setHasMore(transformed.length === ITEMS_PER_PAGE);
      setOffset(currentOffset + ITEMS_PER_PAGE);

    } catch (err: any) {
      setError(err?.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    if (historyLoaded) {
      loadEvents(true);
    }
  }, [historyLoaded, typeFilter, startDate, endDate, debouncedSearch]);

  const highlight = (text: string) => {
    if (!debouncedSearch) return text;
    const lc = text.toLowerCase();
    const s = debouncedSearch.toLowerCase();
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
              <option value="Cash">Cash</option>
              <option value="User">User</option>
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
                placeholder="Search events..."
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
        {!loading && !error && events.length === 0 && (
          <div className="status-empty">No matching events found.</div>
        )}
        {!loading && !error && events.length > 0 && (
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
              {events.map((ev, index) => {
                const ts = new Date(ev.timestamp);
                const isLast = index === events.length - 1;
                return (
                  <tr
                    key={ev.id}
                    className={`row-${ev.type.toLowerCase()}`}
                    ref={isLast ? lastEventElementRef : null}
                  >
                    <td>
                      <div className="ts-main">{ts.toLocaleString()}</div>
                    </td>
                    <td className="type-cell">
                      {ev.id !== 'start' ? (
                        <span className={`badge badge-${ev.type.toLowerCase().replace('_', '-')}`}>
                          {ev.type.replace('_', ' ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="desc-cell">{highlight(ev.description)}</td>
                    <td className={`change-cell ${ev.valueChange >= 0 ? 'pos' : 'neg'}`}>
                      {(() => {
                        const sym = ev.currencySymbol || '$';
                        const abs = Math.abs(ev.valueChange).toLocaleString();
                        return (ev.id === 'start')
                          ? `${sym}${abs}`
                          : `${ev.valueChange >= 0 ? '+' : '-'}${sym}${abs}`;
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {loadingMore && <div className="status-msg-small">Loading more...</div>}
      </div>
    </div>
  );
};

export default EventLog;
