import { Easing } from "react-native";

export const MOTION = {
  spring: {
    friction: 9,
    tension: 68,
    useNativeDriver: true,
  },
  springSnappy: {
    friction: 8,
    tension: 120,
    useNativeDriver: true,
  },
  fadeIn: {
    duration: 380,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  fadeOut: {
    duration: 180,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  },
  slideUp: {
    duration: 400,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
};
