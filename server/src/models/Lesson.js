const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    topic: { type: String },
    learnerLevel: { type: String, enum: ["beginner", "intermediate", "advanced"] },
    language: { type: String, default: "en" },
    availableTimeMinutes: { type: Number },
    learningObjective: { type: String },
    preferredStyle: { type: String },
    plan: { type: mongoose.Schema.Types.Mixed, required: true },
    groundedInMaterial: { type: Boolean, default: false },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material" },
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Material" }],
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);
