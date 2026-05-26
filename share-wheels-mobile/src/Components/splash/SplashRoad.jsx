import React, { useEffect } from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: W } = Dimensions.get("window");
const AnimatedView = Animated.createAnimatedComponent(View);

const SplashRoad = () => {
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    dashOffset.value = withRepeat(
      withTiming(48, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );
  }, [dashOffset]);

  const laneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(dashOffset.value % 48) }],
  }));

  const dashes = Array.from({ length: 16 }, (_, i) => (
    <Line
      key={i}
      x1={i * 48 + 8}
      y1={28}
      x2={i * 48 + 36}
      y2={28}
      stroke="rgba(255,255,255,0.5)"
      strokeWidth={4}
      strokeLinecap="round"
    />
  ));

  return (
    <AnimatedView style={[styles.wrap, laneStyle]}>
      <Svg width={W * 1.5} height={56} viewBox={`0 0 ${W * 1.5} 56`}>
        <Path
          d={`M0 46 Q ${W * 0.4} 10 ${W * 0.75} 46 T ${W * 1.5} 46`}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={3}
        />
        {dashes}
      </Svg>
    </AnimatedView>
  );
};

export default SplashRoad;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 56,
    marginTop: 8,
    overflow: "hidden",
    alignItems: "center",
  },
});
