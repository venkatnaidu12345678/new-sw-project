import React, { useState, useRef, useMemo } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import ScreenHeader from "../Components/ui/ScreenHeader";
import ToggleComponent from "../Components/ToggleComponent";
import DateAndSeats from "../Components/DateAndSeats";
import FixedButton from "../Components/FixedButton";
import FromToInput from "../Components/FromToInput";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import {
  RequestHero,
  RequestSection,
  RequestPriceInput,
} from "../Components/ui/RequestFormUI";

import { createpassengerrequest } from "../ApiService/ridesApiServices";
import { validateLocation, validatePrice } from "../Utils";
import { PASSENGER_THEME as T } from "../theme/requestFormTheme";
import { DS } from "../theme/designSystem";

const PassengerRequest = () => {
  const navigation = useNavigation();
  const formRef = useRef();
  const [submitted, setSubmitted] = useState(false);

  const [payload, setPayload] = useState({
    from: "",
    to: "",
    ride_need_date: "",
    seats_needed: 1,
    dateStart: "",
    dateEnd: "",
    luggage_included: true,
    amount_will: "",
  });

  const updatePayload = (key, value) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const scheduleData = useMemo(
    () => ({
      ...payload,
      availableSeats: String(payload.seats_needed || 1),
    }),
    [payload]
  );

  const updateScheduleData = (key, value) => {
    if (key === "availableSeats") {
      setPayload((prev) => ({
        ...prev,
        seats_needed: Number(value) || 1,
      }));
      return;
    }
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const fields = [
    {
      key: "from",
      label: "From",
      placeholder: "Enter starting location",
      value: payload.from,
      onChangeText: (text) => updatePayload("from", text),
      rules: [(v) => validateLocation(v, "From")],
    },
    {
      key: "to",
      label: "To",
      placeholder: "Enter destination",
      value: payload.to,
      onChangeText: (text) => updatePayload("to", text),
      rules: [(v) => validateLocation(v, "To")],
    },
  ];

  const handleCreateRequest = async () => {
    setSubmitted(true);

    const isValid = formRef.current?.validate();
    if (!isValid) {
      Alert.alert("Check your details", "Please fill in From and To locations.");
      return;
    }

    if (!payload.dateStart || !payload.dateEnd) {
      Alert.alert("Check your details", "Please select a date range.");
      return;
    }

    if (!payload.seats_needed) {
      Alert.alert("Check your details", "Seats required.");
      return;
    }

    const priceError = validatePrice(payload.amount_will);
    if (priceError) {
      Alert.alert("Validation", priceError);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      const finalPayload = {
        ...payload,
        ride_need_date: payload.dateStart,
        amount_will: Number(payload.amount_will),
        date: {
          startDate: payload.dateStart,
          endDate: payload.dateEnd,
        },
      };

      const response = await createpassengerrequest(token, finalPayload);

      Alert.alert(
        "Request posted",
        response?.message || "Passenger request created successfully.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Request"),
          },
        ]
      );
    } catch (error) {
      console.log("Passenger Request Error:", error);
      Alert.alert("Error", error?.message || "Failed to create request");
    }
  };

  return (
    <>
      <KeyboardAwareScreen
        style={{ flex: 1, backgroundColor: T.pageBg }}
        scrollable
        contentContainerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingTop: DS.spacing.md,
          paddingBottom: 120,
        }}
      >
        <ScreenHeader
          title="Passenger request"
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Request");
          }}
        />

        <RequestHero
          theme={T}
          icon="person"
          title="Need a ride?"
          subtitle="Tell drivers where you're going, when, and how much you'll pay per seat."
          pills={["Share costs", "Flexible dates"]}
        />

        <RequestSection
          theme={T}
          accent={T.sections.route}
          title="Route"
          subtitle="From and To locations"
        >
          <FromToInput ref={formRef} fields={fields} variant="route" />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.schedule}
          title="When & seats"
          subtitle="Date range and seats you need"
        >
          <DateAndSeats
            rideData={scheduleData}
            updateRideData={updateScheduleData}
            submitted={submitted}
            embedded
          />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.preferences}
          title="Preferences"
          subtitle="Luggage and comfort"
        >
          <ToggleComponent
            title="Luggage included"
            subtitle="Let drivers know you're carrying bags"
            icon={require("../assets/courier.png")}
            iconBg="#FEF3C7"
            value={payload.luggage_included}
            onChange={(value) => updatePayload("luggage_included", value)}
            compact
          />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.pricing}
          title="Your offer"
          subtitle="Amount you're willing to pay"
          style={{ marginBottom: DS.spacing.sm }}
        >
          <RequestPriceInput
            theme={T}
            value={payload.amount_will}
            onChangeText={(text) =>
              updatePayload("amount_will", text.replace(/[^0-9]/g, ""))
            }
            placeholder="Enter amount per seat (₹)"
          />
        </RequestSection>
      </KeyboardAwareScreen>

      <FixedButton title="Post request" onPress={handleCreateRequest} />
    </>
  );
};

export default PassengerRequest;
