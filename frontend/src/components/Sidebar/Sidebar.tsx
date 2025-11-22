import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Determine if we're on the analysis page
  const isAnalysisPage = location.pathname === '/analysis';
  const dynamicPageLabel = isAnalysisPage ? 'Dashboard' : 'Analysis';
  const dynamicPageRoute = isAnalysisPage ? '/dashboard' : '/analysis';

  // Detect touch device (iPad, tablets, touch screens)
  React.useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
  }, []);

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

  // Handle sidebar click/tap for touch devices - toggle open/close
  const handleSidebarClick = () => {
    if (isTouchDevice && window.innerWidth > 768) {
      setExpanded(!expanded);
    }
  };

  // Handle hover for opening
  const handleSidebarEnter = () => {
    setExpanded(true);
  };

  const handleSidebarLeave = () => {
    // Always close on mouse leave for non-touch devices
    if (!isTouchDevice) {
      setExpanded(false);
    }
  };

  // Only allow button interactions when sidebar is expanded on touch devices
  const handleButtonClick = (callback: () => void) => {
    if (isTouchDevice && window.innerWidth > 768 && !expanded) {
      // If closed, just open the sidebar
      setExpanded(true);
      return;
    }
    // If expanded or not touch device, execute the callback
    callback();
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
        onMouseEnter={handleSidebarEnter} 
        onMouseLeave={handleSidebarLeave}
        onClick={handleSidebarClick}
      >
      
      {/* Home Button */}
      <div className="sidebar-section">
        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { navigate("/"); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
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

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { navigate("/user-guide"); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> User Guide </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => setShowCurrencyModal(true)); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Currency </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => onOpenAssistant && onOpenAssistant()); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Saki Assistant </span>
        </button>

        <button className="selection large" onClick={() => navigate('/event-log')}>
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> View Event Log </span>
        </button> 
        
        <button className="selection large" onClick={() => { navigate(dynamicPageRoute); setMobileOpen(false); }}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> {dynamicPageLabel} </span>
        </button>
      </div>

      {/* Settings Section */}
      <div className="sidebar-section">
        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Settings </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { navigate('/change-username'); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Username </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { navigate('/change-email'); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Email </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { navigate('/change-password'); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Password </span>
        </button>

        <button 
          className="selection large" 
          onClick={(e) => { 
            e.stopPropagation(); 
            handleButtonClick(() => { handleLogout(); setMobileOpen(false); }); 
          }}
          disabled={isTouchDevice && !expanded && window.innerWidth > 768}
        > 
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
