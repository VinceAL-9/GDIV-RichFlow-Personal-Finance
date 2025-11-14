import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setAccessToken, clearAccessToken, refreshAccessToken } from '../utils/api';

interface User {
  id: string | number;
  name: string;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (newName: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session using refresh token cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to refresh access token from cookie
        const refreshed = await refreshAccessToken();
        
        if (refreshed) {
          // Get user profile with the new access token
          const userData = await authAPI.getProfile();
          setUser(userData.user);
        }
      } catch (error) {
        // No valid session, user stays logged out
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateUsername = async (newName: string) => {
    try {
      const data = await authAPI.updateUsername(newName);
      // Expect backend to return `{ user: { id, email, name } }`
      if (data?.user) {
        setUser(data.user);
      } else {
        // Fallback to local update
        setUser((prev) => (prev ? { ...prev, name: newName } : prev));
      }
    } catch (error: any) {
      // Surface error to caller
      throw error;
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const data = await authAPI.updateEmail(newEmail);
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser((prev) => (prev ? { ...prev, email: newEmail } : prev));
      }
    } catch (error: any) {
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authAPI.updatePassword(currentPassword, newPassword);
    } catch (error: any) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUsername,
    updateEmail,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};