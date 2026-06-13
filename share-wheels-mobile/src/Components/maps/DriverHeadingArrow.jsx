import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";

const DEFAULT_SIZE = 58;

/**
 * Google Maps–style navigation puck (points up; rotate via parent/Marker).
 * SVG-only — safe inside react-native-maps Marker on Android.
 */
const DriverHeadingArrow = ({ size = DEFAULT_SIZE }) => (
  <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
    <Svg width={size} height={size} viewBox="0 0 58 58">
      {/* Soft accuracy halo */}
      <Circle cx="29" cy="29" r="26" fill="#4285F4" fillOpacity={0.14} />
      <Circle cx="29" cy="29" r="20" fill="#4285F4" fillOpacity={0.1} />

      {/* Direction wedge — bright cone ahead */}
      <Path
        d="M29 6 L40 34 C40 34 36 30 29 28 C22 30 18 34 18 34 Z"
        fill="#4285F4"
        fillOpacity={0.35}
      />

      {/* White ring */}
      <Circle cx="29" cy="29" r="15.5" fill="#FFFFFF" />

      {/* Blue core */}
      <Circle cx="29" cy="29" r="12.5" fill="#1A73E8" />

      {/* Forward chevron */}
      <Path
        d="M29 14 L35.5 30 L29 26.5 L22.5 30 Z"
        fill="#FFFFFF"
      />

      {/* Subtle ground shadow */}
      <Ellipse cx="29" cy="47" rx="10" ry="2.5" fill="#0F172A" fillOpacity={0.12} />
    </Svg>
  </View>
);

export default DriverHeadingArrow;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
