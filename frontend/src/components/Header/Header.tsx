import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onAddBalanceSheet?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddBalanceSheet }) => {
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleAddBalanceSheet = () => {
    setIsDropdownOpen(false);
    onAddBalanceSheet?.();
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
          <button className="add-button" onClick={toggleDropdown} title="Add new item">
            +
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={handleAddBalanceSheet}>
                Add Balance Sheet
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
