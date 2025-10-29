import React, { useState } from 'react';
import './IncomeSection.css';

interface IncomeItem {
  id: number;
  name: string;
  amount: string;
}

const IncomeSection: React.FC = () => {
  const [earnedIncome, setEarnedIncome] = useState<IncomeItem[]>([]);
  const [portfolio, setPortfolio] = useState<IncomeItem[]>([]);
  const [passive, setPassive] = useState<IncomeItem[]>([]);

  const handleAddIncome = (
    section: 'earned' | 'portfolio' | 'passive',
    name: string,
    amount: string
  ) => {
    if (!name.trim() || !amount.trim()) return;
    const newItem: IncomeItem = { id: Date.now(), name, amount };

    if (section === 'earned') setEarnedIncome([...earnedIncome, newItem]);
    else if (section === 'portfolio') setPortfolio([...portfolio, newItem]);
    else setPassive([...passive, newItem]);
  };

  const handleDelete = (section: 'earned' | 'portfolio' | 'passive', id: number) => {
    if (section === 'earned') setEarnedIncome(earnedIncome.filter(i => i.id !== id));
    else if (section === 'portfolio') setPortfolio(portfolio.filter(i => i.id !== id));
    else setPassive(passive.filter(i => i.id !== id));
  };

  const IncomeCard = ({
    title,
    items,
    section,
  }: {
    title: string;
    items: IncomeItem[];
    section: 'earned' | 'portfolio' | 'passive';
  }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    return (
      <div className="income-card">
        <div className="income-card-header">{title}</div>

        {items.map((item) => (
          <div className="income-item" key={item.id}>
            <span className="income-name">{item.name}:</span>
            <span className="income-amount">{item.amount}</span>
            <button
              className="delete-btn"
              onClick={() => handleDelete(section, item.id)}
            >
              ✕
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="income-empty">No {title.toLowerCase()} added yet.</p>
        )}

        <div className="income-inputs">
          <input
            type="text"
            placeholder="Source name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button
          className="add-btn"
          onClick={() => {
            handleAddIncome(section, name, amount);
            setName('');
            setAmount('');
          }}
        >
          + Add {title}
        </button>
      </div>
    );
  };

  return (
    <div className="income-container">
      <h1 className="income-title">Income</h1>
      <div className="income-sections">
        <IncomeCard title="Earned Income" items={earnedIncome} section="earned" />
        <IncomeCard title="Portfolio Income" items={portfolio} section="portfolio" />
        <IncomeCard title="Passive Income" items={passive} section="passive" />
      </div>
    </div>
  );
};

export default IncomeSection;
