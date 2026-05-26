import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import PagerView from "react-native-pager-view";
import AdBanner from "./AdBanner";
import AdVideo from "./AdVideo";
import AdNative from "./AdNative";
import { LAYOUT, scale } from "../../theme/layout";
import { isVideoAd } from "../../Utils/adMedia";

const { width: SCREEN_W } = Dimensions.get("window");
const AUTO_ADVANCE_MS = 6000;
const HEIGHT_VIDEO = scale(188);
const HEIGHT_COMPACT = scale(80);

const renderSlide = (ad, style, { isActive, compact }) => {
  if (isVideoAd(ad)) {
    return (
      <AdVideo
        ad={ad}
        style={style}
        compact={compact}
        isActive={isActive}
      />
    );
  }
  switch (ad.type) {
    case "native":
      return <AdNative ad={ad} style={style} compact={compact} />;
    case "banner":
    default:
      return <AdBanner ad={ad} style={style} compact={compact} />;
  }
};

const AdCarousel = ({ ads = [], style, containerStyle }) => {
  const pagerRef = useRef(null);
  const [page, setPage] = useState(0);
  const validAds = ads.filter((a) => {
    if (!a?.mediaUrl) return false;
    if (a.type === "video") return isVideoAd(a);
    return a.type !== "video";
  });

  const currentAd = validAds[page];
  const pagerHeight =
    currentAd && isVideoAd(currentAd) ? HEIGHT_VIDEO : HEIGHT_COMPACT;

  const goNext = useCallback(() => {
    if (validAds.length <= 1) return;
    setPage((prev) => {
      const next = (prev + 1) % validAds.length;
      pagerRef.current?.setPage(next);
      return next;
    });
  }, [validAds.length]);

  useEffect(() => {
    if (validAds.length <= 1) return undefined;
    const timer = setInterval(goNext, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [validAds.length, goNext]);

  if (!validAds.length) return null;

  if (validAds.length === 1) {
    const compact = !isVideoAd(validAds[0]);
    return (
      <View style={[containerStyle, { height: compact ? HEIGHT_COMPACT : HEIGHT_VIDEO }]}>
        {renderSlide(validAds[0], style, { isActive: true, compact })}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <PagerView
        ref={pagerRef}
        style={[styles.pager, { height: pagerHeight }]}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {validAds.map((ad, index) => {
          const compact = !isVideoAd(ad);
          return (
            <View key={ad._id} style={styles.page}>
              {renderSlide(ad, [style, styles.slide], {
                isActive: page === index,
                compact,
              })}
            </View>
          );
        })}
      </PagerView>
      <View style={styles.dots}>
        {validAds.map((ad, i) => (
          <View
            key={ad._id}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
};

export default AdCarousel;

const styles = StyleSheet.create({
  wrap: {
    width: SCREEN_W - LAYOUT.spacing.screen * 2,
    alignSelf: "center",
  },
  pager: {
    width: "100%",
  },
  page: {
    flex: 1,
    justifyContent: "center",
  },
  slide: {
    marginVertical: 0,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#2563EB",
  },
});
