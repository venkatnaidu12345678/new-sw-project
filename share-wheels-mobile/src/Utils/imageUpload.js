import { Alert, Platform } from "react-native";
import RNFS from "react-native-fs";
import { baseUrl } from "../Config";
import { parseApiResponse } from "./parseApiResponse";
import { requestCameraPermission } from "./mediaPermissions";

const ALLOWED_DOCUMENT_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const PICKER_OPTIONS = {
  mediaType: "photo",
  quality: 0.85,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: false,
  selectionLimit: 1,
};

/** Higher resolution for licence / RC OCR */
const DOCUMENT_PICKER_OPTIONS = {
  mediaType: "photo",
  quality: 1,
  maxWidth: 2560,
  maxHeight: 2560,
  includeBase64: false,
  selectionLimit: 1,
};

const inferMimeType = (asset) => {
  const raw = String(asset?.type || "").toLowerCase().trim();
  if (raw && raw !== "image" && raw !== "image/*") {
    if (ALLOWED_DOCUMENT_MIME.includes(raw)) return raw;
    if (raw.includes("jpeg") || raw.includes("jpg")) return "image/jpeg";
    if (raw.includes("png")) return "image/png";
    if (raw.includes("webp")) return "image/webp";
    if (raw.includes("/")) return raw;
  }

  const name = String(asset?.fileName || asset?.uri || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
};

const inferFileName = (asset, fallbackName) => {
  if (asset?.fileName) return asset.fileName;
  const mime = inferMimeType(asset);
  if (mime.includes("png")) return fallbackName.replace(/\.jpe?g$/i, ".png") || `${fallbackName}.png`;
  if (mime.includes("webp")) return fallbackName.replace(/\.jpe?g$/i, ".webp") || `${fallbackName}.webp`;
  return fallbackName.endsWith(".jpg") || fallbackName.endsWith(".jpeg")
    ? fallbackName
    : `${fallbackName}.jpg`;
};

const needsLocalCopy = (uri) => {
  if (!uri || isRemoteImageUrl(uri)) return false;
  if (uri.startsWith("file://") || (Platform.OS === "android" && uri.startsWith("/"))) {
    return false;
  }
  return (
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library://")
  );
};

const copyToCache = async (uri, asset) => {
  const name = inferFileName(asset, `pick-${Date.now()}.jpg`);
  const ext = name.split(".").pop() || "jpg";
  const dest = `${RNFS.CachesDirectoryPath}/sw-${Date.now()}.${ext}`;

  try {
    await RNFS.copyFile(uri, dest);
    return dest;
  } catch (copyErr) {
    try {
      const data = await RNFS.readFile(uri, "base64");
      await RNFS.writeFile(dest, data, "base64");
      return dest;
    } catch (readErr) {
      console.log("copyToCache failed:", copyErr?.message || copyErr, readErr?.message || readErr);
      return null;
    }
  }
};

/** Gallery/camera URIs → local file:// for OCR + upload. */
export const ensureLocalFileUri = async (asset) => {
  if (!asset?.uri) return asset;

  const uri = asset.uri;
  if (!needsLocalCopy(uri)) return asset;

  const dest = await copyToCache(uri, asset);
  if (!dest) return asset;

  return {
    ...asset,
    uri: `file://${dest}`,
    name: inferFileName(asset, `pick-${Date.now()}.jpg`),
    type: inferMimeType(asset),
  };
};

const normalizeAsset = (asset, fallbackName) => {
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    type: inferMimeType(asset),
    name: inferFileName(asset, fallbackName),
    fileSize: asset.fileSize,
  };
};

export const validateDocumentAsset = (asset) => {
  if (!asset?.uri) throw new Error("No image selected");

  const type = String(asset.type || inferMimeType(asset)).toLowerCase();
  const mimeOk =
    ALLOWED_DOCUMENT_MIME.includes(type) ||
    type.includes("jpeg") ||
    type.includes("png") ||
    type.includes("webp");

  const uri = String(asset.uri).toLowerCase();
  const looksLikeImage =
    uri.startsWith("content://") ||
    uri.startsWith("file://") ||
    uri.startsWith("ph://") ||
    /\.(jpe?g|png|webp)(\?|$)/i.test(uri);

  if (!mimeOk && !looksLikeImage) {
    throw new Error("Only JPG or PNG document photos are allowed.");
  }

  if (asset.fileSize && asset.fileSize > MAX_DOCUMENT_BYTES) {
    throw new Error("Image is too large. Please use a photo under 10 MB.");
  }

  return true;
};

export const isRemoteImageUrl = (value) =>
  typeof value === "string" &&
  (value.startsWith("http://") || value.startsWith("https://"));

export const getImageUri = (image) => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.uri || null;
};

const normalizeUploadUri = (uri) => {
  if (!uri || isRemoteImageUrl(uri)) return uri;
  if (Platform.OS === "ios") return uri.replace(/^file:\/\//, "");
  if (uri.startsWith("content://") || uri.startsWith("file://")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
};

export const appendImageFile = (formData, fieldName, image) => {
  if (!image) return;

  const uri = getImageUri(image);
  if (!uri) return;

  if (isRemoteImageUrl(uri)) {
    formData.append(fieldName, uri);
    return;
  }

  const type = image.type || inferMimeType(image) || "image/jpeg";
  const name = image.name || `${fieldName}.jpg`;

  formData.append(fieldName, {
    uri: normalizeUploadUri(uri),
    type,
    name,
  });
};

/**
 * Upload local image to Cloudinary via backend. Returns HTTPS URL or existing URL.
 */
export const uploadImageToCloudinary = async (token, image, folder = "general") => {
  const localImage = await ensureLocalFileUri(image);
  const uri = getImageUri(localImage);
  if (!uri) return null;
  if (isRemoteImageUrl(uri)) return uri;

  const formData = new FormData();
  formData.append("folder", folder);
  appendImageFile(formData, "image", localImage);

  const response = await fetch(`${baseUrl}/auth/upload-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await parseApiResponse(response);
  if (!response.ok || !data?.url) {
    throw new Error(data?.message || "Image upload failed");
  }
  return data.url;
};

/** Local file → Cloudinary URL; already-remote URLs pass through. */
export const ensureCloudinaryUrl = async (token, image, folder = "general") => {
  if (!image) return "";
  const uri = getImageUri(image);
  if (!uri) return "";
  if (isRemoteImageUrl(uri)) return uri;
  return uploadImageToCloudinary(token, image, folder);
};

const processPickerResponse = async (response, fallbackName) => {
  if (response.didCancel) return null;
  if (response.errorCode) {
    throw new Error(response.errorMessage || "Could not open image picker");
  }

  const asset = normalizeAsset(response.assets?.[0], fallbackName);
  if (!asset) throw new Error("No image selected");

  const localAsset = await ensureLocalFileUri(asset);
  validateDocumentAsset(localAsset);
  return localAsset;
};

export const pickFromCamera = async (
  fallbackName = `photo-${Date.now()}.jpg`,
  options = PICKER_OPTIONS
) => {
  const granted = await requestCameraPermission();
  if (!granted) {
    throw new Error("Camera permission is required. Enable it in Settings → Apps → Share Wheels.");
  }

  const { launchCamera } = require("react-native-image-picker");
  const response = await launchCamera({
    ...options,
    cameraType: "back",
    saveToPhotos: false,
  });
  return processPickerResponse(response, fallbackName);
};

export const pickFromGallery = async (
  fallbackName = `photo-${Date.now()}.jpg`,
  options = PICKER_OPTIONS
) => {
  const { launchImageLibrary } = require("react-native-image-picker");
  const response = await launchImageLibrary(options);
  return processPickerResponse(response, fallbackName);
};

/** Alert with Camera / Gallery — returns normalized local asset or null. */
export const showImageSourcePicker = (
  fallbackName = `photo-${Date.now()}.jpg`,
  title = "Select Image",
  pickerOptions = PICKER_OPTIONS
) =>
  new Promise((resolve, reject) => {
    Alert.alert(title, "Choose an option", [
      {
        text: "Camera",
        onPress: () => {
          pickFromCamera(fallbackName, pickerOptions).then(resolve).catch(reject);
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          pickFromGallery(fallbackName, pickerOptions).then(resolve).catch(reject);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => resolve(null),
      },
    ]);
  });

export const pickImageAsset = async () =>
  showImageSourcePicker(`${Date.now()}.jpg`);

export const pickVehicleImage = async () =>
  showImageSourcePicker(`vehicle-${Date.now()}.jpg`, "Vehicle photo");

export const pickDocumentImage = async () =>
  showImageSourcePicker(`document-${Date.now()}.jpg`, "Document photo", DOCUMENT_PICKER_OPTIONS);
