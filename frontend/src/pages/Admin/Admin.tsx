import React from 'react';
import AdminHeader from '../../components/AdminHeader/AdminHeader';
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar';
import AdminPanel from '../../components/AdminPanel/AdminPanel';
import './Admin.css';

const Admin: React.FC = () => {
  return (
    <div className="dashboard-container">
      <AdminHeader />
      <div className="dashboard-main">
        <AdminSidebar />
        <AdminPanel />
      </div>
    </div>
  );
};

export default Admin;
