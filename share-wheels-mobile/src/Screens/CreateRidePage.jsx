import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import CreateRideComponentOne from "../Components/CreateRideComponentOne";
import CreateRideComponentTwo from "../Components/CreateRideComponentTwo";
import AddVehicleModal from "../Components/AddVehicleModal";
import BackButton from "../Components/BackButton";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createRideApi } from "../ApiService/ridesApiServices";
import { profileData } from "../Navigation/AuthNavigator";

const CreateRidePage = () => {
  const navigation = useNavigation();

  const { setRefreshUpcomingrides } = profileData();

  const [showSecond, setShowSecond] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicle, setVehicle] = useState(null);

  const [rideData, setRideData] = useState({
    from: "",
    to: "",
    rideType: "Long",
    availableSeats: "",
    ride_amount: "",
    date: "",
    AlternatePhoneNumber: "",
    startTime: "",
    CanCarryCourier: false,
    QuickReserve: false,
  });

  const updateRideData = (field, value) => {
    setRideData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePress = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const response = await createRideApi(token, rideData);

      if (response?.success) {
        Alert.alert(
          "Success",
          "Ride Created Successfully",
          [
            {
              text: "OK",
              onPress: () => {
                // 🔄 Refresh dashboard rides
                setRefreshUpcomingrides((prev) => !prev);

                // 🚀 Navigate to Dashboard (Home tab)
                navigation.navigate("Navigator", {
                  screen: "Home",
                });
              },
            },
          ]
        );
      } else {
        if (
          response?.message?.toLowerCase().includes("vehicle") ||
          response?.error?.toLowerCase().includes("vehicle")
        ) {
          setShowVehicleForm(true);
        } else {
          Alert.alert("Error", response?.message || "Failed to create ride");
        }
      }
    } catch (error) {
      console.log("Create Ride Error:", error);
      Alert.alert("Error", "Something went wrong while creating the ride");
    }
  };

  return (
    <View style={{ flex: 1 }}>
       <View style={styles.header}>
    <BackButton />
    <Text style={styles.headerTitle}>Create Ride</Text>
  </View>
      {showSecond ? (
        <CreateRideComponentTwo
          rideData={rideData}
          updateRideData={updateRideData}
        />
      ) : (
        <CreateRideComponentOne
          rideData={rideData}
          updateRideData={updateRideData}
        />
      )}

      {/* CREATE BUTTON */}
      <View style={[styles.fixedButton,styles.card, styles.fullWidth]}>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Create Ride</Text>
        </TouchableOpacity>
      </View>
     

      {/* ADD VEHICLE MODAL */}
      <AddVehicleModal
        visible={showVehicleForm}
        onClose={() => setShowVehicleForm(false)}
        onVehicleAdded={(v) => {
          setVehicle(v);
          setShowVehicleForm(false);
          Alert.alert("Success", "Vehicle added. Try creating the ride again.");
        }}
      />
    </View>
  );
};

export default CreateRidePage;

const styles = StyleSheet.create({
  fixedButton: {
     backgroundColor: "white",
    // paddingTop:0,
  },
  card:{
    width: "48%", padding: 16, borderRadius: 16,
  },
  fullWidth:{
    width:'100%',
  },
  header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingVertical: 12,
  backgroundColor: "#fff",
  elevation: 2,
},

headerTitle: {
  fontSize: 20,
  fontWeight: "700",
  marginLeft: 10,
  color: "#111827",
},

  button: {
    backgroundColor: "#2619DA",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});