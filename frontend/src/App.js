/**
 * src/App.js — Root component: router setup and route definitions
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Login      from "./pages/Login";
import Register   from "./pages/Register";
import Dashboard  from "./pages/Dashboard";
import Predict    from "./pages/Predict";
import History    from "./pages/History";

// Components
import Navbar         from "./components/Navbar";
import LoadingSpinner from "./components/LoadingSpinner";

// ── Private route guard ──────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner size="lg" text="Restoring session…" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

// ── Public route guard (redirect if already logged in) ───────────────────────
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// ── App shell ────────────────────────────────────────────────────────────────
const AppShell = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Only show Navbar when authenticated */}
      {user && <Navbar />}

      <Routes>
        {/* Public */}
        <Route path="/"         element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/predict"   element={<PrivateRoute><Predict /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a2235",
            color: "#f1f5f9",
            border: "1px solid #1e2d45",
            borderRadius: "12px",
            fontSize: "0.88rem",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#0b1120" } },
          error:   { iconTheme: { primary: "#f87171", secondary: "#0b1120" } },
          duration: 4000,
        }}
      />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
