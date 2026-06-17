import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import UserAvatar from "./UserAvatar";
import { formatDisplayDate, formatRideTimeLabel } from "../../Utils/dateUtils";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";

const RequestMatchingRides = ({
  rides = [],
  linkedRide = null,
  role = "Passenger",
  joiningRideId = null,
  onViewRide,
  onJoinRide,
  emptyMessage,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isCourier = role === "Courier";
  const list = linkedRide
    ? [linkedRide, ...rides.filter((r) => String(r._id) !== String(linkedRide._id))]
    : rides;

  if (!list.length) {
    return (
      <View style={styles.emptyWrap}>
        <Icon name="car-outline" size={28} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No matching driver rides</Text>
        <Text style={styles.emptySub}>
          {emptyMessage ||
            "Try another date or check Home search for more options."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>
        {linkedRide ? "Your ride" : "Matching rides"}
      </Text>
      {list.map((ride) => {
        const isLinked = linkedRide && String(ride._id) === String(linkedRide._id);
        const pending = isCourier
          ? ride.courierRequestPending
          : ride.passengerRequestPending;
        const joinInFlight = !!joiningRideId;
        const busy = joinInFlight && String(joiningRideId) === String(ride._id);
        const seats = ride.availableSeats ?? 1;
        const driverName = ride.creator?.name || "Driver";

        return (
          <View key={String(ride._id)} style={styles.rideCard}>
            <View style={styles.driverRow}>
              <UserAvatar user={ride.creator} size={44} borderColor={colors.border} />
              <View style={styles.driverCol}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {driverName}
                </Text>
                <Text style={styles.rideRoute} numberOfLines={1}>
                  {ride.from} → {ride.to}
                </Text>
              </View>
              {isLinked ? (
                <View style={styles.linkedBadge}>
                  <Text style={styles.linkedBadgeText}>Joined</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.rideMeta}>
              {formatDisplayDate(ride.date, { weekday: false })} ·{" "}
              {formatRideTimeLabel(ride.date, ride.startTime)}
            </Text>
            <Text style={styles.rideMeta}>
              ₹{ride.ride_amount ?? "—"} · {seats} seat{seats !== 1 ? "s" : ""}
              {ride.CanCarryCourier && isCourier ? " · Courier OK" : ""}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onViewRide?.(ride)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>View ride</Text>
              </TouchableOpacity>

              {pending ? (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingText}>Request pending</Text>
                </View>
              ) : isLinked ? null : (
                <TouchableOpacity
                  style={[styles.primaryBtn, joinInFlight && styles.primaryBtnDisabled]}
                  onPress={() => onJoinRide?.(ride)}
                  disabled={joinInFlight}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {joinInFlight
                        ? "Please wait…"
                        : isCourier
                          ? "Request courier"
                          : "Request seat"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default RequestMatchingRides;

const createStyles = (c) =>
  StyleSheet.create({
    wrap: {
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textSecondary,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    rideCard: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    driverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    driverCol: {
      flex: 1,
      minWidth: 0,
    },
    driverName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    rideRoute: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    linkedBadge: {
      backgroundColor: c.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    linkedBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: c.primaryText,
    },
    rideMeta: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
    },
    secondaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    secondaryBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: c.primary,
      paddingVertical: 9,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
    },
    primaryBtnDisabled: {
      opacity: 0.7,
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },
    pendingPill: {
      flex: 1,
      backgroundColor: c.warningBg,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    pendingText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.warningText,
    },
    emptyWrap: {
      alignItems: "center",
      paddingVertical: 20,
      paddingHorizontal: 12,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyTitle: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: "700",
      color: c.textSecondary,
    },
    emptySub: {
      marginTop: 4,
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
    },
  });
