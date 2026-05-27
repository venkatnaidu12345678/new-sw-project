const express = require("express");
const adminController = require("../controllers/adminController");
const adminAdController = require("../controllers/adminAdController");
const adminLocationController = require("../controllers/adminLocationController");
const adminFeedbackController = require("../controllers/adminFeedbackController");
const adminLegalController = require("../controllers/adminLegalController");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const adUploadMiddleware = require("../middlewares/adUploadMiddleware");

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

router.get("/ads/meta", adminAdController.getMeta);
router.get("/ads", adminAdController.listAds);
router.post("/ads", adminAdController.createAd);
router.post("/ads/upload", adUploadMiddleware, adminAdController.uploadMedia);
router.patch("/ads/:id", adminAdController.updateAd);
router.delete("/ads/:id", adminAdController.deleteAd);

router.get("/locations", adminLocationController.listLocations);
router.post("/locations", adminLocationController.createLocation);
router.put("/locations/bulk", adminLocationController.bulkUpsertLocations);
router.post("/locations/bulk", adminLocationController.bulkUpsertLocations);
router.delete("/locations/all", adminLocationController.clearAllLocations);
router.patch("/locations/:id", adminLocationController.updateLocation);
router.delete("/locations/:id", adminLocationController.deleteLocation);

router.get("/feedback", adminFeedbackController.list);
router.patch("/feedback/:id", adminFeedbackController.update);

// Legal policies (terms/privacy/disclaimer)
router.get("/legal/policies", adminLegalController.listPolicies);
router.put("/legal/policies", adminLegalController.upsertPolicies);

module.exports = router;
