import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import seat from "../assets/seatIcon.png";
import { LAYOUT } from "../theme/layout";

/**
 * Driver control to change total vehicle seats after ride creation.
 */
const EditableRideSeats = ({
  availableSeats = 0,
  bookedSeats = 0,
  canEdit,
  saving,
  onSave,
}) => {
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
      if (next > 20) return 20;
      return next;
    });
  };

  const handleSave = () => {
    if (total === totalCapacity) return;
    onSave?.(total);
  };

  return (
    <View style={[styles.card, { backgroundColor: "#FFF7ED" }]}>
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
              disabled={total >= 20 || saving}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.meta}>
            {bookedSeats} booked · {Math.max(0, total - bookedSeats)} available
          </Text>
          {total !== totalCapacity ? (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
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

const styles = StyleSheet.create({
  card: {
    width: "48%",
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius?.md || 12,
    minHeight: 120,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 22,
    color: "#334155",
    fontWeight: "600",
  },
  countBox: {
    alignItems: "center",
    flex: 1,
  },
  count: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  countHint: {
    fontSize: 11,
    color: "#64748B",
  },
  meta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
});
