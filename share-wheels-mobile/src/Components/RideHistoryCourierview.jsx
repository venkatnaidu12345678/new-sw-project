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

/* ICONS */
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import clock from "../assets/clock2.png";
import UserAvatar from "./ui/UserAvatar";
import VehicleInfoStrip from "./VehicleInfoStrip";
import CourierParcelPreview from "./CourierParcelPreview";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import starIcon from "../assets/staricon.png";
import { getCourierFare } from "../Utils/fareUtils";

const RideHistoryCourierview = ({ ride, loading }) => {
  if (!ride) return null;

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
        contentContainerStyle={styles.scrollContent}
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

        
        

         

        {ride?.activeData || ride?.courierSnapshot ? (
          <>
            <Text style={styles.sectionTitle}>Your Parcel</Text>
            <View style={styles.driverCard}>
              <CourierParcelPreview
                courier={ride.activeData || ride.courierSnapshot}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Driver & Vehicle</Text>

        <View style={styles.driverCard}>
          <UserAvatar user={ride?.creator} size={52} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.driverName}>
              {ride?.creator?.name?.trim() || "Driver"}
            </Text>
            <Text style={styles.driverRole}>
              {ride?.creator?.gender || "Driver"}
            </Text>
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

        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total Fare</Text>
            <Text style={styles.totalAmount}>₹{getCourierFare(ride)}</Text>
          </View>
        </LinearGradient>
      </ScrollView>
      )}
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

export default RideHistoryCourierview;

/* STYLES */
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
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

  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  totalCard: {
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 18,
    padding: 18,
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