import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { openPhoneCall } from "../Utils/phoneCall";
import VehicleInfoStrip from "./VehicleInfoStrip";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const MessageBadge = ({ count, styles }) => {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
};

/**
 * Passenger / courier view — driver info with actions.
 */
const DriverContactCard = ({
  driver,
  vehicle,
  onMessage,
  onCall,
  messageUnread = 0,
  showCall = true,
  showVehicle = true,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const name = driver?.name || "Driver";

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.top}>
          <UserAvatar user={driver} size={56} borderColor={colors.primary} />
          <View style={styles.info}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>Driver</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {driver?.userNo ? (
              <Text style={styles.meta}>ID: {driver.userNo}</Text>
            ) : null}
            {driver?.mobile ? (
              <Text style={styles.meta}>{driver.mobile}</Text>
            ) : null}
            {driver?.email ? (
              <Text style={styles.metaMuted} numberOfLines={1}>
                {driver.email}
              </Text>
            ) : null}
          </View>
        </View>

        {showVehicle && vehicle ? <VehicleInfoStrip vehicle={vehicle} compact /> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onMessage}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Message</Text>
            <MessageBadge count={messageUnread} styles={styles} />
          </TouchableOpacity>
          {showCall ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={() => onCall?.() ?? openPhoneCall(driver?.mobile, name)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnOutlineText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default DriverContactCard;

const createStyles = (c) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: LAYOUT.radius.lg,
      marginBottom: LAYOUT.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    accent: {
      width: 4,
      backgroundColor: c.primary,
    },
    body: {
      flex: 1,
      padding: LAYOUT.spacing.md,
    },
    top: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    info: {
      flex: 1,
      marginLeft: LAYOUT.spacing.sm,
    },
    rolePill: {
      alignSelf: "flex-start",
      backgroundColor: c.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginBottom: 4,
    },
    rolePillText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.primaryText,
    },
    name: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
    },
    meta: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 3,
    },
    metaMuted: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      marginTop: LAYOUT.spacing.md,
    },
    btn: {
      flex: 1,
      marginRight: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 10,
      position: "relative",
    },
    btnPrimary: {
      backgroundColor: c.primary,
    },
    btnPrimaryText: {
      color: c.inverseText,
      fontWeight: "700",
      fontSize: 14,
    },
    btnOutline: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: 0,
    },
    btnOutlineText: {
      color: c.text,
      fontWeight: "600",
      fontSize: 14,
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.errorText,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: c.primary,
    },
    badgeText: {
      color: c.inverseText,
      fontSize: 10,
      fontWeight: "800",
    },
  });
