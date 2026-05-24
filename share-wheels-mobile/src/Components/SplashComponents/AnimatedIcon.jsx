import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const ICON_SIZE = 140;
const PADDING = 20;

const AnimatedIcon = ({ source }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.1)).current;
  const rotateAnim = useRef(new Animated.Value(30)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Initial delay
      Animated.delay(1000),

      // Appear + scale + rotate to center
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -20,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // Hold
      Animated.delay(700),

      // Rotate back
      Animated.timing(rotateAnim, {
        toValue: 20,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.delay(5000),
      // Move to top-left + rotate again
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -width / 2 + ICON_SIZE / 1.7 + PADDING,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -height / 2.2 + ICON_SIZE / 1.5 + PADDING,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 30],
    outputRange: ['30deg', '200deg'],
  });



  return (
    <Animated.View
    pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate },
          ],
        },
      ]}
    >
      <Image source={source} style={styles.icon} resizeMode="contain" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});

export default AnimatedIcon;
