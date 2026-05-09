/**
 * src/pages/Predict.jsx
 * Drag-and-drop image upload → AI prediction → result display.
 */

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

export default function Predict() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const code = rejected[0]?.errors[0]?.code;
      toast.error(code === "file-too-large" ? "Image must be under 10 MB." : "Use JPEG, PNG, or WEBP.");
      return;
    }
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handlePredict = async () => {
    if (!file) { toast.error("Please select an image first."); return; }
    const formData = new FormData();
    formData.append("image", file);
    setLoading(true);
    try {
      const { data } = await api.post("/predictions/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data.prediction);
      const isFound = data.prediction.status && (data.prediction.status.endsWith("_detected") || ["disease_detected", "lesion_detected"].includes(data.prediction.status));
      toast.success(isFound
        ? `⚠️ ${data.prediction.detectionCount || data.prediction.lesionCount} issue(s) detected!`
        : "✅ No issues detected.");
    } catch (err) {
      toast.error(err.uiMessage || "Prediction failed. Is the AI server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "oral_health_analysis.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error("Download failed. Opening in new tab instead.");
      window.open(url, "_blank");
    }
  };

  const handleReset = () => { setFile(null); setPreview(null); setResult(null); };

  const isDetected = result?.status && (result.status.endsWith("_detected") || ["disease_detected", "lesion_detected"].includes(result.status));

  return (
    <div className="page">
      {loading && <LoadingSpinner fullScreen text="Analysing image with YOLOv8…" />}
      <div className="container" style={{ maxWidth: 860 }}>

        <div className="page-header">
          <h1 className="page-title">🔬 Oral Health Analysis</h1>
          <p className="page-subtitle">Upload a clear mouth/oral image. The AI model will detect diseases and abnormalities in seconds.</p>
        </div>

        {/* Upload area */}
        {!result && (
          <div className="card animate-slide-up" style={{ marginBottom: "1.5rem" }}>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
              <input {...getInputProps()} id="image-upload-input" />
              <div className="dropzone-icon">{file ? "🖼️" : "📂"}</div>
              {file ? (
                <>
                  <p className="dropzone-text" style={{ color: "var(--clr-primary)" }}>{file.name}</p>
                  <p className="dropzone-sub">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                </>
              ) : (
                <>
                  <p className="dropzone-text">Drag & drop an image here</p>
                  <p className="dropzone-sub">or click to browse — JPEG, PNG, WEBP · max 10 MB</p>
                </>
              )}
            </div>

            {preview && (
              <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
                <img src={preview} alt="Preview" style={{
                  maxHeight: 300, maxWidth: "100%", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--clr-border)", objectFit: "contain", background: "#000",
                }} />
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              {file && <button className="btn btn-ghost" onClick={handleReset}>Clear</button>}
              <button id="detect-btn" className="btn btn-primary btn-lg"
                onClick={handlePredict} disabled={!file || loading}>
                🔍 Run Analysis
              </button>
            </div>
          </div>
        )}

        {/* Result Panel */}
        {result && (
          <div className="animate-slide-up">
            <div className="result-panel" style={{ marginBottom: "1.25rem" }}>
              <div className={`result-header ${isDetected ? "detected" : "no-lesion"}`}>
                <span style={{ fontSize: "1.5rem" }}>{isDetected ? "⚠️" : "✅"}</span>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    {isDetected ? `${result.detectionCount || result.lesionCount} Disease(s)/Finding(s) Detected` : "No Issues Detected"}
                  </h2>
                  <p className="text-sm text-muted">{result.message}</p>
                </div>
                <span className={`badge ${isDetected ? "badge-danger" : "badge-success"}`} style={{ marginLeft: "auto", textTransform: "capitalize" }}>
                  {result.status ? result.status.replace(/_/g, " ") : (isDetected ? "Detected" : "Clear")}
                </span>
              </div>

              <div className="result-body">
                {isDetected && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
                      <span className="text-sm font-semibold">Top Confidence Score</span>
                      <span style={{
                        fontSize: "1.1rem", fontWeight: 800,
                        background: "var(--grad-primary)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>{result.topConfidence?.toFixed(1)}%</span>
                    </div>
                    <div className="confidence-bar-track">
                      <div className="confidence-bar-fill" style={{ width: `${result.topConfidence}%` }} />
                    </div>
                  </div>
                )}

                {/* Image comparison */}
                <div className="img-compare">
                  <div className="img-compare-item">
                    <img src={preview} alt="Original" />
                    <div className="img-compare-label">📷 Original Image</div>
                  </div>
                  <div className="img-compare-item">
                    {result.annotatedImage ? (
                      <>
                        <img src={result.annotatedImage} alt="Annotated" />
                        <div className="img-compare-label">🤖 AI Annotated</div>
                      </>
                    ) : (
                      <div style={{
                        height: 260, display: "flex", alignItems: "center",
                        justifyContent: "center", flexDirection: "column",
                        gap: "0.5rem", color: "var(--clr-text-muted)",
                      }}>
                        <span style={{ fontSize: "2rem" }}>✅</span>
                        <span className="text-sm">No bounding boxes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Per-detection rows */}
                {isDetected && result.detections?.length > 0 && (
                  <div style={{ marginTop: "1.25rem" }}>
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Detection Details
                    </h3>
                    {result.detections.map((det, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.65rem 1rem", marginBottom: "0.5rem",
                        background: "var(--clr-bg-elevated)", borderRadius: "var(--radius-md)",
                        border: "1px solid var(--clr-border)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: "var(--clr-danger)", display: "inline-flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: "0.65rem", color: "#fff", fontWeight: 700,
                          }}>{i + 1}</span>
                          <span style={{ fontWeight: 600 }}>{det.label}</span>
                        </div>
                        <span className="badge badge-danger">{(det.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              {result.annotatedImage && (
                <button
                  onClick={() => handleDownload(result.annotatedImage, `oral_health_${Date.now()}.jpg`)}
                  className="btn btn-outline"
                >
                  ⬇️ Download Result
                </button>
              )}
              <button className="btn btn-primary" onClick={handleReset}>🔬 New Detection</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
