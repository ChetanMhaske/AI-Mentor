require("dotenv").config();
const mongoose = require("mongoose");
const Lesson = require("./src/models/Lesson");
const Session = require("./src/models/Session");
const lessonService = require("./src/services/lesson.service");

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = new mongoose.Types.ObjectId();
  
  // Create a dummy lesson
  console.log("Creating dummy lesson...");
  const lesson = await Lesson.create({
    title: "Ohm's Law",
    createdBy: userId,
    plan: {
      sections: [
        {
          section_title: "Understanding Resistance",
          explanation_script: "Ohm's Law states that Voltage (V) equals Current (I) multiplied by Resistance (R). So V = I * R. Voltage is the push, Current is the flow of electrons, and Resistance is what slows it down, like a narrow pipe.",
          checkpoint_question: {
            question: "What happens to the current if you increase the resistance, assuming voltage stays the same?",
            options: ["It increases", "It decreases", "It stays the same", "It drops to zero"],
            correct_answer_index: 1,
            explanation: "Since V = I * R, if R increases and V is constant, I must decrease."
          }
        }
      ]
    }
  });

  const sectionIndex = 0;
  const question = lesson.plan.sections[sectionIndex].checkpoint_question.question;
  const options = lesson.plan.sections[sectionIndex].checkpoint_question.options;
  
  console.log(`\n--- Question ---`);
  console.log(`${question}`);

  // Wrong answer 1
  const wrongAnswer1 = "It increases because more resistance means more power.";
  console.log(`\nSubmitting Answer 1: "${wrongAnswer1}"`);
  const eval1 = await lessonService.evaluateAnswer(
    lesson._id, 
    userId, 
    sectionIndex, 
    question, 
    options, 
    wrongAnswer1
  );
  console.log(`Is Correct: ${eval1.is_correct}`);
  console.log(`Misconception: ${eval1.misconception}`);
  console.log(`Re-explanation: ${eval1.re_explanation}`);

  // Wrong answer 2
  const wrongAnswer2 = "It stays exactly the same since voltage hasn't changed.";
  console.log(`\nSubmitting Answer 2: "${wrongAnswer2}"`);
  const eval2 = await lessonService.evaluateAnswer(
    lesson._id, 
    userId, 
    sectionIndex, 
    question, 
    options, 
    wrongAnswer2
  );
  console.log(`Is Correct: ${eval2.is_correct}`);
  console.log(`Misconception: ${eval2.misconception}`);
  console.log(`Re-explanation: ${eval2.re_explanation}`);

  process.exit(0);
}

verify().catch(console.error);
