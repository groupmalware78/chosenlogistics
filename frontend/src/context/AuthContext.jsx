import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useIdleTimer } from '../hooks/useIdleTimer';

const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000;    // show warning 1 minute before logout

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('slp_user');
    const token = localStorage.getItem('slp_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('slp_token', data.token);
    localStorage.setItem('slp_user', JSON.stringify(data.user));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('slp_token');
    localStorage.removeItem('slp_user');
    delete api.defaults.headers.common['Authorization'];
    setIdleWarning(false);
    setUser(null);
    // ProtectedRoute will redirect to /login once user is null
  }, []);

  // Called when the user clicks "Stay Logged In" in the warning modal.
  // The act of clicking counts as activity, which resets the idle timer via the
  // DOM event listener in useIdleTimer — so we only need to close the modal here.
  const extendSession = useCallback(() => {
    setIdleWarning(false);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('slp_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Only active while a user is logged in
  useIdleTimer({
    onWarning: () => setIdleWarning(true),
    onIdle: logout,
    onActivity: () => setIdleWarning(false),
    enabled: !!user,
    timeoutMs: IDLE_TIMEOUT_MS,
    warningMs: WARNING_BEFORE_MS,
  });

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, idleWarning, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
