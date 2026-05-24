const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const supportController = require("../controllers/supportController");

const router = express.Router();

router.get("/context", authMiddleware, supportController.getContext);
router.get("/snapshot", authMiddleware, supportController.getSnapshot);
router.post("/chat", authMiddleware, supportController.chat);

module.exports = router;
