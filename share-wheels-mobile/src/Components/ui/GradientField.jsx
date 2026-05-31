import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { LAYOUT } from "../../theme/layout";
import { useTheme } from "../../context/ThemeContext";

const getVariants = (c, isDark) => ({
  from: {
    border: isDark
      ? [c.primary, "#6366F1", "#8B5CF6"]
      : ["#3B82F6", "#6366F1", "#8B5CF6"],
    inner: isDark
      ? [c.surface, c.inputBg]
      : ["#FFFFFF", "#F8FAFF"],
  },
  to: {
    border: isDark
      ? [c.successText, "#14B8A6", "#06B6D4"]
      : ["#22C55E", "#14B8A6", "#06B6D4"],
    inner: isDark
      ? [c.surface, c.tintGreen]
      : ["#FFFFFF", "#F0FDF4"],
  },
  date: {
    border: isDark
      ? [c.warningText, "#F97316", c.errorText]
      : ["#F59E0B", "#F97316", "#EF4444"],
    inner: isDark
      ? [c.surface, c.tintOrange]
      : ["#FFFFFF", "#FFFBEB"],
  },
});

/**
 * Input shell with gradient border (dashboard search fields).
 */
const GradientField = ({ children, variant = "from", style }) => {
  const { colors, isDark } = useTheme();
  const variants = useMemo(() => getVariants(colors, isDark), [colors, isDark]);
  const fieldColors = variants[variant] || variants.from;

  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={fieldColors.border}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <LinearGradient
          colors={fieldColors.inner}
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
