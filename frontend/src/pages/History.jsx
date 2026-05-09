/**
 * src/pages/History.jsx
 * Full paginated prediction history with delete and detail expansion.
 */

import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

export default function History() {
  const [predictions, setPredictions] = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0 });
  const [loading,     setLoading]     = useState(true);
  const [deleting,    setDeleting]    = useState(null);
  const [expanded,    setExpanded]    = useState(null);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/predictions/history?page=${page}&limit=8`);
      setPredictions(data.predictions);
      setPagination(data.pagination);
    } catch (err) {
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "oral_health_history.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error("Download failed.");
      window.open(url, "_blank");
    }
  };

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this prediction? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete(`/predictions/${id}`);
      toast.success("Prediction deleted.");
      fetchHistory(pagination.page);
    } catch {
      toast.error("Could not delete prediction.");
    } finally {
      setDeleting(null);
    }
  };

  const statusBadge = (status) => {
    if (!status) return <span className="badge badge-warning">❌ Error</span>;
    if (status === "no_lesion" || status === "no_disease") return <span className="badge badge-success">✅ Clear</span>;
    
    // Format dynamic status (e.g., "ulcer_detected" -> "Ulcer Detected")
    const label = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return <span className="badge badge-danger">⚠️ {label}</span>;
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header animate-fade-in">
          <h1 className="page-title">📋 Prediction History</h1>
          <p className="page-subtitle">
            {pagination.total} total scan{pagination.total !== 1 ? "s" : ""} on record.
          </p>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: "4rem 0" }}>
            <LoadingSpinner text="Loading history…" />
          </div>
        ) : predictions.length === 0 ? (
          <div className="card text-center animate-fade-in" style={{ padding: "4rem 2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔬</div>
            <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No Predictions Yet</h2>
            <p className="text-muted">Go to the Detect page to run your first scan.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper animate-slide-up">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Findings</th>
                    <th>Confidence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, idx) => (
                    <React.Fragment key={p._id}>
                      <tr>
                        <td className="text-muted text-sm">
                          {(pagination.page - 1) * 8 + idx + 1}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)", minWidth: 150 }}>
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td>{statusBadge(p.status)}</td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: "1rem" }}>{p.lesionCount}</span>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <div className="confidence-bar-track">
                              <div className="confidence-bar-fill" style={{ width: `${p.topConfidence}%` }} />
                            </div>
                            <span className="text-xs text-muted">{p.topConfidence?.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                            >
                              {expanded === p._id ? "▲ Hide" : "▼ Details"}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(p._id)}
                              disabled={deleting === p._id}
                            >
                              {deleting === p._id ? <span className="spinner spinner-sm" /> : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expanded === p._id && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={{
                              background: "var(--clr-bg-elevated)",
                              borderTop: "1px solid var(--clr-border)",
                              padding: "1.1rem 1.3rem",
                              animation: "fadeIn 0.3s ease",
                            }}>
                              <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>
                                {p.message || "No additional message."}
                              </p>

                              {/* Images */}
                              {(p.originalImageUrl || p.annotatedImageUrl) && (
                                <div className="img-compare">
                                  {p.originalImageUrl && (
                                    <div className="img-compare-item">
                                      <img src={p.originalImageUrl} alt="Original" />
                                      <div className="img-compare-label">📷 Original</div>
                                    </div>
                                  )}
                                  {p.annotatedImageUrl && (
                                    <div className="img-compare-item">
                                      <img src={p.annotatedImageUrl} alt="Annotated" />
                                      <div className="img-compare-label">🤖 Annotated</div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Detections list */}
                              {p.detections?.length > 0 && (
                                <div style={{ marginTop: "0.75rem" }}>
                                  <p className="text-xs text-muted font-semibold" style={{ marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Detected Items
                                  </p>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                    {p.detections.map((d, i) => (
                                      <span key={i} className="badge badge-danger">
                                        {d.label} — {(d.confidence * 100).toFixed(1)}%
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {p.annotatedImageUrl && (
                                <div style={{ marginTop: "0.75rem" }}>
                                  <button
                                    onClick={() => handleDownload(p.annotatedImageUrl, `oral_health_history_${p._id}.jpg`)}
                                    className="btn btn-outline btn-sm"
                                  >
                                    ⬇️ Download Annotated Image
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fetchHistory(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  ← Prev
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    className={`btn btn-sm ${pg === pagination.page ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => fetchHistory(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fetchHistory(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
