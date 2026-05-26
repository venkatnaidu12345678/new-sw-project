import React, { useState, useCallback } from "react";

import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";

import { useNavigation, useFocusEffect } from "@react-navigation/native";



import CreateRideComponentOne from "../Components/CreateRideComponentOne";

import CreateRideComponentTwo from "../Components/CreateRideComponentTwo";

import AddVehicleModal from "../Components/AddVehicleModal";

import BackButton from "../Components/BackButton";

import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";



import AsyncStorage from "@react-native-async-storage/async-storage";

import { createRideApi, userProfile } from "../ApiService/ridesApiServices";

import { profileData } from "../Navigation/AuthNavigator";



const hasCompleteVehicle = (info) =>

  !!(info?.vehicleCompany?.trim() && info?.vehicleModel?.trim());



const CreateRidePage = () => {

  const navigation = useNavigation();

  const { setRefreshUpcomingrides, ProfileDetails, SetProfileDetails } =

    profileData();



  const [showSecond, setShowSecond] = useState(false);

  const [showVehicleForm, setShowVehicleForm] = useState(false);



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



  const vehicleInfo = ProfileDetails?.data?.vehicleInfo;

  const userName = ProfileDetails?.data?.personalInfo?.name;



  const refreshProfile = useCallback(async () => {

    try {

      const token = await AsyncStorage.getItem("token");

      if (!token) return;

      const res = await userProfile(token);

      if (res?.data) SetProfileDetails(res);

    } catch (e) {

      console.log("Profile refresh failed:", e);

    }

  }, [SetProfileDetails]);



  useFocusEffect(

    useCallback(() => {

      refreshProfile();

    }, [refreshProfile])

  );



  const updateRideData = (field, value) => {

    setRideData((prev) => ({

      ...prev,

      [field]: value,

    }));

  };



  const openVehicleForm = () => setShowVehicleForm(true);



  const handlePress = async () => {

    if (!hasCompleteVehicle(vehicleInfo)) {

      Alert.alert(

        "Vehicle required",

        "Add your vehicle details before creating a ride.",

        [

          { text: "Cancel", style: "cancel" },

          { text: "Add vehicle", onPress: openVehicleForm },

        ]

      );

      return;

    }



    try {

      const token = await AsyncStorage.getItem("token");



      if (!token) {

        Alert.alert("Error", "User not authenticated");

        return;

      }



      const response = await createRideApi(token, rideData);



      if (response?.success) {

        Alert.alert("Success", "Ride Created Successfully", [

          {

            text: "OK",

            onPress: () => {

              setRefreshUpcomingrides((prev) => !prev);

              navigation.navigate("Navigator", { screen: "Home" });

            },

          },

        ]);

      } else {

        const msg = (

          response?.message ||

          response?.error ||

          ""

        ).toLowerCase();

        if (msg.includes("vehicle")) {

          openVehicleForm();

        } else {

          Alert.alert("Error", response?.message || "Failed to create ride");

        }

      }

    } catch (error) {

      console.log("Create Ride Error:", error);

      Alert.alert("Error", "Something went wrong while creating the ride");

    }

  };



  const handleVehicleAdded = async () => {

    await refreshProfile();

    Alert.alert("Success", "Vehicle saved. You can create your ride now.");

  };



  return (

    <>

      <KeyboardAwareScreen style={styles.page}>

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

            vehicleInfo={vehicleInfo}

            userName={userName}

            onPressAddVehicle={openVehicleForm}

          />

        )}



        <View style={[styles.fixedButton, styles.card, styles.fullWidth]}>

          <TouchableOpacity style={styles.button} onPress={handlePress}>

            <Text style={styles.buttonText}>Create Ride</Text>

          </TouchableOpacity>

        </View>

      </KeyboardAwareScreen>



      <AddVehicleModal

        visible={showVehicleForm}

        onClose={() => setShowVehicleForm(false)}

        existingVehicle={vehicleInfo}

        onVehicleAdded={handleVehicleAdded}

      />

    </>

  );

};



export default CreateRidePage;



const styles = StyleSheet.create({

  page: { flex: 1, backgroundColor: "#F8FAFC" },

  fixedButton: {

    backgroundColor: "white",

  },

  card: {

    width: "48%",

    padding: 16,

    borderRadius: 16,

  },

  fullWidth: {

    width: "100%",

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


