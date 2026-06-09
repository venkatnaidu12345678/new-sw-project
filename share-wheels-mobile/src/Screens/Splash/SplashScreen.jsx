import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Dimensions,
  Pressable,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { AUTH_COLORS, AUTH_GRADIENTS } from "../../theme/authTheme";
import { LAYOUT, scale, verticalScale, moderateScale } from "../../theme/layout";
import ScreenContainer from "../../Components/ui/ScreenContainer";
import SplashBackground from "../../Components/splash/SplashBackground";
import icon from "../../assets/icon.png";
import { INTRO_CTA_DELAY_MS } from "../../theme/splashTiming";

const { width: SCREEN_W } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GRADIENT_COLORS = AUTH_GRADIENTS.screen;
const GRADIENT_LOCATIONS = AUTH_GRADIENTS.screenLocations;

const FEATURES = ["Carpool", "Courier", "Community"];

const SplashScreen = ({ mode = "intro" }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isBootstrap = mode === "bootstrap";
  const [ctaReady, setCtaReady] = useState(isBootstrap);

  const logoEnter = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const progressWidth = useSharedValue(0.15);

  useEffect(() => {
    if (!isBootstrap) {
      const t = setTimeout(() => setCtaReady(true), INTRO_CTA_DELAY_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isBootstrap]);

  useEffect(() => {
    logoEnter.value = withSpring(1, { damping: 14, stiffness: 90 });
    shimmer.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    progressWidth.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 2200, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.15, { duration: 0 })
      ),
      -1,
      false
    );
  }, [logoEnter, progressWidth, shimmer]);

  const logoClusterStyle = useAnimatedStyle(() => ({
    opacity: logoEnter.value,
    transform: [
      { scale: interpolate(logoEnter.value, [0, 1], [0.88, 1]) },
      { translateY: interpolate(logoEnter.value, [0, 1], [24, 0]) },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.35, 0.85]),
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressWidth.value }],
  }));

  const goToSignIn = () => {
    if (!isBootstrap) {
      navigation.replace("Signin");
    }
  };

  const onPressIn = () => {
    btnScale.value = withTiming(0.97, { duration: 80 });
  };
  const onPressOut = () => {
    btnScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  return (
    <ScreenContainer
      edges={[]}
      backgroundColor="transparent"
      style={styles.screen}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.gradient}
      >
        <SplashBackground />

        <View
          style={[
            styles.safeContent,
            { paddingTop: insets.top + scale(12), paddingBottom: insets.bottom + scale(16) },
          ]}
        >
          {/* Brand hero */}
          <View style={styles.hero}>
            <Animated.View style={[styles.logoCluster, logoClusterStyle]}>
              <Animated.View style={[styles.logoHalo, shimmerStyle]} />
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.12)"]}
                style={styles.logoCard}
              >
                <Image source={icon} style={styles.logoImage} resizeMode="contain" />
              </LinearGradient>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(280).duration(500)}
              style={styles.brandName}
            >
              Share Wheels
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(420).duration(500)}
              style={styles.tagline}
            >
              Share rides. Save money. Travel smarter.
            </Animated.Text>

            <Animated.View
              entering={FadeIn.delay(520).duration(400)}
              style={styles.featureRow}
            >
              {FEATURES.map((label) => (
                <View key={label} style={styles.featurePill}>
                  <Text style={styles.featureText}>{label}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Footer panel */}
          <Animated.View
            entering={FadeInUp.delay(isBootstrap ? 300 : 900).duration(450)}
            style={styles.footerPanel}
          >
            {isBootstrap ? (
              <View style={styles.bootBlock}>
                <Text style={styles.bootTitle}>Getting things ready</Text>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
                <Text style={styles.bootSub}>Loading your account…</Text>
              </View>
            ) : ctaReady ? (
              <AnimatedPressable
                onPress={goToSignIn}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[styles.ctaButton, btnAnimStyle]}
              >
                <LinearGradient
                  colors={["#FFFFFF", "#F8FAFC"]}
                  style={styles.ctaInner}
                >
                  <Text style={styles.ctaText}>Get Started</Text>
                  <View style={styles.ctaArrow}>
                    <Text style={styles.ctaArrowText}>→</Text>
                  </View>
                </LinearGradient>
              </AnimatedPressable>
            ) : (
              <View style={styles.bootBlock}>
                <Text style={styles.bootTitle}>Welcome</Text>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
                <Text style={styles.bootSub}>Preparing your experience…</Text>
              </View>
            )}

            <Text style={styles.versionNote}>Ride sharing made simple</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gradient: { flex: 1 },
  safeContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingBottom: verticalScale(8),
  },
  logoCluster: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(28),
  },
  logoHalo: {
    position: "absolute",
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  logoCard: {
    width: scale(132),
    height: scale(132),
    borderRadius: scale(36),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: {
    width: scale(80),
    height: scale(80),
  },
  brandName: {
    fontSize: Math.min(moderateScale(32), 36),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: scale(10),
  },
  tagline: {
    fontSize: LAYOUT.font.body + 1,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    lineHeight: scale(22),
    maxWidth: SCREEN_W * 0.82,
    marginBottom: scale(20),
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(8),
  },
  featurePill: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  featureText: {
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.3,
  },
  footerPanel: {
    marginHorizontal: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.lg,
    paddingBottom: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ctaButton: {
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(17),
    paddingHorizontal: scale(24),
    gap: scale(10),
  },
  ctaText: {
    color: AUTH_COLORS.primary,
    fontSize: LAYOUT.font.section,
    fontWeight: "800",
  },
  ctaArrow: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: AUTH_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaArrowText: {
    color: "#FFFFFF",
    fontSize: scale(16),
    fontWeight: "700",
    marginTop: -1,
  },
  bootBlock: {
    alignItems: "stretch",
    width: "100%",
  },
  bootTitle: {
    color: "#FFFFFF",
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: scale(12),
  },
  bootSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: LAYOUT.font.small,
    textAlign: "center",
    marginTop: scale(10),
  },
  progressTrack: {
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: "100%",
    borderRadius: scale(2),
    backgroundColor: "#FFFFFF",
    transformOrigin: "left",
  },
  versionNote: {
    marginTop: scale(14),
    fontSize: LAYOUT.font.tiny,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    letterSpacing: 0.8,
  },
});
