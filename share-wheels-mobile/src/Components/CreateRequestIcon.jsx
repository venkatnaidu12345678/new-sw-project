import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import rideIcon from "../assets/ride.png";
import passengerIcon from "../assets/passenger.png";
import couriericon from "../assets/couriericon.png";
import { LAYOUT, scale } from "../theme/layout";
const CreateOptionsCard = () => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1 }}>
      {/* Overlay */}
      {visible && (
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        />
      )}
      {/* Popup Card */}
      {visible && (
        <View style={styles.card}>
          <Option
            icon={rideIcon}
            bg="#EEF4FF"
            title="Ride"
            subtitle="Create a ride as a driver"
            onPress={() => {
              setVisible(false);
              navigation.navigate("CreateRide");
            }}
          />
          <Option
            icon={passengerIcon}
            bg="#EAFBF1"
            title="Passenger Request"
            subtitle="Join as a passenger"
            onPress={() => {
              setVisible(false);
              navigation.navigate("PassengerRequest");
            }}
            
          />
          <Option
            icon={couriericon}
            bg="#FFF4EA"
            title="Courier Request"
            subtitle="Send a package"
            onPress={() => {
              setVisible(false);
              navigation.navigate("CourierRequest");
            }}
          />
        </View>
      )}
      {/* Floating + Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(!visible)}
        activeOpacity={0.8}
      >
        <Text style={styles.plus}>+</Text>
      </TouchableOpacity>
    </View>
  );
};
const Option = ({ icon, title, subtitle, bg, onPress }) => (
  <TouchableOpacity
    style={[styles.option, { backgroundColor: bg }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.iconWrap}>
      <Image source={icon} style={styles.icon} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);
export default CreateOptionsCard;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  card: {
    position: "absolute",
    bottom: 150,
    right: 20,
    width: 280,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    elevation: 10,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },

  iconWrap: {
    width: 46,
    height: 46,
    marginRight: 10,
    elevation: 2,
  },

  icon: {
    width: 46,
    height: 46,
    resizeMode: "contain",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  sub: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: LAYOUT.sizes.fabSize,
    height: LAYOUT.sizes.fabSize,
    borderRadius: LAYOUT.sizes.fabSize / 2,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  plus: {
    fontSize: scale(28),
    color: "#fff",
    lineHeight: scale(28),
  },
});
