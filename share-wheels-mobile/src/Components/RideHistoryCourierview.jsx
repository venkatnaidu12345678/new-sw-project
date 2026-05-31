import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

/* ICONS */
import dateIcon from "../assets/dateIcon.png";
import clock from "../assets/clock2.png";
import UserAvatar from "./ui/UserAvatar";
import VehicleInfoStrip from "./VehicleInfoStrip";
import CourierParcelPreview from "./CourierParcelPreview";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import { getCourierFare } from "../Utils/fareUtils";
import { formatDisplayTime } from "../Utils/dateUtils";
import { useThemedStyles } from "../theme/useThemedStyles";

const RideHistoryCourierview = ({ ride, loading }) => {
  const styles = useThemedStyles(createStyles);
  if (!ride) return null;

  const formattedDate =
    ride.formattedDate ||
    (ride.date ? new Date(ride.date).toLocaleDateString() : null);
  const formattedTime =
    ride.formattedTime || formatDisplayTime(ride.startTime) || null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ride Details</Text>
          <Text style={styles.headerSub}>Courier</Text>
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

        {(formattedDate || formattedTime) && (
          <View style={styles.infoGrid}>
            {formattedDate ? (
              <InfoCard
                icon={dateIcon}
                label="Date"
                value={formattedDate}
                bg="#ECFEFF"
              />
            ) : null}
            {formattedTime ? (
              <InfoCard
                icon={clock}
                label="Start Time"
                value={formattedTime}
                bg="#EFF6FF"
              />
            ) : null}
          </View>
        )}

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
            <Text style={styles.driverRole}>Driver</Text>
            {ride?.creator?.mobile ? (
              <Text style={styles.driverMeta}>{ride.creator.mobile}</Text>
            ) : null}
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
      </View>
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
const createStyles = (c) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    backgroundColor: c.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.warningText,
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
    color: c.textMuted,
    fontWeight: "600",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: c.text,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: c.text,
  },

  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.text,
  },

  driverRole: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },

  driverMeta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
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
    color: c.inverseText,
    marginTop: 4,
  },
});