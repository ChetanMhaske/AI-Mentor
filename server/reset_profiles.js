require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.db.collection("learnerprofiles").updateMany(
    {},
    { $set: { strongConcepts: [], weakConcepts: [], pastTopics: [], pastScores: [], learningHistory: [] } }
  );
  console.log("Reset", result.modifiedCount, "learner profiles");
  process.exit(0);
});
