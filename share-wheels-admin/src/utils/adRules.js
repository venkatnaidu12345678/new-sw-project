export const PLACEMENT_LABELS = {
  home_banner: "Home - Banner",
  home_video: "Home - Video",
  home_native: "Home - Native card",
  search_results: "Search results",
  ride_history: "Ride history",
  profile: "Profile",
};

export const PLACEMENT_RULES = {
  home_banner: {
    allowedTypes: ["banner"],
    label: "Carousel banners — use wide images (~2.4:1). Videos are not shown here.",
  },
  home_video: {
    allowedTypes: ["video"],
    label: "Video playlist — only video files; they play one after another in the app.",
  },
  home_native: {
    allowedTypes: ["native"],
    label: "Sponsored native card with image + text.",
  },
  search_results: {
    allowedTypes: ["banner", "native"],
    label: "Banner carousel in search results.",
  },
  ride_history: {
    allowedTypes: ["banner", "native"],
    label: "Banner carousel on ride history.",
  },
  profile: {
    allowedTypes: ["banner", "native"],
    label: "Banner carousel on profile.",
  },
};

export const isVideoMediaUrl = (url = "") => {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(u)) return true;
  if (u.includes("/video/upload/")) return true;
  if (u.includes("resource_type=video")) return true;
  return false;
};

export const isVideoAd = (ad) =>
  ad?.type === "video" && isVideoMediaUrl(ad?.mediaUrl);

export const getAllowedTypesForPlacement = (placement) =>
  PLACEMENT_RULES[placement]?.allowedTypes || ["banner", "video", "native"];

export const isAdVisibleOnMobile = (ad) => {
  if (!ad?.mediaUrl?.trim()) return false;
  const rules = PLACEMENT_RULES[ad.placement];
  if (!rules) return true;
  if (!rules.allowedTypes.includes(ad.type)) return false;
  if (ad.placement === "home_video") return isVideoAd(ad);
  if (ad.type === "video") return isVideoAd(ad);
  return ad.type !== "video";
};

export const validateAdForm = ({ type, placement, mediaUrl }) => {
  const rules = PLACEMENT_RULES[placement];
  const url = String(mediaUrl || "").trim();

  if (rules && !rules.allowedTypes.includes(type)) {
    return `This placement only accepts: ${rules.allowedTypes.join(", ")}`;
  }
  if (type === "video" && url && !isVideoMediaUrl(url)) {
    return "Video ads need a valid video URL (mp4/webm or Cloudinary video).";
  }
  if (placement === "home_video" && type !== "video") {
    return "Home video placement requires type \"video\".";
  }
  if (placement === "home_banner" && type === "video") {
    return "Use Home - Video for videos. Home banner is for images only.";
  }
  if (
    (placement === "home_banner" || placement === "home_native") &&
    url &&
    isVideoMediaUrl(url) &&
    type !== "video"
  ) {
    return "This placement expects an image, not a video file.";
  }
  return null;
};

export const defaultTypeForPlacement = (placement) =>
  getAllowedTypesForPlacement(placement)[0] || "banner";

/** Mobile banner carousel aspect ratio */
export const BANNER_PREVIEW_ASPECT = "2.4 / 1";
