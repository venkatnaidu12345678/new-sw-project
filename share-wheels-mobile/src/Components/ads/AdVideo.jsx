import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { LAYOUT, scale } from "../../theme/layout";
import { recordAdClick, recordAdImpression } from "../../ApiService/adsApiService";
import { isVideoMediaUrl } from "../../Utils/adMedia";

const buildVideoHtml = (videoUrl, { loop = false, notifyOnEnd = false } = {}) => {
  const safeUrl = videoUrl.replace(/"/g, "&quot;");
  const loopAttr = loop ? "loop" : "";
  const endHandler = notifyOnEnd
    ? `onended="if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage('ended');}"`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0F172A; overflow: hidden; }
    video {
      width: 100%; height: 100%; object-fit: cover;
      background: #0F172A;
    }
  </style>
</head>
<body>
  <video
    src="${safeUrl}"
    autoplay
    muted
    ${loopAttr}
    playsinline
    webkit-playsinline
    preload="auto"
    ${endHandler}
  ></video>
</body>
</html>`;
};

/**
 * In-app muted autoplay video ad (no poster-as-video fallback).
 */
const AdVideo = ({
  ad,
  style,
  compact = false,
  isActive = true,
  loop = true,
  onEnded,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ad?._id && isActive) recordAdImpression(ad._id);
  }, [ad?._id, isActive]);

  const videoUrl = ad?.mediaUrl?.trim();
  if (!videoUrl || !isVideoMediaUrl(videoUrl)) return null;

  const html = useMemo(
    () =>
      buildVideoHtml(videoUrl, {
        loop,
        notifyOnEnd: !!onEnded && !loop,
      }),
    [videoUrl, loop, onEnded]
  );

  const open = async () => {
    if (ad._id) await recordAdClick(ad._id);
    const url = ad.ctaUrl?.trim();
    if (url?.startsWith("http")) Linking.openURL(url);
  };

  const height = compact ? scale(72) : scale(180);

  return (
    <TouchableOpacity
      activeOpacity={ad.ctaUrl ? 0.92 : 1}
      onPress={ad.ctaUrl ? open : undefined}
      style={[styles.wrap, compact && styles.wrapCompact, { minHeight: height }, style]}
    >
      {isActive ? (
        <WebView
          source={{ html }}
          style={[styles.webview, { height }]}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => setReady(true)}
          onMessage={(event) => {
            if (event.nativeEvent.data === "ended") onEnded?.();
          }}
        />
      ) : (
        <View style={[styles.webview, styles.paused, { height }]} />
      )}
      {!ready && isActive ? (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading video…</Text>
        </View>
      ) : null}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Video</Text>
      </View>
      {!compact && ad.title ? (
        <View style={styles.caption} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {ad.title}
          </Text>
        </View>
      ) : null}
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
  },
  wrapCompact: {
    marginVertical: 4,
    borderRadius: 10,
  },
  webview: {
    width: "100%",
    backgroundColor: "#0F172A",
  },
  paused: {
    backgroundColor: "#1E293B",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(15,23,42,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(15,23,42,0.55)",
    zIndex: 2,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
