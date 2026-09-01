const Lesson = require("../models/Lesson");
const LearnerProfile = require("../models/LearnerProfile");

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1");

/**
 * Start a live teacher session for a lesson.
 */
const startSession = async (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId is required" });

    const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user._id }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    // Build student profile
    const profile = await LearnerProfile.findOne({ user: req.user._id }).lean();
    let studentProfile = null;
    if (profile) {
      let avgScore = null;
      if (profile.pastScores && profile.pastScores.length > 0) {
        const total = profile.pastScores.reduce(
          (sum, s) => sum + (s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0), 0
        );
        avgScore = Math.round(total / profile.pastScores.length);
      }
      studentProfile = {
        level: profile.level || "beginner",
        weak_concepts: profile.weakConcepts || [],
        strong_concepts: profile.strongConcepts || [],
        interests: profile.interests || [],
        past_topics: profile.pastTopics || [],
        avg_score: avgScore,
        learning_style: profile.learningStyle || "visual",
      };
    }

    // Get material_id if lesson is grounded in material
    let materialId = null;
    if (lesson.material) {
      const Material = require("../models/Material");
      const mat = await Material.findById(lesson.material).lean();
      if (mat && mat.ai_service_material_id) {
        materialId = mat.ai_service_material_id;
      }
    }

    const response = await fetch(`${AI_SERVICE_URL}/teacher/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: lessonId,
        lesson_title: lesson.title,
        lesson_topic: lesson.topic || lesson.title,
        sections: lesson.plan?.sections || [],
        student_level: lesson.learnerLevel || "beginner",
        available_time: lesson.availableTimeMinutes || 20,
        language: lesson.language || "en",
        student_profile: studentProfile,
        material_id: materialId,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ message: err.detail || "Failed to start session" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error starting teacher session:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Process a student interaction during a live lesson.
 */
const interact = async (req, res) => {
  try {
    const { sessionId, studentMessage, currentSectionIndex } = req.body;
    if (!sessionId || !studentMessage) {
      return res.status(400).json({ message: "sessionId and studentMessage are required" });
    }

    const response = await fetch(`${AI_SERVICE_URL}/teacher/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        student_message: studentMessage,
        current_section_index: currentSectionIndex || 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ message: err.detail || "Interaction failed" });
    }

    const data = await response.json();

    // Update learner profile in real-time if misconception detected
    if (data.misconception_detected && data.misconception) {
      try {
        let profile = await LearnerProfile.findOne({ user: req.user._id });
        if (!profile) profile = new LearnerProfile({ user: req.user._id });

        // Add misconception if not already tracked
        const existingMisconception = (profile.misconceptions || []).find(
          m => m.misconception === data.misconception
        );
        if (!existingMisconception) {
          if (!profile.misconceptions) profile.misconceptions = [];
          profile.misconceptions.push({
            concept: data.session_state?.current_concept || "",
            misconception: data.misconception,
            lastDetected: new Date(),
            resolved: false,
          });
          await profile.save();
        }
      } catch (profileErr) {
        console.error("Failed to update learner profile:", profileErr);
        // Non-fatal — don't fail the interaction
      }
    }

    res.json(data);
  } catch (err) {
    console.error("Error in teacher interaction:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Generate TTS for a teacher response.
 */
const generateTTS = async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });

    const response = await fetch(`${AI_SERVICE_URL}/teacher/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: language || "en" }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ message: err.detail || "TTS failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error generating TTS:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get current session state.
 */
const getSessionState = async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/teacher/session/${req.params.sessionId}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ message: err.detail || "Session not found" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error getting session state:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { startSession, interact, generateTTS, getSessionState };
