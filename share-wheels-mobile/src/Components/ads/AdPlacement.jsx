import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAds } from "../../context/AdsContext";
import AdCarousel from "./AdCarousel";
import AdBanner from "./AdBanner";
import AdVideo from "./AdVideo";
import AdNative from "./AdNative";

const renderSingleAd = (ad, style) => {
  switch (ad.type) {
    case "video":
      return <AdVideo ad={ad} style={style} />;
    case "native":
      return <AdNative ad={ad} style={style} />;
    case "banner":
    default:
      return <AdBanner ad={ad} style={style} />;
  }
};

/**
 * Renders all active ads for a placement (carousel when multiple).
 */
const AdPlacement = ({ placement, style, containerStyle, showDebug }) => {
  const { getAdsForPlacement, loading, error } = useAds();
  const ads = getAdsForPlacement(placement);

  if (loading) return null;

  if (__DEV__ && showDebug && error) {
    return (
      <Text style={styles.debug}>Ads: {error}</Text>
    );
  }

  const valid = ads.filter((a) => a?.mediaUrl);
  if (!valid.length) return null;

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
