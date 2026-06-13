import React from "react";
import { View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { MAP_PIN_THEME, ROLE_PIN_COLORS, ROLE_MAP_ICONS } from "./mapTheme";

export { ROLE_MAP_ICONS };

/**
 * Custom marker pin for react-native-maps (child of Marker).
 */
const RideMapMarkerIcon = ({ role = "passenger", isMe = false }) => {
  const normalized = (role || "passenger").toLowerCase();
  const theme = MAP_PIN_THEME[normalized] || MAP_PIN_THEME.passenger;
  const bg = ROLE_PIN_COLORS[normalized] || theme.color;
  const iconName = ROLE_MAP_ICONS[normalized] || theme.icon;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg, borderColor: isMe ? "#FBBF24" : "#FFFFFF" },
          isMe && styles.bubbleMe,
        ]}
      >
        <Icon name={iconName} size={20} color="#FFFFFF" />
      </View>
      <View style={[styles.pointer, { borderTopColor: bg }]} />
      {isMe ? <View style={styles.meRing} /> : null}
    </View>
  );
};

export default RideMapMarkerIcon;

const BUBBLE = 42;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: BUBBLE,
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  bubbleMe: {
    borderWidth: 3,
  },
  meRing: {
    position: "absolute",
    top: -3,
    width: BUBBLE + 6,
    height: BUBBLE + 6,
    borderRadius: (BUBBLE + 6) / 2,
    borderWidth: 2,
    borderColor: "#FBBF24",
    opacity: 0.85,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
