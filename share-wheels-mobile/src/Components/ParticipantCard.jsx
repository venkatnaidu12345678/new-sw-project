import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { DS } from "../theme/designSystem";

const ROLE_COLORS = {
  passenger: { bg: "#EFF6FF", accent: "#2563EB", label: "Passenger" },
  courier: { bg: "#FFF7ED", accent: "#EA580C", label: "Courier" },
};

/**
 * Driver view: confirmed passenger or courier on a ride.
 */
const ParticipantCard = ({
  user,
  role = "passenger",
  subtitleLines = [],
  fare,
  fareLabel = "Fare",
  verified,
  showVerify,
  onVerify,
  onMessage,
  onRemove,
  onCall,
}) => {
  const theme = ROLE_COLORS[role] || ROLE_COLORS.passenger;
  const name = user?.name || (role === "courier" ? "Courier" : "Passenger");
  const userNo = user?.userNo || "—";

  return (
    <View style={[styles.card, { borderLeftColor: theme.accent }]}>
      <View style={styles.topRow}>
        <UserAvatar user={user} size={52} />
        <View style={styles.main}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.bg }]}>
              <Text style={[styles.roleText, { color: theme.accent }]}>
                {theme.label}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            ID: {userNo}
            {verified ? " • Verified ✓" : " • Pending verification"}
          </Text>
          {subtitleLines.filter(Boolean).map((line, i) => (
            <Text key={i} style={styles.subline} numberOfLines={2}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.fareBox}>
          <Text style={styles.fareLabel}>{fareLabel}</Text>
          <Text style={styles.fare}>₹{fare ?? 0}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {showVerify && onVerify ? (
          <TouchableOpacity style={[styles.chip, styles.chipPrimary]} onPress={onVerify}>
            <Text style={styles.chipPrimaryText}>Verify</Text>
          </TouchableOpacity>
        ) : null}
        {onCall ? (
          <TouchableOpacity style={styles.chip} onPress={onCall}>
            <Text style={styles.chipText}>📞 Call</Text>
          </TouchableOpacity>
        ) : null}
        {onMessage ? (
          <TouchableOpacity style={[styles.chip, styles.chipOutline]} onPress={onMessage}>
            <Text style={styles.chipOutlineText}>Message</Text>
          </TouchableOpacity>
        ) : null}
        {onRemove ? (
          <TouchableOpacity style={[styles.chip, styles.chipDanger]} onPress={onRemove}>
            <Text style={styles.chipDangerText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default ParticipantCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: LAYOUT.radius?.lg || 14,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
    borderWidth: 1,
    borderColor: LAYOUT.colors.border,
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  main: {
    flex: 1,
    marginHorizontal: LAYOUT.spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: LAYOUT.colors.text,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    color: LAYOUT.colors.textMuted,
    marginTop: 4,
  },
  subline: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  fareBox: {
    alignItems: "flex-end",
    minWidth: 56,
  },
  fareLabel: {
    fontSize: 11,
    color: LAYOUT.colors.textMuted,
  },
  fare: {
    fontSize: 18,
    fontWeight: "700",
    color: LAYOUT.colors.primary,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: LAYOUT.colors.border,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  chipPrimary: {
    backgroundColor: "#2563EB",
  },
  chipPrimaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  chipOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: LAYOUT.colors.primary,
  },
  chipOutlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: LAYOUT.colors.primary,
  },
  chipDanger: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  chipDangerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
});
