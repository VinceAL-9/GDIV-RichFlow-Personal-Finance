import React from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './pages/Landing/Landing';
import Signup from './pages/Signup/Signup';


const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Signup />
    </React.StrictMode>
  );
}
