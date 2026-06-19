import React, { useState, useRef, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";

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

import {
  createpassengerrequest,
  updateMyPassengerRequest,
} from "../ApiService/ridesApiServices";
import { validateLocation, validatePrice } from "../Utils";
import { getPassengerTheme } from "../theme/requestFormTheme";
import { DS } from "../theme/designSystem";
import { useTheme } from "../context/ThemeContext";
import {
  alertError,
  alertValidation,
  showAppToast,
} from "../Utils/appAlert";

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
  const route = useRoute();
  const { colors } = useTheme();
  const T = useMemo(() => getPassengerTheme(colors), [colors]);
  const formRef = useRef();
  const [formResetKey, setFormResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const editRequest = route?.params?.editRequest || null;
  const isEditMode = !!editRequest?.requestId;

  const [payload, setPayload] = useState({ ...EMPTY_PASSENGER_PAYLOAD });

  useEffect(() => {
    if (!isEditMode) return;
    setPayload((prev) => ({
      ...prev,
      from: String(editRequest?.from || ""),
      to: String(editRequest?.to || ""),
      seats_needed: Number(editRequest?.seats || 1) || 1,
      dateStart:
        editRequest?.raw?.date ||
        editRequest?.raw?.ride_need_date ||
        "",
      dateEnd:
        editRequest?.raw?.date_end ||
        editRequest?.raw?.date ||
        editRequest?.raw?.ride_need_date ||
        "",
      luggage_included:
        typeof editRequest?.raw?.luggage_included === "boolean"
          ? editRequest.raw.luggage_included
          : true,
      amount_will: String(editRequest?.raw?.amount || editRequest?.amount || ""),
    }));
    setFormResetKey((k) => k + 1);
  }, [isEditMode, editRequest]);

  const updatePayload = (key, value) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const fields = [
    {
      key: "from",
      label: "From",
      placeholder: "Select starting location from list",
      value: payload.from,
      onChangeText: (text) => updatePayload("from", text),
      rules: [(v) => validateLocation(v, "From")],
    },
    {
      key: "to",
      label: "To",
      placeholder: "Select destination from list",
      value: payload.to,
      onChangeText: (text) => updatePayload("to", text),
      rules: [(v) => validateLocation(v, "To")],
    },
  ];

  const handleCreateRequest = async () => {
    const isValid = formRef.current?.validate?.();
    if (!isValid) {
      alertValidation("Please select From and To from the suggestions list.");
      return;
    }

    if (!payload.dateStart || !payload.dateEnd) {
      alertValidation("Please select a date range.");
      return;
    }

    if (!payload.seats_needed) {
      alertValidation("Seats required.");
      return;
    }

    const priceError = validatePrice(payload.amount_will);
    if (priceError) {
      alertValidation(priceError);
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alertError("User not authenticated", "Sign in required");
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

      const response = isEditMode
        ? await updateMyPassengerRequest(token, editRequest.requestId, finalPayload)
        : await createpassengerrequest(token, finalPayload);

      goToMyRequestsTab(navigation, "Passenger");

      showAppToast(
        response?.message ||
          (isEditMode
            ? "Passenger request updated successfully."
            : "Passenger request created successfully."),
        "success"
      );
    } catch (error) {
      console.log("Passenger Request Error:", error);
      alertError(error?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const dateAccent = {
    bg: T.date.bg,
    border: T.date.border,
    icon: T.date.icon,
    label: T.text,
    surface: T.surface,
  };

  return (
    <>
      <KeyboardAwareScreen
        style={{ flex: 1, backgroundColor: T.pageBg }}
        scrollable
        header={
          <ScreenHeader
            title={isEditMode ? "Edit passenger request" : "Passenger request"}
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
            presetConfirmed={
              isEditMode ? { from: true, to: true } : undefined
            }
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

      <FixedButton
        title={isEditMode ? "Save changes" : "Post request"}
        onPress={handleCreateRequest}
        loading={submitting}
        disabled={submitting}
      />
    </>
  );
};

export default PassengerRequest;
