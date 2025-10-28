import React from 'react';
import Header from '../../components/Header/Header';
import Sidebar from '../../components/Sidebar/Sidebar';
import IncomeSection from '../../components/IncomeSection/IncomeSection';
import SummarySection from '../../components/SummarySection/SummarySection';
import ExpensesSection from '../../components/ExpensesSection/ExpensesSection';
import './Dashboard.css';

const Dashboard: React.FC = () => {
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
