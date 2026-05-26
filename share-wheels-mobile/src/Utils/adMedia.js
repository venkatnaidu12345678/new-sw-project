/** True when URL points to video (Cloudinary / direct file). */
export const isVideoMediaUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(u)) return true;
  if (u.includes("/video/upload/")) return true;
  if (u.includes("resource_type=video")) return true;
  return false;
};

export const isVideoAd = (ad) =>
  ad?.type === "video" && isVideoMediaUrl(ad?.mediaUrl);
