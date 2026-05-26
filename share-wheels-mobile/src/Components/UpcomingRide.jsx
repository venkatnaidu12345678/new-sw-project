import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import driverIcon from "../assets/caricon.png";
import passengerIcon from "../assets/upcomingperson.png";
import courierIcon from "../assets/courier.png";
import { getRideDisplayFare } from "../Utils/fareUtils";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";

const UpcomingRide = ({ data, onPress }) => {

  const roleColors = {
    passenger: "#F0FDF4",
    driver: "#EFF6FF",
    courier: "#FFFBEB",
  };

  const borderColors = {
    passenger: "#22C55E",
    driver: "#3B82F6",
    courier: "#F59E0B",
  };

  const roleIcons = {
    passenger: passengerIcon,
    driver: driverIcon,
    courier: courierIcon,
  };

  const roleColor = roleColors[data?.myRole] || "#FFFFFF";
  const borderColor = borderColors[data?.myRole] || "#D8DADC";
  const roleIcon = roleIcons[data?.myRole];

  const route = `${data?.from || ""} → ${data?.to || ""}`;
  const car = data?.vehicle?.type || "N/A";
  const seats =
    data?.requires_seats ||
    data?.activeData?.requires_seats ||
    data?.availableSeats ||
    0;
  const price = getRideDisplayFare(data);
  const isPending = data?.bookingStatus === "pending_approval";
  const statusLabel =
    data?.status === "started"
      ? "In progress"
      : data?.isScheduleFuture && data?.status === "pending" && data?.myRole === "driver"
      ? "Can start early"
      : data?.isSchedulePassed && data?.status === "pending" && data?.myRole === "driver"
      ? "Ready to start (late)"
      : isPending
      ? "Awaiting approval"
      : null;

  const formattedDate = data?.date
    ? new Date(data.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: roleColor, borderColor: borderColor }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <UserAvatar
        user={data?.creator}
        size={LAYOUT.sizes.avatarSm + 4}
        style={styles.avatar}
      />

      <View style={styles.left}>
        <Text style={styles.title}>{route}</Text>
        {data?.creator?.name ? (
          <Text style={styles.driverName}>{data.creator.name}</Text>
        ) : null}
        <Text style={styles.subtitle}>
          {car} | {seats} seat{seats !== 1 ? "s" : ""} | ₹{price}
          {data?.myRole === "passenger" && !isPending ? "/seat" : ""} | {formattedDate}
        </Text>
        {statusLabel ? (
          <Text
            style={[
              styles.statusPill,
              isPending && styles.statusPending,
              (data?.isSchedulePassed || data?.isScheduleFuture) &&
                data?.status === "pending" &&
                data?.myRole === "driver" &&
                styles.statusLate,
            ]}
          >
            {statusLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <View style={styles.iconWrapper}>
          <Image source={roleIcon} style={styles.icon} />
        </View>

        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {data?.myRole?.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default UpcomingRide;

const styles = StyleSheet.create({
  card: {
    minHeight: LAYOUT.sizes.inputHeight + 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md,
    gap: LAYOUT.spacing.sm,
  },
  avatar: {
    marginRight: 2,
  },
  left: {
    flex: 1,
  },
  driverName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 2,
  },

  title: {
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: LAYOUT.font.small,
    color: "#6B7280",
    marginTop: 2,
  },
  statusPill: {
    marginTop: 6,
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  statusPending: {
    color: "#B45309",
    backgroundColor: "#FFFBEB",
  },
  statusLate: {
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
  },

  right: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrapper: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },

  tagText: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "600",
  },
});