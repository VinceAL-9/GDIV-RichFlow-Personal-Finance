import React, { useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/currency.utils';
import './ExpensesSection.css';

const ExpenseSection: React.FC = () => {
  const { user } = useAuth();
  const currency = user?.preferredCurrency;
  const { expenses, loading, error, addExpense: addExpenseToHook, deleteExpense: deleteExpenseFromHook, updateExpense } = useExpenses();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const handleEditExpense = (id: number, expenseName: string, expenseAmount: number) => {
    setEditingId(id);
    setName(expenseName);
    setAmount(expenseAmount.toString());
  };

  const handleUpdateExpense = async () => {
    if (!editingId || !name.trim() || !amount.trim() || isUpdating !== null) return;

    try {
      setIsUpdating(editingId);
      await updateExpense(editingId, name, parseFloat(amount));
      setEditingId(null);
      setName('');
      setAmount('');
    } catch (err: any) {
      // Error is handled in hook
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setAmount('');
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
                {formatCurrency(typeof item.amount === 'number' ? item.amount : 0, currency)}
              </span>
              <div className="expense-item-actions">
                <button
                  className="edit-btn"
                  onClick={() => handleEditExpense(item.id, item.name, item.amount)}
                  disabled={editingId !== null || isDeleting !== null}
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteExpense(item.id)}
                  disabled={isDeleting === item.id || editingId !== null}
                >
                  {isDeleting === item.id ? '...' : '✕'}
                </button>
              </div>
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

        {editingId !== null ? (
          <div className="expense-edit-actions">
            <button 
              className="save-btn" 
              onClick={handleUpdateExpense}
              disabled={isUpdating !== null || !name.trim() || !amount.trim()}
            >
              {isUpdating === editingId ? 'Saving...' : 'Save'}
            </button>
            <button 
              className="cancel-btn" 
              onClick={handleCancelEdit}
              disabled={isUpdating !== null}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
            className="add-expense-btn" 
            onClick={handleAddExpense}
            disabled={isAdding || !name.trim() || !amount.trim()}
          >
            {isAdding ? 'Adding...' : '+ Add Expense'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ExpenseSection;
