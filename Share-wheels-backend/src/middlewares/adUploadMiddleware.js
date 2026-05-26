const multer = require("multer");
const { isConfigured } = require("../config/cloudinary");

const MAX_VIDEO = 50 * 1024 * 1024;

const resolveMediaType = (req, file) => {
  const fromRequest = req.body?.mediaType || req.query?.mediaType;
  if (fromRequest === "video" || fromRequest === "image") return fromRequest;
  if (file?.mimetype?.startsWith("video/")) return "video";
  if (file?.mimetype?.startsWith("image/")) return "image";
  return "image";
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO },
  fileFilter: (req, file, cb) => {
    const mediaType = resolveMediaType(req, file);

    if (mediaType === "video") {
      if (!file.mimetype?.startsWith("video/")) {
        return cb(new Error("Only video files are allowed"));
      }
    } else if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    req._adMediaType = mediaType;
    cb(null, true);
  },
});

const adUploadMiddleware = (req, res, next) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Cloudinary is not configured on the server.",
    });
  }
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large." });
    }
    return res.status(400).json({ success: false, message: err.message || "Invalid upload" });
  });
};

module.exports = adUploadMiddleware;
