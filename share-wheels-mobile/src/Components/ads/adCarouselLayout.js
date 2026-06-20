import { LAYOUT, scale } from "../../theme/layout";

/** Typical mobile banner ~ 2.4:1 (width : height). */
export const AD_BANNER_ASPECT = 2.4;

export const AD_CONTENT_WIDTH =
  LAYOUT.screenWidth - LAYOUT.spacing.screen * 2;

export const AD_BANNER_HEIGHT = Math.round(AD_CONTENT_WIDTH / AD_BANNER_ASPECT);

export const AD_CAROUSEL_VIDEO_HEIGHT = scale(188);

export const AD_CAROUSEL_NATIVE_HEIGHT = scale(120);

export const getCarouselSlideHeight = (ad, isVideoAdFn) => {
  if (isVideoAdFn(ad)) return AD_CAROUSEL_VIDEO_HEIGHT;
  if (ad?.type === "native") return AD_CAROUSEL_NATIVE_HEIGHT;
  return AD_BANNER_HEIGHT;
};
