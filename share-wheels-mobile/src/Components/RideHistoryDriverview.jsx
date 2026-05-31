import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

import UserAvatar from "./ui/UserAvatar";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import {
  getPassengerFare,
  getCourierFare,
  getDriverTotalEarnings,
  getDriverPendingEarnings,
} from "../Utils/fareUtils";
import {
  passengerCountsTowardEarnings,
  courierCountsTowardEarnings,
  tripStatusLabel,
} from "../Utils/participantTripStatus";
import { formatDisplayTime } from "../Utils/dateUtils";
import { useThemedStyles } from "../theme/useThemedStyles";

const RideHistoryDriverview = ({ ride, loading }) => {
  const styles = useThemedStyles(createStyles);
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const totalEarnings = getDriverTotalEarnings(ride);
  const pendingEarnings = getDriverPendingEarnings(ride);
  const dateLabel =
    ride?.formattedDate ||
    (ride?.date ? new Date(ride.date).toLocaleDateString() : "—");
  const timeLabel =
    ride?.formattedTime || formatDisplayTime(ride?.startTime) || "—";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <Text style={styles.headerSub}>Driver</Text>
        </View>
        {ride?.status ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{ride.status}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
      ) : (
        <View style={styles.scrollContent}>
          <View style={styles.routeCard}>
            <View style={styles.routeItem}>
              <Image source={madhapurIcon} style={styles.routeIcon} />
              <View>
                <Text style={styles.place}>{ride?.from}</Text>
                <Text style={styles.address}>Pickup Location</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routeItem}>
              <Image source={kondapurIcon} style={styles.routeIcon} />
              <View>
                <Text style={styles.place}>{ride?.to}</Text>
                <Text style={styles.address}>Drop Location</Text>
              </View>
            </View>
          </View>

          <Text style={styles.rideMeta}>
            {dateLabel} • {timeLabel}
          </Text>

          <Text style={styles.sectionTitle}>
            Passengers ({passengers.length})
          </Text>

          {passengers.length === 0 ? (
            <Text style={styles.empty}>No passengers on this ride</Text>
          ) : (
            passengers.map((p, index) => {
              const fare = getPassengerFare(p);
              const seats = p?.requires_seats || 1;
              const counts = passengerCountsTowardEarnings(p);
              return (
                <View key={p?._id || index} style={styles.passengerRow}>
                  <UserAvatar user={p?.userId} size={44} />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.passengerName}>
                      {p?.userId?.name || "Passenger"}
                    </Text>
                    <Text style={styles.passengerMeta}>
                      {p?.userId?.gender || "—"} · {seats} seat
                      {seats !== 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.passengerMeta}>
                      {p?.isBoardingVerified ? tripStatusLabel(p?.status) : "Not verified"}
                      {counts ? " · counts in earnings" : ""}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.passengerPrice,
                      !counts && styles.passengerPriceMuted,
                    ]}
                  >
                    ₹{counts ? fare : 0}
                  </Text>
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Couriers ({couriers.length})</Text>
          {couriers.length === 0 ? (
            <Text style={styles.empty}>No couriers on this ride</Text>
          ) : (
            couriers.map((c, index) => {
              const fare = getCourierFare(c);
              const counts = courierCountsTowardEarnings(c);
              return (
                <View key={c?._id || index} style={styles.passengerRow}>
                  <UserAvatar user={c?.userId} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.passengerName}>
                      {c?.userId?.name || "Courier"}
                    </Text>
                    <Text style={styles.passengerMeta}>
                      {c?.parcel || c?.what_to_deliver || "Parcel"}
                    </Text>
                    <Text style={styles.passengerMeta}>
                      {c?.isBoardingVerified ? tripStatusLabel(c?.status) : "Not verified"}
                      {counts ? " · counts in earnings" : ""}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.passengerPrice,
                      !counts && styles.passengerPriceMuted,
                    ]}
                  >
                    ₹{counts ? fare : 0}
                  </Text>
                </View>
              );
            })
          )}

          <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Total Earnings (OTP verified)</Text>
              <Text style={styles.totalAmount}>₹{totalEarnings}</Text>
              {pendingEarnings > 0 ? (
                <Text style={styles.pendingNote}>
                  ₹{pendingEarnings} pending (picked up, not dropped/delivered yet)
                </Text>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

export default RideHistoryDriverview;

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: c.text,
  },
  headerSub: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  rolePill: {
    backgroundColor: c.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.primaryText,
    textTransform: "capitalize",
  },
  routeCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    elevation: 2,
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 32,
    backgroundColor: c.border,
    marginLeft: 11,
    marginVertical: 6,
  },
  place: {
    fontSize: 15,
    fontWeight: "700",
    color: c.text,
  },
  address: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: c.text,
  },
  rideMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: c.textMuted,
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: "600",
    color: c.text,
  },
  passengerMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  passengerPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: c.text,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  totalCard: {
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: "#DBEAFE",
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  pendingNote: {
    fontSize: 11,
    color: "#DBEAFE",
    marginTop: 6,
    fontWeight: "600",
  },
  passengerPriceMuted: {
    color: c.textMuted,
    textDecorationLine: "line-through",
  },
});
