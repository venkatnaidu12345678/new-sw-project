import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { LAYOUT } from "../theme/layout";

const DriverParticipantsHub = ({
  passengerCount,
  courierCount,
  pendingCount,
  onOpen,
  onOpenPending,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const total = passengerCount + courierCount;
  const showPending = pendingCount > 0;

  const subtitle = (() => {
    if (showPending && total === 0) {
      return `${pendingCount} request${pendingCount === 1 ? "" : "s"} need approval`;
    }
    if (total > 0) {
      return `${total} on this ride · tap to manage`;
    }
    return "No one joined yet · tap to view requests";
  })();

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={onOpen}
        activeOpacity={0.92}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="people" size={22} color={colors.inverseText} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Participants</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.chevronWrap}>
            <Icon name="chevron-forward" size={20} color={colors.primary} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, styles.statPassenger]}>
            <Icon name="person" size={18} color={colors.successText} />
            <Text style={styles.statNum}>{passengerCount}</Text>
            <Text style={styles.statLabel}>Passengers</Text>
          </View>
          <View style={[styles.statPill, styles.statCourier]}>
            <Icon name="cube" size={18} color="#EA580C" />
            <Text style={styles.statNum}>{courierCount}</Text>
            <Text style={styles.statLabel}>Couriers</Text>
          </View>
          {showPending ? (
            <View
              style={[
                styles.statPill,
                styles.statPending,
                styles.statPendingActive,
              ]}
            >
              <Icon name="notifications-outline" size={18} color={colors.warningText} />
              <Text style={[styles.statNum, styles.statNumHighlight]}>
                {pendingCount}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {showPending ? (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={onOpenPending}
          activeOpacity={0.88}
        >
          <View style={styles.alertIconWrap}>
            <Icon name="alert-circle" size={18} color={colors.warningText} />
          </View>
          <Text style={styles.alertText}>
            {pendingCount} request{pendingCount === 1 ? "" : "s"} need your
            approval
          </Text>
          <Text style={styles.alertAction}>Review</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default DriverParticipantsHub;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      marginBottom: LAYOUT.spacing.md,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    headerText: {
      flex: 1,
      marginRight: 8,
    },
    chevronWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    subtitle: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 3,
      lineHeight: 17,
    },
    statsRow: {
      flexDirection: "row",
      gap: 8,
    },
    statPill: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
      borderWidth: 1,
    },
    statPassenger: {
      backgroundColor: c.successBg,
      borderColor: c.border,
    },
    statCourier: {
      backgroundColor: c.tintOrange,
      borderColor: c.border,
    },
    statPending: {
      backgroundColor: c.chipBg,
      borderColor: c.border,
    },
    statPendingActive: {
      backgroundColor: c.warningBg,
      borderColor: c.warningBorder,
    },
    statNum: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginTop: 6,
    },
    statNumHighlight: {
      color: c.warningText,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.35,
      textAlign: "center",
    },
    alertBanner: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: c.warningBg,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    alertIconWrap: {
      marginRight: 10,
    },
    alertText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.warningText,
      lineHeight: 18,
    },
    alertAction: {
      fontSize: 13,
      fontWeight: "800",
      color: c.primary,
      marginLeft: 8,
    },
  });
