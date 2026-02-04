import React, { createContext, useState, useContext, useEffect } from 'react';
import { loadToken, login as apiLogin, register as apiRegister, logout as apiLogout, getProfile } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load saved token and user on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await loadToken();
        if (token) {
          // Verify token by getting profile
          const result = await getProfile();
          if (result.success) {
            setUser(result.user);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const result = await apiLogin(email, password);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return { success: result.success, error: result.error, code: result.code, user: result.user };
  };

  const register = async (email, password, name) => {
    const result = await apiRegister(email, password, name);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return result;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUserData = (newData) => {
    setUser(prev => ({ ...prev, ...newData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
