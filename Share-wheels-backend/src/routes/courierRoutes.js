const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const courierController = require("../controllers/courierController");

const router = express.Router();

router.post("/create-courier-request", authMiddleware, courierController.createCourierRequest);
router.post("/request-courier", authMiddleware, courierController.requestCourier);
router.post("/accept-courier", authMiddleware, courierController.acceptCourier);
router.post("/reject-courier", authMiddleware, courierController.rejectCourier);
router.post("/remove-delivery", authMiddleware, courierController.removeDelivery);

module.exports = router;
