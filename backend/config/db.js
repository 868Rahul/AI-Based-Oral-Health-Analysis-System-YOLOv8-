/**
 * config/db.js — MongoDB Atlas connection via Mongoose
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error(`Error: ${error.message}`);
    if (error.message.includes("ENOTFOUND")) {
      console.error("👉 TIP: You need to put your actual MongoDB Atlas URI in backend/.env");
    }
    process.exit(1);
  }
};

module.exports = connectDB;
