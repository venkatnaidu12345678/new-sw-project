import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { MOTION } from "../../theme/motion";

/**
 * Pill-style tabs with sliding indicator + label fade/scale.
 */
const AnimatedTabs = ({
  tabs,
  activeIndex,
  onChange,
  style,
  variant = "pill",
}) => {
  const slide = useRef(new Animated.Value(activeIndex)).current;
  const [tabWidth, setTabWidth] = React.useState(0);
  const labelAnims = useRef(tabs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: activeIndex,
      ...MOTION.springSnappy,
    }).start();

    tabs.forEach((_, i) => {
      Animated.timing(labelAnims[i], {
        toValue: i === activeIndex ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex, slide, tabs, labelAnims]);

  const isPill = variant === "pill";

  return (
    <View
      style={[isPill ? styles.pillWrap : styles.chipWrap, style]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width / tabs.length;
        if (w > 0) setTabWidth(w);
      }}
    >
      {tabWidth > 0 && isPill && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: tabWidth - 6,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: tabs.map((_, i) => i),
                    outputRange: tabs.map((_, i) => i * tabWidth + 3),
                  }),
                },
              ],
            },
          ]}
        />
      )}

      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const labelScale = labelAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        });
        const labelOpacity = labelAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1],
        });

        return (
          <TouchableOpacity
            key={typeof tab === "string" ? tab : tab.key}
            style={[
              isPill ? styles.pillTab : styles.chipTab,
              !isPill && isActive && styles.chipTabActive,
            ]}
            onPress={() => onChange(index, tab)}
            activeOpacity={0.75}
          >
            <Animated.Text
              style={[
                isPill ? styles.pillLabel : styles.chipLabel,
                isActive && (isPill ? styles.pillLabelActive : styles.chipLabelActive),
                { opacity: labelOpacity, transform: [{ scale: labelScale }] },
              ]}
            >
              {typeof tab === "string" ? tab : tab.label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default AnimatedTabs;

const styles = StyleSheet.create({
  pillWrap: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  pillTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    zIndex: 1,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  pillLabelActive: {
    color: "#0F172A",
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  chipTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
    marginRight: 8,
    marginBottom: 8,
  },
  chipTabActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  chipLabelActive: {
    color: "#1D4ED8",
  },
});
