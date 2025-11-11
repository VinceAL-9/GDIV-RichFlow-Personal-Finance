import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
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
    <aside className={`sidebar ${ expanded ? 'expanded' : ''}` } onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
      
      {/* Home Button */}
      <div className="sidebar-section">
        <button className="selection large" onClick={() => navigate("/")}> 
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

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> User Guide </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Currency </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Saki Assistant </span>
        </button>
      </div>

      {/* Settings Section */}
      <div className="sidebar-section">
        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Settings </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Username </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Email </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Change Password </span>
        </button>

        <button className="selection large" onClick={handleLogout}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Log Out </span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
