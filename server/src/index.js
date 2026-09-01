require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const lessonRoutes = require("./routes/lesson.routes");
const materialRoutes = require("./routes/material.routes");
const progressRoutes = require("./routes/progress.routes");
const teacherRoutes = require("./routes/teacher.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/teacher", teacherRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-mentor-server" });
});

// Start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
