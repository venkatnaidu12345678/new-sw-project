import React, { useState, useRef, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";

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

import {
  courierRequest,
  updateMyCourierRequest,
} from "../ApiService/ridesApiServices";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { validateLocation, validatePrice } from "../Utils";
import { getCourierTheme } from "../theme/requestFormTheme";
import { DS } from "../theme/designSystem";
import { useTheme } from "../context/ThemeContext";
import { useLookupOptions } from "../hooks/useLookupOptions";
import {
  alertError,
  alertValidation,
  showAppToast,
} from "../Utils/appAlert";

const EMPTY_COURIER_PAYLOAD = {
  from: "",
  to: "",
  courier_type: "",
  what_to_deliver: "",
  courier_img: null,
  amount_will: "",
  dateStart: "",
  dateEnd: "",
  receiver_name: "",
  receiver_mobile: "",
  receiver_alternate_mobile: "",
  receiver_address: "",
};

const goToMyRequestsTab = (navigation, activeTab) => {
  navigation.navigate("Navigator", {
    screen: "Request",
    params: { activeTab },
  });
};

const CourierRequest = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const T = useMemo(() => getCourierTheme(colors), [colors]);
  const { pickerItems: courierTypeItems } = useLookupOptions(
    "courier_type",
    "Select courier type"
  );
  const fromToRef = useRef();
  const [formResetKey, setFormResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const editRequest = route?.params?.editRequest || null;
  const isEditMode = !!editRequest?.requestId;

  const [payload, setPayload] = useState({ ...EMPTY_COURIER_PAYLOAD });

  useEffect(() => {
    if (!isEditMode) return;
    const raw = editRequest?.raw || {};
    const receiver = raw.receiver || {};
    setPayload((prev) => ({
      ...prev,
      from: String(editRequest?.from || ""),
      to: String(editRequest?.to || ""),
      courier_type: String(raw.courier_type || ""),
      what_to_deliver: String(raw.what_to_deliver || raw.parcel || ""),
      courier_img: raw.courier_img || null,
      amount_will: String(raw.amount_will || raw.amount || ""),
      dateStart: raw.date?.startDate || raw.date || "",
      dateEnd: raw.date?.endDate || raw.date?.startDate || raw.date || "",
      receiver_name: String(receiver.name || ""),
      receiver_mobile: String(receiver.mobile || ""),
      receiver_alternate_mobile: String(
        receiver.alternate_mobile || receiver.alternateMobile || ""
      ),
      receiver_address: String(receiver.Address || receiver.address || ""),
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
      placeholder: "Select pickup location from list",
      value: payload.from,
      onChangeText: (text) => updatePayload("from", text),
      rules: [(v) => validateLocation(v, "From")],
    },
    {
      key: "to",
      label: "To",
      placeholder: "Select delivery destination from list",
      value: payload.to,
      onChangeText: (text) => updatePayload("to", text),
      rules: [(v) => validateLocation(v, "To")],
    },
  ];

  const handleCreateRequest = async () => {
    const routeValid = fromToRef.current?.validate?.() ?? true;
    if (!routeValid) {
      alertValidation("Please select From and To from the suggestions list.");
      return;
    }

    if (!payload.receiver_name?.trim() || !payload.receiver_mobile?.trim()) {
      alertValidation("Receiver name and mobile are required.");
      return;
    }

    if (!payload.dateStart || !payload.dateEnd) {
      alertValidation("Please select a date range.");
      return;
    }

    if (!payload.courier_type) {
      alertValidation("Please select courier type.");
      return;
    }

    if (!payload.what_to_deliver?.trim()) {
      alertValidation("Please describe what you are sending.");
      return;
    }

    if (!payload.receiver_address?.trim()) {
      alertValidation("Receiver delivery address is required.");
      return;
    }

    const priceError = validatePrice(payload.amount_will);
    if (priceError) {
      alertValidation(priceError);
      return;
    }

    if (!payload.courier_img) {
      alertValidation("Please upload a photo of the parcel.");
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alertError("User not authenticated", "Sign in required");
        return;
      }

      const receiverMobile = payload.receiver_mobile.trim();
      const finalPayload = {
        from: payload.from.trim(),
        to: payload.to.trim(),
        courier_type: payload.courier_type,
        what_to_deliver: payload.what_to_deliver.trim(),
        courier_img: payload.courier_img,
        amount_will: Number(payload.amount_will),
        date: {
          startDate: payload.dateStart,
          endDate: payload.dateEnd,
        },
        receiver_name: payload.receiver_name.trim(),
        receiver_mobile: receiverMobile,
        receiver_alternate_mobile:
          payload.receiver_alternate_mobile?.trim() || receiverMobile,
        receiver_address: payload.receiver_address.trim(),
      };

      const response = isEditMode
        ? await updateMyCourierRequest(token, editRequest.requestId, finalPayload)
        : await courierRequest(token, finalPayload);

      goToMyRequestsTab(navigation, "Courier");

      showAppToast(
        response?.message ||
          (isEditMode
            ? "Courier request updated successfully."
            : "Courier request created successfully."),
        "success"
      );
    } catch (error) {
      console.log("Courier Request Error:", error);
      alertError(
        getApiErrorMessage(error, "Failed to create courier request")
      );
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
        header={
          <ScreenHeader
            title={isEditMode ? "Edit courier request" : "Courier request"}
            backgroundColor={T.pageBg}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else goToMyRequestsTab(navigation, "Courier");
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
          <FromToInput
            key={`courier-route-${formResetKey}`}
            ref={fromToRef}
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
          subtitle="When the parcel should be delivered"
        >
          <CalenderRange
            key={`courier-dates-${formResetKey}`}
            rideData={payload}
            updateRideData={updatePayload}
            startLabel="From date"
            endLabel="To date"
            accent={dateAccent}
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
            items={courierTypeItems}
          />

          <ImagePicker
            key={`courier-img-${formResetKey}`}
            type="courier"
            resetKey={formResetKey}
            onChange={(img) => updatePayload("courier_img", img)}
          />

          <StyledField label="What to deliver" theme={T}>
            <StyledTextInput
              theme={T}
              accent={{ bg: T.picker.bg, border: T.picker.border, icon: T.heroIcon }}
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
            accent={{ bg: T.sections.receiver.bg, border: T.cardBorder, icon: T.sections.receiver.color }}
            icon="person-outline"
            placeholder="Receiver full name"
            value={payload.receiver_name}
            onChangeText={(text) => updatePayload("receiver_name", text)}
          />

          <StyledTextInput
            theme={T}
            accent={{ bg: T.sections.receiver.bg, border: T.cardBorder, icon: T.sections.receiver.color }}
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
            accent={{ bg: T.surface, border: T.cardBorder, icon: T.textMuted }}
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
            accent={{ bg: T.sections.receiver.bg, border: T.cardBorder, icon: T.sections.receiver.color }}
            icon="location-outline"
            placeholder="Full delivery address"
            multiline
            value={payload.receiver_address}
            onChangeText={(text) => updatePayload("receiver_address", text)}
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

export default CourierRequest;
