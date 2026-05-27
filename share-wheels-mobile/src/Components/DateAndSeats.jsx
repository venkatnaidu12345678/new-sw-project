import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import CalenderRange from "./CalenderRange";
import person from "../assets/person.png";
import seatsicon from "../assets/seatsicon.png";
import calendar from "../assets/calender.png";
import { validateSeats } from "../Utils";
import { parseLocalDate } from "../Utils/dateUtils";

const DateAndSeats = ({ rideData, updateRideData, submitted, embedded = false }) => {

  const seats = parseInt(rideData.availableSeats || "1");

  // ✅ Track user interaction
  const [touched, setTouched] = useState({
    dateStart: false,
    dateEnd: false,
    seats: false,
  });

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const validateDateRange = () => {
    const start = parseLocalDate(rideData.dateStart);
    const end = parseLocalDate(rideData.dateEnd);
    if (!start) return "Start date is required";
    if (!end) return "End date is required";
    if (start < today) return "Start date cannot be in the past";
    if (end < start) return "End date must be on/after start date";
    return "";
  };

  const dateError =
    submitted || touched.dateStart || touched.dateEnd ? validateDateRange() : "";

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
          embedded && styles.cardEmbedded,
          (submitted || touched.dateStart || touched.dateEnd) &&
            !isDateValid &&
            styles.errorBorder
        ]}>
          <View style={styles.header}>
            <Image source={calendar} style={styles.cardIcon} />
            <Text style={styles.sectionLabel}>
              Date range
              {(submitted || touched.dateStart || touched.dateEnd) &&
                !isDateValid && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <CalenderRange
              rideData={rideData}
              updateRideData={(key, value) => {
                updateRideData(key, value);
                if (key === "dateStart") {
                  setTouched((prev) => ({ ...prev, dateStart: true }));
                }
                if (key === "dateEnd") {
                  setTouched((prev) => ({ ...prev, dateEnd: true }));
                }
              }}
              startLabel="From date"
              endLabel="To date"
            />
          </View>

          <Text style={styles.errorText}>
            {submitted || touched.dateStart || touched.dateEnd
              ? dateError || " "
              : " "}
          </Text>
        </View>

        {/* -------- SEATS -------- */}
        <View style={[
          styles.card,
          embedded && styles.cardEmbedded,
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
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardEmbedded: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    minHeight: 130,
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