import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import DateTimePicker from "@react-native-community/datetimepicker";
import FromToInput from "../Components/FromToInput.jsx";
import VehicleInfo from "./VehicleInfo.jsx";
import DateAndSeats from "./DateAndSeats.jsx";
import ToggleComponent from "./ToggleComponent";
import PriceCard from "./PriceCard.jsx";
import { validators } from "../Utils.js";

const CreateRideComponentOne = ({
  rideData,
  updateRideData,
  submitted,
  vehicleInfo,
  userName,
  onPressAddVehicle,
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [touchedTime, setTouchedTime] = useState(false);

  // ✅ Fields
  const fields = useMemo(
    () => [
      {
        key: "from",
        label: "From",
        placeholder: "Enter starting location",
        value: rideData.from,
        onChangeText: (text) => updateRideData("from", text),
        rules: [(v) => validators.required(v, "From")],
      },
      {
        key: "to",
        label: "To",
        placeholder: "Enter stop location",
        value: rideData.to,
        onChangeText: (text) => updateRideData("to", text),
        rules: [(v) => validators.required(v, "To")],
      },
      {
        key: "AlternatePhoneNumber",
        label: "Alternate Phone Number",
        placeholder: "Enter alternate phone number",
        value: rideData.AlternatePhoneNumber,
        onChangeText: (text) =>
          updateRideData("AlternatePhoneNumber", text),
      },
    ],
    [rideData, updateRideData]
  );

  // ✅ Time Picker Handler
  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    if (event?.type === "set" && selectedTime) {
      setTouchedTime(true);
      updateRideData("startTime", selectedTime.toISOString());
    }
  };

  // ✅ Validation
  const timeError =
    submitted || touchedTime
      ? validators.required(rideData.startTime, "Start Time")
      : "";

  const isTimeValid = !timeError;

  return (
    <View style={styles.mainContainer}>
      <KeyboardAwareScreen scrollable contentContainerStyle={styles.scrollContent}>
          <VehicleInfo
            vehicleInfo={vehicleInfo}
            userName={userName}
            onPressAdd={onPressAddVehicle}
          />

          <FromToInput fields={fields} />

          {/* 🔹 Start Time */}
          <Text style={styles.label}>
            Start Time
            {(submitted || touchedTime) && !isTimeValid && (
              <Text style={styles.required}> *</Text>
            )}
          </Text>

          <TouchableOpacity
            style={[
              styles.timeBox,
              (submitted || touchedTime) &&
                !isTimeValid &&
                styles.errorBorder,
            ]}
            onPress={() => {
              setTouchedTime(true);
              setShowTimePicker(true);
            }}
          >
            <Text style={styles.timeText}>
              {rideData.startTime
                ? new Date(rideData.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Select time"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.errorText}>
            {(submitted || touchedTime) ? (timeError || " ") : " "}
          </Text>

          {/* 🔹 Date & Seats */}
          <DateAndSeats
            rideData={rideData}
            updateRideData={updateRideData}
            submitted={submitted}
          />

          {/* 🔹 Price */}
          <PriceCard
            rideData={rideData}
            updateRideData={updateRideData}
            submitted={submitted}
          />

          {/* 🔹 Toggles */}
          <ToggleComponent
            title="Can carry courier"
            subtitle="Allow passengers to send packages"
            icon={require("../assets/courier.png")}
            iconBg="#FFF3E8"
            value={rideData.CanCarryCourier}
            onChange={(value) =>
              updateRideData("CanCarryCourier", value)
            }
          />

          <ToggleComponent
            title="Quick Reserve"
            subtitle="Requests accepted automatically"
            icon={require("../assets/reverse.png")}
            iconBg="#E6FFFA"
            value={rideData.quickReserve}
            onChange={(value) =>
              updateRideData("quickReserve", value)
            }
          />
      </KeyboardAwareScreen>

      {/* 🔹 Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={
            rideData.startTime
              ? new Date(rideData.startTime)
              : new Date()
          }
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeChange}
        />
      )}
    </View>
  );
};

export default CreateRideComponentOne;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
//paddingTop: 50,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  label: {
    fontSize: 19,
    color: "#050404",
    marginBottom: 6,
    fontWeight: "bold",
  },
  timeBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#fff",
    //marginBottom: 16,
    borderColor:"#0e0c0c",
  },
  timeText: {
    fontSize: 14,
    color: "#111827",
  },
  required: {
  color: "#EF4444",
},

errorBorder: {
  borderColor: "#EF4444",
  borderWidth: 1.5,
},

errorText: {
  color: "#EF4444",
  fontSize: 12,
  marginTop: 6,
  minHeight: 16,
},
});