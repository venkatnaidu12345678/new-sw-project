const multer = require("multer");
const { isConfigured } = require("../config/cloudinary");

const MAX_FILE_SIZE = 8 * 1024 * 1024;

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

const singleImageUpload = upload.single("image");

const singleImageUploadMiddleware = (req, res, next) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Cloudinary is not configured on the server.",
    });
  }

  singleImageUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image too large (max 8MB).",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Invalid image upload",
    });
  });
};

module.exports = singleImageUploadMiddleware;
