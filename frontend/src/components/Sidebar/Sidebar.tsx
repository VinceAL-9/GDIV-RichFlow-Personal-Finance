import React from 'react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <aside className={`sidebar ${ expanded ? 'expanded' : ''}` } onMouseEnter={() => setExpanded(true)} onMouseLeave={() => setExpanded(false)}>
      <div className="sidebar-section">

        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

      </div>
      <div className="sidebar-section">
        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

      </div>
      <div className="sidebar-section">

        <button className="selection small">
          <div className="sidebar-button small"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>
      </div>

      <div className="sidebar-section">

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

        <button className="selection large"> 
          <div className="sidebar-button large"></div>
          <span className="sidebar-text"> Placeholder </span>
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;
