const express = require("express");
const adminController = require("../controllers/adminController");
const adminAdController = require("../controllers/adminAdController");
const adminLocationController = require("../controllers/adminLocationController");
const adminFeedbackController = require("../controllers/adminFeedbackController");
const adminLegalController = require("../controllers/adminLegalController");
const adminLookupController = require("../controllers/adminLookupController");
const adminSubscriptionController = require("../controllers/adminSubscriptionController");
const adminVehicleFareController = require("../controllers/adminVehicleFareController");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const adUploadMiddleware = require("../middlewares/adUploadMiddleware");

const router = express.Router();

router.post("/register", adminController.register);
router.post("/login", adminController.login);

router.use(adminAuthMiddleware);
router.get("/dashboard/stats", adminController.dashboardStats);
router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.post("/users/backfill-passwords", adminController.backfillUserPasswords);
router.patch("/users/:id/verify", adminController.updateUserVerification);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.get("/rides", adminController.listRides);
router.get("/passenger-rides", adminController.listPassengerRides);
router.get("/couriers", adminController.listCouriers);
router.patch("/rides/:id/status", adminController.updateRideStatus);
router.get("/tracking/active", adminController.activeTracking);
router.get("/maps/directions", adminController.routeDirections);
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

router.get("/lookups", adminLookupController.listTypes);
router.post("/lookups", adminLookupController.createType);
router.post("/lookups/bulk", adminLookupController.bulkUpsertTypes);
router.patch("/lookups/:id", adminLookupController.updateType);
router.delete("/lookups/:id", adminLookupController.deleteType);

router.get("/subscription-plans/meta", adminSubscriptionController.getMeta);
router.get("/subscription-plans", adminSubscriptionController.listPlans);
router.post("/subscription-plans", adminSubscriptionController.createPlan);
router.patch("/subscription-plans/:id", adminSubscriptionController.updatePlan);
router.delete("/subscription-plans/:id", adminSubscriptionController.deletePlan);

router.get("/vehicle-fares", adminVehicleFareController.listFares);
router.post("/vehicle-fares", adminVehicleFareController.createFare);
router.patch("/vehicle-fares/:id", adminVehicleFareController.updateFare);
router.delete("/vehicle-fares/:id", adminVehicleFareController.deleteFare);

module.exports = router;
