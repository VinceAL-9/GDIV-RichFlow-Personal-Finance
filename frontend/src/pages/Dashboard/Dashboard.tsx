
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FinancialDataProvider } from '../../context/FinancialDataContext';
import { balanceSheetAPI } from '../../utils/api';
import Header from '../../components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import IncomeSection from '../../components/IncomeSection/IncomeSection';
import SummarySection from '../../components/SummarySection/SummarySection';
import ExpensesSection from '../../components/ExpensesSection/ExpensesSection';
import AssetsSection from '../../components/AssetsSection/AssetsSection';
import LiabilitiesSection from '../../components/LiabilitiesSection/LiabilitiesSection';
import './Dashboard.css';
import RightSidePanel from '../../components/RightSidePanel/RightSidePanel';
import SakiAssistant from '../../components/RightSidePanel/SakiAssistant';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [showBalanceSheet, setShowBalanceSheet] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('balanceSheetVisible');
      return stored === null ? true : stored === 'true';
    } catch (e) {
      return true;
    }
  });
  const [balanceSheetExists, setBalanceSheetExists] = useState(false);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(0);

  useEffect(() => {
    // Only redirect if loading is complete and user is not authenticated
    if (!loading && !isAuthenticated) {
      navigate('/'); // go to Landing instead of Login
    }
  }, [isAuthenticated, loading, navigate]);

  // Check if user has a balance sheet
  useEffect(() => {
    const checkBalanceSheet = async () => {
      if (!isAuthenticated) return;
      
      try {
        const balanceSheet = await balanceSheetAPI.getBalanceSheet();
        if (balanceSheet) {
          setBalanceSheetExists(true);
          // Respect user preference stored in localStorage
          try {
            const stored = localStorage.getItem('balanceSheetVisible');
            if (stored === null) {
              setShowBalanceSheet(true);
            } else {
              setShowBalanceSheet(stored === 'true');
            }
          } catch (e) {
            setShowBalanceSheet(true);
          }
        }
      } catch (error) {
        console.error('Error checking balance sheet:', error);
        setBalanceSheetExists(false);
      }
    };

    checkBalanceSheet();
  }, [isAuthenticated]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#000000' }}>
        <div className="text-gold text-2xl">Loading...</div>
      </div>
    );
  }

  // If not authenticated after loading, don't render (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const handleAddBalanceSheet = async () => {
    try {
      await balanceSheetAPI.createBalanceSheet();
      setBalanceSheetExists(true);
      setShowBalanceSheet(true);
    } catch (error) {
      console.error('Error creating balance sheet:', error);
    }
  };

  const handleToggleBalanceSheet = (show: boolean) => {
    setShowBalanceSheet(show);
    try {
      localStorage.setItem('balanceSheetVisible', show ? 'true' : 'false');
    } catch (e) {
      // ignore storage errors
    }
  };

  return (
    <FinancialDataProvider>
      <div className="dashboard-container">
        <Header onAddBalanceSheet={handleAddBalanceSheet} onToggleBalanceSheet={handleToggleBalanceSheet} balanceSheetExists={balanceSheetExists} balanceSheetVisible={showBalanceSheet} />
        <div className="dashboard-main">
          <Sidebar onOpenAssistant={() => setPanelOpen(true)} />
          <main className="dashboard-content" style={{ backgroundColor: '#000000' }}>
            <div className="dashboard-grid">
              <div className="grid-left">
                <IncomeSection />
              </div>
              <div className="grid-right">
                <div className="grid-right-top">
                  <SummarySection
                    balanceSheetVisible={showBalanceSheet}
                    totalAssetsProp={totalAssets}
                    totalLiabilitiesProp={totalLiabilities}
                  />
                </div>
                <div className="grid-right-bottom">
                  <ExpensesSection />
                </div>
              </div>
            </div>
            {showBalanceSheet && (
              <div className="balance-sheet-section">
                <div className="balance-sheet-grid">
                  <AssetsSection onTotalsChange={(t: number) => setTotalAssets(t)} />
                  <LiabilitiesSection onTotalsChange={(t: number) => setTotalLiabilities(t)} />
                </div>
              </div>
            )}
          </main>
        </div>
        <RightSidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} title="Saki Assistant">
          <SakiAssistant isOpen={panelOpen} includeBalanceSheet={showBalanceSheet} />
        </RightSidePanel>
      </div>
    </FinancialDataProvider>
  );
};

export default Dashboard;
