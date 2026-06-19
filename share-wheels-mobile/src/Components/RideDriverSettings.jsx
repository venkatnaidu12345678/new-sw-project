import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { updateRideOptions } from "../ApiService/ridesApiServices";

/**
 * Compact driver toggle — courier friendly only.
 */
const RideDriverSettings = ({
  rideId,
  token,
  canCarryCourier,
  onUpdated,
  disabled = false,
}) => {
  const [courier, setCourier] = useState(!!canCarryCourier);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCourier(!!canCarryCourier);
  }, [canCarryCourier]);

  const save = async (patch) => {
    if (!token || !rideId || disabled) return;
    try {
      setSaving(true);
      const res = await updateRideOptions(token, {
        rideId,
        ...patch,
      });
      onUpdated?.({
        CanCarryCourier: res.CanCarryCourier,
      });
    } catch (e) {
      Alert.alert("Could not update", e.message);
      if (patch.CanCarryCourier !== undefined) setCourier(!!canCarryCourier);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {saving ? (
        <View style={styles.savingBadge}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : null}

      <View style={styles.option}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: courier ? "#FFEDD5" : "#FFF3E8" },
            courier && styles.iconBoxOn,
          ]}
        >
          <Image source={require("../assets/courier.png")} style={styles.icon} />
        </View>
        <Switch
          value={courier}
          onValueChange={(value) => {
            setCourier(value);
            save({ CanCarryCourier: value });
          }}
          disabled={disabled || saving}
          trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Can carry courier"
        />
      </View>
    </View>
  );
};

export default RideDriverSettings;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88,
    position: "relative",
  },
  savingBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconBoxOn: {
    borderColor: "#93C5FD",
  },
  icon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
});
