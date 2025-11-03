import React, { useEffect, useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { cashSavingsAPI, incomeAPI } from '../../utils/api';
import { passiveIncomeStore } from '../../state/passiveIncomeStore';
import { incomeTotalsStore } from '../../state/incomeTotalsStore';
import './SummarySection.css';

type Props = {
  passiveIncome?: number;
  totalExpenses?: number;
  totalIncome?: number; // new prop for display
};

const SummarySection: React.FC<Props> = ({
  passiveIncome = 0,
  totalExpenses = 0,
  totalIncome = 0, // default placeholder, backend will replace
}) => {
  const [cashSavings, setCashSavings] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Passive income used for the progress block (fetched from IncomeSection data)
  const [passiveIncomeProgress, setPassiveIncomeProgress] = useState<number>(0);
  const [totalIncomeLive, setTotalIncomeLive] = useState<number>(0);

  // Pull total expenses from backend via custom hook
  const { totalExpenses: totalExpensesDb } = useExpenses();

  // Fetch cash savings on component mount
  useEffect(() => {
    fetchCashSavings();
  }, []);

  // Fetch passive income total initially and subscribe to store for live updates
  useEffect(() => {
    // Seed from store immediately
    setPassiveIncomeProgress(passiveIncomeStore.get());

    const unsub = passiveIncomeStore.subscribe(() => {
      setPassiveIncomeProgress(passiveIncomeStore.get());
    });

    // Also fetch once to prime the store if needed
    const fetchPassiveIncome = async () => {
      try {
        const response = await incomeAPI.getIncomeLines();
        const incomeLines = Array.isArray(response) ? response : [];
        const totalPassive = incomeLines
          .filter((item: any) => item.type === 'Passive')
          .reduce((sum: number, item: any) => sum + (typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)), 0);
        passiveIncomeStore.set(totalPassive || 0);
      } catch (e) {
        console.error('Error fetching passive income:', e);
      }
    };
    fetchPassiveIncome();

    return () => {
      unsub();
    };
  }, []);

  // Subscribe to total income totals for live updates
  useEffect(() => {
    // seed
    setTotalIncomeLive(incomeTotalsStore.get().total);
    const unsub = incomeTotalsStore.subscribe(() => {
      setTotalIncomeLive(incomeTotalsStore.get().total);
    });

    // Also fetch once to prime the totals if IncomeSection hasn't yet
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
        // non-fatal
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
    const currentNet = (totalIncomeLive || 0) - (totalExpensesDb || 0);
    setEditValue(currentNet.toString());
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
  
  // Net cash/savings = Total Income - Total Expenses (live values)
  const netCash = (totalIncomeLive || 0) - (totalExpensesDb || 0);
  // Percentage of passive income relative to TOTAL expenses from DB
  const percent = (() => {
    const expensesBase = totalExpensesDb; // use live DB-driven total expenses
    if (!expensesBase || expensesBase <= 0) return 0;
    const ratio = (passiveIncomeProgress || 0) / expensesBase;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  })();

  // New: compute cashflow and values for bar graph
  const cashFlow = totalIncomeLive - totalExpenses;

  // Determine max for scaling bars (use income vs passive income)
  const barMax = Math.max(totalIncomeLive, passiveIncomeProgress, 1);

  const toBarPercent = (value: number) =>
    Math.round((value / barMax) * 100);

  const incomeBarPercent = toBarPercent(totalIncomeLive);
  const passiveBarPercent = toBarPercent(passiveIncomeProgress);

  return (
    <section className="summary-section">
      <div className="section-header">
        <h2 className="section-title">Summary</h2>
      </div>

      <div className="summary-content">
        {/* Progress block tracking passive income */}
        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-label">Passive income</span>
            <span className="progress-amount">
              ${passiveIncomeProgress.toLocaleString()}
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Passive income progress"
          >
            <div
              className="progress-fill"
              style={{ width: `${percent}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="progress-footer">
            <span className="progress-percent">{percent}%</span>
            <span className="progress-target">
              of ${totalExpensesDb.toLocaleString()}
            </span>
          </div>
        </div>

        {/* New: Horizontal bar graph for Total Income and Passive Income */}
        {/* Grouped inside a darker, square-ish card */}
        <div className="graph-card" aria-hidden={false}>
          <div className="horizontal-graph">
            <div className="hbar">
              <div className="hbar-label">Total Income</div>
              <div
                className="hbar-track"
                role="img"
                aria-label={`Total income ${totalIncome}`}
              >
                <div
                  className="hbar-fill income"
                  style={{ width: `${incomeBarPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="hbar-value">${totalIncomeLive.toLocaleString()}</div>
            </div>

            <div className="hbar">
              <div className="hbar-label">Passive Income</div>
              <div
                className="hbar-track"
                role="img"
                aria-label={`Passive income ${passiveIncome}`}
              >
                <div
                  className="hbar-fill passive"
                  style={{ width: `${passiveBarPercent}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="hbar-value">${passiveIncomeProgress.toLocaleString()}</div>
            </div>
          </div>

          {/* Total cashflow row inside the same card */}
          <div
            className={`cashflow-row ${cashFlow < 0 ? 'negative' : 'positive'}`}
          >
            <div className="cashflow-label">Total Expenses</div>
            <div className="cashflow-amount">${totalExpensesDb.toLocaleString()}</div>
          </div>
        </div>

        {/* Existing content placeholder */}
        {/* Content will be added when data integration begins */}
      </div>

      {/* Bottom savings row */}
      <div className="savings-bar">
        <span className="savings-label">Cash / Savings</span>
        <div className="savings-edit-container">
          {!isEditing ? (
            <>
              <span className="savings-amount">
                {loading ? 'Loading...' : `$${netCash.toLocaleString()}`}
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
