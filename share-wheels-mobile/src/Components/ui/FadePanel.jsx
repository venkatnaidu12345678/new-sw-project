import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { MOTION } from "../../theme/motion";

/** Cross-fades children when `activeKey` changes (e.g. tab panels). */
const FadePanel = ({ activeKey, children, style }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevKey = useRef(activeKey);

  useEffect(() => {
    if (prevKey.current === activeKey) return;
    prevKey.current = activeKey;

    opacity.setValue(0);
    translateY.setValue(10);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, ...MOTION.fadeIn }),
      Animated.timing(translateY, {
        toValue: 0,
        ...MOTION.slideUp,
      }),
    ]).start();
  }, [activeKey, opacity, translateY]);

  return (
    <Animated.View
      style={[style, { flex: 1, opacity, transform: [{ translateY }] }]}
    >
      {children}
    </Animated.View>
  );
};

export default FadePanel;
