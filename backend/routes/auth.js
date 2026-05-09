/**
 * routes/auth.js — Authentication routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me  (protected)
 */

const express = require("express");
const { body } = require("express-validator");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("name")
      .trim()
      .notEmpty().withMessage("Name is required")
      .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email")
      .isEmail().withMessage("Invalid email address")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  register
);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// ─── Get current user (JWT protected) ────────────────────────────────────────
router.get("/me", protect, getMe);

module.exports = router;
