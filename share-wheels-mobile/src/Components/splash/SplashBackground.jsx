import React, { useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

const ORBS = [
  { size: W * 0.55, top: -H * 0.08, left: -W * 0.2, delay: 0 },
  { size: W * 0.45, top: H * 0.35, right: -W * 0.15, delay: 400 },
  { size: W * 0.35, bottom: H * 0.12, left: W * 0.05, delay: 800 },
];

const FloatingOrb = ({ orb, index }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800 + index * 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800 + index * 400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.12, 0.28]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -18 - index * 6]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.08]) },
    ],
  }));

  const pos = {
    width: orb.size,
    height: orb.size,
    borderRadius: orb.size / 2,
    position: "absolute",
    top: orb.top,
    left: orb.left,
    right: orb.right,
    bottom: orb.bottom,
  };

  return <Animated.View style={[styles.orb, pos, style]} />;
};

const SplashBackground = () => (
  <>
    {ORBS.map((orb, i) => (
      <FloatingOrb key={i} orb={orb} index={i} />
    ))}
    <Animated.View style={styles.shine} pointerEvents="none" />
  </>
);

export default SplashBackground;

const styles = StyleSheet.create({
  orb: {
    backgroundColor: "#FFFFFF",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: H * 0.45,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderBottomLeftRadius: W,
    borderBottomRightRadius: W,
  },
});
