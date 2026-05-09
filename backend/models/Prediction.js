/**
 * models/Prediction.js — Mongoose schema for AI prediction results
 * Each document represents one image upload + YOLOv8 prediction.
 */

const mongoose = require("mongoose");

// Sub-schema for each detected bounding box
const detectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true, // e.g., "Oral Lesion"
    },
    confidence: {
      type: Number,
      required: true, // 0.0 – 1.0 float
      min: 0,
      max: 1,
    },
    bbox: {
      // Bounding box coordinates [x1, y1, x2, y2] in pixels
      x1: Number,
      y1: Number,
      x2: Number,
      y2: Number,
    },
  },
  { _id: false }
);

const predictionSchema = new mongoose.Schema(
  {
    // Reference to the user who made this prediction
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Original uploaded image filename (stored in /uploads)
    originalImage: {
      type: String,
      required: true,
    },

    // Annotated image returned by Flask (with bounding boxes drawn)
    annotatedImage: {
      type: String,
      default: null,
    },

    // Array of all detections found by YOLO
    detections: [detectionSchema],

    // Highest confidence score among all detections (0–100 %)
    topConfidence: {
      type: Number,
      default: 0,
    },

    // Human-readable status
    status: {
      type: String,
      default: "no_disease",
    },

    // Total number of lesions detected
    lesionCount: {
      type: Number,
      default: 0,
    },

    // Raw message from Flask API
    message: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // createdAt = prediction date/time
  }
);

module.exports = mongoose.model("Prediction", predictionSchema);
