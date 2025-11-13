import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onExpensesDataChange } from '../hooks/useExpenses';

interface FinancialDataContextType {
  dataVersion: number;
  triggerDataUpdate: () => void;
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export const FinancialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataVersion, setDataVersion] = useState(0);

  const triggerDataUpdate = useCallback(() => {
    setDataVersion(prev => prev + 1);
  }, []);

  // Listen to expense changes
  useEffect(() => {
    const unsubscribe = onExpensesDataChange(() => {
      triggerDataUpdate();
    });
    return unsubscribe;
  }, [triggerDataUpdate]);

  return (
    <FinancialDataContext.Provider value={{ dataVersion, triggerDataUpdate }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within FinancialDataProvider');
  }
  return context;
};