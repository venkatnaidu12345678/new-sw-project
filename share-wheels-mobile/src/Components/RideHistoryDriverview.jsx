import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";

/* ICONS */

import passenger1 from "../assets/passenger1.png";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";


const RideHistoryDriverview = ({ ride }) => {
  const passengers = ride?.passengers || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* ROUTE */}
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

        {/* PASSENGERS */}
        <Text style={styles.sectionTitle}>
          Passengers ({passengers.length})
        </Text>

        {passengers.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No passengers found
          </Text>
        ) : (
          passengers.map((p, index) => (
            <View key={p?._id || index} style={styles.passengerRow}>
              <Image
                source={
                  p?.userId?.profile_img
                    ? { uri: p.userId.profile_img }
                    : passenger1
                }
                style={styles.avatar}
              />

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.passengerName}>
                  {p?.userId?.name || "No Name"}
                </Text>

                <Text style={styles.passengerMeta}>
 
  {p?.userId?.gender || "-"} •{" "}
  {p?.seats || 1} seat{p?.seats > 1 ? "s" : ""}
</Text>
              </View>

              <Text style={styles.passengerPrice}>
                ₹{ride?.price || 0}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* TOTAL */}
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Earning</Text>
          <Text style={styles.totalAmount}>₹{ride?.price || 0}</Text>
        </View>
      </View>
    </View>
  );
};

/* INFO CARD COMPONENT */
const InfoCard = ({ icon, label, value, bg, full }) => (
  <View style={[styles.infoCard, { backgroundColor: bg }, full && styles.full]}>
    <View style={styles.infoRow}>
      <Image source={icon} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>

    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default RideHistoryDriverview;


/* STYLES */

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

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },

  infoCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
  },

  full: {
    width: "100%",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  infoIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },

  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },

  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

  ratingBox: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    minWidth: 70,
  },

  ratingValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  star: {
    width: 16,
    height: 16,
    marginVertical: 2,
  },

  ratingText: {
    fontSize: 10,
    color: "#E0E7FF",
  },
});