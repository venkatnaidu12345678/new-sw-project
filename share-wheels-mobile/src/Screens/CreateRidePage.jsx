import React, { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import CreateRideComponentOne from "../Components/CreateRideComponentOne";
import AddVehicleModal from "../Components/AddVehicleModal";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import ScreenHeader from "../Components/ui/ScreenHeader";
import FixedButton from "../Components/FixedButton";

import { createRideApi, userProfile } from "../ApiService/ridesApiServices";
import { profileData } from "../Navigation/AuthNavigator";
import { validatePrice, validateSeats } from "../Utils";
import { DS } from "../theme/designSystem";
import { CR } from "../theme/createRideTheme";

const hasCompleteVehicle = (info) =>
  !!(info?.vehicleCompany?.trim() && info?.vehicleModel?.trim());

const CreateRidePage = () => {
  const navigation = useNavigation();
  const formRef = useRef(null);
  const { setRefreshUpcomingrides, ProfileDetails, SetProfileDetails } =
    profileData();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const [rideData, setRideData] = useState({
    from: "",
    to: "",
    rideType: "Long",
    availableSeats: "1",
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
    setRideData((prev) => ({ ...prev, [field]: value }));
  };

  const openVehicleForm = () => setShowVehicleForm(true);

  const validateSchedule = () => {
    if (!rideData.date) {
      return "Please select a ride date";
    }
    if (!rideData.startTime) {
      return "Please select a departure time";
    }
    const seatsErr = validateSeats(rideData.availableSeats);
    if (seatsErr) return seatsErr;
    const priceErr = validatePrice(rideData.ride_amount);
    if (priceErr) return priceErr;
    return null;
  };

  const handlePress = async () => {
    setSubmitted(true);

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

    const formOk = formRef.current?.validate?.() ?? true;
    const scheduleErr = validateSchedule();
    if (!formOk || scheduleErr) {
      Alert.alert(
        "Check your details",
        scheduleErr || "Please fill in all required fields."
      );
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const payload = {
        from: rideData.from.trim(),
        to: rideData.to.trim(),
        date: rideData.date,
        startTime: rideData.startTime,
        availableSeats: Number(rideData.availableSeats) || 1,
        ride_amount: Number(rideData.ride_amount),
        AlternatePhoneNumber: rideData.AlternatePhoneNumber?.trim() || undefined,
        CanCarryCourier: rideData.CanCarryCourier,
        QuickReserve: rideData.QuickReserve,
        rideType: rideData.rideType,
      };

      const response = await createRideApi(token, payload);

      if (response?.success) {
        Alert.alert("Ride published", "Your ride is live. Passengers can now find and join it.", [
          {
            text: "OK",
            onPress: () => {
              setRefreshUpcomingrides((prev) => !prev);
              navigation.navigate("Navigator", { screen: "Home" });
            },
          },
        ]);
      } else {
        const msg = (response?.message || response?.error || "").toLowerCase();
        if (msg.includes("vehicle")) {
          openVehicleForm();
        } else {
          Alert.alert("Error", response?.message || "Failed to create ride");
        }
      }
    } catch (error) {
      console.log("Create Ride Error:", error);
      Alert.alert("Error", "Something went wrong while creating the ride");
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleAdded = async () => {
    await refreshProfile();
    Alert.alert("Success", "Vehicle saved. You can create your ride now.");
  };

  return (
    <>
      <KeyboardAwareScreen
        style={{ flex: 1, backgroundColor: CR.pageBg }}
        scrollable
        header={
          <ScreenHeader
            title="Create ride"
            backgroundColor={CR.pageBg}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate("Navigator", { screen: "Home" });
            }}
          />
        }
        headerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingTop: DS.spacing.md,
          backgroundColor: CR.pageBg,
        }}
        contentContainerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingBottom: 120,
        }}
      >
        <CreateRideComponentOne
          ref={formRef}
          rideData={rideData}
          updateRideData={updateRideData}
          submitted={submitted}
          vehicleInfo={vehicleInfo}
          userName={userName}
          onPressAddVehicle={openVehicleForm}
        />
      </KeyboardAwareScreen>

      <FixedButton
        title="Publish ride"
        onPress={handlePress}
        loading={loading}
        disabled={loading}
      />

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
