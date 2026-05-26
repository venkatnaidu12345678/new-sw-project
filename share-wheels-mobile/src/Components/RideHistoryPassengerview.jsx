import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";

/* ICONS */
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import clock from "../assets/clock2.png";
import UserAvatar from "./ui/UserAvatar";
import VehicleInfoStrip from "./VehicleInfoStrip";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import starIcon from "../assets/staricon.png";
import { getRideDisplayFare } from "../Utils/fareUtils";

const RideHistoryPassengerView = ({ ride, loading }) => {
  if (!ride) return null;

  const formattedDate =
    ride.formattedDate ||
    (ride.date ? new Date(ride.date).toLocaleDateString() : "—");

  const formattedTime =
    ride.formattedTime ||
    (ride.startTime
      ? new Date(ride.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—");

  const seats =
    ride.requires_seats ||
    ride.activeData?.requires_seats ||
    ride.seats ||
    1;
  const totalFare = getRideDisplayFare(ride);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
      ) : (
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

        {/* INFO CARDS */}
        <View style={styles.infoGrid}>
          <InfoCard
            icon={car}
            label="Car Type"
            value={
              [ride?.vehicle?.company, ride?.vehicle?.model, ride?.vehicle?.car_no]
                .filter(Boolean)
                .join(" · ") || "Car"
            }
            bg="#F3E8FF"
          />

          <InfoCard
            icon={seat}
            label="Seats"
            value={String(seats)}
            bg="#FFF7ED"
          />

          <InfoCard
            icon={dateIcon}
            label="Date"
            value={formattedDate}
            bg="#ECFEFF"
          />

          <InfoCard
            icon={clock}
            label="Start Time"
            value={formattedTime}
            bg="#EFF6FF"
            full
          />
        </View>

        {/* DRIVER & VEHICLE */}
        <Text style={styles.sectionTitle}>Driver & Vehicle</Text>

        <View style={styles.driverCard}>
          <UserAvatar user={ride?.creator} size={52} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.driverName}>
              {ride?.creator?.name || "Driver"}
            </Text>
            <Text style={styles.driverRole}>Driver</Text>
            {ride?.creator?.mobile ? (
              <Text style={styles.driverMeta}>{ride.creator.mobile}</Text>
            ) : null}
          </View>

          <View style={styles.driverRating}>
            <Text style={styles.ratingValue}>4.5</Text>
            <Image source={starIcon} style={styles.star} />
          </View>
        </View>

        {ride?.vehicle ? (
          <VehicleInfoStrip vehicle={ride.vehicle} />
        ) : null}
      </ScrollView>
      )}

      {/* TOTAL FARE */}
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={styles.totalAmount}>₹{totalFare}</Text>
        </View>
      </View>
    </View>
  );
};

/* INFO CARD */
const InfoCard = ({ icon, label, value, bg, full }) => (
  <View style={[styles.infoCard, { backgroundColor: bg }, full && styles.full]}>
    <View style={styles.infoRow}>
      <Image source={icon} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default RideHistoryPassengerView;

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
    color: "#475569",
    marginTop: 4,
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