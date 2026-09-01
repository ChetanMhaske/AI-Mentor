const mongoose = require("mongoose");

const pastScoreSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    score: { type: Number },
    maxScore: { type: Number },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const learningHistorySchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    topic: { type: String },
    score: { type: Number },
    maxScore: { type: Number },
    percentage: { type: Number },
    strongConcepts: [{ type: String }],
    weakConcepts: [{ type: String }],
    suggestedNextTopic: { type: String },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const misconceptionSchema = new mongoose.Schema(
  {
    concept: { type: String },
    misconception: { type: String },
    lastDetected: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
  },
  { _id: false }
);

const learnerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    preferredLanguage: { type: String, default: "en" },
    learningStyle: { type: String, enum: ["visual", "auditory", "reading", "kinesthetic"], default: "visual" },
    interests: [{ type: String }],
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    pastTopics: [{ type: String }],
    weakConcepts: [{ type: String }],
    strongConcepts: [{ type: String }],
    pastScores: [pastScoreSchema],
    learningHistory: [learningHistorySchema],
    // NEW: Real-time adaptive teaching data
    conceptMastery: { type: Map, of: Number, default: {} },
    misconceptions: [misconceptionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearnerProfile", learnerProfileSchema);
