const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const driverRideController = require("../controllers/driverRideController");
const rideVerificationController = require("../controllers/rideVerificationController");

const router = express.Router();

router.post("/driver-accept-passenger-request", authMiddleware, driverRideController.acceptPassengerRequest);
router.post("/driver-reject-passenger-request", authMiddleware, driverRideController.rejectPassengerRequest);
router.post("/driver-remove-passenger", authMiddleware, driverRideController.removePassenger);
router.patch("/start-ride", authMiddleware, driverRideController.startRide);
router.patch("/end-ride", authMiddleware, driverRideController.endRide);
router.patch("/update-seats", authMiddleware, driverRideController.updateRideSeats);
router.post("/enroute-requests", authMiddleware, driverRideController.enrouteRequests);
router.post("/driver/pick-courier", authMiddleware, driverRideController.pickCourier);
router.get(
  "/:rideId/verification/participants",
  authMiddleware,
  rideVerificationController.listParticipants
);
router.post(
  "/:rideId/verification/verify",
  authMiddleware,
  rideVerificationController.verifyParticipant
);

module.exports = router;
