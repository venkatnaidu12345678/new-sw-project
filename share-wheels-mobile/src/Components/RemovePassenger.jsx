import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";

import profileIcon from "../assets/profile.png";

const RemovePassengerModal = ({ passenger, onRemove }) => {

  const handleRemovePassenger = () => {
    const passengerId =
      typeof passenger?.userId === "object"
        ? passenger.userId._id
        : passenger?.userId;

   onRemove(passengerId);
    console.log("PassengerId sending:", passengerId);

  };

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Remove Passenger</Text>
      </View>

      {/* PASSENGER CARD */}
      <View style={styles.card}>
        <Image
          source={
            passenger?.userId?.profile_img
              ? { uri: passenger.userId.profile_img }
              : profileIcon
          }
          style={styles.avatar}
        />

        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>
            {passenger?.userId?.name || "Passenger"}
          </Text>

          <Text style={styles.sub}>
            {passenger?.userId?.gender || "Male"}
          </Text>

          <Text style={styles.pickup}>
            Pickup: {passenger?.userId?.pickup || "Location"}
          </Text>
        </View>
      </View>

      {/* WARNING */}
      <Text style={styles.warning}>
        Do you really want to remove this passenger?
      </Text>
      

      {/* REMOVE BUTTON */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={handleRemovePassenger}
      >
        <Text style={styles.removeText}>Remove</Text>
        
      </TouchableOpacity>

    </View>
  );
};

export default RemovePassengerModal;
const styles = StyleSheet.create({

    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end"
    },

    container: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20
    },

    handle: {
        width: 50,
        height: 5,
        backgroundColor: "#E5E7EB",
        alignSelf: "center",
        borderRadius: 10,
        marginBottom: 15
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
    },

    title: {
        fontSize: 18,
        fontWeight: "700"
    },

    close: {
        fontSize: 20,
        color: "#6B7280"
    },

    card: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 20
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24
    },

    name: {
        fontSize: 15,
        fontWeight: "600"
    },

    sub: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2
    },

    pickup: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2
    },

    warning: {
        color: "#EF4444",
        fontWeight: "700",
        marginBottom: 8
    },

    desc: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
        marginBottom: 20
    },

    removeBtn: {
        backgroundColor: "#EF4444",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center"
    },

    removeText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700"
    }

});