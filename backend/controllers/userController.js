/**
 * controllers/userController.js
 * Handles user profile retrieval and update.
 */

const User = require("../models/User");

// ─── @GET /api/users/profile ──────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─── @PUT /api/users/profile ──────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters.",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated.",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { getProfile, updateProfile };
