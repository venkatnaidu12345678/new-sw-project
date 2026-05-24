const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const passengerRideController = require("../controllers/passengerRideController");

const router = express.Router();

router.post("/create-passenger-request", authMiddleware, passengerRideController.createPassengerRequest);
router.get("/open", authMiddleware, passengerRideController.getOpenRequests);
router.post("/driver/pick-passenger", authMiddleware, passengerRideController.pickPassenger);

module.exports = router;
