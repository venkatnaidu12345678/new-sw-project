import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "../context/ThemeContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_RADIUS = 28;

const SPRING_OPEN = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

const SPRING_SNAP = {
  damping: 22,
  stiffness: 340,
  mass: 0.72,
};

const getDefaultTheme = (c, isDark) => ({
  backdropColor: "#000",
  backdropOpacity: isDark ? 0.55 : 0.45,
  gradient: [c.sliderPanel, c.surface, c.background],
  borderColor: c.border,
  handleColor: c.textMuted,
});

const BottomSlider = ({
  visible,
  onClose,
  children,
  dragHeader = null,
  scrollable = true,
  solid = false,
  heightRatio = 0.75,
  dismissOnBackdropPress = true,
  closeDisabled = false,
  theme = {},
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mergedTheme = { ...getDefaultTheme(colors, isDark), ...theme };
  const [mounted, setMounted] = useState(visible);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(visible);

  const sheetHeight = useMemo(
    () => SCREEN_HEIGHT * Math.min(Math.max(heightRatio, 0.38), 0.82),
    [heightRatio]
  );

  const translateY = useSharedValue(sheetHeight);
  const dragStartY = useSharedValue(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const finishClose = () => {
    setMounted(false);
  };

  const requestClose = () => {
    onCloseRef.current?.();
  };

  useEffect(() => {
    if (visible) {
      wasOpenRef.current = true;
      setMounted(true);
      translateY.value = sheetHeight;
      translateY.value = withSpring(0, SPRING_OPEN);
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      translateY.value = withTiming(
        sheetHeight,
        { duration: 240 },
        (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        }
      );
    }
  }, [visible, sheetHeight, translateY]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(6)
        .failOffsetX([-24, 24])
        .onStart(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          const next = dragStartY.value + event.translationY;
          translateY.value = Math.max(0, Math.min(next, sheetHeight));
        })
        .onEnd((event) => {
          const shouldClose =
            !closeDisabled &&
            (translateY.value > sheetHeight * 0.22 || event.velocityY > 650);

          if (shouldClose) {
            translateY.value = withTiming(
              sheetHeight,
              { duration: 220 },
              (finished) => {
                if (finished) {
                  runOnJS(requestClose)();
                }
              }
            );
          } else {
            translateY.value = withSpring(0, SPRING_SNAP);
          }
        }),
    [sheetHeight, translateY, dragStartY, closeDisabled]
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, sheetHeight],
      [mergedTheme.backdropOpacity, 0],
      Extrapolation.CLAMP
    ),
  }));

  const topDismissAnimatedStyle = useAnimatedStyle(() => ({
    height: Math.max(0, SCREEN_HEIGHT - sheetHeight + translateY.value),
  }));

  if (!mounted) return null;

  const surfaceStyle = [
    styles.sliderSurface,
    { paddingBottom: Math.max(insets.bottom, 12) },
    solid && { backgroundColor: colors.surface },
  ];

  const body = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.bodyFill}>{children}</View>
  );

  const sheetBorderColor = mergedTheme.borderColor;
  const sheetBg = solid ? colors.surface : colors.sliderPanel;

  return (
    <View style={styles.portal} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          backdropAnimatedStyle,
          { backgroundColor: mergedTheme.backdropColor },
        ]}
      />

      {dismissOnBackdropPress && !closeDisabled ? (
        <Animated.View style={[styles.topDismiss, topDismissAnimatedStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          />
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.sheetShell,
          {
            height: sheetHeight,
            shadowColor: colors.shadow,
          },
          sheetAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.sheetFrame,
            {
              backgroundColor: sheetBg,
              borderColor: sheetBorderColor,
            },
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={[styles.dragChrome, { borderBottomColor: sheetBorderColor }]}>
              <View style={styles.handleTrack}>
                <View
                  style={[
                    styles.dragHandle,
                    { backgroundColor: mergedTheme.handleColor },
                  ]}
                />
              </View>
              {!dragHeader ? (
                <Text style={[styles.dragHint, { color: colors.textMuted }]}>
                  Drag down to close
                </Text>
              ) : null}
              {dragHeader}
            </View>
          </GestureDetector>

          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          >
            {solid ? (
              <View style={surfaceStyle}>{body}</View>
            ) : (
              <LinearGradient
                colors={mergedTheme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={surfaceStyle}
              >
                {body}
              </LinearGradient>
            )}
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </View>
  );
};

export default BottomSlider;

const styles = StyleSheet.create({
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  topDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  sheetShell: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1002,
    paddingHorizontal: 10,
    paddingBottom: 0,
  },
  sheetFrame: {
    flex: 1,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
    elevation: 28,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
  },
  dragChrome: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
  },
  handleTrack: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 100,
  },
  dragHint: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  keyboardAvoid: {
    flex: 1,
  },
  sliderSurface: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyFill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
});
