import React from "react";
import { View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { MAP_PIN_THEME } from "./mapTheme";

/**
 * Map pin for route endpoints and stopovers (distinct from participant pins).
 */
const RouteMapPin = ({ role = "stopover", small = false }) => {
  const theme = MAP_PIN_THEME[role] || MAP_PIN_THEME.stopover;
  const isParticipantPin =
    role === "participant-pickup" || role === "participant-drop";
  const size = small ? 32 : isParticipantPin ? 36 : 38;
  const iconSize = small ? 14 : isParticipantPin ? 16 : 17;

  return (
    <View style={[styles.wrap, { width: size }]} pointerEvents="none">
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.color,
          },
        ]}
      >
        <Icon name={theme.icon} size={iconSize} color="#FFFFFF" />
      </View>
      <View style={[styles.pointer, { borderTopColor: theme.color }]} />
    </View>
  );
};

export default RouteMapPin;

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
