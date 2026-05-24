import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";

const AnimatedTabIcon = ({ focused, children }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.92,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        focused && styles.wrapActive,
        { transform: [{ scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedTabIcon;

const styles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wrapActive: {
    backgroundColor: "#EEF2FF",
  },
});
