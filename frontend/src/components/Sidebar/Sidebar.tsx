import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CurrencySelector from '../CurrencySelector/CurrencySelector';
import './Sidebar.css';

type Props = {
  onOpenAssistant?: () => void;
};

const Sidebar: React.FC<Props> = ({ onOpenAssistant }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = React.useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to landing page even if logout fails
      navigate('/');
    }
  };

  return (
    <>
      {/* Hamburger Menu Button - Mobile Only */}
      <button 
        className={`sidebar-hamburger ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className="sidebar-hamburger-line"></span>
        <span className="sidebar-hamburger-line"></span>
        <span className="sidebar-hamburger-line"></span>
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      <aside 
        className={`sidebar ${expanded ? 'expanded' : ''} ${mobileOpen ? 'mobile-open' : ''}`} 
        onMouseEnter={() => setExpanded(true)} 
        onMouseLeave={() => setExpanded(false)}
      >
      
      {/* Home Button */}
      <div className="sidebar-section">
        <button className="selection large" onClick={() => { navigate("/"); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text home"> Home </span>
        </button>
      </div>

      {/* General Section */}
      <div className="sidebar-section">
        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> General </span>
        </button>

        <button className="selection large" onClick={() => { navigate("/user-guide"); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> User Guide </span>
        </button>

        <button className="selection large" onClick={() => setShowCurrencyModal(true)}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Currency </span>
        </button>

        <button className="selection large" onClick={() => onOpenAssistant && onOpenAssistant()}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Saki Assistant </span>
        </button>

        <button className="selection large" onClick={() => navigate('/event-log')}>
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> View Event Log </span>
        </button>
      </div>

      {/* Settings Section */}
      <div className="sidebar-section">
        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Settings </span>
        </button>

        <button className="selection large" onClick={() => { navigate('/change-username'); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Username </span>
        </button>

        <button className="selection large" onClick={() => { navigate('/change-email'); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Email </span>
        </button>

        <button className="selection large" onClick={() => { navigate('/change-password'); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Password </span>
        </button>

        <button className="selection large" onClick={() => { handleLogout(); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Log Out </span>
        </button>
      </div>

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div className="currency-modal-overlay" onClick={() => setShowCurrencyModal(false)}>
          <div className="currency-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="currency-modal-header">
              <h2>Select Currency</h2>
              <button className="currency-modal-close" onClick={() => setShowCurrencyModal(false)}>×</button>
            </div>
            <div className="currency-modal-body">
              <CurrencySelector onCurrencyChange={() => setShowCurrencyModal(false)} />
            </div>
          </div>
        </div>
      )}

      </aside>
    </>
  );
};

export default Sidebar;
