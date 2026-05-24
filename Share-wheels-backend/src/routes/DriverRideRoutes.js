const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const driverRideController = require("../controllers/driverRideController");

const router = express.Router();

router.post("/driver-accept-passenger-request", authMiddleware, driverRideController.acceptPassengerRequest);
router.post("/driver-reject-passenger-request", authMiddleware, driverRideController.rejectPassengerRequest);
router.post("/driver-remove-passenger", authMiddleware, driverRideController.removePassenger);
router.patch("/start-ride", authMiddleware, driverRideController.startRide);
router.patch("/end-ride", authMiddleware, driverRideController.endRide);
router.post("/enroute-requests", authMiddleware, driverRideController.enrouteRequests);
router.post("/driver/pick-courier", authMiddleware, driverRideController.pickCourier);

module.exports = router;
