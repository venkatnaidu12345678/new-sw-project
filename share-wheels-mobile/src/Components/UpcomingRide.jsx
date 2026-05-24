import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import driverIcon from "../assets/caricon.png";
import passengerIcon from "../assets/upcomingperson.png";
import courierIcon from "../assets/courier.png";
import { getRideDisplayFare } from "../Utils/fareUtils";

const UpcomingRide = ({ data, onPress }) => {

  const roleColors = {
    passenger: "#F0FDF4",
    driver: "#EFF6FF",
    courier: "#FFFBEB",
  };

  const borderColors = {
    passenger: "#22C55E",
    driver: "#3B82F6",
    courier: "#F59E0B",
  };

  const roleIcons = {
    passenger: passengerIcon,
    driver: driverIcon,
    courier: courierIcon,
  };

  const roleColor = roleColors[data?.myRole] || "#FFFFFF";
  const borderColor = borderColors[data?.myRole] || "#D8DADC";
  const roleIcon = roleIcons[data?.myRole];

  const route = `${data?.from || ""} → ${data?.to || ""}`;
  const car = data?.vehicle?.type || "N/A";
  const seats = data?.availableSeats || 0;
  const price = getRideDisplayFare(data);

  const formattedDate = data?.date
    ? new Date(data.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: roleColor, borderColor: borderColor }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <Text style={styles.title}>{route}</Text>

        <Text style={styles.subtitle}>
          {car} | {seats} Seats | ₹{price}/Seat | {formattedDate}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={styles.iconWrapper}>
          <Image source={roleIcon} style={styles.icon} />
        </View>

        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {data?.myRole?.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default UpcomingRide;

const styles = StyleSheet.create({
  card: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  left: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  right: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrapper: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },

  tagText: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "600",
  },
});