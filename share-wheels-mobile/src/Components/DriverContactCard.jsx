import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { openPhoneCall } from "../Utils/phoneCall";
import caricon from "../assets/caricon.png";

const MessageBadge = ({ count }) => {
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
}) => {
  const name = driver?.name || "Driver";

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.top}>
          <UserAvatar user={driver} size={56} borderColor="#2563EB" />
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

        {vehicle?.company || vehicle?.car_no ? (
          <View style={styles.vehicleRow}>
            <Image source={caricon} style={styles.carIcon} />
            <Text style={styles.vehicleText}>
              {[vehicle?.company, vehicle?.model].filter(Boolean).join(" ")}
              {vehicle?.car_no ? ` · ${vehicle.car_no}` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onMessage}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>💬 Message</Text>
            <MessageBadge count={messageUnread} />
          </TouchableOpacity>
          {showCall ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={() =>
                onCall ? onCall() : openPhoneCall(driver?.mobile, "driver")
              }
              activeOpacity={0.85}
            >
              <Text style={styles.btnOutlineText}>📞 Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default DriverContactCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: LAYOUT.radius.lg,
    marginBottom: LAYOUT.spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accent: {
    width: 4,
    backgroundColor: "#2563EB",
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
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  meta: {
    fontSize: 13,
    color: "#334155",
    marginTop: 3,
  },
  metaMuted: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: LAYOUT.spacing.sm,
    paddingTop: LAYOUT.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  carIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: "contain",
  },
  vehicleText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
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
    backgroundColor: "#2563EB",
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  btnOutline: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginRight: 0,
  },
  btnOutlineText: {
    color: "#334155",
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
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
