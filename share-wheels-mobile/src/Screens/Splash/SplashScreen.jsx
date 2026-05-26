import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
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
import { AUTH_COLORS } from "../../theme/authTheme";
import { LAYOUT, scale, verticalScale } from "../../theme/layout";
import ScreenContainer from "../../Components/ui/ScreenContainer";
import SplashBackground from "../../Components/splash/SplashBackground";
import SplashRoad from "../../Components/splash/SplashRoad";
import icon from "../../assets/icon.png";
import car from "../../assets/splashcar.png";
import { INTRO_CTA_DELAY_MS } from "../../theme/splashTiming";

const { width: SCREEN_W } = Dimensions.get("window");
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const LoadingDot = ({ delay }) => {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
          withTiming(0.35, { duration: 380, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(opacity.value, [0.35, 1], [0.85, 1.15]) }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
};

const LoadingDots = () => (
  <View style={styles.dotsRow}>
    <LoadingDot delay={0} />
    <LoadingDot delay={140} />
    <LoadingDot delay={280} />
  </View>
);

/**
 * mode: "intro" — onboarding splash with CTA
 * mode: "bootstrap" — shown while checking stored auth token
 */
const SplashScreen = ({ mode = "intro" }) => {
  const navigation = useNavigation();
  const isBootstrap = mode === "bootstrap";
  const [ctaReady, setCtaReady] = useState(isBootstrap);

  const logoScale = useSharedValue(0.6);
  const logoRotate = useSharedValue(-8);
  const carX = useSharedValue(-SCREEN_W * 0.85);
  const carBob = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    if (!isBootstrap) {
      const t = setTimeout(() => setCtaReady(true), INTRO_CTA_DELAY_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isBootstrap]);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    logoRotate.value = withSpring(0, { damping: 12, stiffness: 90 });

    carX.value = withDelay(
      350,
      withSpring(0, { damping: 16, stiffness: 85, mass: 0.9 })
    );

    carBob.value = withDelay(
      1100,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [logoScale, logoRotate, carX, carBob]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const carStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: carX.value },
      { translateY: carBob.value },
    ],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const goToSignIn = () => {
    if (!isBootstrap) {
      navigation.replace("Signin");
    }
  };

  const onPressIn = () => {
    btnScale.value = withTiming(0.96, { duration: 80 });
  };
  const onPressOut = () => {
    btnScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  return (
    <ScreenContainer
      edges={["top", "bottom"]}
      backgroundColor="transparent"
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" backgroundColor={AUTH_COLORS.primaryDark} />
      <LinearGradient
        colors={["#0F172A", AUTH_COLORS.primaryDark, AUTH_COLORS.primary, "#38BDF8"]}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      >
        <SplashBackground />

        <View style={styles.content}>
          <Animated.View entering={FadeIn.duration(500)} style={logoStyle}>
            <View style={styles.logoWrap}>
              <View style={styles.logoGlow} />
              <Image source={icon} style={styles.logo} resizeMode="contain" />
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(180).duration(600).springify()}
            style={styles.appName}
          >
            Share Wheels
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(320).duration(600)}
            style={styles.tagline}
          >
            Share rides. Save money.{"\n"}Travel smarter together.
          </Animated.Text>

          <Animated.View style={[styles.carWrap, carStyle]}>
            <Image source={car} style={styles.car} resizeMode="contain" />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(700).duration(500)} style={styles.roadWrap}>
            <SplashRoad />
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(isBootstrap ? 400 : INTRO_CTA_DELAY_MS).duration(500)}
          style={styles.footer}
        >
          {isBootstrap ? (
            <View style={styles.bootBlock}>
              <LoadingDots />
              <Text style={styles.bootText}>Loading your account…</Text>
            </View>
          ) : ctaReady ? (
            <AnimatedTouchable
              style={[styles.button, btnAnimStyle]}
              activeOpacity={1}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={goToSignIn}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </AnimatedTouchable>
          ) : (
            <View style={styles.bootBlock}>
              <LoadingDots />
              <Text style={styles.bootText}>Welcome to Share Wheels…</Text>
            </View>
          )}
          <Text style={styles.footerNote}>Carpool · Courier · Community</Text>
        </Animated.View>
      </LinearGradient>
    </ScreenContainer>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gradient: { flex: 1, overflow: "hidden" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingTop: LAYOUT.spacing.lg,
  },
  logoWrap: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(22),
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  logoGlow: {
    position: "absolute",
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  logo: { width: scale(52), height: scale(52) },
  appName: {
    fontSize: LAYOUT.font.hero + 2,
    fontWeight: "800",
    color: AUTH_COLORS.white,
    letterSpacing: 0.8,
    marginBottom: scale(10),
    textAlign: "center",
  },
  tagline: {
    fontSize: LAYOUT.font.body,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: scale(22),
    maxWidth: 300,
    marginBottom: scale(8),
  },
  carWrap: {
    marginTop: scale(12),
    alignItems: "center",
  },
  car: {
    width: scale(260),
    height: verticalScale(150),
  },
  roadWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: scale(4),
  },
  footer: {
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingBottom: LAYOUT.spacing.xl,
    alignItems: "center",
  },
  button: {
    backgroundColor: AUTH_COLORS.white,
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(16),
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: AUTH_COLORS.primary,
    fontSize: LAYOUT.font.body + 1,
    fontWeight: "700",
  },
  buttonArrow: {
    color: AUTH_COLORS.primary,
    fontSize: LAYOUT.font.title,
    fontWeight: "700",
    marginTop: -2,
  },
  bootBlock: {
    alignItems: "center",
    minHeight: scale(56),
  },
  bootText: {
    color: "rgba(255,255,255,0.9)",
    marginTop: scale(14),
    fontSize: scale(15),
    fontWeight: "500",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AUTH_COLORS.white,
  },
  footerNote: {
    marginTop: scale(14),
    fontSize: scale(12),
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
