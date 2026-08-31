const lessonService = require("../services/lesson.service");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const LearnerProfile = require("../models/LearnerProfile");
const Lesson = require("../models/Lesson");

const create = async (req, res) => {
  try {
    const lesson = await lessonService.createLesson(req.user._id, req.body);
    res.status(201).json({ lesson });
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
};

const preview = async (req, res) => {
  try {
    const data = await lessonService.previewLesson(req.user._id, req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({ message: err.message });
  }
};

const list = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Service Unavailable: Database not connected" });
    }
    const lessons = await lessonService.getUserLessons(req.user._id);
    res.json({ lessons });
  } catch (err) {
    console.error("Error in list lessons:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};

const getById = async (req, res) => {
  try {

    const lesson = await lessonService.getLessonById(req.params.id, req.user._id);
    res.json({ lesson });
  } catch (err) {
    const status = err.message === "Lesson not found" ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

const switchLanguage = async (req, res) => {
  try {
    const { sectionIndex, targetLanguage } = req.body;
    if (sectionIndex === undefined || !targetLanguage) {
      return res.status(400).json({ message: "sectionIndex and targetLanguage are required" });
    }
    const lesson = await lessonService.switchSectionLanguage(
      req.params.id,
      sectionIndex,
      targetLanguage,
      req.user._id
    );
    res.json({ lesson });
  } catch (err) {
    const status = err.message === "Lesson not found" ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

const updateSectionVideo = async (req, res) => {
  try {
    const { id, n } = req.params;
    const lesson = await lessonService.updateSectionVideo(id, parseInt(n), req.body);
    res.json({ message: "Section updated", lesson });
  } catch (err) {
    const status = err.message === "Lesson not found" ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
};

const evaluateAnswer = async (req, res) => {
  try {


    const { sectionIndex, question, options, studentAnswer } = req.body;
    if (sectionIndex === undefined || !question || !studentAnswer) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const evaluation = await lessonService.evaluateAnswer(
      req.params.id,
      req.user._id,
      sectionIndex,
      question,
      options,
      studentAnswer
    );
    res.json({ evaluation });
  } catch (err) {
    console.error("Error evaluating answer:", err);
    res.status(502).json({ message: err.message });
  }
};

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const startAssessment = async (req, res) => {
  try {
    const lessonId = req.params.id;



    const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user._id }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const plan = lesson.plan;
    const questions = plan.final_assessment?.questions || [];

    res.json({
      assessment: {
        lesson_id: lessonId,
        questions
      }
    });
  } catch (err) {
    console.error("Error starting assessment:", err);
    res.status(500).json({ message: err.message });
  }
};

const submitAssessment = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "answers array is required" });
    }



    const lesson = await Lesson.findOne({ _id: lessonId, createdBy: req.user._id }).lean();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const plan = lesson.plan;
    const questions = plan.final_assessment?.questions || [];

    // Call AI service for grading
    const response = await fetch(`${AI_SERVICE_URL}/lessons/grade-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: lessonId,
        lesson_title: lesson.title,
        lesson_topic: lesson.topic || lesson.title,
        answers,
        questions
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `AI service returned ${response.status}`);
    }

    const report = await response.json();

    // Save assessment to DB
    await Assessment.create({
      user: req.user._id,
      lesson: lessonId,
      score: report.score,
      maxScore: report.max_score,
      percentage: report.percentage,
      strongConcepts: report.strong_concepts,
      weakConcepts: report.weak_concepts,
      incorrectConcepts: report.incorrect_concepts,
      recommendedRevision: report.recommended_revision,
      suggestedNextTopic: report.suggested_next_topic,
      gradedAnswers: report.graded_answers?.map(a => ({
        questionIndex: a.question_index,
        question: a.question,
        studentAnswer: a.student_answer,
        correctAnswer: a.correct_answer,
        isCorrect: a.is_correct,
        explanation: a.explanation
      }))
    });

    // Update LearnerProfile
    let profile = await LearnerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new LearnerProfile({ user: req.user._id });
    }

    // Add to pastScores
    profile.pastScores.push({
      lesson: lessonId,
      score: report.score,
      maxScore: report.max_score,
      date: new Date()
    });

    // Add to learningHistory
    profile.learningHistory.push({
      lesson: lessonId,
      topic: lesson.topic || lesson.title,
      score: report.score,
      maxScore: report.max_score,
      percentage: report.percentage,
      strongConcepts: report.strong_concepts,
      weakConcepts: report.weak_concepts,
      suggestedNextTopic: report.suggested_next_topic
    });

    // Update topic list
    if (lesson.topic && !profile.pastTopics.includes(lesson.topic)) {
      profile.pastTopics.push(lesson.topic);
    }

    // Merge weak/strong concepts (add new ones, remove resolved ones)
    const newWeak = report.weak_concepts || [];
    const newStrong = report.strong_concepts || [];

    for (const c of newWeak) {
      if (!profile.weakConcepts.includes(c)) profile.weakConcepts.push(c);
      // Remove from strong if now weak
      profile.strongConcepts = profile.strongConcepts.filter(s => s !== c);
    }
    for (const c of newStrong) {
      if (!profile.strongConcepts.includes(c)) profile.strongConcepts.push(c);
      // Remove from weak if now strong
      profile.weakConcepts = profile.weakConcepts.filter(w => w !== c);
    }

    await profile.save();

    res.json({ report });
  } catch (err) {
    console.error("Error submitting assessment:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { create, preview, list, getById, switchLanguage, updateSectionVideo, evaluateAnswer, startAssessment, submitAssessment };
