import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import UserAvatar from "./ui/UserAvatar";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import { getPassengerFare, getDriverTotalEarnings } from "../Utils/fareUtils";

const RideHistoryDriverview = ({ ride, loading }) => {
  const passengers = ride?.passengers || [];
  const totalEarnings = getDriverTotalEarnings(ride);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
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
        </ScrollView>
      )}

      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Earning</Text>
          <Text style={styles.totalAmount}>₹{totalEarnings}</Text>
        </View>
      </View>
    </View>
  );
};

export default RideHistoryDriverview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 90,
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
    borderBottomColor: "#E5E7EB",
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
    backgroundColor: "#2563EB",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
