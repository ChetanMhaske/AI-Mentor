const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String },
    fileType: { type: String },
    original_filename: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ai_service_material_id: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);

