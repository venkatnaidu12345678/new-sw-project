import React, { useState, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import ScreenHeader from "../Components/ui/ScreenHeader";
import ToggleComponent from "../Components/ToggleComponent";
import CalenderRange from "../Components/CalenderRange";
import FixedButton from "../Components/FixedButton";
import FromToInput from "../Components/FromToInput";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import {
  RequestHero,
  RequestSection,
  RequestPriceInput,
  RequestSeatsStepper,
} from "../Components/ui/RequestFormUI";

import { createpassengerrequest } from "../ApiService/ridesApiServices";
import { validateLocation, validatePrice } from "../Utils";
import { PASSENGER_THEME as T } from "../theme/requestFormTheme";
import { DS } from "../theme/designSystem";

const EMPTY_PASSENGER_PAYLOAD = {
  from: "",
  to: "",
  ride_need_date: "",
  seats_needed: 1,
  dateStart: "",
  dateEnd: "",
  luggage_included: true,
  amount_will: "",
};

const goToMyRequestsTab = (navigation, activeTab) => {
  navigation.navigate("Navigator", {
    screen: "Request",
    params: { activeTab },
  });
};

const PassengerRequest = () => {
  const navigation = useNavigation();
  const formRef = useRef();
  const [formResetKey, setFormResetKey] = useState(0);

  const [payload, setPayload] = useState({ ...EMPTY_PASSENGER_PAYLOAD });

  const updatePayload = (key, value) => {
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
    const isValid = formRef.current?.validate?.();
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

      setPayload({ ...EMPTY_PASSENGER_PAYLOAD });
      setFormResetKey((k) => k + 1);
      goToMyRequestsTab(navigation, "Passenger");

      Alert.alert(
        "Request posted",
        response?.message || "Passenger request created successfully."
      );
    } catch (error) {
      console.log("Passenger Request Error:", error);
      Alert.alert("Error", error?.message || "Failed to create request");
    }
  };

  const dateAccent = {
    bg: T.date.bg,
    border: T.date.border,
    icon: T.date.icon,
    label: T.date.icon,
    surface: T.surface,
  };

  return (
    <>
      <KeyboardAwareScreen
        style={{ flex: 1, backgroundColor: T.pageBg }}
        scrollable
        header={
          <ScreenHeader
            title="Passenger request"
            backgroundColor={T.pageBg}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else goToMyRequestsTab(navigation, "Passenger");
            }}
          />
        }
        headerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingTop: DS.spacing.md,
          backgroundColor: T.pageBg,
        }}
        contentContainerStyle={{
          paddingHorizontal: DS.spacing.screen,
          paddingBottom: 120,
        }}
      >
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
          <FromToInput
            key={`passenger-route-${formResetKey}`}
            ref={formRef}
            fields={fields}
            variant="route"
          />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.schedule}
          title="Schedule"
          subtitle="When you need a ride"
        >
          <CalenderRange
            key={`passenger-dates-${formResetKey}`}
            rideData={payload}
            updateRideData={updatePayload}
            startLabel="From date"
            endLabel="To date"
            accent={dateAccent}
          />
          <RequestSeatsStepper
            theme={T}
            label="Seats needed"
            value={payload.seats_needed}
            onChange={(n) => updatePayload("seats_needed", n)}
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
            label="Amount per seat (₹)"
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
