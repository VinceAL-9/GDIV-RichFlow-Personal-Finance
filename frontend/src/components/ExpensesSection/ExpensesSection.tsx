import React, { useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import './ExpensesSection.css';

const ExpenseSection: React.FC = () => {
  const { expenses, loading, error, addExpense: addExpenseToHook, deleteExpense: deleteExpenseFromHook } = useExpenses();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleAddExpense = async () => {
    if (!name.trim() || !amount.trim() || isAdding) return;

    try {
      setIsAdding(true);
      await addExpenseToHook(name, parseFloat(amount));
      setName('');
      setAmount('');
    } catch (err: any) {
      // Error is handled in hook
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (isDeleting !== null) return;
    
    try {
      setIsDeleting(id);
      await deleteExpenseFromHook(id);
    } catch (err: any) {
      // Error is handled in hook
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="expense-container">
      <h1 className="expense-header">Expenses</h1>

      <div className="expense-card">
        {loading ? (
          <p>Loading expenses...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : !Array.isArray(expenses) ? (
          <p className="error-message">Error loading expenses</p>
        ) : expenses.length === 0 ? (
          <p className="expense-empty">No expenses added yet.</p>
        ) : (
          expenses.map((item) => (
            <div key={item.id} className="expense-item">
              <span>{item.name}</span>
              <span className="expense-amount">
                ${typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00'}
              </span>
              <button
                className="delete-btn"
                onClick={() => handleDeleteExpense(item.id)}
                disabled={isDeleting === item.id}
              >
                {isDeleting === item.id ? '...' : '✕'}
              </button>
            </div>
          ))
        )}

        <div className="expense-inputs">
          <input
            type="text"
            placeholder="Expense name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button 
          className="add-expense-btn" 
          onClick={handleAddExpense}
          disabled={isAdding || !name.trim() || !amount.trim()}
        >
          {isAdding ? 'Adding...' : '+ Add Expense'}
        </button>
      </div>
    </div>
  );
};

export default ExpenseSection;
