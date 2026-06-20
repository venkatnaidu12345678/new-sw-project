import {
  isVideoAd,
  isVideoMediaUrl,
  BANNER_PREVIEW_ASPECT,
} from "../../utils/adRules";

/**
 * Preview ad media the way the mobile app displays it.
 */
export default function AdMediaPreview({ ad, size = "modal" }) {
  if (!ad?.mediaUrl) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        No media
      </div>
    );
  }

  const isVideo = isVideoAd(ad) || (ad.type === "video" && isVideoMediaUrl(ad.mediaUrl));
  const isBannerCarousel =
    ad.type === "banner" &&
    (ad.placement === "home_banner" ||
      ad.placement === "search_results" ||
      ad.placement === "ride_history" ||
      ad.placement === "profile");

  if (isVideo) {
    return (
      <div
        className={
          size === "thumb"
            ? "h-14 w-24 overflow-hidden rounded-lg bg-slate-900"
            : "overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
        }
        style={size === "modal" ? { aspectRatio: "16 / 9", maxHeight: "220px" } : undefined}
      >
        <video
          src={ad.mediaUrl}
          poster={ad.posterUrl || undefined}
          className="h-full w-full object-contain"
          muted
          autoPlay={size === "modal"}
          loop={size === "modal"}
          playsInline
        />
      </div>
    );
  }

  if (isBannerCarousel) {
    return (
      <div
        className={
          size === "thumb"
            ? "w-28 overflow-hidden rounded-lg bg-slate-900"
            : "w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
        }
        style={{ aspectRatio: BANNER_PREVIEW_ASPECT }}
      >
        <img
          src={ad.mediaUrl}
          alt={ad.title || "Banner preview"}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={
        size === "thumb"
          ? "h-14 w-24 overflow-hidden rounded-lg bg-slate-100"
          : "overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      }
    >
      <img
        src={ad.mediaUrl}
        alt={ad.title || "Preview"}
        className={
          size === "thumb"
            ? "h-full w-full object-contain"
            : "max-h-48 w-full object-contain"
        }
      />
    </div>
  );
}
