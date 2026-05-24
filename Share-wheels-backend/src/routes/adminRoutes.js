const express = require("express");
const adminController = require("../controllers/adminController");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

const router = express.Router();

router.post("/register", adminController.register);
router.post("/login", adminController.login);

router.use(adminAuthMiddleware);
router.get("/dashboard/stats", adminController.dashboardStats);
router.get("/users", adminController.listUsers);
router.get("/rides", adminController.listRides);
router.get("/passenger-rides", adminController.listPassengerRides);
router.get("/couriers", adminController.listCouriers);
router.patch("/rides/:id/status", adminController.updateRideStatus);
router.patch("/users/:id/verify", adminController.updateUserVerification);
router.get("/tracking/active", adminController.activeTracking);
router.get("/tracking/:id", adminController.trackingDetail);

module.exports = router;
