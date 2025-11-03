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
      
      <div className="sidebar-section">
      <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text home"> Home </span>
        </button>
      </div>

      <div className="sidebar-section">

        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Categories </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Income </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Expenses </span>
        </button>
      </div>

      <div className="sidebar-section">

        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Layouts </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Student </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Adult </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Custom </span>
        </button>
      </div>

      <div className="sidebar-section">

        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> General </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> AI Assistant </span>
        </button>

        <button className="selection large" onClick={handleLogout}> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Log out </span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
