import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import Calender from "../Components/Calender";
import person from "../assets/person.png";
import seatsicon from "../assets/seatsicon.png";
import calendar from "../assets/calender.png";
import { validateDate, validateSeats } from "../Utils";

const DateAndSeats = ({ rideData, updateRideData, submitted }) => {

  const seats = parseInt(rideData.availableSeats || "1");

  // ✅ Track user interaction
  const [touched, setTouched] = useState({
    date: false,
    seats: false,
  });

  // ✅ Validation logic
  const dateError =
    submitted || touched.date
      ? validateDate(rideData.date)
      : "";

  const seatsError =
    submitted || touched.seats
      ? validateSeats(rideData.availableSeats)
      : "";

  const isDateValid = !dateError;
  const isSeatsValid = !seatsError;

  // ✅ Seat handlers
  const increaseSeats = () => {
    setTouched((prev) => ({ ...prev, seats: true }));
    updateRideData("availableSeats", String(seats + 1));
  };

  const decreaseSeats = () => {
    if (seats > 1) {
      setTouched((prev) => ({ ...prev, seats: true }));
      updateRideData("availableSeats", String(seats - 1));
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.row}>

        {/* -------- DATE -------- */}
        <View style={[
          styles.card,
          (submitted || touched.date) && !isDateValid && styles.errorBorder
        ]}>
          <View style={styles.header}>
            <Image source={calendar} style={styles.cardIcon} />
            <Text style={styles.sectionLabel}>
              Date
              {(submitted || touched.date) && !isDateValid && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Calender
              rideData={rideData}
              updateRideData={(key, value) => {
                updateRideData(key, value);
                setTouched((prev) => ({ ...prev, date: true }));
              }}
              isInvalid={(submitted || touched.date) && !isDateValid}
            />
          </View>

          <Text style={styles.errorText}>
            {(submitted || touched.date) ? (dateError || " ") : " "}
          </Text>
        </View>

        {/* -------- SEATS -------- */}
        <View style={[
          styles.card,
          (submitted || touched.seats) && !isSeatsValid && styles.errorBorder
        ]}>
          <View style={styles.header}>
            <Image source={person} style={styles.cardIcon} />
            <Text style={styles.sectionLabel}>
              Seats
              {(submitted || touched.seats) && !isSeatsValid && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <View style={styles.seatBox}>
              <Image source={seatsicon} style={styles.seatsicon} />

              <TouchableOpacity onPress={decreaseSeats}>
                <Text style={styles.seatBtn}>−</Text>
              </TouchableOpacity>

              <Text style={styles.seatCount}>{seats}</Text>

              <TouchableOpacity onPress={increaseSeats}>
                <Text style={styles.seatBtn}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.errorText}>
            {(submitted || touched.seats) ? (seatsError || " ") : " "}
          </Text>
        </View>

      </View>
    </View>
  );
};

export default DateAndSeats;

const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    minHeight: 140,
    justifyContent: "space-between",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  cardIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    marginRight: 8,
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b0e13",
    
  },

  seatBox: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderColor:"#0e0c0c",
  },

  seatsicon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
    marginRight: 12,
  },

  seatBtn: {
    fontSize: 24,
    color: "#6B7280",
    paddingHorizontal: 10,
  },

  seatCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0b0b0c",
    marginHorizontal: 4,
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