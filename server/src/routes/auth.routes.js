const { Router } = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const auth = require("../middleware/auth");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);

module.exports = router;
