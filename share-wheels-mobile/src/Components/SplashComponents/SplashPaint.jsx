import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const SIZE = Math.max(width, height) + 200;

const SplashPaint = ({ children }) => {
  const position = useRef(
    new Animated.ValueXY({
      x: width,
      y: height,
    })
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(position, {
        toValue: {
          x: width / 2 - SIZE / 2,
          y: height / 2 - SIZE / 2,
        },
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),

      Animated.delay(7650),

      Animated.spring(position, {
        toValue: {
          x: -width - SIZE / 2.8,
          y: -height + SIZE / 3.8,
        },
        velocity: 100,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Paint animation */}
      <Animated.View
        style={[
          styles.paint,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            transform: position.getTranslateTransform(),
          },
        ]}
      />

      {/* Centered overlay (icon) */}
      <View style={styles.centerContent} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paint: {
    position: 'absolute',
    backgroundColor: '#2563EB',
    zIndex: 5,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
});

export default SplashPaint;
