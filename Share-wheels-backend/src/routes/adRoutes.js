const express = require("express");
const adController = require("../controllers/adController");

const router = express.Router();

router.get("/active", adController.getActiveAds);
router.post("/:id/click", adController.recordClick);
router.post("/:id/impression", adController.recordImpression);

module.exports = router;
