import React from 'react';
import './Header.css';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-circle max-h-fit"><img src="../../../assets/richflow.png" alt="RichFlow Logo" className="logo-icon" /></div>
          <span className="logo-text">{user?.name || 'RichMan'}</span>
        </div>
      </div>
      <div className="header-center">
        <h1 className="header-title">Dashboard</h1>
      </div>
      <div className="header-right">
      </div>
    </header>
  );
};

export default Header;
