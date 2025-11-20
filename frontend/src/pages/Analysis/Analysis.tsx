import React from 'react';
import './Analysis.css';
import Sidebar from '../../components/Sidebar/Sidebar';
import '../../components/Header/Header.css';
import Header from '../../components/Header/Header';
import { useAuth } from '../../context/AuthContext';

type SnapshotItem = { label: string; value: string };

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [timelineOpen, setTimelineOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false);
  const [comparisonDate, setComparisonDate] = React.useState('');
  const [snapshotItems, setSnapshotItems] = React.useState<SnapshotItem[]>([]);
  const [savedSnapshots, setSavedSnapshots] = React.useState<Array<{ id: string; date: string; items: SnapshotItem[] }>>([]);
  const [comparisonSnapshots, setComparisonSnapshots] = React.useState<Array<{ id: string; date: string; items: SnapshotItem[] }>>([]);
  const [isDragOverComparison, setIsDragOverComparison] = React.useState(false);

  // Simulate initial data fetch
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const today = new Date().toISOString().substring(0, 10);
      setSnapshotItems([
        { label: 'Date', value: today },
        { label: 'Cash Flow', value: '$0.00' },
        { label: 'Total Income', value: '$0.00' },
        { label: 'Total Expenses', value: '$0.00' },
        { label: 'Assets', value: '$0.00' },
        { label: 'Liabilities', value: '$0.00' }
      ]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveSnapshot = () => {
    const id = `${Date.now()}`;
    // Use selectedDate if set, otherwise current snapshot date
    const date = selectedDate || snapshotItems.find(s => s.label === 'Date')?.value || '';
    const cloned = snapshotItems.map(s => ({ ...s }));
    if (date) {
      const idx = cloned.findIndex(s => s.label === 'Date');
      if (idx >= 0) cloned[idx] = { label: 'Date', value: date };
    }
    setSavedSnapshots(prev => [{ id, date: date || 'Unknown', items: cloned }, ...prev]);
  };

  const handleRemoveSnapshot = (id: string) => {
    setSavedSnapshots(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="analysis-layout">
      {/* Full-width header like dashboard */}
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
            {/* Comparison (left) */}
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
                  if (prev.some(s => s.id === id)) return prev; // avoid duplicates
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
                  <button className="btn-primary" disabled={!comparisonDate}>Compare</button>
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
                        <ul className="comparison-list">
                          {cs.items.map(i => (
                            <li key={i.label}><span>{i.label}:</span> {i.value}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Snapshot (right) with embedded timeline */}
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
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setSelectedDate(newDate);
                        // Update date in current snapshotItems
                        setSnapshotItems(prev => prev.map(item => item.label === 'Date' ? { ...item, value: newDate } : item));
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="snapshot-grid">
                {snapshotItems.map(item => (
                  <div key={item.label} className="snapshot-card">
                    <div className="snapshot-label">{item.label}</div>
                    <div className="snapshot-value">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="snapshot-actions">
                <button className="btn-primary" onClick={handleSaveSnapshot}>Save Snapshot</button>
              </div>
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
                      <ul className="note-list">
                        {note.items.map(i => (
                          <li key={i.label}><span>{i.label}:</span> {i.value}</li>
                        ))}
                      </ul>
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
