const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const rideDetailsController = require("../controllers/rideDetailsController");

const router = express.Router();

router.post("/user/get-ride-details", authMiddleware, rideDetailsController.getUserRideDetails);

module.exports = router;
