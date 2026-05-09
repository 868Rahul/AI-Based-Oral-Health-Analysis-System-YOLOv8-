/**
 * src/pages/Dashboard.jsx
 * Shows summary stats + quick links + recent predictions table.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

// ── Small stat card ──────────────────────────────────────────────────────────
const StatCard = ({ icon, bg, label, value, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg }}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          api.get("/predictions/stats"),
          api.get("/predictions/history?page=1&limit=5"),
        ]);
        setStats(statsRes.data.stats);
        setRecent(histRes.data.predictions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: "100vh" }}>
        <LoadingSpinner text="Loading dashboard…" />
      </div>
    );
  }

  const statCards = [
    { icon: "🔬", bg: "rgba(6,182,212,0.15)",   label: "Total Scans",        value: stats?.totalScans      ?? 0 },
    { icon: "⚠️",  bg: "rgba(248,113,113,0.15)", label: "Findings Detected",  value: stats?.findingsDetected ?? 0 },
    { icon: "✅",  bg: "rgba(52,211,153,0.15)",  label: "Clear Scans",        value: stats?.noDisease        ?? 0 },
    { icon: "📈",  bg: "rgba(129,140,248,0.15)", label: "Avg. Confidence",    value: `${stats?.avgConfidence ?? 0}%`, sub: `Detection rate: ${stats?.detectionRate ?? 0}%` },
  ];

  return (
    <div className="page" style={{ background: "var(--clr-bg)" }}>
      <div className="container">
        {/* Welcome header */}
        <div className="page-header animate-fade-in">
          <h1 className="page-title">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="page-subtitle">
            Here's your oral health analysis overview.
          </p>
        </div>

        {/* Stat cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1.1rem",
          marginBottom: "2rem",
        }}
          className="animate-slide-up"
        >
          {statCards.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <Link to="/predict" style={{ textDecoration: "none" }}>
            <div className="card" style={{
              background: "linear-gradient(135deg,rgba(6,182,212,0.12),rgba(129,140,248,0.08))",
              borderColor: "rgba(6,182,212,0.3)",
              cursor: "pointer",
              transition: "all 250ms",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔬</div>
              <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>New Detection</h3>
              <p className="text-muted text-sm">Upload a mouth image for AI-powered lesion analysis.</p>
            </div>
          </Link>

          <Link to="/history" style={{ textDecoration: "none" }}>
            <div className="card" style={{
              background: "linear-gradient(135deg,rgba(129,140,248,0.12),rgba(6,182,212,0.08))",
              borderColor: "rgba(129,140,248,0.3)",
              cursor: "pointer",
              transition: "all 250ms",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: "0.4rem" }}>View History</h3>
              <p className="text-muted text-sm">Browse all past predictions and download reports.</p>
            </div>
          </Link>
        </div>

        {/* Recent predictions table */}
        <div className="card animate-fade-in">
          <div className="flex-between" style={{ marginBottom: "1.1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>Recent Predictions</h2>
            <Link to="/history" className="btn btn-ghost btn-sm">View all →</Link>
          </div>

          {recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--clr-text-muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔬</div>
              <p>No predictions yet. <Link to="/predict">Start your first scan →</Link></p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Findings</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p._id}>
                      <td style={{ color: "var(--clr-text-muted)", fontSize: "0.82rem" }}>
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${(p.status === "no_lesion" || p.status === "no_disease") ? "badge-success" : (p.status === "error" ? "badge-warning" : "badge-danger")}`}>
                          {p.status ? p.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Error"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.lesionCount}</td>
                      <td>
                        <div className="confidence-bar-wrapper" style={{ minWidth: 120 }}>
                          <div className="confidence-bar-track">
                            <div className="confidence-bar-fill" style={{ width: `${p.topConfidence}%` }} />
                          </div>
                          <span className="text-xs text-muted">{p.topConfidence.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
