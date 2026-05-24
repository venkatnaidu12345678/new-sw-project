import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const BottomSlider = ({ visible, onClose, children,height=500 }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
          toValue: 0.4,
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
  }, [visible,height]);

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
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />

      <Animated.View
        style={[
          styles.slider,
          {
            transform: [{ translateY: Animated.add(translateY, dragY) }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex:1000,
    elevation: 12,
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
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 10,
    zIndex: 10,
  },
  closeText: {
    fontSize: 22,
    fontWeight: "700",
  },
});
