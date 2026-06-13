const express = require("express");
const locationController = require("../controllers/locationController");
const placesController = require("../controllers/placesController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/active", locationController.getActiveLocations);

router.get("/places/autocomplete", authMiddleware, placesController.autocomplete);
router.get("/places/details", authMiddleware, placesController.placeDetails);
router.get("/directions", authMiddleware, placesController.directions);
router.get("/routes/alternatives", authMiddleware, placesController.alternativeRoutes);
router.get("/route/stopover-candidates", authMiddleware, placesController.stopoverCandidates);
router.post("/route/stopover-candidates", authMiddleware, placesController.stopoverCandidates);

module.exports = router;
