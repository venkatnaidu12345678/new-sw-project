import React, { useMemo } from "react";
import { StyleSheet, UIManager, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

let BlurViewComponent = null;
try {
  BlurViewComponent = require("@react-native-community/blur").BlurView;
} catch {
  BlurViewComponent = null;
}

export const isNativeBlurAvailable = () => {
  if (!BlurViewComponent) return false;
  try {
    return !!(
      UIManager.getViewManagerConfig?.("BlurView") ||
      UIManager.getViewManagerConfig?.("AndroidBlurView")
    );
  } catch {
    return false;
  }
};

/**
 * Frosted sticky header background — native blur when linked, layered fallback otherwise.
 */
const StickyGlassBackground = ({
  blurConfig,
  gradientColors,
  glassTintStyle,
  glassSheenStyle,
  glassEdgeBottomStyle,
  glassFallbackStyle,
  fillStyle,
}) => {
  const nativeBlur = useMemo(() => isNativeBlurAvailable(), []);

  return (
    <>
      {nativeBlur ? (
        <BlurViewComponent
          style={fillStyle}
          blurType={blurConfig.blurType}
          blurAmount={blurConfig.blurAmount}
          reducedTransparencyFallbackColor={blurConfig.fallback}
          overlayColor={blurConfig.overlayColor}
        />
      ) : (
        <>
          <View style={[fillStyle, glassFallbackStyle]} />
        </>
      )}
      <View style={[fillStyle, glassTintStyle]} />
      {!nativeBlur ? (
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={fillStyle}
        />
      ) : (
        <>
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={fillStyle}
          />
          <View style={glassSheenStyle} />
        </>
      )}
      <View style={glassEdgeBottomStyle} />
    </>
  );
};

export default React.memo(StickyGlassBackground);
