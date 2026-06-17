import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { LAYOUT } from "../theme/layout";

const DriverEnrouteHub = ({
  passengerCount,
  courierCount,
  loading = false,
  picksRemaining,
  ridesRemaining,
  isFreePlan,
  unlimitedPicks,
  planName,
  onOpen,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const total = passengerCount + courierCount;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={onOpen}
        activeOpacity={0.92}
      >
        <View style={styles.header}>
          <View style={[styles.headerIcon, styles.headerIconEnroute]}>
            <Icon name="navigate" size={22} color={colors.inverseText} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>En route requests</Text>
            <Text style={styles.subtitle}>
              {loading
                ? "Checking nearby passengers & couriers…"
                : isFreePlan && ridesRemaining != null
                  ? `${ridesRemaining} free ride${ridesRemaining === 1 ? "" : "s"} left · unlimited picks per ride${
                      total > 0 ? ` · ${total} nearby` : ""
                    }`
                  : unlimitedPicks
                    ? `Unlimited picks${
                        planName ? ` on ${planName}` : ""
                      }${total > 0 ? ` · ${total} nearby` : " · tap to refresh"}`
                    : picksRemaining != null
                      ? `${picksRemaining} pick${picksRemaining === 1 ? "" : "s"} left${
                          planName ? ` on ${planName}` : ""
                        } · ${total > 0 ? `${total} nearby` : "tap to refresh"}`
                      : total > 0
                        ? `${total} nearby · tap to pick up`
                        : "No nearby requests · tap to refresh"}
            </Text>
          </View>
          <View style={styles.chevronWrap}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="chevron-forward" size={20} color={colors.primary} />
            )}
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
          <View style={[styles.statPill, styles.statTotal]}>
            <Icon name="layers" size={18} color={colors.primary} />
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default DriverEnrouteHub;

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
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    headerIconEnroute: {
      backgroundColor: c.infoText || c.primary,
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
    statTotal: {
      backgroundColor: c.primaryMuted,
      borderColor: c.border,
    },
    statNum: {
      fontSize: 20,
      fontWeight: "800",
      color: c.text,
      marginTop: 6,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.35,
    },
  });
