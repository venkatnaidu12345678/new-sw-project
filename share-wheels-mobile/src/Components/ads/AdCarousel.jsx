import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";
import AdBanner from "./AdBanner";
import AdVideo from "./AdVideo";
import AdNative from "./AdNative";
import { LAYOUT } from "../../theme/layout";
import { isVideoAd } from "../../Utils/adMedia";
import { getCarouselSlideHeight } from "./adCarouselLayout";

const AUTO_ADVANCE_MS = 6000;

const renderSlide = (ad, style, { isActive, variant }) => {
  if (isVideoAd(ad)) {
    return (
      <AdVideo
        ad={ad}
        style={style}
        compact={false}
        isActive={isActive}
      />
    );
  }
  switch (ad.type) {
    case "native":
      return <AdNative ad={ad} style={style} compact={variant !== "carousel"} />;
    case "banner":
    default:
      return <AdBanner ad={ad} style={style} variant={variant} />;
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
  const pagerHeight = currentAd
    ? getCarouselSlideHeight(currentAd, isVideoAd)
    : getCarouselSlideHeight({ type: "banner" }, isVideoAd);

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
    const slideHeight = getCarouselSlideHeight(validAds[0], isVideoAd);
    return (
      <View style={[styles.singleWrap, containerStyle, { height: slideHeight }]}>
        {renderSlide(validAds[0], style, { isActive: true, variant: "carousel" })}
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
        {validAds.map((ad, index) => (
          <View key={ad._id} style={[styles.page, { height: pagerHeight }]}>
            {renderSlide(ad, [style, styles.slide], {
              isActive: page === index,
              variant: "carousel",
            })}
          </View>
        ))}
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
    width: "100%",
    alignSelf: "stretch",
  },
  singleWrap: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  pager: {
    width: "100%",
  },
  page: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "stretch",
  },
  slide: {
    marginVertical: 0,
    flex: 1,
    alignSelf: "stretch",
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
