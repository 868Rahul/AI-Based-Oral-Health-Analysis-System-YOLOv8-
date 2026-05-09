/**
 * server.js — Entry point for the Node.js + Express backend
 * Loads environment variables, connects to MongoDB, registers routes,
 * and starts the HTTP server.
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");

// Load .env variables
dotenv.config();

// Import DB connection
const connectDB = require("./config/db");

// Import route handlers
const authRoutes = require("./routes/auth");
const predictionRoutes = require("./routes/predictions");
const userRoutes = require("./routes/users");

// Initialize Express app
const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

// Allow cross-origin requests from the React frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Parse incoming JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (dev mode)
app.use(morgan("dev"));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);          // Register / Login
app.use("/api/predictions", predictionRoutes); // AI prediction endpoints
app.use("/api/users", userRoutes);         // User profile endpoints

// Root health-check
app.get("/", (req, res) => {
  res.json({ message: "Oral Lesion Detection API is running ✅" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB(); // Connect to MongoDB first
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  });
};

startServer();
