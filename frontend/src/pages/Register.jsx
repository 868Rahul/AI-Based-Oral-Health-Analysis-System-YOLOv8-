/**
 * src/pages/Register.jsx — Registration page
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm]       = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!form.email) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters.";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      toast.success("Account created! Welcome to OralAI 🎉");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.uiMessage || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, type, key, placeholder, extra = {}) => (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className={`form-input ${errors[key] ? "error" : ""}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...extra}
      />
      {errors[key] && <span className="form-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🦷</div>
          <h1>Create Account</h1>
          <p>Join OralAI — AI-powered lesion detection</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {field("reg-name",     "Full Name",        "text",     "name",     "Dr. John Doe",   { autoFocus: true, autoComplete: "name" })}
          {field("reg-email",    "Email Address",    "email",    "email",    "you@example.com",{ autoComplete: "email" })}
          {field("reg-password", "Password",         "password", "password", "Min. 6 characters", { autoComplete: "new-password" })}
          {field("reg-confirm",  "Confirm Password", "password", "confirm",  "Repeat password",{ autoComplete: "new-password" })}

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? (
              <><span className="spinner spinner-sm" /> Creating account…</>
            ) : (
              "Create Account →"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted" style={{ marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
