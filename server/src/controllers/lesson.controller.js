const lessonService = require("../services/lesson.service");

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
    const lessons = await lessonService.getUserLessons(req.user._id);
    res.json({ lessons });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

module.exports = { create, preview, list, getById, switchLanguage };
