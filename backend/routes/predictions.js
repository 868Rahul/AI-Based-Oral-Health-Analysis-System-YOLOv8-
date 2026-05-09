/**
 * routes/predictions.js — Prediction routes (all protected by JWT)
 * POST   /api/predictions/predict     — Upload image & get AI result
 * GET    /api/predictions/history     — Get user's prediction history
 * GET    /api/predictions/stats       — Get dashboard stats
 * GET    /api/predictions/:id         — Get single prediction
 * DELETE /api/predictions/:id         — Delete a prediction
 */

const express = require("express");
const {
  predict,
  getHistory,
  getPredictionById,
  deletePrediction,
  getStats,
} = require("../controllers/predictionController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../config/multer");

const router = express.Router();

// All routes below require a valid JWT
router.use(protect);

// Stats must come before /:id to avoid being matched as an ID
router.get("/stats", getStats);
router.get("/history", getHistory);

router.post(
  "/predict",
  upload.single("image"), // "image" must match the frontend FormData field name
  predict
);

router.get("/:id", getPredictionById);
router.delete("/:id", deletePrediction);

module.exports = router;
