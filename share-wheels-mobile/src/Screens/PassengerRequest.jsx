import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

/* ICON */
import ScreenHeader from "../Components/ui/ScreenHeader";

/* COMPONENTS */
import ToggleComponent from "../Components/ToggleComponent";
import DateAndSeats from "../Components/DateAndSeats";
import FixedButton from "../Components/FixedButton";
import FromToInput from "../Components/FromToInput";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";

/* API */
import { createpassengerrequest } from "../ApiService/ridesApiServices";
import { validateLocation, validatePrice } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const PassengerRequest = () => {
  const navigation = useNavigation();
  const formRef = useRef();

  const [payload, setPayload] = useState({
    from: "",
    to: "",
    ride_need_date: "",
    seats_needed: 1,
    date: "",
    luggage_included: true,
    amount_will: "",
  });

  const updateRideData = (key, value) => {
    setPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* ---------------- FIELDS ---------------- */
  const fields = [
    {
      key: "from",
      label: "From",
      placeholder: "Enter pickup location",
      value: payload.from,
      onChangeText: (text) => updateRideData("from", text),
      rules: [(v) => validateLocation(v, "From")],
    },
    {
      key: "to",
      label: "To",
      placeholder: "Enter drop location",
      value: payload.to,
      onChangeText: (text) => updateRideData("to", text),
      rules: [(v) => validateLocation(v, "To")],
    },
  ];

  /* ---------------- SUBMIT ---------------- */
  const handleCreateRequest = async () => {
    const isValid = formRef.current?.validate();
    if (!isValid) return;

    if (!payload.date) {
      Alert.alert("Error", "Please select date");
      return;
    }

    if (!payload.seats_needed) {
      Alert.alert("Error", "Seats required");
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
        ride_need_date: payload.date,
        amount_will: Number(payload.amount_will),
      };

      const response = await createpassengerrequest(token, finalPayload);

      Alert.alert(
        "Success",
        response?.message || "Request created successfully",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Request"),
          },
        ]
      );
    } catch (error) {
      console.log("❌ Passenger Request Error:", error);
      Alert.alert("Error", error?.message || "Failed to create request");
    }
  };

  return (
    <KeyboardAwareScreen
      style={styles.safe}
      scrollable
      contentContainerStyle={styles.container}
    >

        <ScreenHeader
          title="Create Passenger Request"
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Request");
            }
          }}
        />

        {/* FORM TITLE */}
       

        {/* FROM + TO */}
        <FromToInput ref={formRef} fields={fields} />

        {/* DATE + SEATS */}
        <DateAndSeats
          rideData={payload}
          updateRideData={updateRideData}
        />

        {/* LUGGAGE */}
        <ToggleComponent
          title="Luggage Included"
          value={payload.luggage_included}
          onChange={(value) =>
            updateRideData("luggage_included", value)
          }
        />

        {/* PRICE */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Offered Amount (₹)</Text>
          <TextInput
            placeholder="Enter amount you will pay"
            placeholderTextColor={INPUT_COLORS.placeholder}
            keyboardType="numeric"
            style={styles.priceInput}
            value={payload.amount_will}
            onChangeText={(text) =>
              updateRideData("amount_will", text.replace(/[^0-9]/g, ""))
            }
          />
        </View>

        {/* BUTTON */}
      <FixedButton title="Create" onPress={handleCreateRequest} />
    </KeyboardAwareScreen>
  );
};

export default PassengerRequest;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  backIcon: {
    width: 49,
    height: 49,
    resizeMode: "contain",
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginLeft: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },

  priceCard: {
    marginTop: 16,
    marginBottom: 8,
  },

  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  priceInput: {
    height: 48,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: INPUT_COLORS.background,
    color: INPUT_COLORS.text,
    fontSize: 15,
  },
});