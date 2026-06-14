import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import {
  buildCorridorLabels,
  corridorHasSegments,
  isValidCorridorSegment,
} from "../../Utils/rideCorridorUtils";

const RideCorridorSegmentPicker = ({ ride, value, onChange, disabled = false }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const corridor = useMemo(() => buildCorridorLabels(ride), [ride]);
  const showPicker = corridorHasSegments(ride);

  const [pickup, setPickup] = useState(value?.from || corridor[0] || "");
  const [drop, setDrop] = useState(value?.to || corridor[corridor.length - 1] || "");

  useEffect(() => {
    if (!showPicker) return;
    const nextFrom = value?.from || corridor[0] || "";
    const nextTo = value?.to || corridor[corridor.length - 1] || "";
    setPickup(nextFrom);
    setDrop(nextTo);
  }, [value?.from, value?.to, corridor, showPicker]);

  const pickupOptions = useMemo(() => {
    const dropIdx = corridor.findIndex((label) => label === drop);
    const maxIdx = dropIdx === -1 ? corridor.length - 1 : dropIdx - 1;
    return corridor.filter((_, index) => index <= maxIdx);
  }, [corridor, drop]);

  const dropOptions = useMemo(() => {
    const fromIdx = corridor.findIndex((label) => label === pickup);
    const minIdx = fromIdx === -1 ? 0 : fromIdx + 1;
    return corridor.filter((_, index) => index >= minIdx);
  }, [corridor, pickup]);

  const applySegment = (from, to) => {
    if (!isValidCorridorSegment(ride, from, to)) return;
    onChange?.({ from, to });
  };

  const selectPickup = (label) => {
    if (disabled) return;
    setPickup(label);
    let nextDrop = drop;
    const fromIdx = corridor.indexOf(label);
    const dropIdx = corridor.indexOf(drop);
    if (dropIdx <= fromIdx) {
      nextDrop = corridor[fromIdx + 1] || label;
      setDrop(nextDrop);
    }
    applySegment(label, nextDrop);
  };

  const selectDrop = (label) => {
    if (disabled) return;
    setDrop(label);
    applySegment(pickup, label);
  };

  if (!showPicker) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Your route segment</Text>
      <Text style={styles.hint}>Board at and get off along the driver's route.</Text>

      <Text style={styles.sectionLabel}>Board at</Text>
      <View style={styles.chipRow}>
        {pickupOptions.map((label) => {
          const active = label === pickup;
          return (
            <TouchableOpacity
              key={`pick-${label}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectPickup(label)}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Get off at</Text>
      <View style={styles.chipRow}>
        {dropOptions.map((label) => {
          const active = label === drop;
          return (
            <TouchableOpacity
              key={`drop-${label}`}
              style={[styles.chip, active && styles.chipActiveDrop]}
              onPress={() => selectDrop(label)}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActiveDrop]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.previewRow}>
        <Icon name="navigate-outline" size={14} color={colors.successText} />
        <Text style={styles.previewText} numberOfLines={2}>
          {pickup} → {drop}
        </Text>
      </View>
    </View>
  );
};

export default RideCorridorSegmentPicker;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.chipBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
    },
    hint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 4,
      marginBottom: 10,
      lineHeight: 15,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 6,
      marginTop: 4,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 4,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.chipBg,
      borderWidth: 1,
      borderColor: c.border,
      maxWidth: "100%",
    },
    chipActive: {
      borderColor: c.successText,
      backgroundColor: c.successBg,
    },
    chipActiveDrop: {
      borderColor: c.warningText,
      backgroundColor: c.warningBg,
    },
    chipText: {
      fontSize: 11,
      fontWeight: "600",
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.successText,
      fontWeight: "700",
    },
    chipTextActiveDrop: {
      color: c.warningText,
      fontWeight: "700",
    },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    previewText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
  });
