import { isRemoteImageUrl } from "./imageUpload";

/**
 * Resolve profile photo URL from API user objects (various field names).
 */
export const getProfileImageUri = (user) => {
  if (!user) return null;

  const candidates = [
    user.profile_img,
    user.userimg,
    user.profile,
    user.activeData?.profile_img,
    user.activeData?.userimg,
    typeof user === "string" ? user : null,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (isRemoteImageUrl(trimmed) || trimmed.startsWith("file://")) {
        return trimmed;
      }
    }
  }
  return null;
};

/** Wrap a bare URL string as a user-like object for UserAvatar */
export const profileFromUrl = (url) =>
  url ? { profile_img: url } : null;
