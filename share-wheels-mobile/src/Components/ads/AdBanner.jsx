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
import { recordAdClick, recordAdImpression } from "../../ApiService/adsApiService";

const AdBanner = ({ ad, style }) => {
  const [imgError, setImgError] = useState(false);

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
      style={[styles.wrap, style]}
    >
      {!imgError ? (
        <Image
          source={{ uri: ad.mediaUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[styles.image, styles.fallback]}>
          <Text style={styles.fallbackText}>{ad.title || "Sponsored"}</Text>
        </View>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Ad</Text>
      </View>
      {ad.title ? <Text style={styles.title} numberOfLines={1}>{ad.title}</Text> : null}
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
  image: {
    width: "100%",
    height: scale(100),
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15,23,42,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
