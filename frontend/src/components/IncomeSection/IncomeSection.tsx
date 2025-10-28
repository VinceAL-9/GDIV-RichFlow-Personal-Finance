import React from 'react';
import './IncomeSection.css';

const IncomeSection: React.FC = () => {
  return (
    <section className="income-section">
      <div className="section-header">
        <h2 className="section-title">Income</h2>
      </div>
      <div className="income-content">
        <div className="income-main">
            <div className="income-box-header">
              <span className="income-label">Earned Income</span>
          </div>
        </div>
        <div className="income-secondary">
          <div className="income-box-small">
            <div className="income-box-small-header">
              <span className="income-label">Portfolio</span>
            </div>
          </div>
          <div className="income-box-small">
            <div className="income-box-small-header">
              <span className="income-label">Passive</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IncomeSection;
