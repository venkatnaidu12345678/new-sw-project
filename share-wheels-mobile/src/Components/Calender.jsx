import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import calendar from "../assets/calender.png";

const Calender = ({ rideData, updateRideData }) => {
  const [showDate, setShowDate] = useState(false);

  const currentDate = rideData.date ? new Date(rideData.date) : new Date();

  // ✅ TODAY (no past dates allowed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const onDateChange = (event, selectedDate) => {
    setShowDate(false);

    if (event?.type === "set" && selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      updateRideData("date", formattedDate);
    }
  };

  return (
    <View style={styles.row}>
      {/* DATE CARD */}
      <View style={styles.card}>
        <View style={styles.header}>
          {/* <Image source={calendar} style={styles.icon} />
          <Text style={styles.label}>Date</Text> */}
        </View>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDate(true)}
        >
          <Text style={styles.text}>
            {rideData.date
              ? new Date(rideData.date).toDateString()
              : "Select Date"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DATE PICKER */}
      {showDate && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          minimumDate={today} // ✅ prevents past dates
          onChange={onDateChange}
        />
      )}
    </View>
  );
};

export default Calender;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  card: {
    width: "98%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  icon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderColor:"#0e0c0c",
  },
  text: {
    fontSize: 14,
    color: "#111827",
  },
});