const Lesson = require("../models/Lesson");
const LearnerProfile = require("../models/LearnerProfile");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Fetch the learner profile for a user and serialize it for the AI service.
 */
const getProfilePayload = async (userId) => {
  const profile = await LearnerProfile.findOne({ user: userId }).lean();
  if (!profile) return null;

  // Compute average score from recent assessments
  let avgScore = null;
  if (profile.pastScores && profile.pastScores.length > 0) {
    const total = profile.pastScores.reduce(
      (sum, s) => sum + (s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0),
      0
    );
    avgScore = Math.round(total / profile.pastScores.length);
  }

  return {
    level: profile.level || "beginner",
    preferred_language: profile.preferredLanguage || "en",
    learning_style: profile.learningStyle || "visual",
    interests: profile.interests || [],
    past_topics: profile.pastTopics || [],
    weak_concepts: profile.weakConcepts || [],
    strong_concepts: profile.strongConcepts || [],
    avg_score: avgScore,
  };
};

/**
 * Call the AI service to generate a lesson plan and persist it.
 */
const createLesson = async (userId, body) => {
  const {
    material_id,
    topic,
    learner_level,
    language,
    available_time_minutes,
    learning_objective,
    preferred_style,
  } = body;

  // Fetch learner profile from MongoDB
  const learnerProfile = await getProfilePayload(userId);

  // Call the AI service
  const response = await fetch(`${AI_SERVICE_URL}/lessons/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      material_id: material_id || null,
      topic: topic || null,
      learner_level: learner_level || (learnerProfile && learnerProfile.level) || "beginner",
      language: language || (learnerProfile && learnerProfile.preferred_language) || "en",
      available_time_minutes,
      learning_objective,
      preferred_style: preferred_style || (learnerProfile && learnerProfile.learning_style) || "visual",
      learner_profile: learnerProfile,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `AI service returned ${response.status}`);
  }

  const data = await response.json();
  const plan = data.plan;

  // Determine title from the plan
  const title = plan.title || (plan.days && plan.days[0]?.title) || topic || "Untitled Lesson";

  // Persist to MongoDB
  const lesson = await Lesson.create({
    title,
    topic,
    learnerLevel: learner_level || (learnerProfile && learnerProfile.level) || "beginner",
    language: language || (learnerProfile && learnerProfile.preferred_language) || "en",
    availableTimeMinutes: available_time_minutes,
    learningObjective: learning_objective,
    preferredStyle: preferred_style || (learnerProfile && learnerProfile.learning_style) || "visual",
    plan,
    groundedInMaterial: data.grounded_in_material || false,
    material: material_id || undefined,
    materials: material_id ? [material_id] : [],
    createdBy: userId,
  });

  return lesson;
};

/**
 * Call the AI service for a fast lesson plan preview (outline only).
 */
const previewLesson = async (userId, body) => {
  const {
    material_id,
    topic,
    learner_level,
    language,
    available_time_minutes,
    learning_objective,
    preferred_style,
  } = body;

  // Fetch learner profile from MongoDB
  const learnerProfile = await getProfilePayload(userId);

  const response = await fetch(`${AI_SERVICE_URL}/lessons/plan/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      material_id: material_id || null,
      topic: topic || null,
      learner_level: learner_level || (learnerProfile && learnerProfile.level) || "beginner",
      language: language || (learnerProfile && learnerProfile.preferred_language) || "en",
      available_time_minutes,
      learning_objective,
      preferred_style: preferred_style || (learnerProfile && learnerProfile.learning_style) || "visual",
      learner_profile: learnerProfile,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `AI service returned ${response.status}`);
  }

  return response.json();
};

/**
 * Get all lessons for a user.
 */
const getUserLessons = async (userId) => {
  return Lesson.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .select("-plan")
    .lean();
};

/**
 * Get a single lesson by ID (only if owned by the user).
 */
const getLessonById = async (lessonId, userId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, createdBy: userId }).lean();
  if (!lesson) {
    throw new Error("Lesson not found");
  }
  return lesson;
};

module.exports = { createLesson, previewLesson, getUserLessons, getLessonById };
