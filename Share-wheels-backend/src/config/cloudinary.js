const cloudinary = require("cloudinary").v2;

const isConfigured = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const rootFolder = () =>
  (process.env.CLOUDINARY_ROOT_FOLDER || "sharewheels").replace(/\/$/, "");

/** Cloudinary folder paths per app area */
const folders = {
  vehicles: () => `${rootFolder()}/vehicles`,
  profiles: () => `${rootFolder()}/profiles`,
  couriers: () => `${rootFolder()}/couriers`,
  ads: () => `${rootFolder()}/ads`,
  general: () => `${rootFolder()}/general`,
};

const resolveFolder = (key) => {
  const resolver = folders[key] || folders.general;
  return resolver();
};

/**
 * Upload image buffer to Cloudinary. Returns secure HTTPS URL.
 */
const uploadImageBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(
        new Error(
          "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
        )
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

const uploadVideoBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return reject(new Error("Cloudinary is not configured."));
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "video" },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          posterUrl: result.thumbnail_url || result.secure_url,
        });
      }
    );
    stream.end(buffer);
  });

/**
 * Use existing http(s) URL or upload new file buffer.
 * @param {string} [folderKey] - vehicles | profiles | couriers | general
 */
const resolveImageUrl = async (file, existingUrl, folderKey = "vehicles") => {
  const trimmed = typeof existingUrl === "string" ? existingUrl.trim() : "";
  if (file?.buffer?.length) {
    return uploadImageBuffer(file.buffer, resolveFolder(folderKey));
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
};

module.exports = {
  cloudinary,
  isConfigured,
  folders,
  resolveFolder,
  uploadImageBuffer,
  uploadVideoBuffer,
  resolveImageUrl,
};
