import React, { useState, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import FromToInput from "../Components/FromToInput";
import CalenderRange from "../Components/CalenderRange";
import FixedButton from "../Components/FixedButton";
import ImagePicker from "../Components/ImagePicker";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import ScreenHeader from "../Components/ui/ScreenHeader";
import {
  RequestHero,
  RequestSection,
  RequestPriceInput,
  StyledTextInput,
  StyledPicker,
  StyledField,
} from "../Components/ui/RequestFormUI";

import { courierRequest } from "../ApiService/ridesApiServices";
import { validateLocation, validatePrice } from "../Utils";
import { COURIER_THEME as T } from "../theme/requestFormTheme";
import { DS } from "../theme/designSystem";

const TIME_SLOTS = [
  { label: "Select time slot", value: "" },
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
];

const COURIER_TYPES = [
  { label: "Select courier type", value: "" },
  { label: "Document", value: "document" },
  { label: "Parcel", value: "parcel" },
  { label: "Package", value: "package" },
];

const CourierRequest = () => {
  const navigation = useNavigation();
  const fromToRef = useRef();

  const [payload, setPayload] = useState({
    from: "",
    to: "",
    courier_type: "",
    what_to_deliver: "",
    courier_img: null,
    amount_will: "",
    dateStart: "",
    dateEnd: "",
    timeSlot: "",
    receiver_name: "",
    receiver_mobile: "",
    receiver_alternate_mobile: "",
    receiver_address: "",
  });

  const updatePayload = (key, value) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const fields = [
    {
      key: "from",
      label: "From",
      placeholder: "Pickup location",
      value: payload.from,
      onChangeText: (text) => updatePayload("from", text),
      rules: [(v) => validateLocation(v, "From")],
    },
    {
      key: "to",
      label: "To",
      placeholder: "Delivery destination",
      value: payload.to,
      onChangeText: (text) => updatePayload("to", text),
      rules: [(v) => validateLocation(v, "To")],
    },
  ];

  const handleCreateRequest = async () => {
    const routeValid = fromToRef.current?.validate?.() ?? true;
    if (!routeValid) {
      Alert.alert("Check your details", "Please fill in From and To locations.");
      return;
    }

    if (!payload.receiver_name?.trim() || !payload.receiver_mobile?.trim()) {
      Alert.alert("Validation", "Receiver name and mobile are required.");
      return;
    }

    if (!payload.dateStart || !payload.dateEnd) {
      Alert.alert("Validation", "Please select a date range.");
      return;
    }

    if (!payload.timeSlot) {
      Alert.alert("Validation", "Please select a time slot.");
      return;
    }

    if (!payload.courier_type) {
      Alert.alert("Validation", "Please select courier type.");
      return;
    }

    const priceError = validatePrice(payload.amount_will);
    if (priceError) {
      Alert.alert("Validation", priceError);
      return;
    }

    if (!payload.courier_img) {
      Alert.alert("Required", "Please upload a photo of the parcel.");
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
        amount_will: Number(payload.amount_will),
        date: {
          startDate: payload.dateStart,
          endDate: payload.dateEnd,
        },
      };

      const response = await courierRequest(token, finalPayload);

      Alert.alert(
        "Request posted",
        response?.message || "Courier request created successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              setPayload({
                from: "",
                to: "",
                courier_type: "",
                what_to_deliver: "",
                courier_img: null,
                amount_will: "",
                dateStart: "",
                dateEnd: "",
                timeSlot: "",
                receiver_name: "",
                receiver_mobile: "",
                receiver_alternate_mobile: "",
                receiver_address: "",
              });
              navigation.navigate("Request", { activeTab: "courier" });
            },
          },
        ]
      );
    } catch (error) {
      console.log("Courier Request Error:", error);
      Alert.alert("Error", "Failed to create request");
    }
  };

  const dateAccent = {
    bg: T.date.bg,
    border: T.date.border,
    icon: T.date.icon,
    label: T.date.icon,
    surface: T.surface,
  };

  const pickerAccent = {
    bg: T.picker.bg,
    border: T.picker.border,
    icon: T.picker.icon || T.heroIcon,
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
          title="Courier request"
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Request");
          }}
        />

        <RequestHero
          theme={T}
          icon="cube"
          title="Send a parcel"
          subtitle="Share pickup, delivery details, and what you're sending with drivers on your route."
          pills={["Documents", "Parcels", "Packages"]}
        />

        <RequestSection
          theme={T}
          accent={T.sections.route}
          title="Route"
          subtitle="From and To for pickup & delivery"
        >
          <FromToInput ref={fromToRef} fields={fields} variant="route" />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.schedule}
          title="Schedule"
          subtitle="When the parcel should be delivered"
        >
          <CalenderRange
            rideData={payload}
            updateRideData={updatePayload}
            startLabel="From date"
            endLabel="To date"
            accent={dateAccent}
          />

          <StyledPicker
            theme={T}
            accent={pickerAccent}
            label="Time slot"
            icon="time-outline"
            selectedValue={payload.timeSlot}
            onValueChange={(v) => updatePayload("timeSlot", v)}
            items={TIME_SLOTS}
          />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.parcel}
          title="Parcel details"
          subtitle="Type, photo, and description"
        >
          <StyledPicker
            theme={T}
            accent={pickerAccent}
            label="Courier type"
            icon="layers-outline"
            selectedValue={payload.courier_type}
            onValueChange={(v) => updatePayload("courier_type", v)}
            items={COURIER_TYPES}
          />

          <ImagePicker
            type="courier"
            onChange={(img) => updatePayload("courier_img", img)}
          />

          <StyledField label="What to deliver" theme={T}>
            <StyledTextInput
              theme={T}
              accent={{ bg: "#FFF7ED", border: "#FED7AA", icon: T.heroIcon }}
              icon="document-text-outline"
              placeholder="Describe the parcel (size, weight, fragile, etc.)"
              multiline
              value={payload.what_to_deliver}
              onChangeText={(text) => updatePayload("what_to_deliver", text)}
            />
          </StyledField>
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.pricing}
          title="Your offer"
          subtitle="Amount you'll pay for delivery"
        >
          <RequestPriceInput
            theme={T}
            label="Delivery amount (₹)"
            value={payload.amount_will}
            onChangeText={(text) =>
              updatePayload("amount_will", text.replace(/[^0-9]/g, ""))
            }
            placeholder="Enter delivery amount (₹)"
          />
        </RequestSection>

        <RequestSection
          theme={T}
          accent={T.sections.receiver}
          title="Receiver"
          subtitle="Who will receive the parcel"
          style={{ marginBottom: DS.spacing.sm }}
        >
          <StyledTextInput
            theme={T}
            accent={{ bg: "#EEF2FF", border: "#C7D2FE", icon: "#4F46E5" }}
            icon="person-outline"
            placeholder="Receiver full name"
            value={payload.receiver_name}
            onChangeText={(text) => updatePayload("receiver_name", text)}
          />

          <StyledTextInput
            theme={T}
            accent={{ bg: "#EEF2FF", border: "#C7D2FE", icon: "#4F46E5" }}
            icon="call-outline"
            placeholder="Receiver mobile (10 digits)"
            keyboardType="phone-pad"
            value={payload.receiver_mobile}
            onChangeText={(text) =>
              updatePayload("receiver_mobile", text.replace(/[^0-9]/g, ""))
            }
            maxLength={15}
          />

          <StyledTextInput
            theme={T}
            accent={{ bg: "#F8FAFC", border: "#E2E8F0", icon: T.textMuted }}
            icon="call-outline"
            placeholder="Alternate mobile (optional)"
            keyboardType="phone-pad"
            value={payload.receiver_alternate_mobile}
            onChangeText={(text) =>
              updatePayload(
                "receiver_alternate_mobile",
                text.replace(/[^0-9]/g, "")
              )
            }
            maxLength={15}
          />

          <StyledTextInput
            theme={T}
            accent={{ bg: "#EEF2FF", border: "#C7D2FE", icon: "#4F46E5" }}
            icon="location-outline"
            placeholder="Full delivery address"
            multiline
            value={payload.receiver_address}
            onChangeText={(text) => updatePayload("receiver_address", text)}
          />
        </RequestSection>
      </KeyboardAwareScreen>

      <FixedButton title="Post request" onPress={handleCreateRequest} />
    </>
  );
};

export default CourierRequest;
