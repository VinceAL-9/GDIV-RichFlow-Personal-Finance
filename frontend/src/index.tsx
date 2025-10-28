import React from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './pages/Landing/Landing';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/login';
import Dashboard from './pages/Dashboard/Dashboard';


const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
}
