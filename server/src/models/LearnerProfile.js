const mongoose = require("mongoose");

const learnerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    preferredLanguage: { type: String, default: "en" },
    learningStyle: { type: String, enum: ["visual", "auditory", "reading", "kinesthetic"], default: "visual" },
    interests: [{ type: String }],
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearnerProfile", learnerProfileSchema);
