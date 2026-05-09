/**
 * controllers/predictionController.js
 * Handles image upload → Flask AI call → MongoDB save → response
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const Prediction = require("../models/Prediction");

// ─── @POST /api/predictions/predict ──────────────────────────────────────────
const predict = async (req, res) => {
  // Multer puts file info in req.file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file uploaded.",
    });
  }

  const filePath = req.file.path;
  const fileName = req.file.filename;

  try {
    // ── 1. Send image to Flask AI API using multipart/form-data ──────────────
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));

    const flaskResponse = await axios.post(
      `${process.env.FLASK_API_URL}/predict`,
      formData,
      {
        headers: { ...formData.getHeaders() },
        timeout: 60000, // 60s timeout for AI inference
      }
    );

    const aiResult = flaskResponse.data;

    // ── 2. Determine status ───────────────────────────────────────────────────
    const detectionCount = aiResult.detection_count || (aiResult.detections ? aiResult.detections.length : 0);
    const status = aiResult.status || (detectionCount > 0 ? "disease_detected" : "no_disease");

    // Highest confidence score among detections (as percentage)
    const topConfidence =
      detectionCount > 0
        ? Math.max(...aiResult.detections.map((d) => d.confidence)) * 100
        : 0;

    // ── 3. Save prediction record to MongoDB ──────────────────────────────────
    const prediction = await Prediction.create({
      userId: req.user._id,
      originalImage: aiResult.original_image || fileName,
      annotatedImage: aiResult.annotated_image || null,
      detections: aiResult.detections || [],
      topConfidence: parseFloat(topConfidence.toFixed(2)),
      status,
      lesionCount: detectionCount, // Keeping DB field name as lesionCount for schema compatibility
      message: aiResult.message || "",
    });

    // ── 4. Return result to frontend ──────────────────────────────────────────
    return res.status(200).json({
      success: true,
      prediction: {
        id: prediction._id,
        status,
        detectionCount,
        lesionCount: detectionCount, // For backward compatibility
        topConfidence: prediction.topConfidence,
        detections: prediction.detections,
        originalImage: `${process.env.FLASK_API_URL}/uploads/${aiResult.original_image || fileName}`,
        annotatedImage: aiResult.annotated_image
          ? `${process.env.FLASK_API_URL}/annotated/${aiResult.annotated_image}`
          : null,
        message: prediction.message,
        createdAt: prediction.createdAt,
      },
    });
  } catch (error) {
    console.error("Prediction error:", error.message);

    // Save failed prediction to DB for audit trail
    await Prediction.create({
      userId: req.user._id,
      originalImage: fileName,
      status: "error",
      message: error.message,
    }).catch(() => {});

    // Handle Flask connection failure specifically
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "AI service is unavailable. Please ensure the Flask server is running.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Prediction failed. Please try again.",
    });
  }
};

// ─── @GET /api/predictions/history ───────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [predictions, total] = await Promise.all([
      Prediction.find({ userId: req.user._id })
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .lean(),
      Prediction.countDocuments({ userId: req.user._id }),
    ]);

    // Attach full image URLs
    const enriched = predictions.map((p) => ({
      ...p,
      originalImageUrl: p.originalImage
        ? `${process.env.FLASK_API_URL}/uploads/${p.originalImage}`
        : null,
      annotatedImageUrl: p.annotatedImage
        ? `${process.env.FLASK_API_URL}/annotated/${p.annotatedImage}`
        : null,
    }));

    res.status(200).json({
      success: true,
      predictions: enriched,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history." });
  }
};

// ─── @GET /api/predictions/:id ────────────────────────────────────────────────
const getPredictionById = async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      userId: req.user._id, // Ensure user can only access their own
    }).lean();

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found.",
      });
    }

    res.status(200).json({
      success: true,
      prediction: {
        ...prediction,
        originalImageUrl: prediction.originalImage
          ? `${process.env.FLASK_API_URL}/uploads/${prediction.originalImage}`
          : null,
        annotatedImageUrl: prediction.annotatedImage
          ? `${process.env.FLASK_API_URL}/annotated/${prediction.annotatedImage}`
          : null,
      },
    });
  } catch (error) {
    console.error("Get prediction error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── @DELETE /api/predictions/:id ────────────────────────────────────────────
const deletePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found or not authorized.",
      });
    }

    // Optionally delete associated image files from disk
    const uploadsDir = path.join(__dirname, "../uploads");
    const originalPath = path.join(uploadsDir, prediction.originalImage || "");
    if (prediction.originalImage && fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }

    res.status(200).json({ success: true, message: "Prediction deleted." });
  } catch (error) {
    console.error("Delete prediction error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── @GET /api/predictions/stats ─────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, detected, noDisease] = await Promise.all([
      Prediction.countDocuments({ userId }),
      Prediction.countDocuments({ userId, status: { $nin: ["no_lesion", "no_disease", "error"] } }),
      Prediction.countDocuments({ userId, status: { $in: ["no_lesion", "no_disease"] } }),
    ]);

    // Average confidence over detected lesions
    const avgResult = await Prediction.aggregate([
      { $match: { userId: userId, status: { $nin: ["no_lesion", "no_disease", "error"] } } },
      { $group: { _id: null, avgConf: { $avg: "$topConfidence" } } },
    ]);
    const avgConfidence =
      avgResult.length > 0 ? parseFloat(avgResult[0].avgConf.toFixed(2)) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalScans: total,
        findingsDetected: detected,
        noDisease,
        avgConfidence,
        detectionRate:
          total > 0 ? parseFloat(((detected / total) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
};

module.exports = {
  predict,
  getHistory,
  getPredictionById,
  deletePrediction,
  getStats,
};
