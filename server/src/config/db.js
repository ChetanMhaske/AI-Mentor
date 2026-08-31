const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("No MONGO_URI provided. Running without database for UI demo.");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000, family: 4 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.warn("Continuing without database for UI demo.");
  }
};

module.exports = connectDB;
