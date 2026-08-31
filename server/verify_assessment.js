require("dotenv").config();
const mongoose = require("mongoose");
const Lesson = require("./src/models/Lesson");
const LearnerProfile = require("./src/models/LearnerProfile");
const { submitAssessment } = require("./src/controllers/lesson.controller");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = new mongoose.Types.ObjectId();
  
  // 1. Setup Dummy Lesson
  const lesson = await Lesson.create({
    title: "Intro to CSS",
    topic: "CSS Basics",
    createdBy: userId,
    plan: {
      final_assessment: {
        questions: [
          {
            question: "What does CSS stand for?",
            options: ["Cascading Style Sheets", "Creative Style System", "Computer Style Sheets"],
            correct_answer_index: 0,
            explanation: "CSS stands for Cascading Style Sheets."
          },
          {
            question: "How do you select an element with id 'header'?",
            options: [".header", "#header", "*header"],
            correct_answer_index: 1,
            explanation: "The # symbol is used to select elements by ID."
          }
        ]
      }
    }
  });

  console.log("Lesson created:", lesson._id);

  // Helper to mock express res object
  const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
  };

  // 2. Mostly WRONG answers
  console.log("\n=== Submitting Assessment: Mostly Wrong ===");
  let req = {
    user: { _id: userId },
    params: { id: lesson._id.toString() },
    body: {
      answers: [
        { question_index: 0, question: lesson.plan.final_assessment.questions[0].question, options: lesson.plan.final_assessment.questions[0].options, student_answer: "Computer Style Sheets" },
        { question_index: 1, question: lesson.plan.final_assessment.questions[1].question, options: lesson.plan.final_assessment.questions[1].options, student_answer: ".header" }
      ]
    }
  };
  let res = mockRes();
  
  await submitAssessment(req, res);
  console.log("Status:", res.statusCode);
  if (res.data && res.data.report) {
    console.log("Score:", res.data.report.score);
    console.log("Weak Concepts:", res.data.report.weak_concepts);
  } else {
    console.log(res.data);
  }

  let profile = await LearnerProfile.findOne({ user: userId });
  console.log("DB Profile Weak Concepts:", profile ? profile.weakConcepts : 'None');


  // 3. Perfect answers
  console.log("\n=== Submitting Assessment: Perfect Answers ===");
  req.body.answers = [
        { question_index: 0, question: lesson.plan.final_assessment.questions[0].question, options: lesson.plan.final_assessment.questions[0].options, student_answer: "Cascading Style Sheets" },
        { question_index: 1, question: lesson.plan.final_assessment.questions[1].question, options: lesson.plan.final_assessment.questions[1].options, student_answer: "#header" }
  ];
  res = mockRes();
  
  await submitAssessment(req, res);
  console.log("Status:", res.statusCode);
  if (res.data && res.data.report) {
    console.log("Score:", res.data.report.score);
    console.log("Strong Concepts:", res.data.report.strong_concepts);
  }

  profile = await LearnerProfile.findOne({ user: userId });
  console.log("DB Profile Strong Concepts:", profile ? profile.strongConcepts : 'None');
  console.log("DB Profile Weak Concepts:", profile ? profile.weakConcepts : 'None');

  process.exit(0);
}
run().catch(console.error);
