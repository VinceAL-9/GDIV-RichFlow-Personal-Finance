import React from 'react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <button className="sidebar-button small"></button>
      </div>
      <div className="sidebar-section">
        <button className="sidebar-button large"></button>
        <button className="sidebar-button large"></button>
        <button className="sidebar-button large"></button>
      </div>
      <div className="sidebar-section">
        <button className="sidebar-button small"></button>
      </div>
      <div className="sidebar-section">
        <button className="sidebar-button large"></button>
        <button className="sidebar-button large"></button>
        <button className="sidebar-button large"></button>
      </div>
    </aside>
  );
};

export default Sidebar;
