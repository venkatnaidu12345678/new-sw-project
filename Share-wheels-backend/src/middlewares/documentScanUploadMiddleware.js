const multer = require("multer");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

const documentScanUpload = upload.single("image");

const documentScanUploadMiddleware = (req, res, next) => {
  documentScanUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image too large (max 10MB).",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Invalid image upload",
    });
  });
};

module.exports = documentScanUploadMiddleware;
