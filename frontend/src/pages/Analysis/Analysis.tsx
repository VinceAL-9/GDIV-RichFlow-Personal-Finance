import React from 'react';
import './Analysis.css';
import Sidebar from '../../components/Sidebar/Sidebar';

type SnapshotItem = { label: string; value: string };

const Analysis: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [rangeValue, setRangeValue] = React.useState<number>(100);
  const [showEvents, setShowEvents] = React.useState(false);
  const [comparisonEnabled, setComparisonEnabled] = React.useState(false);
  const [comparisonDate, setComparisonDate] = React.useState('');
  const [snapshotItems, setSnapshotItems] = React.useState<SnapshotItem[]>([]);

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

  return (
    <div className="analysis-layout">
      <Sidebar />
      <main className="analysis-main" aria-labelledby="analysis-title">
        <header className="analysis-header">
          <h1 id="analysis-title" className="analysis-title">Financial Analysis</h1>
          <p className="analysis-subtitle">Explore historical snapshots, compare points in time, and review significant events.</p>
        </header>

        {loading && (
          <div className="analysis-loading" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <span>Loading financial history...</span>
          </div>
        )}

        {!loading && (
          <div className="analysis-grid">
            {/* Timeline */}
            <section className="analysis-section timeline" aria-label="Timeline slider for historical position">
              <div className="section-header">
                <h2 className="section-heading">Timeline</h2>
                <span className="section-note">Adjust to browse historical state (placeholder)</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rangeValue}
                onChange={(e) => setRangeValue(Number(e.target.value))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={rangeValue}
              />
              <div className="range-label">Position: {rangeValue}%</div>
            </section>

            {/* Snapshot */}
            <section className="analysis-section snapshot" aria-label="Financial snapshot for selected date">
              <div className="section-header">
                <h2 className="section-heading">Snapshot</h2>
                <span className="section-note">Values represent state at selected point</span>
              </div>
              <div className="snapshot-grid">
                {snapshotItems.map(item => (
                  <div key={item.label} className="snapshot-card">
                    <div className="snapshot-label">{item.label}</div>
                    <div className="snapshot-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Comparison Tool */}
            <section className="analysis-section comparison" aria-label="Compare snapshots between dates">
              <div className="section-header">
                <h2 className="section-heading">Comparison</h2>
                <span className="section-note">Select a second date to compare</span>
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
              <div className="comparison-result">No comparison performed.</div>
            </section>

            {/* Event Log */}
            <section className="analysis-section events" aria-label="Historical financial events">
              <div className="section-header">
                <h2 className="section-heading">Event Log</h2>
                <span className="section-note">Recorded actions & changes (future)</span>
              </div>
              <button className="btn-primary" onClick={() => setShowEvents(true)}>Open Event Log</button>
              {showEvents && (
                <div className="events-modal" role="dialog" aria-modal="true" aria-label="Historical Events" onClick={() => setShowEvents(false)}>
                  <div className="events-modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3 className="events-title">Historical Events</h3>
                    <ul className="events-list">
                      <li>No events recorded yet.</li>
                    </ul>
                    <button className="btn-secondary" onClick={() => setShowEvents(false)}>Close</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analysis;
