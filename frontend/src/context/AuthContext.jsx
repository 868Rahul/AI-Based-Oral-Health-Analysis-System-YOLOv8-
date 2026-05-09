/**
 * src/context/AuthContext.jsx
 * Global authentication state via React Context.
 * Provides: user, token, login(), register(), logout(), loading
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem("oralai_token") || null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // ── Restore session on page reload ─────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      if (!token) { setLoading(false); return; }
      try {
        // Set auth header then verify token with backend
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        // Token invalid / expired — clear it
        localStorage.removeItem("oralai_token");
        setToken(null);
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep axios header in sync whenever token changes ───────────────────────
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // ── Register ────────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("oralai_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("oralai_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("oralai_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy consumption
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
