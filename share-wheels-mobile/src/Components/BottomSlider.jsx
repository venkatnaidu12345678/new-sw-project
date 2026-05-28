import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_THEME = {
  backdropColor: "#000",
  backdropOpacity: 0.42,
  gradient: ["#FFFFFF", "#F8FAFC", "#F1F5F9"],
  borderColor: "#CBD5E1",
  handleColor: "#94A3B8",
  closeColor: "#334155",
};

const BottomSlider = ({
  visible,
  onClose,
  children,
  height = 500,
  scrollable = true,
  theme = {},
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mergedTheme = { ...DEFAULT_THEME, ...theme };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 140,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: mergedTheme.backdropOpacity,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, height, mergedTheme.backdropOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,

      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },

      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 15,
            stiffness: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropOpacity, backgroundColor: mergedTheme.backdropColor },
        ]}
      />

      <Animated.View
        style={[
          styles.slider,
          { borderTopColor: mergedTheme.borderColor },
          {
            transform: [{ translateY: Animated.add(translateY, dragY) }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={[styles.dragHandle, { backgroundColor: mergedTheme.handleColor }]} />
        </View>

        <LinearGradient
          colors={mergedTheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sliderSurface}
        >
          {scrollable ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </LinearGradient>
      </Animated.View>
    </>
  );
};

export default BottomSlider;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  slider: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: "#fff",
    borderTopWidth: 1.2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 0,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex:1000,
    elevation: 12,
  },
  sliderSurface: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  dragArea: {
    paddingVertical: 10,
    alignItems: "center",
  },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#D0D0D0",
    borderRadius: 3,
  },
});
