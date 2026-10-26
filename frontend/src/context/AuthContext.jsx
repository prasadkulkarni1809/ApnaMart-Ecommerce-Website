/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const ACCOUNT_API = "http://localhost:3000/api/account";
const REACT_HEADERS = { "X-Client": "react" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${ACCOUNT_API}/me`, {
        withCredentials: true,
        headers: REACT_HEADERS,
      });
      setUser(response.data.user || null);
      return response.data.user || null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAuth();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${ACCOUNT_API}/logout`, {}, {
        withCredentials: true,
        headers: REACT_HEADERS,
      });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
