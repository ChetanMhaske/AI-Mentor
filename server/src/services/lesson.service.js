const Lesson = require("../models/Lesson");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

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

  // Call the AI service
  const response = await fetch(`${AI_SERVICE_URL}/lessons/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      material_id: material_id || null,
      topic: topic || null,
      learner_level,
      language: language || "en",
      available_time_minutes,
      learning_objective,
      preferred_style: preferred_style || "visual",
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
    learnerLevel: learner_level,
    language: language || "en",
    availableTimeMinutes: available_time_minutes,
    learningObjective: learning_objective,
    preferredStyle: preferred_style || "visual",
    plan,
    groundedInMaterial: data.grounded_in_material || false,
    material: material_id || undefined,
    materials: material_id ? [material_id] : [],
    createdBy: userId,
  });

  return lesson;
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

module.exports = { createLesson, getUserLessons, getLessonById };
