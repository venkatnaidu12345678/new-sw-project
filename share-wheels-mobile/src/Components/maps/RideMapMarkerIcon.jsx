import React from "react";
import { View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { ROLE_PIN_COLORS } from "./rideMapMarkers";

/** Ionicons per role — shown on Google Maps markers */
export const ROLE_MAP_ICONS = {
  driver: "car",
  passenger: "person",
  courier: "cube",
};

/**
 * Custom marker pin for react-native-maps (child of Marker).
 */
const RideMapMarkerIcon = ({ role = "passenger", isMe = false }) => {
  const normalized = (role || "passenger").toLowerCase();
  const bg = ROLE_PIN_COLORS[normalized] || ROLE_PIN_COLORS.passenger;
  const iconName = ROLE_MAP_ICONS[normalized] || "location";

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg },
          isMe && styles.bubbleMe,
        ]}
      >
        <Icon name={iconName} size={20} color="#FFFFFF" />
      </View>
      <View style={[styles.pointer, { borderTopColor: bg }]} />
    </View>
  );
};

export default RideMapMarkerIcon;

const BUBBLE = 40;

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
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 5,
  },
  bubbleMe: {
    borderWidth: 3,
    borderColor: "#FBBF24",
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
