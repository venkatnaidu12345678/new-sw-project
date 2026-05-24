import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Animated,
} from "react-native";

import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { INPUT_COLORS } from "../theme/inputTheme";

/* ✅ IMPORT FROM UTILS */
import {
  validateForm,
  validateLocation,
  validateDate,
} from "../Utils"; // adjust path if needed

const SearchLocation = ({
  fromValue,
  toValue,
  suggestions,
  date,
  showDate,
  showFilters,
  dropdownTop,
  animatedHeight,
  animatedOpacity,
  setFromValue,
  setToValue,
  setDate,
  setShowDate,
  filterLocations,
  selectLocation,
  handleSearch,
  onFocus,
  onBlur,
}) => {
  const [errors, setErrors] = useState({});

  /* ---------------- SEARCH HANDLER ---------------- */
  const onSearchPress = () => {
    const validationErrors = validateForm({
      from: {
        value: fromValue,
        rules: [(v) => validateLocation(v, "From")],
      },
      to: {
        value: toValue,
        rules: [(v) => validateLocation(v, "To")],
      },
      date: {
        value: date,
        rules: [validateDate],
      },
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    handleSearch();
  };

  return (
    <View style={styles.container}>
      {/* FROM */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="From — pickup city"
          placeholderTextColor={INPUT_COLORS.placeholder}
          value={fromValue}
          onChangeText={(text) => {
            setFromValue(text);
            filterLocations(text, "FROM");

            // ✅ clear error
            setErrors((prev) => ({ ...prev, from: "" }));
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#999" />
      </View>
      {errors.from && <Text style={styles.error}>{errors.from}</Text>}

      {/* TO */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="To — destination city"
          placeholderTextColor={INPUT_COLORS.placeholder}
          value={toValue}
          onChangeText={(text) => {
            setToValue(text);
            filterLocations(text, "TO");

            // ✅ clear error
            setErrors((prev) => ({ ...prev, to: "" }));
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#3BB77E" />
      </View>
      {errors.to && <Text style={styles.error}>{errors.to}</Text>}

      {/* DROPDOWN */}
      {suggestions.length > 0 && (
        <View style={[styles.dropdownContainer, { top: dropdownTop }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestion}
                onPress={() => {
                  selectLocation(item);

                  // ✅ clear errors after selection
                  setErrors((prev) => ({
                    ...prev,
                    from: "",
                    to: "",
                  }));
                }}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* DATE + SEARCH */}
      {showFilters && (
        <Animated.View
          style={{
            overflow: "hidden",
            height: animatedHeight,
            opacity: animatedOpacity,
          }}
        >
          {/* DATE BUTTON */}
          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setShowDate(true)}
          >
            <Text style={styles.dateText}>
              {date ? date.toDateString() : "Select Date"}
            </Text>
            <Icon name="calendar-outline" size={20} color="#3BB77E" />
          </TouchableOpacity>
          {errors.date && <Text style={styles.error}>{errors.date}</Text>}

          {/* DATE PICKER */}
          {showDate && (
  <DateTimePicker
    value={date || new Date()}
    mode="date"
    display="default"

    // ✅ IMPORTANT: block past dates
    minimumDate={new Date()}

    onChange={(event, selectedDate) => {
      if (event.type === "dismissed") {
        setShowDate(false);
        return;
      }

      setShowDate(false);

      if (selectedDate) {
        setDate(selectedDate);
        setErrors((prev) => ({ ...prev, date: "" }));
      }
    }}
  />
)}
          

          {/* SEARCH BUTTON */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={onSearchPress}
          >
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default SearchLocation;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    height: 60,
    backgroundColor: "#fff",
    zIndex: 1,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: INPUT_COLORS.text,
  },

  dateText: {
    flex: 1,
    fontSize: 15,
    color: INPUT_COLORS.text,
  },

  searchButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  searchText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  dropdownContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 200,
    zIndex: 1000,
    elevation: 6,
  },

  suggestion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  suggestionText: {
    fontSize: 15,
    color: "#111",
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
});