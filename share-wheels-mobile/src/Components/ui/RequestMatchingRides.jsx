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
import { DS } from "../../theme/designSystem";
import { formatDisplayDate, formatRideTimeLabel } from "../../Utils/dateUtils";

const RequestMatchingRides = ({
  rides = [],
  linkedRide = null,
  role = "Passenger",
  joiningRideId = null,
  onViewRide,
  onJoinRide,
  emptyMessage,
}) => {
  const isCourier = role === "Courier";
  const list = linkedRide
    ? [linkedRide, ...rides.filter((r) => String(r._id) !== String(linkedRide._id))]
    : rides;

  if (!list.length) {
    return (
      <View style={styles.emptyWrap}>
        <Icon name="car-outline" size={28} color="#94A3B8" />
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
        const busy = joiningRideId && String(joiningRideId) === String(ride._id);
        const seats = ride.availableSeats ?? 1;
        const driverName = ride.creator?.name || "Driver";

        return (
          <View key={String(ride._id)} style={styles.rideCard}>
            <View style={styles.driverRow}>
              <UserAvatar user={ride.creator} size={44} borderColor="#E2E8F0" />
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
                  style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
                  onPress={() => onJoinRide?.(ride)}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isCourier ? "Request courier" : "Request seat"}
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

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rideCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
  },
  rideRoute: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  linkedBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  linkedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  rideMeta: {
    fontSize: 12,
    color: "#64748B",
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
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: DS.colors.primary,
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
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
});
