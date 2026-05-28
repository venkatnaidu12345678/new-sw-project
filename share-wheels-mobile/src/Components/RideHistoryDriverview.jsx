import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
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
} from "../Utils/fareUtils";

const RideHistoryDriverview = ({ ride, loading }) => {
  const passengers = ride?.passengers || [];
  const couriers = ride?.all_deliveries || [];
  const totalEarnings = getDriverTotalEarnings(ride);
  const dateLabel =
    ride?.formattedDate ||
    (ride?.date ? new Date(ride.date).toLocaleDateString() : "—");
  const timeLabel =
    ride?.formattedTime ||
    (ride?.startTime
      ? new Date(ride.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
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
                  </View>

                  <Text style={styles.passengerPrice}>₹{fare}</Text>
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Couriers ({couriers.length})</Text>
          {couriers.length === 0 ? (
            <Text style={styles.empty}>No couriers on this ride</Text>
          ) : (
            couriers.map((c, index) => (
              <View key={c?._id || index} style={styles.passengerRow}>
                <UserAvatar user={c?.userId} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.passengerName}>
                    {c?.userId?.name || "Courier"}
                  </Text>
                  <Text style={styles.passengerMeta}>
                    {c?.parcel || c?.what_to_deliver || "Parcel"}
                  </Text>
                </View>
                <Text style={styles.passengerPrice}>₹{getCourierFare(c)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Earning</Text>
          <Text style={styles.totalAmount}>₹{totalEarnings}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export default RideHistoryDriverview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 86,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
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
    backgroundColor: "#E5E7EB",
    marginLeft: 11,
    marginVertical: 6,
  },
  place: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  address: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  rideMeta: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    color: "#6B7280",
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  passengerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  passengerMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  passengerPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  totalCard: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
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
});
