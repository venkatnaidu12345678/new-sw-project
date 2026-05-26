import React, { useEffect } from "react";
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

const AdNative = ({ ad, style, compact = false }) => {
  useEffect(() => {
    if (ad?._id) recordAdImpression(ad._id);
  }, [ad?._id]);

  if (!ad?.mediaUrl) return null;

  const open = async () => {
    if (ad._id) await recordAdClick(ad._id);
    const url = ad.ctaUrl?.trim();
    if (url?.startsWith("http")) Linking.openURL(url);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={open}
      style={[styles.card, style]}
    >
      <Image
        source={{ uri: ad.mediaUrl }}
        style={[styles.thumb, compact && styles.thumbCompact]}
        resizeMode="cover"
      />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.sponsored}>Sponsored</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {ad.title || "Promotion"}
        </Text>
        {ad.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {ad.description}
          </Text>
        ) : null}
        {ad.ctaLabel ? (
          <View style={styles.ctaBtn}>
            <Text style={styles.ctaText}>{ad.ctaLabel}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default AdNative;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    overflow: "hidden",
    marginVertical: LAYOUT.spacing.sm,
  },
  thumb: {
    width: scale(100),
    minHeight: scale(100),
  },
  thumbCompact: {
    width: scale(72),
    minHeight: scale(72),
  },
  body: {
    flex: 1,
    padding: LAYOUT.spacing.md,
    justifyContent: "center",
  },
  row: { marginBottom: 4 },
  sponsored: {
    fontSize: LAYOUT.font.tiny,
    color: "#B45309",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
    color: "#0F172A",
  },
  desc: {
    fontSize: LAYOUT.font.small,
    color: "#64748B",
    marginTop: 4,
    lineHeight: scale(18),
  },
  ctaBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
  },
});
