const jwt = require("jsonwebtoken");
const User = require("../models/User");
const mongoose = require("mongoose");

const auth = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Service Unavailable: Database not connected" });
    }

    let user;
    const header = req.header("Authorization");
    
    if (header && header.startsWith("Bearer ")) {
      const token = header.replace("Bearer ", "");
      if (token !== "null" && token !== "undefined") {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          user = await User.findById(decoded.id).select("-password");
        } catch (e) {
          // Token invalid, fall through to auto-user creation
        }
      }
    }

    // Auto-login/create default user for prototype (since there is no login UI)
    if (!user) {
      user = await User.findOne({ email: "demo@example.com" });
      if (!user) {
        user = await User.create({
          name: "Demo User",
          email: "demo@example.com",
          password: "password123", // Will be hashed by model pre-save
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;
