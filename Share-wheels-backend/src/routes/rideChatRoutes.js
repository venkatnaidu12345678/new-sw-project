const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const rideChatController = require("../controllers/rideChatController");

const router = express.Router({ mergeParams: true });

router.get("/messages", authMiddleware, rideChatController.getMessages);
router.post("/messages", authMiddleware, rideChatController.sendMessage);
router.post("/location", authMiddleware, rideChatController.updateLocation);
router.get("/tracking", authMiddleware, rideChatController.getTracking);

module.exports = router;
