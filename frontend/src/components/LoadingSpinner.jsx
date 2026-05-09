/**
 * src/components/LoadingSpinner.jsx
 * Reusable spinner with optional text label.
 */

import React from "react";

export default function LoadingSpinner({ size = "md", text = "", fullScreen = false }) {
  const spinnerClass = size === "sm" ? "spinner spinner-sm" : "spinner";

  const inner = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div className={spinnerClass} />
      {text && (
        <p style={{ color: "var(--clr-text-muted)", fontSize: "0.9rem", fontWeight: 500 }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "rgba(11,17,32,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}>
        {inner}
      </div>
    );
  }

  return inner;
}
