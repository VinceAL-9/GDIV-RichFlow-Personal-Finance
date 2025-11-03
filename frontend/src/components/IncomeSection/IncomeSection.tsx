import React, { useState, useEffect } from "react";
import { incomeAPI } from "../../utils/api";
import "./IncomeSection.css";
import { passiveIncomeStore } from "../../state/passiveIncomeStore";
import { incomeTotalsStore } from "../../state/incomeTotalsStore";

interface IncomeItem {
  id: number;
  name: string;
  amount: number;
  type: 'Earned' | 'Portfolio' | 'Passive';
}

const IncomeSection: React.FC = () => {
  const [earnedIncome, setEarnedIncome] = useState<IncomeItem[]>([]);
  const [portfolioIncome, setPortfolioIncome] = useState<IncomeItem[]>([]);
  const [passiveIncome, setPassiveIncome] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Fetch income data on component mount
  useEffect(() => {
    fetchIncomeData();
  }, []);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await incomeAPI.getIncomeLines();
      
      console.log('Income API response:', response);
      
      // Ensure response is an array
      const incomeLines = Array.isArray(response) ? response : [];
      
      // Group income by type with proper typing
      const earned = incomeLines.filter((item: any) => item.type === 'Earned').map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount),
        type: 'Earned' as 'Earned'
      }));
      
      const portfolio = incomeLines.filter((item: any) => item.type === 'Portfolio').map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount),
        type: 'Portfolio' as 'Portfolio'
      }));
      
      const passive = incomeLines.filter((item: any) => item.type === 'Passive').map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount),
        type: 'Passive' as 'Passive'
      }));
      
      setEarnedIncome(earned);
      setPortfolioIncome(portfolio);
      setPassiveIncome(passive);
      // Update shared passive income total
      const passiveTotal = passive.reduce((sum, item) => sum + item.amount, 0);
      passiveIncomeStore.set(passiveTotal);
      // Update income totals store
      const earnedTotal = earned.reduce((sum, item) => sum + item.amount, 0);
      const portfolioTotal = portfolio.reduce((sum, item) => sum + item.amount, 0);
      incomeTotalsStore.replace({ earned: earnedTotal, portfolio: portfolioTotal, passive: passiveTotal });
    } catch (err: any) {
      console.error('Error fetching income:', err);
      setError('Failed to load income data');
      // Set empty arrays on error
      setEarnedIncome([]);
      setPortfolioIncome([]);
      setPassiveIncome([]);
      passiveIncomeStore.set(0);
      incomeTotalsStore.replace({ earned: 0, portfolio: 0, passive: 0 });
    } finally {
      setLoading(false);
    }
  };

  // handle add income
  const handleAddIncome = async (
    section: "earned" | "portfolio" | "passive",
    name: string,
    amount: string
  ) => {
    if (!name.trim() || !amount.trim() || isAdding) return;
    
    try {
      setIsAdding(true);
      setError(null);
      const type = section.charAt(0).toUpperCase() + section.slice(1) as 'Earned' | 'Portfolio' | 'Passive';
      const response = await incomeAPI.addIncomeLine(name, parseFloat(amount), type);
      
      // Backend returns { message, incomeLine }, so extract the incomeLine
      const incomeLineData = response.incomeLine || response;
      const newItem: IncomeItem = {
        id: incomeLineData.id,
        name: incomeLineData.name,
        amount: incomeLineData.amount,
        type
      };

      if (section === "earned") {
        const next = [...earnedIncome, newItem];
        setEarnedIncome(next);
        const earnedTotal = next.reduce((s, i) => s + i.amount, 0);
        incomeTotalsStore.set({ earned: earnedTotal });
      }
      if (section === "portfolio") {
        const next = [...portfolioIncome, newItem];
        setPortfolioIncome(next);
        const portfolioTotal = next.reduce((s, i) => s + i.amount, 0);
        incomeTotalsStore.set({ portfolio: portfolioTotal });
      }
      if (section === "passive") {
        const next = [...passiveIncome, newItem];
        setPassiveIncome(next);
        // Update shared passive income total
        const passiveTotal = next.reduce((sum, item) => sum + item.amount, 0);
        passiveIncomeStore.set(passiveTotal);
        incomeTotalsStore.set({ passive: passiveTotal });
      }
    } catch (err: any) {
      console.error('Error adding income:', err);
      setError('Failed to add income');
    } finally {
      setIsAdding(false);
    }
  };

  // handle delete income
  const handleDelete = async (section: "earned" | "portfolio" | "passive", id: number) => {
    if (isDeleting !== null) return; // Prevent multiple simultaneous deletes
    
    try {
      setIsDeleting(id);
      setError(null);
      await incomeAPI.deleteIncomeLine(id);
      
      if (section === "earned") {
        const next = earnedIncome.filter((i) => i.id !== id);
        setEarnedIncome(next);
        const earnedTotal = next.reduce((s, i) => s + i.amount, 0);
        incomeTotalsStore.set({ earned: earnedTotal });
      }
      if (section === "portfolio") {
        const next = portfolioIncome.filter((i) => i.id !== id);
        setPortfolioIncome(next);
        const portfolioTotal = next.reduce((s, i) => s + i.amount, 0);
        incomeTotalsStore.set({ portfolio: portfolioTotal });
      }
      if (section === "passive") {
        const next = passiveIncome.filter((i) => i.id !== id);
        setPassiveIncome(next);
        // Update shared passive income total
        const passiveTotal = next.reduce((sum, item) => sum + item.amount, 0);
        passiveIncomeStore.set(passiveTotal);
        incomeTotalsStore.set({ passive: passiveTotal });
      }
    } catch (err: any) {
      console.error('Error deleting income:', err);
      setError('Failed to delete income');
    } finally {
      setIsDeleting(null);
    }
  };

  // reusable income card
  const IncomeCard = ({
    title,
    items,
    section,
  }: {
    title: string;
    items: IncomeItem[];
    section: "earned" | "portfolio" | "passive";
  }) => {
    const [source, setSource] = useState("");
    const [amount, setAmount] = useState("");

    return (
      <div className="income-card">
        <div className="income-card-header">{title}</div>

        {items.length === 0 ? (
          <p className="income-empty">No {title.toLowerCase()} added yet.</p>
        ) : (
          <div className="income-list">
            {items.map((item) => (
              <div key={item.id} className="income-item">
                <span>{item.name}</span>
                <span>${typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00'}</span>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(section, item.id)}
                  disabled={isDeleting === item.id}
                >
                  {isDeleting === item.id ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="income-inputs">
          <input
            type="text"
            placeholder="Source name"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button
          className="add-btn"
          onClick={() => {
            handleAddIncome(section, source, amount);
            setSource("");
            setAmount("");
          }}
          disabled={isAdding || !source.trim() || !amount.trim()}
        >
          {isAdding ? 'Adding...' : `+ Add ${title}`}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="income-container">
        <div className="income-header">Income</div>
        <div className="income-sections">
          <p style={{ textAlign: 'center', color: '#d4af37', padding: '20px' }}>Loading income data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="income-container">
      <div className="income-header">Income</div>
      
      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          textAlign: 'center', 
          padding: '10px', 
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          {error}
        </div>
      )}

      <div className="income-sections">
        <IncomeCard title="Earned Income" items={earnedIncome} section="earned" />
        <IncomeCard title="Portfolio Income" items={portfolioIncome} section="portfolio" />
        <IncomeCard title="Passive Income" items={passiveIncome} section="passive" />
      </div>
    </div>
  );
};

export default IncomeSection;
