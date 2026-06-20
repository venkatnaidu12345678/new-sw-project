import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAds } from "../../context/AdsContext";
import AdCarousel from "./AdCarousel";
import AdBanner from "./AdBanner";
import AdVideo from "./AdVideo";
import AdVideoPlaylist from "./AdVideoPlaylist";
import AdNative from "./AdNative";
import { isVideoAd } from "../../Utils/adMedia";
import { AdPlacementSkeleton } from "../ui/Skeleton";

/** home_video accepts only type=video with a real video URL — never banners or native. */
const filterAdsForPlacement = (ads, placement) =>
  (ads || []).filter((a) => {
    if (!a?.mediaUrl) return false;
    if (placement === "home_video") {
      return a.type === "video" && isVideoAd(a);
    }
    if (a.type === "video") return isVideoAd(a);
    return a.type !== "video";
  });

const renderSingleAd = (ad, style) => {
  if (isVideoAd(ad)) {
    return <AdVideo ad={ad} style={style} isActive />;
  }
  switch (ad.type) {
    case "native":
      return <AdNative ad={ad} style={style} />;
    case "banner":
    default:
      return <AdBanner ad={ad} style={style} />;
  }
};

const AdPlacement = ({ placement, style, containerStyle, showDebug }) => {
  const { getAdsForPlacement, loading, error } = useAds();
  const ads = getAdsForPlacement(placement);

  if (loading) {
    return <AdPlacementSkeleton variant={placement === "home_video" ? "video" : "banner"} />;
  }

  if (__DEV__ && showDebug && error) {
    return <Text style={styles.debug}>Ads: {error}</Text>;
  }

  const valid = filterAdsForPlacement(ads, placement);
  if (!valid.length) return null;

  if (placement === "home_video") {
    return (
      <AdVideoPlaylist
        ads={valid}
        style={style}
        containerStyle={containerStyle}
      />
    );
  }

  if (valid.length > 1) {
    return (
      <AdCarousel ads={valid} style={style} containerStyle={containerStyle} />
    );
  }

  return <View style={containerStyle}>{renderSingleAd(valid[0], style)}</View>;
};

export default AdPlacement;

const styles = StyleSheet.create({
  debug: {
    fontSize: 11,
    color: "#B91C1C",
    marginVertical: 4,
  },
});
