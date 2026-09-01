const { Router } = require("express");
const { startSession, interact, generateTTS, getSessionState } = require("../controllers/teacher.controller");
const auth = require("../middleware/auth");

const router = Router();

router.post("/session/start", auth, startSession);
router.post("/interact", auth, interact);
router.post("/tts", auth, generateTTS);
router.get("/session/:sessionId", auth, getSessionState);

module.exports = router;
