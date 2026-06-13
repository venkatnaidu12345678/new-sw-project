const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const subscriptionController = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/plans", subscriptionController.listPlans);
router.get("/me", authMiddleware, subscriptionController.getMySubscription);
router.post("/subscribe", authMiddleware, subscriptionController.subscribe);

module.exports = router;
