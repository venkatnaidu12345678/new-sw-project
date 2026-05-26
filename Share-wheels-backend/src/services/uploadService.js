const { uploadImageBuffer, resolveFolder } = require("../config/cloudinary");

const ALLOWED_FOLDERS = new Set(["vehicles", "profiles", "couriers", "general"]);

const uploadSingleImage = async (file, folderKey = "general") => {
  if (!file?.buffer?.length) {
    return {
      status: 400,
      body: { success: false, message: "No image file provided" },
    };
  }

  const key = ALLOWED_FOLDERS.has(folderKey) ? folderKey : "general";

  try {
    const url = await uploadImageBuffer(file.buffer, resolveFolder(key));
    return {
      status: 200,
      body: { success: true, url, folder: key },
    };
  } catch (err) {
    return {
      status: 500,
      body: { success: false, message: err.message || "Upload failed" },
    };
  }
};

module.exports = { uploadSingleImage };
