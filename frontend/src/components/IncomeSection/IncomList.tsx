import React from 'react';
import { IncomeLine } from '../../types/income.types';
import './IncomeSection.css';

interface Props {
  incomeLines: IncomeLine[];
  onEdit: (income: IncomeLine) => void;
  onDelete: (id: number) => void;
}

const IncomeList: React.FC<Props> = ({ incomeLines, onEdit, onDelete }) => {
  // Group income lines by type
  const groupedIncome = incomeLines.reduce((groups, income) => {
    if (!groups[income.type]) {
      groups[income.type] = [];
    }
    groups[income.type].push(income);
    return groups;
  }, {} as Record<string, IncomeLine[]>);

  // Sort income types in preferred order
  const incomeTypes = ['Earned', 'Portfolio', 'Passive'].filter(
    type => groupedIncome[type]?.length > 0
  );

  if (incomeLines.length === 0) {
    return (
      <div className="no-income">
        <p>No income entries yet. Click "Add Income" to get started.</p>
      </div>
    );
  }

  return (
    <div className="income-list">
      {incomeTypes.map(type => (
        <div key={type} className="income-group">
          <h3 className="income-type-header">{type} Income</h3>
          <div className="income-items">
            {groupedIncome[type].map(income => (
              <div key={income.id} className="income-item">
                <div className="income-details">
                  <span className="income-name">{income.name}</span>
                  <span className="income-amount">
                    ${income.amount.toLocaleString()}
                  </span>
                </div>
                <div className="income-actions">
                  <button
                    className="edit-button"
                    onClick={() => onEdit(income)}
                    aria-label={`Edit ${income.name}`}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this income entry?')) {
                        onDelete(income.id);
                      }
                    }}
                    aria-label={`Delete ${income.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncomeList;