const express = require("express");
const auth = require("../middleware/auth");
const LearnerProfile = require("../models/LearnerProfile");
const Assessment = require("../models/Assessment");

const router = express.Router();

// GET /api/progress — get learner's progress dashboard data
router.get("/", auth, async (req, res) => {
  try {
    const profile = await LearnerProfile.findOne({ user: req.user._id }).lean();
    const assessments = await Assessment.find({ user: req.user._id })
      .sort("-completedAt")
      .populate("lesson", "title topic")
      .lean();

    // Build scores-over-time data for charting
    const scoresOverTime = assessments.map(a => ({
      date: a.completedAt || a.createdAt,
      topic: a.lesson?.topic || a.lesson?.title || "Unknown",
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage
    })).reverse(); // oldest first for chart

    res.json({
      success: true,
      profile: profile || { pastTopics: [], weakConcepts: [], strongConcepts: [], pastScores: [], learningHistory: [] },
      assessments,
      scoresOverTime,
      suggestedNextTopic: profile?.learningHistory?.length
        ? profile.learningHistory[profile.learningHistory.length - 1].suggestedNextTopic
        : null
    });
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
