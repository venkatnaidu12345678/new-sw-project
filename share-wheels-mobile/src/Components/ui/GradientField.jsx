import React from "react";
import { View, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { LAYOUT } from "../../theme/layout";

const VARIANTS = {
  from: {
    border: ["#3B82F6", "#6366F1", "#8B5CF6"],
    inner: ["#FFFFFF", "#F8FAFF"],
  },
  to: {
    border: ["#22C55E", "#14B8A6", "#06B6D4"],
    inner: ["#FFFFFF", "#F0FDF4"],
  },
  date: {
    border: ["#F59E0B", "#F97316", "#EF4444"],
    inner: ["#FFFFFF", "#FFFBEB"],
  },
};

/**
 * Input shell with gradient border (dashboard search fields).
 */
const GradientField = ({ children, variant = "from", style }) => {
  const colors = VARIANTS[variant] || VARIANTS.from;

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={colors.border}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <LinearGradient
          colors={colors.inner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.inner}
        >
          <View style={styles.row}>{children}</View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
};

export default GradientField;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: LAYOUT.spacing.sm,
  },
  border: {
    borderRadius: LAYOUT.radius.md + 2,
    padding: 2,
  },
  inner: {
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm + 2,
    minHeight: 52,
    gap: 10,
  },
});
