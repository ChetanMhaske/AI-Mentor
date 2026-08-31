const { Router } = require("express");
const { create, preview, list, getById, switchLanguage, updateSectionVideo, evaluateAnswer } = require("../controllers/lesson.controller");
const auth = require("../middleware/auth");

const router = Router();

router.post("/", auth, create);
router.post("/preview", auth, preview);
router.get("/", auth, list);
router.get("/:id", auth, getById);
router.post("/:id/switch-language", auth, switchLanguage);
router.post("/:id/section/:n/video-ready", updateSectionVideo); // Internal callback, no auth for MVP
router.post("/:id/answer", auth, evaluateAnswer);

module.exports = router;
