import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/Ionicons";

import { validateSeats, getMaxSeatsForVehicleType } from "../Utils";
import { normalizeVehicleType } from "../hooks/useLookupOptions";
import {
  parseLocalDate,
  formatLocalISODate,
  formatDisplayDate,
} from "../Utils/dateUtils";
import { DS } from "../theme/designSystem";
import { getCreateRideTheme } from "../theme/createRideTheme";
import { useTheme } from "../context/ThemeContext";

const DriverDateAndSeats = ({ rideData, updateRideData, submitted, vehicleType }) => {
  const { colors, input, isDark } = useTheme();
  const CR = useMemo(() => getCreateRideTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(CR, input), [CR, input]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [touchedDate, setTouchedDate] = useState(false);
  const [touchedSeats, setTouchedSeats] = useState(false);

  const maxSeats = getMaxSeatsForVehicleType(vehicleType);
  const isBike = normalizeVehicleType(vehicleType) === "bike";
  const seats = parseInt(rideData.availableSeats || "1", 10);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const validateDate = () => {
    const d = parseLocalDate(rideData.date);
    if (!d) return "Ride date is required";
    if (d < today) return "Date cannot be in the past";
    return "";
  };

  const dateError = submitted || touchedDate ? validateDate() : "";
  const seatsError =
    submitted || touchedSeats ? validateSeats(rideData.availableSeats, vehicleType) : "";

  const isDateValid = !dateError;
  const isSeatsValid = !seatsError;

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (event?.type === "set" && selectedDate) {
      setTouchedDate(true);
      updateRideData("date", formatLocalISODate(selectedDate));
    }
  };

  const increaseSeats = () => {
    if (seats >= maxSeats) return;
    setTouchedSeats(true);
    updateRideData("availableSeats", String(seats + 1));
  };

  const decreaseSeats = () => {
    if (seats > 1) {
      setTouchedSeats(true);
      updateRideData("availableSeats", String(seats - 1));
    }
  };

  const currentDate = parseLocalDate(rideData.date) || today;
  const dateLabel = rideData.date
    ? formatDisplayDate(rideData.date)
    : "Select date";

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.dateCol}>
          <Text style={styles.blockLabel}>
            Ride date
            {(submitted || touchedDate) && !isDateValid ? (
              <Text style={styles.required}> *</Text>
            ) : null}
          </Text>

          <TouchableOpacity
            style={[
              styles.dateInput,
              (submitted || touchedDate) && !isDateValid && styles.errorBorder,
            ]}
            onPress={() => {
              setTouchedDate(true);
              setShowDatePicker(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrapDate}>
              <Icon name="calendar-outline" size={20} color={CR.date.icon} />
            </View>
            <Text
              style={[
                styles.dateText,
                !rideData.date && styles.placeholder,
              ]}
              numberOfLines={2}
            >
              {dateLabel}
            </Text>
            <Icon name="chevron-down" size={18} color={CR.textMuted} />
          </TouchableOpacity>

          <Text style={styles.errorText}>
            {submitted || touchedDate ? dateError || " " : " "}
          </Text>
        </View>

        <View style={styles.seatsCol}>
          <Text style={styles.blockLabel}>
            Seats
            {(submitted || touchedSeats) && !isSeatsValid ? (
              <Text style={styles.required}> *</Text>
            ) : null}
          </Text>

          <View
            style={[
              styles.seatStepper,
              (submitted || touchedSeats) && !isSeatsValid && styles.errorBorder,
            ]}
          >
            <TouchableOpacity
              onPress={decreaseSeats}
              style={styles.seatBtn}
              disabled={seats <= 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="remove" size={22} color={CR.textMuted} />
            </TouchableOpacity>

            <Text style={styles.seatCount}>{seats}</Text>

            <TouchableOpacity
              onPress={increaseSeats}
              style={[styles.seatBtn, seats >= maxSeats && styles.seatBtnDisabled]}
              disabled={seats >= maxSeats}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="add"
                size={22}
                color={seats >= maxSeats ? CR.textMuted : CR.seats.icon}
              />
            </TouchableOpacity>
          </View>

          {isBike ? (
            <Text style={styles.bikeHint}>Bikes can offer 1 seat only</Text>
          ) : null}

          <Text style={styles.errorText}>
            {submitted || touchedSeats ? seatsError || " " : " "}
          </Text>
        </View>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          minimumDate={today}
          themeVariant={isDark ? "dark" : "light"}
          onChange={onDateChange}
        />
      ) : null}
    </View>
  );
};

export default DriverDateAndSeats;

const makeStyles = (CR, input) =>
  StyleSheet.create({
    wrap: {
      width: "100%",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: DS.spacing.md,
    },
    dateCol: {
      flex: 1,
      minWidth: 0,
    },
    seatsCol: {
      width: 118,
    },
    blockLabel: {
      fontSize: DS.font.label,
      fontWeight: "600",
      color: CR.text,
      marginBottom: DS.spacing.sm,
    },
    iconWrapDate: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: CR.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    dateInput: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: DS.sizes.inputHeight,
      borderWidth: 1,
      borderColor: CR.date.border,
      borderRadius: DS.radius.md,
      paddingHorizontal: DS.spacing.md,
      paddingVertical: DS.spacing.sm,
      backgroundColor: CR.date.bg,
      gap: DS.spacing.sm,
    },
    dateText: {
      flex: 1,
      fontSize: DS.font.body,
      fontWeight: "500",
      color: input.text,
    },
    placeholder: {
      color: input.placeholder,
      fontWeight: "400",
    },
    seatStepper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: DS.sizes.inputHeight,
      borderWidth: 1,
      borderColor: CR.seats.border,
      borderRadius: DS.radius.md,
      paddingHorizontal: DS.spacing.sm,
      backgroundColor: CR.seats.bg,
    },
    seatBtn: {
      padding: 4,
    },
    seatBtnDisabled: {
      opacity: 0.45,
    },
    bikeHint: {
      fontSize: DS.font.small,
      color: CR.textMuted,
      marginTop: 6,
      lineHeight: 16,
    },
    seatCount: {
      fontSize: DS.font.section,
      fontWeight: "700",
      color: CR.text,
      minWidth: 28,
      textAlign: "center",
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
      fontSize: DS.font.small,
      marginTop: 6,
      minHeight: 16,
    },
  });
