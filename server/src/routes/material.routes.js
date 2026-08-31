const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const auth = require("../middleware/auth");
const Material = require("../models/Material");

const router = express.Router();

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint POST /api/materials/upload
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // 1. Generate a material ID and store basic info in MongoDB
    const material = await Material.create({
      user: req.user.id,
      title: req.body.title || req.file.originalname,
      original_filename: req.file.originalname,
      file_type: req.file.mimetype,
      tags: req.body.tags ? req.body.tags.split(',') : [],
      ai_service_material_id: `mat_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    });

    // 2. Forward the file to the Python AI service
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    
    // Create form data
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);
    formData.append("material_id", material.ai_service_material_id);

    const aiRes = await fetch(`${AI_SERVICE_URL}/materials/upload`, {
      method: "POST",
      body: formData,
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      // Rollback material creation
      await Material.findByIdAndDelete(material._id);
      throw new Error(`AI Service failed to process material: ${errorText}`);
    }

    const aiData = await aiRes.json();

    res.status(201).json({
      success: true,
      material,
      ai_response: aiData
    });
  } catch (err) {
    console.error("Material upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint GET /api/materials
router.get("/", auth, async (req, res) => {
  try {
    const materials = await Material.find({ user: req.user.id }).sort("-createdAt");
    res.json({ success: true, materials });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
