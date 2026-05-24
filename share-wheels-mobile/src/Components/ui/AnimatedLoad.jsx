import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * Shows skeleton while loading, then fades + slides content in smoothly.
 */
const AnimatedLoad = ({ loading, skeleton, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (loading) {
      opacity.setValue(0);
      translateY.setValue(16);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 10,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loading, opacity, translateY]);

  if (loading) {
    return skeleton ?? null;
  }

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedLoad;
