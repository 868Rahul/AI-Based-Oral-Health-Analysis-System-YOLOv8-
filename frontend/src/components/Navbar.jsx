/**
 * src/components/Navbar.jsx
 * Fixed top navigation bar shown to authenticated users.
 */

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Add shadow when page is scrolled
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/predict",   label: "Detect",    icon: "🔬" },
    { to: "/history",   label: "History",   icon: "📋" },
  ];

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      {/* Brand */}
      <NavLink to="/dashboard" className="nav-brand" style={{ textDecoration: "none" }}>
        <div className="nav-brand-icon" style={{ overflow: "hidden" }}>
          <img src="/logo.png" alt="OralAI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <span>OralAI</span>
      </NavLink>

      {/* Desktop nav links */}
      <div className="nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span style={{ marginRight: "0.3rem" }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Right side — user info + logout */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.35rem 0.75rem",
          background: "var(--clr-bg-elevated)",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--clr-border)",
          fontSize: "0.82rem",
        }}>
          <div style={{
            width: 26, height: 26,
            borderRadius: "50%",
            background: "var(--grad-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700, color: "#fff",
          }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <span style={{ color: "var(--clr-text-muted)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name}
          </span>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}
