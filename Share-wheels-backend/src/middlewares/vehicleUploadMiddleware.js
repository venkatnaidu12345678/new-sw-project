const multer = require("multer");
const { isConfigured } = require("../config/cloudinary");

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB per image

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const vehicleImageFields = upload.fields([
  { name: "car_image", maxCount: 1 },
  { name: "license_image", maxCount: 1 },
  { name: "rc_image", maxCount: 1 },
]);

const vehicleUploadMiddleware = (req, res, next) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message:
        "Image upload service is not configured on the server (Cloudinary). Contact support.",
    });
  }

  vehicleImageFields(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image too large. Maximum size is 8MB per file.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Invalid image upload",
    });
  });
};

module.exports = vehicleUploadMiddleware;
