import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import SupportIcon from "../assets/supporticon.png";

const SupportCard = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate("ChartBoat")}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        <Image source={SupportIcon} style={styles.icon} />
      </View>

      <View style={styles.textWrapper}>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>Get help with your rides</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
};

export default SupportCard;
const styles = StyleSheet.create({
row: {
  flexDirection: "row",
  alignItems: "center",
  padding: 20,
  backgroundColor: "white",
  margin: 20,
  borderRadius: 10,

  // iOS shadow (strong)
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 8,

  // Android shadow (strong)
  elevation: 10,
},
  iconWrapper: {
    width: 48,
    height: 48,
    //borderRadius: 24,
   // backgroundColor: "#4F39F6", // fallback color
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    // optional gradient simulation
  },
  icon: {
    width: 50,
    height: 50,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: "#9CA3AF",
  },
});
