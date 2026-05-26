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

const OPTIONS = [
  {
    key: "CanCarryCourier",
    icon: require("../assets/courier.png"),
    iconBg: "#FFF3E8",
    activeBg: "#FFEDD5",
    a11y: "Can carry courier",
  },
  {
    key: "QuickReserve",
    icon: require("../assets/reverse.png"),
    iconBg: "#E6FFFA",
    activeBg: "#D1FAE5",
    a11y: "Quick Reserve",
  },
];

/**
 * Compact driver toggles — icon + switch only (no labels).
 */
const RideDriverSettings = ({
  rideId,
  token,
  canCarryCourier,
  quickReserve,
  onUpdated,
  disabled = false,
}) => {
  const [courier, setCourier] = useState(!!canCarryCourier);
  const [quick, setQuick] = useState(!!quickReserve);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCourier(!!canCarryCourier);
  }, [canCarryCourier]);

  useEffect(() => {
    setQuick(!!quickReserve);
  }, [quickReserve]);

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
        QuickReserve: res.QuickReserve,
      });
    } catch (e) {
      Alert.alert("Could not update", e.message);
      if (patch.CanCarryCourier !== undefined) setCourier(!!canCarryCourier);
      if (patch.QuickReserve !== undefined) setQuick(!!quickReserve);
    } finally {
      setSaving(false);
    }
  };

  const values = { CanCarryCourier: courier, QuickReserve: quick };

  return (
    <View style={styles.wrap}>
      {saving ? (
        <View style={styles.savingBadge}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : null}

      {OPTIONS.map((opt) => {
        const on = values[opt.key];
        return (
          <View key={opt.key} style={styles.option}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: on ? opt.activeBg : opt.iconBg },
                on && styles.iconBoxOn,
              ]}
            >
              <Image source={opt.icon} style={styles.icon} />
            </View>
            <Switch
              value={on}
              onValueChange={(value) => {
                if (opt.key === "CanCarryCourier") {
                  setCourier(value);
                  save({ CanCarryCourier: value });
                } else {
                  setQuick(value);
                  save({ QuickReserve: value });
                }
              }}
              disabled={disabled || saving}
              trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              thumbColor="#FFFFFF"
              accessibilityLabel={opt.a11y}
            />
          </View>
        );
      })}
    </View>
  );
};

export default RideDriverSettings;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
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
