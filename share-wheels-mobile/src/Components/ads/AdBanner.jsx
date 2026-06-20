import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
} from "react-native";
import { LAYOUT, scale } from "../../theme/layout";
import { AD_BANNER_HEIGHT } from "./adCarouselLayout";
import { recordAdClick, recordAdImpression } from "../../ApiService/adsApiService";

const AdBanner = ({ ad, style, compact = false, variant = "default" }) => {
  const [imgError, setImgError] = useState(false);
  const isCarousel = variant === "carousel";

  useEffect(() => {
    if (ad?._id) recordAdImpression(ad._id);
  }, [ad?._id]);

  if (!ad?.mediaUrl) return null;

  const open = async () => {
    if (ad._id) await recordAdClick(ad._id);
    const url = ad.ctaUrl?.trim() || ad.mediaUrl;
    if (url?.startsWith("http")) Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={open}
      style={[
        styles.wrap,
        isCarousel && styles.wrapCarousel,
        compact && !isCarousel && styles.wrapCompact,
        style,
      ]}
    >
      {!imgError ? (
        <Image
          source={{ uri: ad.mediaUrl }}
          style={[
            styles.image,
            isCarousel && styles.imageCarousel,
            compact && !isCarousel && styles.imageCompact,
          ]}
          resizeMode={isCarousel ? "contain" : "cover"}
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={[
            styles.image,
            isCarousel && styles.imageCarousel,
            compact && !isCarousel && styles.imageCompact,
            styles.fallback,
          ]}
        >
          <Text style={styles.fallbackText}>{ad.title || "Sponsored"}</Text>
        </View>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Ad</Text>
      </View>
      {!compact && !isCarousel && ad.title ? (
        <Text style={styles.title} numberOfLines={1}>
          {ad.title}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export default AdBanner;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginVertical: LAYOUT.spacing.sm,
  },
  wrapCarousel: {
    width: "100%",
    height: AD_BANNER_HEIGHT,
    marginVertical: 0,
    alignSelf: "stretch",
    backgroundColor: "#0F172A",
  },
  wrapCompact: {
    marginVertical: 4,
    borderRadius: 10,
  },
  image: {
    width: "100%",
    height: scale(100),
  },
  imageCarousel: {
    width: "100%",
    height: AD_BANNER_HEIGHT,
    backgroundColor: "#0F172A",
  },
  imageCompact: {
    height: scale(72),
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15,23,42,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  title: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CBD5E1",
  },
  fallbackText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: LAYOUT.font.body,
  },
});
