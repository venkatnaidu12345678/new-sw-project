import React, { useEffect, useRef, createContext, useContext } from "react";
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

const { width: SCREEN_W } = Dimensions.get("window");

const GLASS_SHIMMER = [
  "transparent",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.7)",
  "rgba(255,255,255,0.3)",
  "transparent",
];

const ShimmerContext = createContext(null);

const ShimmerProvider = ({ children }) => {
  const progress = useRef(new Animated.Value(0)).current;

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
    <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>
  );
};

/** Frosted-glass placeholder bar */
const GlassBone = ({ width = "100%", height = 12, borderRadius = 6, style }) => {
  const progress = useContext(ShimmerContext);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_W * 0.35, SCREEN_W * 0.85],
  });

  return (
    <View
      style={[styles.glassBone, { width, height, borderRadius }, style]}
    >
      <View
        style={[styles.glassBoneBase, { borderRadius }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.08)"]}
        style={[styles.glassBoneTint, { borderRadius }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.shimmerLayer, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={GLASS_SHIMMER}
          locations={[0, 0.35, 0.5, 0.65, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
      <LinearGradient
        colors={["rgba(255,255,255,0.65)", "transparent"]}
        style={[styles.glassBoneSpecular, { borderRadius }]}
        pointerEvents="none"
      />
    </View>
  );
};

/** Glass card shell — frosted panel with light border */
const GlassCard = ({ children, style, innerStyle }) => (
  <View style={[styles.glassCardWrap, style]}>
    <LinearGradient
      colors={[
        "rgba(255,255,255,0.92)",
        "rgba(255,255,255,0.28)",
        "rgba(255,255,255,0.12)",
        "rgba(255,255,255,0.5)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.glassCardBorder}
    >
      <View style={[styles.glassCardInner, innerStyle]}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.65)",
            "rgba(255,255,255,0.22)",
            "rgba(255,255,255,0.38)",
          ]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.75)", "transparent"]}
          style={styles.glassCardSpecular}
          pointerEvents="none"
        />
        <View style={styles.glassCardContent}>{children}</View>
      </View>
    </LinearGradient>
  </View>
);

const GlassRouteBlock = ({ children }) => (
  <View style={styles.glassRouteBlock}>
    <LinearGradient
      colors={["rgba(255,255,255,0.5)", "rgba(248,250,252,0.25)"]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    {children}
  </View>
);

/* ─── All rides list card ─── */
const AllRideCardSkeleton = () => (
  <GlassCard style={styles.rideCardGlass}>
    <GlassRouteBlock>
      <View style={styles.routeLine}>
        <GlassBone width={14} height={14} borderRadius={7} />
        <GlassBone width="72%" height={13} style={styles.routeBone} />
      </View>
      <View style={styles.routeDivider} />
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

/* ─── Dashboard upcoming ride ─── */
const UpcomingRideSkeleton = () => (
  <GlassCard style={styles.upcomingGlass}>
    <View style={styles.upcomingRow}>
      <View style={styles.upcomingLeft}>
        <GlassBone width="92%" height={15} borderRadius={6} style={styles.mb6} />
        <GlassBone width="78%" height={12} borderRadius={4} />
      </View>
      <View style={styles.upcomingRight}>
        <GlassBone width={36} height={36} borderRadius={10} />
        <GlassBone width={56} height={14} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
    </View>
  </GlassCard>
);

/* ─── My Request card ─── */
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
    <GlassBone
      width={48}
      height={16}
      borderRadius={4}
      style={{ marginTop: 10, alignSelf: "flex-end" }}
    />
  </GlassCard>
);

/* ─── Ride history row ─── */
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

/* ─── Chat bubbles ─── */
const ChatListSkeleton = () => (
  <ShimmerProvider>
    <View style={styles.chatWrap}>
      <View style={[styles.chatBubble, styles.chatLeft]}>
        <GlassBone width="100%" height={14} borderRadius={4} style={styles.mb6} />
        <GlassBone width="70%" height={14} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatRight]}>
        <GlassBone width="85%" height={12} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatLeft, { minHeight: 56 }]}>
        <GlassBone width="100%" height={12} borderRadius={4} style={styles.mb6} />
        <GlassBone width="90%" height={12} borderRadius={4} style={styles.mb6} />
        <GlassBone width="50%" height={12} borderRadius={4} />
      </View>
      <View style={[styles.chatBubble, styles.chatRight]}>
        <GlassBone width="75%" height={12} borderRadius={4} />
      </View>
    </View>
  </ShimmerProvider>
);

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
      <GlassBone height={52} borderRadius={14} style={styles.mb10} />
      <GlassBone height={52} borderRadius={14} style={styles.mb10} />
      <GlassBone height={44} width="58%" borderRadius={14} />
    </View>
  </ShimmerProvider>
);

export const AdPlacementSkeleton = ({ variant = "banner" }) => (
  <ShimmerProvider>
    <GlassBone
      height={variant === "video" ? 188 : 88}
      borderRadius={14}
      style={{ marginVertical: 8 }}
    />
  </ShimmerProvider>
);

/** Full dashboard loading state */
export const DashboardSkeleton = () => (
  <ShimmerProvider>
    <View style={styles.dashboardWrap}>
      <View style={styles.dashboardNav}>
        <GlassBone width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <GlassBone width="55%" height={14} borderRadius={6} style={styles.mb6} />
          <GlassBone width="35%" height={12} borderRadius={4} />
        </View>
        <GlassBone width={40} height={40} borderRadius={12} />
      </View>
      <GlassBone width="75%" height={22} borderRadius={8} style={styles.mb10} />
      <AdPlacementSkeleton variant="banner" />
      <SearchBarSkeleton />
      <AdPlacementSkeleton variant="video" />
      <GlassBone width={120} height={18} borderRadius={6} style={{ marginVertical: 12 }} />
      <AdPlacementSkeleton variant="banner" />
      <RideListSkeleton count={2} variant="upcoming" />
    </View>
  </ShimmerProvider>
);

export { ChatListSkeleton };
export default GlassBone;

const styles = StyleSheet.create({
  glassBone: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  glassBoneBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(226, 232, 240, 0.45)",
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
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
    }),
  },
  glassCardBorder: {
    borderRadius: 18,
    padding: 1.5,
  },
  glassCardInner: {
    borderRadius: 16.5,
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
    padding: 16,
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
    borderColor: "rgba(226, 232, 240, 0.8)",
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
    backgroundColor: "rgba(255, 255, 255, 0.5)",
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
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  upcomingLeft: {
    flex: 1,
    marginRight: 12,
  },
  upcomingRight: {
    alignItems: "center",
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
    borderColor: "rgba(255, 255, 255, 0.7)",
    backgroundColor: "transparent",
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
    padding: 8,
  },
  dashboardWrap: {
    flex: 1,
    paddingTop: 4,
  },
  dashboardNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },

  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb10: { marginBottom: 10 },
});
