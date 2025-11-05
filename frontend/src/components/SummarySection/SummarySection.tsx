import React, { useEffect, useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { cashSavingsAPI, incomeAPI } from '../../utils/api';
import { incomeTotalsStore } from '../../state/incomeTotalsStore';
import './SummarySection.css';

type Props = {
  passiveIncome?: number;
  totalExpenses?: number;
  totalIncome?: number;
};

const SummarySection: React.FC<Props> = ({
}) => {
  const [cashSavings, setCashSavings] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Income totals from store
  const [incomeTotals, setIncomeTotals] = useState({ earned: 0, portfolio: 0, passive: 0, total: 0 });

  // Pull total expenses from backend via custom hook
  const { totalExpenses: totalExpensesDb } = useExpenses();

  // Fetch cash savings on component mount
  useEffect(() => {
    fetchCashSavings();
  }, []);

  // Subscribe to income totals store for live updates
  useEffect(() => {
    // Seed from store immediately
    setIncomeTotals(incomeTotalsStore.get());

    const unsub = incomeTotalsStore.subscribe(() => {
      setIncomeTotals(incomeTotalsStore.get());
    });

    // Fetch income data once to prime the store if needed
    const fetchTotals = async () => {
      try {
        const response = await incomeAPI.getIncomeLines();
        const lines = Array.isArray(response) ? response : [];
        const earned = lines
          .filter((i: any) => i.type === 'Earned')
          .reduce((s: number, i: any) => s + (typeof i.amount === 'number' ? i.amount : parseFloat(i.amount)), 0);
        const portfolio = lines
          .filter((i: any) => i.type === 'Portfolio')
          .reduce((s: number, i: any) => s + (typeof i.amount === 'number' ? i.amount : parseFloat(i.amount)), 0);
        const passive = lines
          .filter((i: any) => i.type === 'Passive')
          .reduce((s: number, i: any) => s + (typeof i.amount === 'number' ? i.amount : parseFloat(i.amount)), 0);
        incomeTotalsStore.replace({ earned, portfolio, passive });
      } catch (e) {
        console.error('Error fetching income totals:', e);
      }
    };
    fetchTotals();

    return () => { unsub(); };
  }, []);

  const fetchCashSavings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cashSavingsAPI.getCashSavings();
      setCashSavings(response.amount || 0);
      setEditValue((response.amount || 0).toString());
    } catch (err: any) {
      console.error('Error fetching cash savings:', err);
      setError('Failed to load cash savings');
      setCashSavings(0);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue(cashSavings.toString());
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(cashSavings.toString());
    setError(null);
  };

  const handleSaveClick = async () => {
    const numValue = parseFloat(editValue);
    
    if (isNaN(numValue) || numValue < 0) {
      setError('Please enter a valid positive number');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await cashSavingsAPI.updateCashSavings(numValue);
      setCashSavings(response.cashSavings.amount);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating cash savings:', err);
      setError(err.message || 'Failed to update cash savings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveClick();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  // Calculate values for the summary section
  // Progress bar: (Passive Income + Portfolio Income) / Total Expenses
  const passiveAndPortfolioIncome = incomeTotals.passive + incomeTotals.portfolio;
  const progressPercent = (() => {
    if (!totalExpensesDb || totalExpensesDb <= 0) return 0;
    const ratio = passiveAndPortfolioIncome / totalExpensesDb;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  })();

  // Cashflow: Total Income - Total Expenses
  const totalIncomeLive = incomeTotals.total;
  const cashFlow = totalIncomeLive - totalExpensesDb;

  return (
    <section className="summary-section">
      <div className="section-header">
        <h2 className="section-title">Summary</h2>
      </div>

      <div className="summary-content">
        {/* Progress block tracking passive + portfolio income */}
        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-label">Passive + Portfolio Income</span>
            <span className="progress-amount">
              ${passiveAndPortfolioIncome.toLocaleString()}
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label="Passive and portfolio income progress"
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="progress-footer">
            <span className="progress-percent">{progressPercent}%</span>
            <span className="progress-target">
              of ${totalExpensesDb.toLocaleString()} (Total Expenses)
            </span>
          </div>
        </div>

        {/* Bar chart showing Total Income, Total Expenses, and Cashflow */}
        <div className="graph-card" aria-hidden={false}>
          <div className="horizontal-graph">
            <div className="hbar">
              <div className="hbar-label">Total Income</div>
              <div
                className="hbar-track"
                role="img"
                aria-label={`Total income ${totalIncomeLive}`}
              >
                <div
                  className="hbar-fill income"
                  style={{ width: `${totalIncomeLive > 0 ? 100 : 0}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="hbar-value">${totalIncomeLive.toLocaleString()}</div>
            </div>

            <div className="hbar">
              <div className="hbar-label">Total Expenses</div>
              <div
                className="hbar-track"
                role="img"
                aria-label={`Total expenses ${totalExpensesDb}`}
              >
                <div
                  className="hbar-fill expenses"
                  style={{ width: `${totalExpensesDb > 0 ? Math.min(100, (totalExpensesDb / Math.max(totalIncomeLive, totalExpensesDb, 1)) * 100) : 0}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="hbar-value">${totalExpensesDb.toLocaleString()}</div>
            </div>
          </div>

          {/* Cashflow row inside the same card */}
          <div
            className={`cashflow-row ${cashFlow < 0 ? 'negative' : 'positive'}`}
          >
            <div className="cashflow-label">Cashflow</div>
            <div className="cashflow-amount">
              ${Math.abs(cashFlow).toLocaleString()}
              {cashFlow < 0 && ' (deficit)'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom savings row - User-editable, not auto-calculated */}
      <div className="savings-bar">
        <span className="savings-label">Cash / Savings</span>
        <div className="savings-edit-container">
          {!isEditing ? (
            <>
              <span className="savings-amount">
                {loading ? 'Loading...' : `$${cashSavings.toLocaleString()}`}
              </span>
              {!loading && (
                <button 
                  className="edit-button" 
                  onClick={handleEditClick}
                  aria-label="Edit cash savings"
                >
                  Edit
                </button>
              )}
            </>
          ) : (
            <div className="savings-edit-form">
              <input
                type="number"
                className="savings-input"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="0"
                min="0"
                step="0.01"
                autoFocus
                disabled={saving}
              />
              <button 
                className="save-button" 
                onClick={handleSaveClick}
                disabled={saving}
              >
                {saving ? '...' : '✓'}
              </button>
              <button 
                className="cancel-button" 
                onClick={handleCancelEdit}
                disabled={saving}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </section>
  );
};

export default SummarySection;
