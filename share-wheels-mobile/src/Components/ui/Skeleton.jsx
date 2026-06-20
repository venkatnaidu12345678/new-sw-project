import React, { useEffect, useRef, createContext, useContext, useMemo } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../context/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");

const ShimmerContext = createContext(null);
const PaletteContext = createContext(null);

const useSkeletonPalette = () => {
  const { colors, isDark } = useTheme();
  return useMemo(
    () => ({
      isDark,
      bone: colors.surfaceAlt,
      boneBorder: colors.border,
      boneBase: isDark ? colors.chipBg : "rgba(226, 232, 240, 0.55)",
      shimmer: isDark
        ? [
            "transparent",
            "rgba(148, 163, 184, 0.08)",
            "rgba(148, 163, 184, 0.22)",
            "rgba(148, 163, 184, 0.08)",
            "transparent",
          ]
        : [
            "transparent",
            "rgba(255,255,255,0.25)",
            "rgba(255,255,255,0.7)",
            "rgba(255,255,255,0.3)",
            "transparent",
          ],
      tint: isDark
        ? ["rgba(51, 65, 85, 0.9)", "rgba(30, 41, 59, 0.4)"]
        : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.08)"],
      specular: isDark
        ? ["rgba(148, 163, 184, 0.2)", "transparent"]
        : ["rgba(255,255,255,0.65)", "transparent"],
      cardBorder: isDark
        ? ["#334155", "#1E293B", "#0F172A", "#334155"]
        : [
            "rgba(255,255,255,0.92)",
            "rgba(255,255,255,0.28)",
            "rgba(255,255,255,0.12)",
            "rgba(255,255,255,0.5)",
          ],
      cardInner: isDark
        ? ["#1E293B", "#334155", "#1E293B"]
        : [
            "rgba(255,255,255,0.65)",
            "rgba(255,255,255,0.22)",
            "rgba(255,255,255,0.38)",
          ],
      cardSpecular: isDark
        ? ["rgba(148, 163, 184, 0.15)", "transparent"]
        : ["rgba(255,255,255,0.75)", "transparent"],
      routeBlock: isDark
        ? ["#334155", "#1E293B"]
        : ["rgba(255,255,255,0.5)", "rgba(248,250,252,0.25)"],
      routeDivider: isDark ? colors.border : "rgba(255, 255, 255, 0.5)",
      shadow: colors.shadow,
      chatBubble: colors.surfaceAlt,
      chatBorder: colors.border,
    }),
    [colors, isDark]
  );
};

const ShimmerProvider = ({ children, palette }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const defaultPalette = useSkeletonPalette();
  const pal = palette || defaultPalette;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <PaletteContext.Provider value={pal}>
      <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>
    </PaletteContext.Provider>
  );
};

const GlassBone = ({ width = "100%", height = 12, borderRadius = 6, style }) => {
  const progress = useContext(ShimmerContext);
  const pal = useContext(PaletteContext);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_W * 0.35, SCREEN_W * 0.85],
  });

  return (
    <View
      style={[
        styles.glassBone,
        {
          width,
          height,
          borderRadius,
          borderColor: pal.boneBorder,
          backgroundColor: pal.bone,
        },
        style,
      ]}
    >
      <View
        style={[styles.glassBoneBase, { borderRadius, backgroundColor: pal.boneBase }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={pal.tint}
        style={[styles.glassBoneTint, { borderRadius }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.shimmerLayer, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={pal.shimmer}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
      <LinearGradient
        colors={pal.specular}
        style={[styles.glassBoneSpecular, { borderRadius }]}
        pointerEvents="none"
      />
    </View>
  );
};

const GlassCard = ({ children, style, innerStyle }) => {
  const pal = useContext(PaletteContext);
  return (
    <View
      style={[
        styles.glassCardWrap,
        {
          shadowColor: pal.shadow,
          shadowOpacity: pal.isDark ? 0.25 : 0.1,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={pal.cardBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glassCardBorder}
      >
        <View style={[styles.glassCardInner, innerStyle]}>
          <LinearGradient
            colors={pal.cardInner}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={pal.cardSpecular}
            style={styles.glassCardSpecular}
            pointerEvents="none"
          />
          <View style={styles.glassCardContent}>{children}</View>
        </View>
      </LinearGradient>
    </View>
  );
};

const GlassRouteBlock = ({ children }) => {
  const pal = useContext(PaletteContext);
  return (
    <View style={[styles.glassRouteBlock, { borderColor: pal.boneBorder }]}>
      <LinearGradient colors={pal.routeBlock} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
};

const AllRideCardSkeleton = () => {
  const pal = useContext(PaletteContext);
  return (
    <GlassCard style={styles.rideCardGlass}>
      <GlassRouteBlock>
        <View style={styles.routeLine}>
          <GlassBone width={14} height={14} borderRadius={7} />
          <GlassBone width="72%" height={13} style={styles.routeBone} />
        </View>
        <View style={[styles.routeDivider, { backgroundColor: pal.routeDivider }]} />
        <View style={styles.routeLine}>
          <GlassBone width={14} height={14} borderRadius={7} />
          <GlassBone width="65%" height={13} style={styles.routeBone} />
        </View>
      </GlassRouteBlock>
      <View style={styles.driverRow}>
        <View style={styles.driverLeft}>
          <GlassBone width={34} height={34} borderRadius={17} />
          <GlassBone width={100} height={14} style={{ marginLeft: 8 }} />
        </View>
        <GlassBone width={52} height={18} borderRadius={6} />
      </View>
      <View style={styles.footerRow}>
        <GlassBone width={72} height={12} borderRadius={4} />
        <GlassBone width={64} height={12} borderRadius={4} />
      </View>
    </GlassCard>
  );
};

/** Matches UpcomingRide card layout */
const UpcomingRideSkeleton = () => (
  <GlassCard style={styles.upcomingGlass} innerStyle={styles.upcomingInner}>
    <GlassBone width="100%" height={3} borderRadius={0} style={styles.upcomingAccent} />
    <View style={styles.upcomingHeader}>
      <GlassBone width={36} height={36} borderRadius={18} />
      <View style={styles.upcomingHeaderText}>
        <GlassBone width="70%" height={14} borderRadius={6} style={styles.mb6} />
        <GlassBone width="45%" height={11} borderRadius={4} />
      </View>
      <View style={styles.upcomingPriceCol}>
        <GlassBone width={48} height={16} borderRadius={6} />
        <GlassBone width={56} height={18} borderRadius={8} style={{ marginTop: 6 }} />
      </View>
    </View>
    <View style={styles.upcomingRoute}>
      <View style={styles.upcomingTimeline}>
        <GlassBone width={8} height={8} borderRadius={4} />
        <GlassBone width={2} height={20} borderRadius={1} style={{ marginVertical: 2 }} />
        <GlassBone width={8} height={8} borderRadius={4} />
      </View>
      <View style={styles.upcomingRouteText}>
        <GlassBone width="42%" height={13} borderRadius={4} style={styles.mb6} />
        <GlassBone width="38%" height={13} borderRadius={4} />
      </View>
    </View>
    <View style={styles.upcomingMeta}>
      <GlassBone width={72} height={22} borderRadius={11} />
      <GlassBone width={64} height={22} borderRadius={11} />
      <GlassBone width={56} height={22} borderRadius={11} />
    </View>
  </GlassCard>
);

const RequestCardSkeleton = () => (
  <GlassCard style={styles.requestGlass}>
    <View style={styles.requestTop}>
      <GlassBone width={72} height={22} borderRadius={11} />
      <GlassBone width={64} height={22} borderRadius={11} />
    </View>
    <View style={styles.routeLine}>
      <GlassBone width={16} height={16} borderRadius={8} />
      <GlassBone width="80%" height={14} style={styles.routeBone} />
    </View>
    <View style={styles.metaRow}>
      <GlassBone width={80} height={12} borderRadius={4} />
      <GlassBone width={48} height={12} borderRadius={4} />
      <GlassBone width={56} height={12} borderRadius={4} />
    </View>
    <GlassBone width={48} height={16} borderRadius={4} style={{ marginTop: 10, alignSelf: "flex-end" }} />
  </GlassCard>
);

const HistoryCardSkeleton = () => (
  <View style={styles.historyRow}>
    <View style={styles.timeline}>
      <GlassBone width={3} height={72} borderRadius={2} />
      <GlassBone width={12} height={12} borderRadius={6} style={styles.timelineDot} />
    </View>
    <GlassCard style={styles.historyGlass} innerStyle={styles.historyInner}>
      <View style={styles.historyTop}>
        <GlassBone width={64} height={20} borderRadius={6} />
        <GlassBone width={48} height={16} borderRadius={4} />
      </View>
      <GlassBone width="88%" height={15} borderRadius={6} style={styles.mb8} />
      <View style={styles.historyBottom}>
        <GlassBone width="55%" height={12} borderRadius={4} />
        <GlassBone width={56} height={12} borderRadius={4} />
      </View>
    </GlassCard>
  </View>
);

const ChatListSkeleton = () => {
  const ctxPal = useContext(PaletteContext);
  const fallbackPal = useSkeletonPalette();
  const pal = ctxPal || fallbackPal;
  return (
    <View style={styles.chatWrap}>
      <View style={[styles.chatBubble, styles.chatLeft, { borderColor: pal.chatBorder, backgroundColor: pal.chatBubble }]}>
        <GlassBone width="100%" height={14} borderRadius={4} style={styles.mb6} />
        <GlassBone width="70%" height={14} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatRight, { borderColor: pal.chatBorder, backgroundColor: pal.chatBubble }]}>
        <GlassBone width="85%" height={12} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatLeft, { minHeight: 56, borderColor: pal.chatBorder, backgroundColor: pal.chatBubble }]}>
        <GlassBone width="100%" height={12} borderRadius={4} style={styles.mb6} />
        <GlassBone width="90%" height={12} borderRadius={4} style={styles.mb6} />
        <GlassBone width="50%" height={12} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatRight, { borderColor: pal.chatBorder, backgroundColor: pal.chatBubble }]}>
        <GlassBone width="75%" height={12} borderRadius={4} />
      </View>
    </View>
  );
};

const CARD_BY_VARIANT = {
  ride: AllRideCardSkeleton,
  upcoming: UpcomingRideSkeleton,
  request: RequestCardSkeleton,
  history: HistoryCardSkeleton,
};

export const RideListSkeleton = ({ count = 3, variant = "ride" }) => {
  const Card = CARD_BY_VARIANT[variant] || AllRideCardSkeleton;

  return (
    <ShimmerProvider>
      <View style={styles.list}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} />
        ))}
      </View>
    </ShimmerProvider>
  );
};

export const SearchBarSkeleton = () => (
  <ShimmerProvider>
    <View style={styles.searchWrap}>
      <GlassBone height={48} borderRadius={12} style={styles.mb10} />
      <GlassBone height={48} borderRadius={12} style={styles.mb10} />
      <View style={styles.searchRow}>
        <GlassBone height={44} style={styles.searchDate} borderRadius={12} />
        <GlassBone height={44} width={100} borderRadius={12} />
      </View>
    </View>
  </ShimmerProvider>
);

export const AdPlacementSkeleton = ({ variant = "banner" }) => (
  <ShimmerProvider>
    <GlassBone
      height={variant === "video" ? 180 : undefined}
      style={
        variant === "banner"
          ? { marginVertical: 8, width: "100%", aspectRatio: 2.4 }
          : { marginVertical: 8 }
      }
      borderRadius={14}
    />
  </ShimmerProvider>
);

/** Full dashboard loading — mirrors home layout (single shimmer context) */
export const DashboardSkeleton = () => (
  <ShimmerProvider>
    <View style={styles.dashboardWrap}>
      <GlassBone width="82%" height={24} borderRadius={8} style={styles.mb12} />
      <GlassBone height={80} borderRadius={14} style={{ marginVertical: 8 }} />
      <View style={styles.searchWrap}>
        <GlassBone height={48} borderRadius={12} style={styles.mb10} />
        <GlassBone height={48} borderRadius={12} style={styles.mb10} />
        <View style={styles.searchRow}>
          <GlassBone height={44} style={styles.searchDate} borderRadius={12} />
          <GlassBone height={44} width={100} borderRadius={12} />
        </View>
      </View>
      <GlassBone height={180} borderRadius={14} style={{ marginVertical: 8 }} />
      <GlassBone width={140} height={18} borderRadius={6} style={styles.sectionTitleBone} />
      <GlassBone height={80} borderRadius={14} style={{ marginBottom: 8 }} />
      <UpcomingRideSkeleton />
      <UpcomingRideSkeleton />
    </View>
  </ShimmerProvider>
);

/** Support chat loading — always wraps shimmer context (safe on ChartBoat). */
export const SupportChatSkeleton = () => (
  <ShimmerProvider>
    <ChatListSkeleton />
  </ShimmerProvider>
);

export { ChatListSkeleton };

export default GlassBone;

const styles = StyleSheet.create({
  glassBone: {
    overflow: "hidden",
    borderWidth: 1,
  },
  glassBoneBase: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBoneTint: {
    ...StyleSheet.absoluteFillObject,
  },
  glassBoneSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  shimmerLayer: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
  },
  shimmerGradient: {
    flex: 1,
    width: SCREEN_W,
  },
  glassCardWrap: {
    marginBottom: 14,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  glassCardBorder: {
    borderRadius: 16,
    padding: 1.5,
  },
  glassCardInner: {
    borderRadius: 14.5,
    overflow: "hidden",
    minHeight: 48,
  },
  glassCardSpecular: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 1,
  },
  glassCardContent: {
    padding: 14,
    zIndex: 2,
  },
  list: {},
  rideCardGlass: {},
  glassRouteBlock: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  routeLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeBone: {
    marginLeft: 8,
    flex: 1,
  },
  routeDivider: {
    height: 1,
    marginVertical: 8,
    marginLeft: 22,
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  upcomingGlass: {
    marginBottom: 12,
  },
  upcomingInner: {
    padding: 0,
    overflow: "hidden",
  },
  upcomingAccent: {
    marginBottom: 0,
    borderWidth: 0,
  },
  upcomingHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 10,
  },
  upcomingHeaderText: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  upcomingPriceCol: {
    alignItems: "flex-end",
  },
  upcomingRoute: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: "flex-start",
  },
  upcomingTimeline: {
    alignItems: "center",
    marginRight: 10,
    paddingTop: 2,
  },
  upcomingRouteText: {
    flex: 1,
  },
  upcomingMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  requestGlass: {},
  historyRow: {
    flexDirection: "row",
    marginBottom: 16,
    paddingLeft: 4,
  },
  timeline: {
    width: 24,
    alignItems: "center",
    marginRight: 10,
  },
  timelineDot: {
    position: "absolute",
    top: 4,
  },
  historyGlass: {
    flex: 1,
    marginBottom: 0,
  },
  historyInner: {
    padding: 14,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  historyBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatWrap: {
    padding: 14,
    flex: 1,
    width: "100%",
  },
  chatBubble: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  chatLeft: {
    alignSelf: "flex-start",
    width: "78%",
    borderBottomLeftRadius: 4,
  },
  chatRight: {
    alignSelf: "flex-end",
    width: "52%",
    borderBottomRightRadius: 4,
  },
  searchWrap: {
    marginVertical: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchDate: {
    flex: 1,
  },
  dashboardWrap: {
    flex: 1,
    paddingTop: 4,
  },
  sectionTitleBone: {
    marginTop: 4,
    marginBottom: 12,
  },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb10: { marginBottom: 10 },
  mb12: { marginBottom: 12 },
});
