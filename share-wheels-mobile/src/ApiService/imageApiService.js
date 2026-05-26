import { baseUrl } from "../Config";
import { parseApiResponse } from "../Utils/parseApiResponse";
import { ensureCloudinaryUrl } from "../Utils/imageUpload";

export { ensureCloudinaryUrl, uploadImageToCloudinary } from "../Utils/imageUpload";

/** Save profile photo URL on user record */
export const updateProfileImageApi = async (token, profileImgUrl) => {
  const response = await fetch(`${baseUrl}/auth/profile/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profile_img: profileImgUrl }),
  });

  const data = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Failed to update profile image");
  }
  return data;
};

/** Pick local file → upload → save profile */
export const uploadAndSetProfileImage = async (token, imageFile) => {
  const url = await ensureCloudinaryUrl(token, imageFile, "profiles");
  return updateProfileImageApi(token, url);
};
