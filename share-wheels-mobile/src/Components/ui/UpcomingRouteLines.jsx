import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const RouteArrowRow = ({
  from,
  to,
  styles,
  colors,
  variant = "ride",
  accent,
}) => {
  const isBooked = variant === "booked";

  return (
    <View style={[styles.routeRow, isBooked && styles.bookedRouteRow]}>
      <View style={styles.routeTimeline}>
        <View
          style={[
            styles.routeDotFrom,
            isBooked && styles.bookedDotFrom,
            isBooked && accent?.dotFrom ? { backgroundColor: accent.dotFrom } : null,
          ]}
        />
        <View
          style={[
            styles.routeLine,
            isBooked && styles.bookedRouteLine,
            isBooked && accent?.line ? { backgroundColor: accent.line } : null,
          ]}
        />
        <View
          style={[
            styles.routeDotTo,
            isBooked && styles.bookedDotTo,
            isBooked && accent?.dotTo ? { backgroundColor: accent.dotTo } : null,
          ]}
        />
      </View>
      <View style={styles.routeText}>
        <Text
          style={[styles.routeCity, isBooked && styles.bookedRouteCity]}
          numberOfLines={1}
        >
          {from}
        </Text>
        <Icon
          name="arrow-forward"
          size={isBooked ? 14 : 11}
          color={isBooked ? accent?.arrow || colors.successText : colors.textMuted}
          style={styles.routeArrow}
        />
        <Text
          style={[styles.routeCity, isBooked && styles.bookedRouteCity]}
          numberOfLines={1}
        >
          {to}
        </Text>
      </View>
    </View>
  );
};

const UpcomingRouteLines = ({ rideRoute, bookedRoute, role = "passenger" }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const accent = useMemo(() => {
    if (role === "courier") {
      return {
        bg: colors.tintOrange,
        border: colors.warningBorder,
        label: colors.warningText,
        labelIcon: "cube",
        dotFrom: "#F59E0B",
        dotTo: "#EA580C",
        line: colors.warningBorder,
        arrow: colors.warningText,
      };
    }
    return {
      bg: colors.successBg,
      border: colors.successText,
      label: colors.successText,
      labelIcon: "ticket-outline",
      dotFrom: "#22C55E",
      dotTo: "#16A34A",
      line: "#86EFAC",
      arrow: colors.successText,
    };
  }, [role, colors]);

  const bookedLabel =
    bookedRoute?.label || (role === "courier" ? "Your delivery" : "Your booking");

  return (
    <View style={styles.wrap}>
      <View style={[styles.routeBlock, bookedRoute && styles.rideBlockMuted]}>
        {bookedRoute ? (
          <Text style={styles.routeLabel}>{rideRoute.label || "Ride"}</Text>
        ) : null}
        <RouteArrowRow
          from={rideRoute.from}
          to={rideRoute.to}
          styles={styles}
          colors={colors}
          variant="ride"
        />
      </View>

      {bookedRoute ? (
        <View
          style={[
            styles.bookedHighlight,
            {
              backgroundColor: accent.bg,
              borderColor: accent.border,
            },
          ]}
        >
          <View style={[styles.bookedAccentBar, { backgroundColor: accent.label }]} />
          <View style={styles.bookedInner}>
            <View style={styles.bookedLabelRow}>
              <View
                style={[
                  styles.bookedLabelPill,
                  { backgroundColor: colors.surface, borderColor: accent.border },
                ]}
              >
                <Icon name={accent.labelIcon} size={11} color={accent.label} />
                <Text style={[styles.bookedLabel, { color: accent.label }]}>
                  {bookedLabel}
                </Text>
              </View>
            </View>
            <RouteArrowRow
              from={bookedRoute.from}
              to={bookedRoute.to}
              styles={styles}
              colors={colors}
              variant="booked"
              accent={accent}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default UpcomingRouteLines;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      gap: 8,
      marginBottom: 4,
    },
    routeBlock: {
      gap: 3,
    },
    rideBlockMuted: {
      opacity: 0.72,
    },
    routeLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 1,
    },
    bookedHighlight: {
      borderRadius: 14,
      borderWidth: 1.5,
      overflow: "hidden",
    },
    bookedAccentBar: {
      height: 3,
      width: "100%",
    },
    bookedInner: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 11,
      gap: 6,
    },
    bookedLabelRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    bookedLabelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    bookedLabel: {
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    bookedRouteRow: {
      gap: 10,
    },
    routeTimeline: {
      width: 10,
      alignItems: "center",
      paddingVertical: 2,
    },
    routeDotFrom: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.textMuted,
      opacity: 0.45,
    },
    routeLine: {
      width: 2,
      height: 12,
      backgroundColor: c.border,
      marginVertical: 2,
      opacity: 0.7,
    },
    routeDotTo: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.textMuted,
      opacity: 0.45,
    },
    bookedDotFrom: {
      width: 9,
      height: 9,
      borderRadius: 5,
      opacity: 1,
    },
    bookedRouteLine: {
      height: 16,
      opacity: 1,
    },
    bookedDotTo: {
      width: 9,
      height: 9,
      borderRadius: 5,
      opacity: 1,
    },
    routeText: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
      gap: 4,
    },
    routeCity: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
    },
    bookedRouteCity: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
    },
    routeArrow: {
      marginHorizontal: 2,
    },
  });
