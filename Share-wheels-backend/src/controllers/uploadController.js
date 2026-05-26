const uploadService = require("../services/uploadService");

const handle = async (res, fn) => {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const uploadImage = async (req, res) =>
  handle(res, () =>
    uploadService.uploadSingleImage(req.file, req.body?.folder || req.query?.folder)
  );

module.exports = { uploadImage };
