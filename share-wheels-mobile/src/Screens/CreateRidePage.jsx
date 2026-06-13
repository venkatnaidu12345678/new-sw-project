import React, { useState, useCallback, useRef, useEffect } from "react";
import { BackHandler } from "react-native";
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
import { assertScheduledStartInFuture } from "../Utils/rideSchedule";
import { DS } from "../theme/designSystem";
import { getCreateRideTheme } from "../theme/createRideTheme";
import { useTheme } from "../context/ThemeContext";
import { toCoordsPayload } from "../Utils/placeSuggestions";
import {
  alertError,
  alertSuccess,
  alertValidation,
  showAppAlert,
} from "../Utils/appAlert";

const hasCompleteVehicle = (info) =>
  !!(info?.vehicleCompany?.trim() && info?.vehicleModel?.trim());

const CreateRidePage = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const CR = getCreateRideTheme(colors);
  const formRef = useRef(null);
  const { setRefreshUpcomingrides, ProfileDetails, SetProfileDetails } =
    profileData();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [routePlan, setRoutePlan] = useState(null);
  const [routeMapFullscreen, setRouteMapFullscreen] = useState(false);

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
    const futureErr = assertScheduledStartInFuture(rideData.date, rideData.startTime);
    if (!futureErr.ok) return futureErr.message;
    return null;
  };

  const handlePress = async () => {
    setSubmitted(true);

    if (!hasCompleteVehicle(vehicleInfo)) {
      showAppAlert(
        "Vehicle required",
        "Add your vehicle details before creating a ride.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add vehicle", onPress: openVehicleForm },
        ],
        "warning"
      );
      return;
    }

    const formOk = formRef.current?.validate?.() ?? true;
    const scheduleErr = validateSchedule();
    if (!formOk || scheduleErr) {
      alertValidation(scheduleErr || "Please fill in all required fields.");
      return;
    }

    const hasEndpoints =
      (fromCoords?.lat != null && toCoords?.lat != null) ||
      (rideData.from.trim() && rideData.to.trim());
    if (hasEndpoints && !routePlan?.routePolyline) {
      alertValidation("Select a route on the map before publishing.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alertError("User not authenticated", "Sign in required");
        return;
      }

      const payload = {
        from: rideData.from.trim(),
        to: rideData.to.trim(),
        fromCoords: toCoordsPayload(fromCoords, rideData.from.trim()),
        toCoords: toCoordsPayload(toCoords, rideData.to.trim()),
        date: rideData.date,
        startTime: rideData.startTime,
        availableSeats: Number(rideData.availableSeats) || 1,
        ride_amount: Number(rideData.ride_amount),
        AlternatePhoneNumber: rideData.AlternatePhoneNumber?.trim() || undefined,
        CanCarryCourier: rideData.CanCarryCourier,
        QuickReserve: rideData.QuickReserve,
        rideType: rideData.rideType,
        routePolyline: routePlan?.routePolyline || undefined,
        selectedRouteIndex: routePlan?.selectedRouteIndex ?? 0,
        stopovers: routePlan?.stopovers || [],
      };

      const response = await createRideApi(token, payload);

      if (response?.success) {
        showAppAlert(
          "Ride published",
          "Your ride is live. Passengers can now find and join it.",
          [
            {
              text: "OK",
              onPress: () => {
                setRefreshUpcomingrides((prev) => !prev);
                navigation.navigate("Navigator", { screen: "Home" });
              },
            },
          ],
          "success"
        );
      } else {
        const msg = (response?.message || response?.error || "").toLowerCase();
        if (msg.includes("vehicle")) {
          openVehicleForm();
        } else {
          alertError(response?.message || "Failed to create ride");
        }
      }
    } catch (error) {
      console.log("Create Ride Error:", error);
      alertError("Something went wrong while creating the ride");
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleAdded = async () => {
    await refreshProfile();
    alertSuccess("Vehicle saved. You can create your ride now.");
  };

  useEffect(() => {
    if (!routeMapFullscreen) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setRouteMapFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [routeMapFullscreen]);

  return (
    <>
      <KeyboardAwareScreen
        style={{ flex: 1, backgroundColor: CR.pageBg }}
        scrollable={!routeMapFullscreen}
        scrollViewProps={{ scrollEnabled: !routeMapFullscreen }}
        header={
          routeMapFullscreen ? null : (
            <ScreenHeader
              title="Create ride"
              backgroundColor={CR.pageBg}
              onBack={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate("Navigator", { screen: "Home" });
              }}
            />
          )
        }
        headerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingTop: DS.spacing.md,
          backgroundColor: CR.pageBg,
        }}
        contentContainerStyle={
          routeMapFullscreen
            ? { flexGrow: 1, paddingHorizontal: 0, paddingBottom: 0 }
            : {
                paddingHorizontal: DS.spacing.screen,
                paddingBottom: 120,
              }
        }
      >
        <CreateRideComponentOne
          ref={formRef}
          theme={CR}
          rideData={rideData}
          updateRideData={updateRideData}
          submitted={submitted}
          vehicleInfo={vehicleInfo}
          userName={userName}
          onPressAddVehicle={openVehicleForm}
          fromCoords={fromCoords}
          toCoords={toCoords}
          onRoutePlanChange={setRoutePlan}
          routeMapFullscreen={routeMapFullscreen}
          onRouteMapFullscreenChange={setRouteMapFullscreen}
          onPlaceSelect={(field, place) => {
            if (field === "from") {
              setFromCoords(place);
              setRoutePlan(null);
            }
            if (field === "to") {
              setToCoords(place);
              setRoutePlan(null);
            }
          }}
        />
      </KeyboardAwareScreen>

      {!routeMapFullscreen ? (
        <FixedButton
          title="Publish ride"
          onPress={handlePress}
          loading={loading}
          disabled={loading}
        />
      ) : null}

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
