const express = require("express");
const auth = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const { requireFields } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", requireFields(["name", "email", "mobile", "gender", "password"]), authController.register);
router.post("/login", requireFields(["email", "password"]), authController.login);
router.post("/verify-otp", requireFields(["userId", "otp"]), authController.verifyOtp);
router.post("/verify-token", authController.verifyToken);
router.post("/profile/image", auth, authController.updateProfileImage);
router.post("/register-fcm-token", auth, authController.registerFcmToken);
router.post("/send-notification", auth, authController.sendNotification);
router.post("/add-vehicle", auth, authController.addVehicle);
router.get("/my-vehicle", auth, authController.getMyVehicle);
router.put("/user/terms", auth, authController.updateTerms);
router.patch("/edit-vehicle", auth, authController.editVehicle);
router.post("/get-users-data", auth, authController.getUsersData);
router.get("/user-profile", auth, authController.getUserProfile);

module.exports = router;
