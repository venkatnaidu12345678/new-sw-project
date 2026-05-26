import React, { useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LAYOUT, scale } from "../../theme/layout";
import { recordAdClick, recordAdImpression } from "../../ApiService/adsApiService";

const AdVideo = ({ ad, style }) => {
  useEffect(() => {
    if (ad?._id) recordAdImpression(ad._id);
  }, [ad?._id]);

  if (!ad?.mediaUrl) return null;

  const poster = ad.posterUrl || ad.mediaUrl;

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
      <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={styles.playBtn}>
          <Icon name="play" size={28} color="#2563EB" />
        </View>
        <Text style={styles.label}>Sponsored video</Text>
        {ad.title ? (
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>
        ) : null}
        {ad.ctaLabel ? (
          <Text style={styles.cta}>{ad.ctaLabel} →</Text>
        ) : null}
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Ad</Text>
      </View>
    </TouchableOpacity>
  );
};

export default AdVideo;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    marginVertical: LAYOUT.spacing.sm,
    minHeight: scale(160),
  },
  poster: {
    width: "100%",
    height: scale(160),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: LAYOUT.spacing.md,
  },
  playBtn: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: LAYOUT.font.tiny,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#fff",
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  cta: {
    color: "#93C5FD",
    fontSize: LAYOUT.font.label,
    fontWeight: "600",
    marginTop: 6,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15,23,42,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
