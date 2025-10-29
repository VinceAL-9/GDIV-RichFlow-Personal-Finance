import React, { useState } from 'react';
import './ExpensesSection.css';

interface ExpenseItem {
  id: number;
  name: string;
  amount: number;
}

const ExpenseSection: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const addExpense = () => {
    if (!name.trim() || !amount.trim()) return;

    const newExpense: ExpenseItem = {
      id: Date.now(),
      name,
      amount: parseFloat(amount),
    };

    setExpenses([...expenses, newExpense]);
    setName('');
    setAmount('');
  };

  const deleteExpense = (id: number) => {
    setExpenses(expenses.filter((expense) => expense.id !== id));
  };

  return (
    <div className="expense-container">
      <h1 className="expense-header">Expenses</h1>

      <div className="expense-card">

        {expenses.length === 0 ? (
          <p className="expense-empty">No expenses added yet.</p>
        ) : (
          expenses.map((item) => (
            <div key={item.id} className="expense-item">
              <span>{item.name}</span>
              <span className="expense-amount">${item.amount.toFixed(2)}</span>
              <button
                className="delete-btn"
                onClick={() => deleteExpense(item.id)}
              >
                ✕
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

        <button className="add-expense-btn" onClick={addExpense}>
          + Add Expense
        </button>
      </div>
    </div>
  );
};

export default ExpenseSection;
