const lessonService = require("../services/lesson.service");
const mongoose = require("mongoose");

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
      console.warn("MongoDB not connected. Returning mock lessons for UI demo.");
      return res.json({
        lessons: [
          {
            _id: "mock-lesson-1",
            title: "Understanding Photosynthesis",
            topic: "Biology",
            learnerLevel: "beginner",
            language: "en",
            availableTimeMinutes: 20,
            plan: { sections: [] },
          },
          {
            _id: "mock-lesson-2",
            title: "Introduction to React Hooks",
            topic: "Web Development",
            learnerLevel: "intermediate",
            language: "en",
            availableTimeMinutes: 45,
            plan: { sections: [] },
          }
        ]
      });
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
    if (mongoose.connection.readyState !== 1 && req.params.id.startsWith("mock-")) {
      return res.json({
        lesson: {
          _id: req.params.id,
          title: req.params.id === "mock-lesson-1" ? "Understanding Photosynthesis" : "Introduction to React Hooks",
          plan: {
            sections: [
              {
                section_title: "Introduction",
                explanation_script: "Welcome to this lesson! Today we will learn about the basics.",
                render_status: "ready",
                video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
                audio_url: null,
                visual_type: "diagram",
                visual_spec: { mermaid_code: "graph TD;\n A-->B;\n A-->C;\n B-->D;\n C-->D;" },
                visual_data: { mermaid_code: "graph TD;\n A-->B;\n A-->C;\n B-->D;\n C-->D;" }
              },
              {
                section_title: "Deep Dive",
                explanation_script: "Let's dive deeper into the details. Unfortunately the avatar failed to render.",
                render_status: "failed",
                video_url: null,
                audio_url: "https://www.w3schools.com/html/horse.mp3",
                visual_type: "code",
                visual_spec: { language: "python", code: "print('Hello World')" },
                visual_data: { code: "print('Hello World')", output: "Hello World" }
              }
            ]
          }
        }
      });
    }
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
    if (mongoose.connection.readyState !== 1 && req.params.id.startsWith("mock-")) {
      // Mock logic for UI testing without DB
      const { studentAnswer } = req.body;
      const isCorrect = studentAnswer === "mock_correct" || studentAnswer === "1"; 
      return res.json({
        evaluation: {
          is_correct: isCorrect,
          decision: isCorrect ? "continue" : "reinforce",
          misconception: isCorrect ? null : "You confused current with voltage.",
          re_explanation: isCorrect ? null : "Think of voltage as the pressure pushing the water, and current as the flow of water itself.",
          follow_up_question: isCorrect ? null : {
            question: "If water pressure increases, does the flow increase?",
            options: ["Yes", "No"],
            correct_answer_index: 0,
            explanation: "Yes, more pressure means more flow."
          }
        }
      });
    }

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

module.exports = { create, preview, list, getById, switchLanguage, updateSectionVideo, evaluateAnswer };
