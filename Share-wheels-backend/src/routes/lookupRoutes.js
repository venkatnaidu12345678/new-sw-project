const express = require("express");
const lookupController = require("../controllers/lookupController");

const router = express.Router();

router.get("/active", lookupController.getActiveTypes);

module.exports = router;
