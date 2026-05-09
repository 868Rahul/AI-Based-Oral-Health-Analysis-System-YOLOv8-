/**
 * src/services/api.js
 * Pre-configured Axios instance pointing at the Node.js backend.
 * All requests that need auth will have the Bearer token injected
 * automatically by the AuthContext whenever the token changes.
 */

import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 90000, // 90 s to allow AI inference time
  headers: { "Content-Type": "application/json" },
});

// ── Response interceptor — surface error messages cleanly ──────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      "Something went wrong. Please try again.";

    // Attach a clean message to the error object for UI use
    error.uiMessage = message;
    return Promise.reject(error);
  }
);

export default api;
