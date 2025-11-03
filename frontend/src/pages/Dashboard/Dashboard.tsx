import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import IncomeSection from '../../components/IncomeSection/IncomeSection';
import SummarySection from '../../components/SummarySection/SummarySection';
import ExpensesSection from '../../components/ExpensesSection/ExpensesSection';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only redirect if loading is complete and user is not authenticated
    if (!loading && !isAuthenticated) {
      navigate('/'); // go to Landing instead of Login
    }
  }, [isAuthenticated, loading, navigate]);

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

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-main">
        <Sidebar />
        <main className="dashboard-content" style={{ backgroundColor: '#000000' }}>
          <div className="dashboard-grid">
            <div className="grid-left">
              <IncomeSection />
            </div>
            <div className="grid-right">
              <div className="grid-right-top">
                <SummarySection />
              </div>
              <div className="grid-right-bottom">
                <ExpensesSection />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
