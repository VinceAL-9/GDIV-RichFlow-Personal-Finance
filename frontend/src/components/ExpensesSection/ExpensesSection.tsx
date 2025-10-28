import React from 'react';
import './ExpensesSection.css';

const ExpensesSection: React.FC = () => {
  return (
    <section className="expenses-section">
      <div className="section-header">
        <h2 className="section-title">Expenses</h2>
      </div>
      <div className="expenses-content">
        {/* Content will be added when data integration begins */}
      </div>
    </section>
  );
};

export default ExpensesSection;
