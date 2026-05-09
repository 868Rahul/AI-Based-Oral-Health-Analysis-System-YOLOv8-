/**
 * routes/users.js — User profile routes (JWT protected)
 * GET /api/users/profile
 * PUT /api/users/profile
 */

const express = require("express");
const { getProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

module.exports = router;
