import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onAddBalanceSheet?: () => void;
  onToggleBalanceSheet?: (show: boolean) => void;
  balanceSheetExists?: boolean;
  balanceSheetVisible?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onAddBalanceSheet, onToggleBalanceSheet, balanceSheetExists, balanceSheetVisible = false }) => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleBalanceSheetAction = () => {
    setIsDropdownOpen(false);
    if (balanceSheetExists) {
      // Toggle visibility without confirmation for a smoother UX
      onToggleBalanceSheet?.(!balanceSheetVisible);
    } else {
      onAddBalanceSheet?.();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-circle max-h-fit"><img src="../../../assets/richflow.png" alt="RichFlow Logo" className="logo-icon" /></div>
          <div className="flex flex-col">
            <span className="logo-text">{user!.name}</span>
            <span className="text-white text-sm opacity-80">{user!.email}</span>
          </div>
        </div>
      </div>
      <div className="header-center">
        <h1 className="header-title">Dashboard</h1>
      </div>
      <div className="header-right">
        <div className="add-button-container" ref={dropdownRef}>
          <button 
            className={`add-button ${balanceSheetExists ? 'minus-button' : ''}`} 
            onClick={toggleDropdown} 
            title={balanceSheetExists ? "Modify Balance Sheet" : "Add new item"}
          >
            {balanceSheetExists ? '-' : '+'}
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleBalanceSheetAction}>
                {balanceSheetExists ? (balanceSheetVisible ? 'Hide Balance Sheet' : 'Show Balance Sheet') : 'Add Balance Sheet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
