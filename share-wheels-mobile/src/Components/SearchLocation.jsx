import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Pressable,
} from "react-native";

import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { INPUT_COLORS } from "../theme/inputTheme";
import { LAYOUT } from "../theme/layout";

import {
  validateForm,
  validateLocation,
  validateDate,
} from "../Utils";

const SearchLocation = ({
  fromValue,
  toValue,
  suggestions,
  date,
  showDate,
  showFilters,
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
  onDismissSuggestions,
  activeField,
}) => {
  const [errors, setErrors] = useState({});

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

  const renderSuggestions = (field) => {
    if (activeField !== field || !suggestions?.length) return null;

    return (
      <View style={styles.inlineDropdown}>
        {suggestions.map((item, index) => (
          <Pressable
            key={`${field}-${item}-${index}`}
            style={({ pressed }) => [
              styles.suggestion,
              pressed && styles.suggestionPressed,
            ]}
            onPress={() => {
              selectLocation(item);
              setErrors((prev) => ({ ...prev, from: "", to: "" }));
              onDismissSuggestions?.();
            }}
          >
            <Text style={styles.suggestionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container} collapsable={false}>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="From — pickup city"
          placeholderTextColor={INPUT_COLORS.placeholder}
          value={fromValue}
          blurOnSubmit={false}
          onChangeText={(text) => {
            setFromValue(text);
            filterLocations(text, "FROM");
            setErrors((prev) => ({ ...prev, from: "" }));
          }}
          onFocus={() => onFocus?.("FROM")}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#999" />
      </View>
      {errors.from && <Text style={styles.error}>{errors.from}</Text>}
      {renderSuggestions("FROM")}

      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="To — destination city"
          placeholderTextColor={INPUT_COLORS.placeholder}
          value={toValue}
          blurOnSubmit={false}
          onChangeText={(text) => {
            setToValue(text);
            filterLocations(text, "TO");
            setErrors((prev) => ({ ...prev, to: "" }));
          }}
          onFocus={() => onFocus?.("TO")}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#3BB77E" />
      </View>
      {errors.to && <Text style={styles.error}>{errors.to}</Text>}
      {renderSuggestions("TO")}

      {showFilters && (
        <Animated.View
          style={{
            overflow: "hidden",
            height: animatedHeight,
            opacity: animatedOpacity,
          }}
        >
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

          {showDate && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="default"
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

          <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default SearchLocation;

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
    height: LAYOUT.sizes.inputHeight + 4,
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
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.radius.md,
    alignItems: "center",
    marginTop: LAYOUT.spacing.sm,
  },
  searchText: {
    color: "#fff",
    fontSize: LAYOUT.font.body,
    fontWeight: "600",
  },
  inlineDropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 200,
    marginBottom: 8,
    elevation: 8,
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: "hidden",
  },
  suggestion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  suggestionPressed: {
    backgroundColor: "#F1F5F9",
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
