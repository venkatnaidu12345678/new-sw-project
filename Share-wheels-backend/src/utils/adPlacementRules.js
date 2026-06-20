/** Mirrors mobile ad placement rules (AdPlacement / adMedia). */

const isVideoMediaUrl = (url = "") => {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(u)) return true;
  if (u.includes("/video/upload/")) return true;
  if (u.includes("resource_type=video")) return true;
  return false;
};

const PLACEMENT_RULES = {
  home_banner: {
    allowedTypes: ["banner"],
    label: "Home banner carousel (2.4:1 images only)",
  },
  home_video: {
    allowedTypes: ["video"],
    requireVideoUrl: true,
    label: "Home video playlist (videos play one after another)",
  },
  home_native: {
    allowedTypes: ["native"],
    label: "Home native card",
  },
  search_results: {
    allowedTypes: ["banner", "native"],
    label: "Search results carousel",
  },
  ride_history: {
    allowedTypes: ["banner", "native"],
    label: "Ride history carousel",
  },
  profile: {
    allowedTypes: ["banner", "native"],
    label: "Profile carousel",
  },
};

const getAllowedTypesForPlacement = (placement) =>
  PLACEMENT_RULES[placement]?.allowedTypes || ["banner", "video", "native"];

const isVideoAdRecord = (ad) =>
  ad?.type === "video" && isVideoMediaUrl(ad?.mediaUrl);

const isAdVisibleOnMobile = (ad) => {
  if (!ad?.mediaUrl?.trim()) return false;
  const rules = PLACEMENT_RULES[ad.placement];
  if (!rules) return true;
  if (!rules.allowedTypes.includes(ad.type)) return false;
  if (ad.placement === "home_video") return isVideoAdRecord(ad);
  if (ad.type === "video") return isVideoAdRecord(ad);
  return ad.type !== "video";
};

const validateAdFields = ({ type, placement, mediaUrl }) => {
  if (!type || !placement) return null;
  const rules = PLACEMENT_RULES[placement];
  const url = String(mediaUrl || "").trim();

  if (rules && !rules.allowedTypes.includes(type)) {
    return {
      message: `Placement "${placement}" only accepts: ${rules.allowedTypes.join(", ")}`,
    };
  }

  if (type === "video" && url && !isVideoMediaUrl(url)) {
    return {
      message:
        "Video ads need a valid video URL (mp4/webm/mov or Cloudinary /video/upload/).",
    };
  }

  if (placement === "home_video") {
    if (type !== "video") {
      return { message: "Home video placement requires type \"video\"." };
    }
    if (url && !isVideoMediaUrl(url)) {
      return { message: "Home video placement requires a valid video file URL." };
    }
  }

  if (placement === "home_banner" && type === "video") {
    return {
      message: "Use Home - Video placement for video ads. Home banner is for images only.",
    };
  }

  if (
    (placement === "home_banner" || placement === "home_native") &&
    url &&
    isVideoMediaUrl(url) &&
    type !== "video"
  ) {
    return {
      message: "This placement expects an image URL, not a video file.",
    };
  }

  return null;
};

module.exports = {
  PLACEMENT_RULES,
  isVideoMediaUrl,
  isVideoAdRecord,
  isAdVisibleOnMobile,
  getAllowedTypesForPlacement,
  validateAdFields,
};
