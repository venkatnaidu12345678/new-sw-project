import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/Ionicons";
import {
  formatLocalISODate,
  parseLocalDate,
  formatDisplayDate,
} from "../Utils/dateUtils";

const CalenderRange = ({
  rideData,
  updateRideData,
  startKey = "dateStart",
  endKey = "dateEnd",
  startLabel = "From date",
  endLabel = "To date",
  accent,
}) => {
  const cardStyle = accent
    ? { backgroundColor: accent.bg, borderColor: accent.border }
    : null;
  const inputStyle = accent
    ? { backgroundColor: accent.surface || "#FFFFFF", borderColor: accent.border }
    : null;
  const iconColor = accent?.icon || "#059669";
  const labelColor = accent?.label || "#334155";
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const selectedStart = rideData?.[startKey] || "";
  const selectedEnd = rideData?.[endKey] || "";

  const currentStartDate = parseLocalDate(selectedStart) || today;
  const currentEndDate = parseLocalDate(selectedEnd) || currentStartDate;

  const openStart = () => {
    setShowEnd(false);
    setShowStart(true);
  };

  const openEnd = () => {
    setShowStart(false);
    setShowEnd(true);
  };

  const onStartChange = (event, date) => {
    setShowStart(false);
    if (event?.type === "set" && date) {
      const iso = formatLocalISODate(date);
      updateRideData(startKey, iso);

      const startD = parseLocalDate(iso);
      const endD = parseLocalDate(selectedEnd);
      if (startD && endD && endD < startD) {
        updateRideData(endKey, "");
      }
    }
  };

  const onEndChange = (event, date) => {
    setShowEnd(false);
    if (event?.type === "set" && date) {
      updateRideData(endKey, formatLocalISODate(date));
    }
  };

  const startText = selectedStart
    ? formatDisplayDate(selectedStart)
    : "Select start";
  const endText = selectedEnd ? formatDisplayDate(selectedEnd) : "Select end";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.inputCard, cardStyle]}>
          <View style={styles.labelRow}>
            <Icon name="calendar-outline" size={16} color={iconColor} />
            <Text style={[styles.label, { color: labelColor }]}>{startLabel}</Text>
          </View>

          <TouchableOpacity
            style={[styles.input, inputStyle]}
            onPress={openStart}
            activeOpacity={0.85}
          >
            <Text style={styles.value} numberOfLines={2}>{startText}</Text>
            <Icon name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {showStart ? (
            <DateTimePicker
              value={currentStartDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              minimumDate={today}
              onChange={onStartChange}
            />
          ) : null}
        </View>

        <View style={[styles.inputCard, cardStyle]}>
          <View style={styles.labelRow}>
            <Icon name="calendar-outline" size={16} color={iconColor} />
            <Text style={[styles.label, { color: labelColor }]}>{endLabel}</Text>
          </View>

          <TouchableOpacity
            style={[styles.input, inputStyle]}
            onPress={openEnd}
            activeOpacity={0.85}
          >
            <Text style={styles.value} numberOfLines={2}>{endText}</Text>
            <Icon name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {showEnd ? (
            <DateTimePicker
              value={currentEndDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              minimumDate={currentStartDate}
              onChange={onEndChange}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default CalenderRange;

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "column",
    gap: 12,
  },
  inputCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: "700", flex: 1 },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
});

