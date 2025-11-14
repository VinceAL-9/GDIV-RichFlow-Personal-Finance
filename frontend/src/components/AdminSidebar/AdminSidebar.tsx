import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminSidebar.css';

const AdminSidebar: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  return (
    <aside 
      className={`admin-sidebar ${expanded ? 'expanded' : ''}`} 
      onMouseEnter={() => setExpanded(true)} 
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logout Button */}
      <div className="admin-sidebar-section">
        <button className="admin-sidebar-item" onClick={handleLogout}> 
          <div className="admin-sidebar-icon"></div>
          <span className="admin-sidebar-text">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
