import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FormPopoverShell from "./FormPopoverShell";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const BookSeatPopover = ({
  visible,
  onClose,
  maxSeats,
  seatFare,
  quickReserve,
  blockReason,
  booking,
  onBook,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    if (visible) setSeats(1);
  }, [visible]);

  useEffect(() => {
    if (maxSeats > 0 && seats > maxSeats) setSeats(maxSeats);
  }, [maxSeats, seats]);

  const totalFare = seatFare * seats;
  const canBook = !blockReason && maxSeats >= 1 && !booking;

  return (
    <FormPopoverShell visible={visible} onClose={onClose} disabledClose={booking}>
      <View style={styles.handle} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successBg }]}>
            <Icon name="people" size={22} color={colors.successText} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Book a seat</Text>
            <Text style={styles.subtitle}>
              {quickReserve
                ? "Quick Reserve — confirmed instantly"
                : "Driver approval required"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} disabled={booking}>
            <Icon name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {blockReason ? (
          <View style={styles.blockBox}>
            <Icon name="information-circle" size={20} color={colors.warningText} />
            <Text style={styles.blockText}>{blockReason}</Text>
          </View>
        ) : null}

        <View style={styles.seatCard}>
          <Text style={styles.seatLabel}>Seats</Text>
          <View style={styles.seatRow}>
            <TouchableOpacity
              style={[styles.seatBtn, seats <= 1 && styles.seatBtnDisabled]}
              onPress={() => setSeats((s) => Math.max(1, s - 1))}
              disabled={seats <= 1 || !!blockReason}
            >
              <Icon name="remove" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.seatCount}>
              {maxSeats < 1 ? "No seats" : `${seats} of ${maxSeats}`}
            </Text>
            <TouchableOpacity
              style={[styles.seatBtn, seats >= maxSeats && styles.seatBtnDisabled]}
              onPress={() => setSeats((s) => Math.min(maxSeats, s + 1))}
              disabled={seats >= maxSeats || maxSeats < 1 || !!blockReason}
            >
              <Icon name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.fareLine}>
            ₹{seatFare}/seat · Total ₹{totalFare}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, !canBook && styles.primaryBtnDisabled]}
          onPress={() => onBook?.(seats)}
          disabled={!canBook}
          activeOpacity={0.88}
        >
          {booking ? (
            <ActivityIndicator color={colors.inverseText} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {quickReserve ? "Confirm booking" : "Send request"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </FormPopoverShell>
  );
};

export default BookSeatPopover;

const createStyles = (c) =>
  StyleSheet.create({
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginTop: 10,
      marginBottom: 8,
    },
    content: { paddingHorizontal: 20, paddingBottom: 28 },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1 },
    title: { fontSize: 18, fontWeight: "800", color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    blockBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: c.warningBg,
      padding: 12,
      borderRadius: 12,
      marginBottom: 14,
      alignItems: "flex-start",
    },
    blockText: {
      flex: 1,
      color: c.warningText,
      fontWeight: "600",
      fontSize: 13,
      lineHeight: 18,
    },
    seatCard: {
      backgroundColor: c.chipBg,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    seatLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 10,
    },
    seatRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    seatBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    seatBtnDisabled: { opacity: 0.35 },
    seatCount: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      minWidth: 100,
      textAlign: "center",
    },
    fareLine: {
      textAlign: "center",
      marginTop: 12,
      fontSize: 14,
      fontWeight: "700",
      color: c.primary,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: {
      color: c.inverseText,
      fontWeight: "800",
      fontSize: 15,
    },
  });
