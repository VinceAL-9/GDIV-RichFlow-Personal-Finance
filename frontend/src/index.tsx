import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing/Landing';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/login';
import Dashboard from './pages/Dashboard/Dashboard';
import UserGuide from './pages/UserGuide/UserGuide';
import ChangeUsername from './pages/ChangeUsername/ChangeUsername';
import ChangeEmail from './pages/ChangeEmail/ChangeEmail';
import ChangePassword from './pages/ChangePassword/ChangePassword';
import Admin from './pages/Admin/Admin';
import EventLog from './pages/EventLog/EventLog';
import Analysis from './pages/Analysis/Analysis';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route 
            path="/analysis" 
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/user-guide" 
            element={
              <ProtectedRoute>
                <UserGuide />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/change-username"
            element={
              <ProtectedRoute>
                <ChangeUsername />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-email"
            element={
              <ProtectedRoute>
                <ChangeEmail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/event-log"
            element={
              <ProtectedRoute>
                <EventLog />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
