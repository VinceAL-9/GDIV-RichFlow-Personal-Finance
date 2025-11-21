import { useEffect, useState } from 'react';
import { expensesAPI } from '../utils/api';

interface ExpenseItem {
  id: number;
  name: string;
  amount: number;
}

type StoreState = {
  expenses: ExpenseItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
};

// Module-level singleton store so multiple components share the same state
const store: StoreState = {
  expenses: [],
  loading: false,
  error: null,
  initialized: false,
};

const listeners = new Set<() => void>();
const dataChangeListeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());
const notifyDataChange = () => dataChangeListeners.forEach((l) => l());

const setState = (partial: Partial<StoreState>) => {
  Object.assign(store, partial);
  notify();
};

// Allow external listeners for data changes
export const onExpensesDataChange = (listener: () => void) => {
  dataChangeListeners.add(listener);
  return () => {
    dataChangeListeners.delete(listener);
  };
};

// Allow external reset on auth change
export const resetExpensesStore = () => {
  setState({ expenses: [], loading: false, error: null, initialized: false });
};

// Reset the shared store whenever auth state changes, even if no component is mounted yet
if (typeof window !== 'undefined') {
  window.addEventListener('auth:changed', () => {
    resetExpensesStore();
  });
}

// Normalize API response to ExpenseItem[]
const normalizeExpenses = (response: any): ExpenseItem[] => {
  if (!Array.isArray(response)) return [];
  return response.map((item: any) => ({
    id: item.id,
    name: item.name,
    amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount),
  }));
};

// Store-backed actions
const fetchExpensesInternal = async () => {
  try {
    setState({ loading: true, error: null });
    const response = await expensesAPI.getExpenses();
    // console.log('Expenses API response:', response);
    const expensesData = normalizeExpenses(response);
    setState({ expenses: expensesData, loading: false, initialized: true });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    setState({ error: 'Failed to load expenses', expenses: [], loading: false, initialized: true });
  }
};

const addExpenseInternal = async (name: string, amount: number) => {
  try {
    setState({ error: null });
    const response = await expensesAPI.addExpense(name, amount);
    const expenseData = response.expense || response;
    const newExpense: ExpenseItem = {
      id: expenseData.id,
      name: expenseData.name,
      amount: expenseData.amount,
    };
    setState({ expenses: [...store.expenses, newExpense] });
    notifyDataChange(); // Notify data change listeners
    return newExpense;
  } catch (err) {
    console.error('Error adding expense:', err);
    setState({ error: 'Failed to add expense' });
    throw err;
  }
};

const updateExpenseInternal = async (id: number, name: string, amount: number) => {
  try {
    setState({ error: null });
    const response = await expensesAPI.updateExpense(id, name, amount);
    const expenseData = response.expense || response;
    const updatedExpense: ExpenseItem = {
      id: expenseData.id,
      name: expenseData.name,
      amount: expenseData.amount,
    };
    setState({ expenses: store.expenses.map((e) => e.id === id ? updatedExpense : e) });
    notifyDataChange(); // Notify data change listeners
    return updatedExpense;
  } catch (err) {
    console.error('Error updating expense:', err);
    setState({ error: 'Failed to update expense' });
    throw err;
  }
};

const deleteExpenseInternal = async (id: number) => {
  try {
    setState({ error: null });
    await expensesAPI.deleteExpense(id);
    setState({ expenses: store.expenses.filter((e) => e.id !== id) });
    notifyDataChange(); // Notify data change listeners
  } catch (err) {
    console.error('Error deleting expense:', err);
    setState({ error: 'Failed to delete expense' });
    throw err;
  }
};

export const useExpenses = () => {
  // Local snapshot of the shared store; updates on notifications
  const [local, setLocal] = useState(() => ({
    expenses: store.expenses,
    loading: store.loading,
    error: store.error as string | null,
  }));

  useEffect(() => {
    const onChange = () => {
      setLocal({ expenses: store.expenses, loading: store.loading, error: store.error });
      // If store was reset (e.g., user switched), refetch for the new user
      if (!store.initialized && !store.loading) {
        fetchExpensesInternal();
      }
    };
    listeners.add(onChange);

    // First subscriber triggers initial fetch if needed
    if (!store.initialized && !store.loading) {
      fetchExpensesInternal();
    }

    return () => {
      listeners.delete(onChange);
    };
  }, []);

  // Public API mirrors the previous hook shape for compatibility
  const setExpenses = (updater: ExpenseItem[] | ((prev: ExpenseItem[]) => ExpenseItem[])) => {
    const next = typeof updater === 'function' ? (updater as (p: ExpenseItem[]) => ExpenseItem[])(store.expenses) : updater;
    setState({ expenses: next });
  };

  const fetchExpenses = async () => fetchExpensesInternal();
  const addExpense = async (name: string, amount: number) => addExpenseInternal(name, amount);
  const updateExpense = async (id: number, name: string, amount: number) => updateExpenseInternal(id, name, amount);
  const deleteExpense = async (id: number) => deleteExpenseInternal(id);

  const totalExpenses = local.expenses.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : parseFloat((e as any).amount)), 0);

  return {
    expenses: local.expenses,
    setExpenses,
    totalExpenses,
    loading: local.loading,
    error: local.error,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
};