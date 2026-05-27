import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";

import { getRideDisplayFare } from "../Utils/fareUtils";
import { formatDisplayDate, formatDisplayTime } from "../Utils/dateUtils";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";

const ROLE_THEME = {
  driver: {
    accent: ["#2563EB", "#4F46E5"],
    bg: ["#EFF6FF", "#F8FAFC", "#FFFFFF"],
    border: "#60A5FA",
    chipBg: "rgba(255,255,255,0.85)",
    chipText: "#1D4ED8",
    label: "Driver",
    icon: "car-sport",
    avatarRing: "#93C5FD",
  },
  passenger: {
    accent: ["#059669", "#10B981"],
    bg: ["#ECFDF5", "#F8FAFC", "#FFFFFF"],
    border: "#34D399",
    chipBg: "rgba(255,255,255,0.85)",
    chipText: "#047857",
    label: "Passenger",
    icon: "person",
    avatarRing: "#6EE7B7",
  },
  courier: {
    accent: ["#D97706", "#F59E0B"],
    bg: ["#FFFBEB", "#F8FAFC", "#FFFFFF"],
    border: "#FBBF24",
    chipBg: "rgba(255,255,255,0.85)",
    chipText: "#B45309",
    label: "Courier",
    icon: "cube",
    avatarRing: "#FCD34D",
  },
};

const MetaChip = ({ icon, label }) => (
  <View style={styles.metaChip}>
    <Icon name={icon} size={11} color="#64748B" />
    <Text style={styles.metaChipText} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const UpcomingRide = ({ data, onPress }) => {
  const role = data?.myRole || "passenger";
  const theme = ROLE_THEME[role] || ROLE_THEME.passenger;

  const routeFrom = data?.from || "—";
  const routeTo = data?.to || "—";
  const seats =
    data?.requires_seats ||
    data?.activeData?.requires_seats ||
    data?.availableSeats ||
    0;
  const price = getRideDisplayFare(data);
  const isPending = data?.bookingStatus === "pending_approval";

  const profileUser = useMemo(() => {
    if (role === "driver") {
      return data?.creator;
    }
    return data?.creator;
  }, [role, data?.creator]);

  const profileName = useMemo(() => {
    if (role === "driver") {
      return profileUser?.name || "You";
    }
    return profileUser?.name || "Driver";
  }, [role, profileUser?.name]);

  const profileSubtitle = useMemo(() => {
    if (role === "driver") return "Your ride";
    if (isPending) return "Awaiting driver";
    return "Driver";
  }, [role, isPending]);

  const statusLabel =
    data?.status === "started"
      ? "In progress"
      : data?.isScheduleFuture &&
          data?.status === "pending" &&
          role === "driver"
        ? "Start early"
        : data?.isSchedulePassed && data?.status === "pending" && role === "driver"
          ? "Ready"
          : isPending
            ? "Pending"
            : null;

  const statusColors =
    data?.status === "started"
      ? { bg: "#DCFCE7", text: "#15803D" }
      : isPending
        ? { bg: "#FEF3C7", text: "#B45309" }
        : data?.isSchedulePassed && role === "driver"
          ? { bg: "#DBEAFE", text: "#1D4ED8" }
          : { bg: "rgba(255,255,255,0.9)", text: "#475569" };

  const dateLabel = formatDisplayDate(data?.date, { showYear: false, weekday: false });
  const timeLabel = formatDisplayTime(data?.startTime);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.cardOuter, { borderColor: theme.border }]}
    >
      <LinearGradient
        colors={theme.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <LinearGradient
          colors={theme.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topAccent}
        />

        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <UserAvatar
              user={profileUser}
              size={36}
              borderColor={theme.avatarRing}
            />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profileName}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: theme.chipBg }]}>
                  <Icon name={theme.icon} size={11} color={theme.chipText} />
                  <Text style={[styles.rolePillText, { color: theme.chipText }]}>
                    {theme.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileSub} numberOfLines={1}>
                {profileSubtitle}
              </Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={[styles.priceValue, { color: theme.chipText }]}>₹{price}</Text>
              {statusLabel ? (
                <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {statusLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeTimeline}>
              <View style={styles.routeDotFrom} />
              <View style={styles.routeLine} />
              <View style={styles.routeDotTo} />
            </View>
            <View style={styles.routeText}>
              <Text style={styles.routeCity} numberOfLines={1}>
                {routeFrom}
              </Text>
              <Icon name="arrow-forward" size={12} color="#94A3B8" style={styles.routeArrow} />
              <Text style={styles.routeCity} numberOfLines={1}>
                {routeTo}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {dateLabel ? <MetaChip icon="calendar-outline" label={dateLabel} /> : null}
            {timeLabel ? <MetaChip icon="time-outline" label={timeLabel} /> : null}
            {seats > 0 ? (
              <MetaChip
                icon="people-outline"
                label={`${seats} seat${seats !== 1 ? "s" : ""}`}
              />
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default UpcomingRide;

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.spacing.sm,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardGradient: {
    borderRadius: LAYOUT.radius.md - 1,
    overflow: "hidden",
  },
  topAccent: {
    height: 3,
    width: "100%",
  },
  cardInner: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  profileSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priceCol: {
    alignItems: "flex-end",
    maxWidth: 88,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusPill: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  routeTimeline: {
    width: 10,
    alignItems: "center",
    paddingVertical: 2,
  },
  routeDotFrom: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: "#CBD5E1",
    marginVertical: 2,
  },
  routeDotTo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
  },
  routeText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 4,
  },
  routeCity: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  routeArrow: {
    marginHorizontal: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    maxWidth: "100%",
  },
  metaChipText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "500",
    flexShrink: 1,
  },
});
