import { Platform } from "react-native";
import { baseUrl } from "../Config";
import { parseApiResponse } from "./parseApiResponse";

export const isRemoteImageUrl = (value) =>
  typeof value === "string" &&
  (value.startsWith("http://") || value.startsWith("https://"));

export const getImageUri = (image) => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.uri || null;
};

export const appendImageFile = (formData, fieldName, image) => {
  if (!image) return;

  const uri = getImageUri(image);
  if (!uri) return;

  if (isRemoteImageUrl(uri)) {
    formData.append(fieldName, uri);
    return;
  }

  const type = image.type || "image/jpeg";
  const name = image.name || `${fieldName}.jpg`;

  formData.append(fieldName, {
    uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
    type,
    name,
  });
};

/**
 * Upload local image to Cloudinary via backend. Returns HTTPS URL or existing URL.
 */
export const uploadImageToCloudinary = async (token, image, folder = "general") => {
  const uri = getImageUri(image);
  if (!uri) return null;
  if (isRemoteImageUrl(uri)) return uri;

  const formData = new FormData();
  formData.append("folder", folder);
  appendImageFile(formData, "image", image);

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

export const pickImageAsset = () =>
  new Promise((resolve, reject) => {
    const { launchImageLibrary } = require("react-native-image-picker");
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.85,
        maxWidth: 1600,
        maxHeight: 1600,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) return resolve(null);
        if (response.errorCode) return reject(new Error(response.errorMessage));
        const asset = response.assets?.[0];
        if (!asset?.uri) return reject(new Error("No image selected"));
        resolve({
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: asset.fileName || `${Date.now()}.jpg`,
        });
      }
    );
  });
