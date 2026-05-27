const express = require("express");
const auth = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

const legalController = require("../controllers/legalController");
const adminLegalController = require("../controllers/adminLegalController");

const router = express.Router();

// Public read
router.get("/policies", legalController.getPolicies);

// Admin write
router.use(adminAuthMiddleware);
router.put("/policies", adminLegalController.upsertPolicies);

module.exports = router;

