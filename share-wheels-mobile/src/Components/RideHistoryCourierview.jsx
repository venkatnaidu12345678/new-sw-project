import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";

/* ICONS */
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import clock from "../assets/clock2.png";
import UserAvatar from "./ui/UserAvatar";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import starIcon from "../assets/staricon.png";
import { getCourierFare } from "../Utils/fareUtils";

const RideHistoryPassengerView = ({ ride }) => {
  if (!ride) return null;

  /* FORMAT DATE */
  const formattedDate = new Date(ride.date).toLocaleDateString();

  /* FORMAT TIME */
  const formattedTime = new Date(ride.startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  console.log("Ride history:", ride)

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ROUTE */}
        <View style={styles.routeCard}>
          <View style={styles.routeItem}>
            <Image source={madhapurIcon} style={styles.routeIcon} />
            <View>
              <Text style={styles.place}>{ride.from}</Text>
              <Text style={styles.address}>Pickup Location</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeItem}>
            <Image source={kondapurIcon} style={styles.routeIcon} />
            <View>
              <Text style={styles.place}>{ride.to}</Text>
              <Text style={styles.address}>Drop Location</Text>
            </View>
          </View>
        </View>

        
        

         

        {/* DRIVER */}
        <Text style={styles.sectionTitle}>Driver</Text>

        <View style={styles.driverCard}>
          <UserAvatar user={ride?.creator} size={52} />

          <View style={{ flex: 1, marginLeft: 12 }}>
           <Text style={styles.driverName}>
  {ride?.creator?.name?.trim() || "Driver"}
</Text>


            <Text style={styles.driverRole}>
              {ride?.creator?.gender || "N/A"}
            </Text>

            <Text style={styles.driverMeta}>
              {ride?.creator?.mobile || ""}
            </Text>
          </View>

          <View style={styles.driverRating}>
            <Text style={styles.ratingValue}>4.5</Text>
            <Image source={starIcon} style={styles.star} />
          </View>
        </View>
      </ScrollView>

      {/* TOTAL FARE */}
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={styles.totalAmount}>
            ₹{getCourierFare(ride)}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* INFO CARD */
const InfoCard = ({ icon, label, value, bg }) => (
  <View style={[styles.infoCard, { backgroundColor: bg }]}>
    <View style={styles.infoRow}>
      <Image source={icon} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default RideHistoryPassengerView;

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
    marginBottom: 20,
  },

  infoCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
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

  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },

  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  driverRole: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  driverMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  driverRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginRight: 4,
  },

  star: {
    width: 14,
    height: 14,
  },

  totalCard: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#2563EB",
    borderRadius: 18,
    padding: 28,
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