const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const vehicleFareController = require("../controllers/vehicleFareController");

const router = express.Router();

router.get("/quote", authMiddleware, vehicleFareController.quote);
router.get("/rules", authMiddleware, vehicleFareController.rules);

module.exports = router;
