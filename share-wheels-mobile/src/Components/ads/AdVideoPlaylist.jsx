import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { isVideoAd } from "../../Utils/adMedia";

const PLAYLIST_HEIGHT = scale(180);

const buildPlaylistHtml = (items) => {
  const payload = JSON.stringify(
    items.map((ad) => ({
      id: String(ad._id || ""),
      url: ad.mediaUrl.trim(),
      title: ad.title || "",
    }))
  );

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
  <video id="player" muted playsinline webkit-playsinline preload="auto"></video>
  <script>
    const playlist = ${payload};
    const video = document.getElementById("player");
    let index = 0;

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function playIndex(i) {
      if (!playlist.length) return;
      index = ((i % playlist.length) + playlist.length) % playlist.length;
      const item = playlist[index];
      video.src = item.url;
      video.loop = playlist.length === 1;
      post({ type: "playing", id: item.id, index: index, title: item.title });
      const p = video.play();
      if (p && p.catch) p.catch(function() {});
    }

    video.addEventListener("ended", function() {
      if (playlist.length <= 1) return;
      playIndex(index + 1);
    });

    playIndex(0);
  </script>
</body>
</html>`;
};

/**
 * Home video slot — one player, videos play back-to-back (no pager / dots / carousel).
 */
const AdVideoPlaylist = ({ ads = [], style, containerStyle }) => {
  const videoAds = useMemo(() => (ads || []).filter(isVideoAd), [ads]);
  const [ready, setReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const impressedRef = React.useRef(new Set());

  const html = useMemo(
    () => (videoAds.length ? buildPlaylistHtml(videoAds) : ""),
    [videoAds]
  );

  const currentAd = videoAds[currentIndex] || videoAds[0];

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data || "{}");
        if (data.type !== "playing" || !data.id) return;

        setCurrentIndex(typeof data.index === "number" ? data.index : 0);

        const impressionKey = `${data.id}:${data.index}`;
        if (!impressedRef.current.has(impressionKey)) {
          impressedRef.current.add(impressionKey);
          recordAdImpression(data.id);
        }
      } catch {
        /* ignore malformed messages */
      }
    },
    []
  );

  useEffect(() => {
    impressedRef.current.clear();
    setCurrentIndex(0);
    setReady(false);
  }, [html]);

  const open = async () => {
    if (!currentAd?._id) return;
    await recordAdClick(currentAd._id);
    const url = currentAd.ctaUrl?.trim();
    if (url?.startsWith("http")) Linking.openURL(url);
  };

  if (!videoAds.length || !html) return null;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TouchableOpacity
        activeOpacity={currentAd?.ctaUrl ? 0.92 : 1}
        onPress={currentAd?.ctaUrl ? open : undefined}
        style={[styles.playerShell, { minHeight: PLAYLIST_HEIGHT }, style]}
      >
        <WebView
          source={{ html }}
          style={[styles.webview, { height: PLAYLIST_HEIGHT }]}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => setReady(true)}
          onMessage={handleMessage}
        />
        {!ready ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Loading video…</Text>
          </View>
        ) : null}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Video</Text>
        </View>
        {currentAd?.title ? (
          <View style={styles.caption} pointerEvents="none">
            <Text style={styles.title} numberOfLines={1}>
              {currentAd.title}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

export default AdVideoPlaylist;

const styles = StyleSheet.create({
  wrap: {
    minHeight: PLAYLIST_HEIGHT,
  },
  playerShell: {
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    marginVertical: LAYOUT.spacing.sm,
  },
  webview: {
    width: "100%",
    backgroundColor: "#0F172A",
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
