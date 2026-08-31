const mongoose = require("mongoose");

const gradedAnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number },
    question: { type: String },
    studentAnswer: { type: String },
    correctAnswer: { type: String },
    isCorrect: { type: Boolean },
    explanation: { type: String },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    score: { type: Number },
    maxScore: { type: Number },
    percentage: { type: Number },
    strongConcepts: [{ type: String }],
    weakConcepts: [{ type: String }],
    incorrectConcepts: [{ type: String }],
    recommendedRevision: [{ type: String }],
    suggestedNextTopic: { type: String },
    gradedAnswers: [gradedAnswerSchema],
    feedback: { type: String },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assessment", assessmentSchema);
