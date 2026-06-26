import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import seat from "../assets/seatIcon.png";
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

import { getMaxSeatsForVehicleType, validateSeats } from "../Utils";
import { normalizeVehicleType } from "../hooks/useLookupOptions";

/**
 * Driver control to change total vehicle seats after ride creation.
 */
const EditableRideSeats = ({
  availableSeats = 0,
  bookedSeats = 0,
  canEdit,
  saving,
  onSave,
  maxSeats = 20,
  vehicleType,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const seatCap =
    vehicleType != null && String(vehicleType).trim() !== ""
      ? getMaxSeatsForVehicleType(vehicleType)
      : maxSeats;
  const isBike = normalizeVehicleType(vehicleType) === "bike";
  const totalCapacity = Math.max(
    1,
    (Number(availableSeats) || 0) + (Number(bookedSeats) || 0)
  );
  const [total, setTotal] = useState(totalCapacity);

  useEffect(() => {
    setTotal(totalCapacity);
  }, [totalCapacity]);

  const minTotal = Math.max(1, bookedSeats);

  const change = (delta) => {
    setTotal((prev) => {
      const next = prev + delta;
      if (next < minTotal) return minTotal;
      if (next > seatCap) return seatCap;
      return next;
    });
  };

  const handleSave = () => {
    if (total === totalCapacity) return;
    const seatsErr = validateSeats(String(total), vehicleType);
    if (seatsErr) {
      Alert.alert("Invalid seats", seatsErr);
      return;
    }
    onSave?.(total);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.tintOrange }]}>
      <Text style={styles.label}>
        <Image source={seat} style={styles.icon} /> Vehicle seats
      </Text>

      {canEdit ? (
        <>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => change(-1)}
              disabled={total <= minTotal || saving}
            >
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <View style={styles.countBox}>
              <Text style={styles.count}>{total}</Text>
              <Text style={styles.countHint}>total seats</Text>
            </View>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => change(1)}
              disabled={total >= seatCap || saving}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.meta}>
            {bookedSeats} booked · {Math.max(0, total - bookedSeats)} available
          </Text>
          {isBike ? (
            <Text style={styles.bikeHint}>Bikes can offer 1 seat only</Text>
          ) : null}
          {total !== totalCapacity ? (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.inverseText} size="small" />
              ) : (
                <Text style={styles.saveText}>Save seats</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <Text style={styles.value}>
          {totalCapacity} total ({availableSeats} available)
        </Text>
      )}
    </View>
  );
};

export default EditableRideSeats;

const createStyles = (c) =>
  StyleSheet.create({
    card: {
      width: "48%",
      padding: LAYOUT.spacing.md,
      borderRadius: LAYOUT.radius?.md || 12,
      minHeight: 120,
    },
    label: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 8,
    },
    icon: {
      width: 14,
      height: 14,
      resizeMode: "contain",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepText: {
      fontSize: 22,
      color: c.text,
      fontWeight: "600",
    },
    countBox: {
      alignItems: "center",
      flex: 1,
    },
    count: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
    },
    countHint: {
      fontSize: 11,
      color: c.textMuted,
    },
    meta: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 8,
      textAlign: "center",
    },
    bikeHint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 15,
    },
    saveBtn: {
      marginTop: 10,
      backgroundColor: c.primary,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveText: {
      color: c.inverseText,
      fontWeight: "700",
      fontSize: 13,
    },
    value: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
    },
  });
