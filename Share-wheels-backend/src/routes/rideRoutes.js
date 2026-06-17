const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const rideController = require("../controllers/rideController");
const rideChatRoutes = require("./rideChatRoutes");

const router = express.Router();

router.post("/get-rides-data", rideController.getRidesData);
router.post("/create-ride", authMiddleware, rideController.createRide);
router.get("/get-rides", authMiddleware, rideController.getRides);
router.post("/ride/cancel", authMiddleware, rideController.cancelRide);
router.post("/passenger/send-request", authMiddleware, rideController.sendPassengerRequest);
router.get("/upcoming-rides", authMiddleware, rideController.upcomingRides);
router.get("/history-rides", authMiddleware, rideController.historyRides);
router.get("/segment-fare/:rideId", authMiddleware, rideController.getSegmentFare);
router.get("/ride-details/:rideId", authMiddleware, rideController.rideDetails);
router.get("/my-requests", authMiddleware, rideController.myRequests);
router.get("/my-passenger-requests", authMiddleware, rideController.myPassengerRequests);
router.get("/my-courier-requests", authMiddleware, rideController.myCourierRequests);
router.delete(
  "/my-passenger-requests/:requestId",
  authMiddleware,
  rideController.deleteMyPassengerRequest
);
router.put(
  "/my-passenger-requests/:requestId",
  authMiddleware,
  rideController.updateMyPassengerRequest
);
router.delete(
  "/my-courier-requests/:requestId",
  authMiddleware,
  rideController.deleteMyCourierRequest
);
router.put(
  "/my-courier-requests/:requestId",
  authMiddleware,
  rideController.updateMyCourierRequest
);

router.use("/:rideId/chat", rideChatRoutes);

module.exports = router;
