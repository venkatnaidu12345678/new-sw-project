import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";

/* LOCAL ICONS */
import rideIcon from "../assets/notificationpassenger.png";
import passengerIcon from "../assets/notificationride.png";
import courierIcon from "../assets/notificationcourier.png";

const notifications = [
  {
    id: "1",
    type: "ride_request",
    title: "Ride Request from Amit Kumar",
    message: "Wants to join your ride from Madhapur to Kondapur",
    time: "5 mins ago",
    role: "ride",
  },
  {
    id: "2",
    type: "ride_accepted",
    title: "Ride Accepted!",
    message: "Venkat accepted your ride request to Hitech City",
    time: "15 mins ago",
    role: "passenger",
  },
  {
    id: "3",
    type: "courier_request",
    title: "Courier Request from Priya",
    message: "Wants you to deliver a package to Kondapur",
    time: "1 hour ago",
    role: "courier",
  },
  {
    id: "4",
    type: "courier_accepted",
    title: "Courier Accepted!",
    message: "Rajesh will deliver your package to Hitech City",
    time: "2 hours ago",
    role: "courier",
  },
];

/* ROLE BASED CONFIG */
const getRoleStyles = (role) => {
  switch (role) {
    case "ride":
      return {
        bg: "#E8F1FF",
        border: "#4A90E2",
        icon: rideIcon,
      };
    case "passenger":
      return {
        bg: "#EAFBF1",
        border: "#34C759",
        icon: passengerIcon,
      };
    case "courier":
      return {
        bg: "#FFF6E5",
        border: "#F5A623",
        icon: courierIcon,
      };
    default:
      return {
        bg: "#F5F5F5",
        border: "#ccc",
        icon: rideIcon,
      };
  }
};

const NotificationCard = ({ item }) => {
  const stylesByRole = getRoleStyles(item.role);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: stylesByRole.bg,
          borderColor: stylesByRole.border,
        },
      ]}
    >
      <Image source={stylesByRole.icon} style={styles.icon} />

      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );
};

const NotificationsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <Text style={styles.subHeader}>2 unread notifications</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 26,
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },

  subHeader: {
    color: "#888",
    marginBottom: 16,
  },

  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
    alignItems: "center",
  },

  icon: {
    width: 32,
    height: 32,
    marginRight: 12,
    resizeMode: "contain",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },

  message: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },

  time: {
    fontSize: 12,
    color: "#999",
  },
});