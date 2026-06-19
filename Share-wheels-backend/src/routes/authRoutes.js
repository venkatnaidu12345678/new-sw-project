const express = require("express");
const auth = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");
const { requireFields, requireLoginFields } = require("../validators/authValidator");
const vehicleUploadMiddleware = require("../middlewares/vehicleUploadMiddleware");
const singleImageUploadMiddleware = require("../middlewares/singleImageUploadMiddleware");
const documentScanUploadMiddleware = require("../middlewares/documentScanUploadMiddleware");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

router.post("/register", requireFields(["name", "email", "mobile", "gender", "password"]), authController.register);
router.post("/login", requireLoginFields, authController.login);
router.post("/forgot-password", requireFields(["email"]), authController.forgotPassword);
router.post(
  "/reset-password",
  requireFields(["email", "otp", "newPassword"]),
  authController.resetPasswordWithOtp
);
router.post("/verify-otp", requireFields(["userId", "otp"]), authController.verifyOtp);
router.post("/verify-token", authController.verifyToken);
router.post(
  "/upload-image",
  auth,
  singleImageUploadMiddleware,
  uploadController.uploadImage
);
router.post("/profile/image", auth, authController.updateProfileImage);
router.post("/register-fcm-token", auth, authController.registerFcmToken);
router.post("/clear-fcm-token", auth, authController.clearFcmToken);
router.get("/push-status", auth, authController.getPushStatus);
router.post("/send-notification", auth, authController.sendNotification);
router.post("/add-vehicle", auth, vehicleUploadMiddleware, authController.addVehicle);
router.post(
  "/scan-vehicle-document",
  auth,
  documentScanUploadMiddleware,
  authController.scanVehicleDocument
);
router.get("/my-vehicle", auth, authController.getMyVehicle);
router.put("/user/terms", auth, authController.updateTerms);
router.patch("/edit-vehicle", auth, vehicleUploadMiddleware, authController.editVehicle);
router.post("/get-users-data", auth, authController.getUsersData);
router.get("/user-profile", auth, authController.getUserProfile);
router.put(
  "/change-password",
  auth,
  requireFields(["currentPassword", "newPassword"]),
  authController.changePassword
);

module.exports = router;
