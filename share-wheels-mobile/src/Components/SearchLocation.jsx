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
import LinearGradient from "react-native-linear-gradient";
import { INPUT_COLORS } from "../theme/inputTheme";
import { LAYOUT } from "../theme/layout";
import GradientField from "./ui/GradientField";

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
  onBlur,
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
      <GradientField variant="from">
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
          onBlur={() => onBlur?.()}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#3B82F6" />
      </GradientField>
      {errors.from && <Text style={styles.error}>{errors.from}</Text>}
      {renderSuggestions("FROM")}

      <GradientField variant="to">
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
          onBlur={() => onBlur?.()}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color="#22C55E" />
      </GradientField>
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
          <GradientField variant="date">
            <TouchableOpacity
              style={styles.dateTap}
              onPress={() => setShowDate(true)}
            >
              <Text style={styles.dateText}>
                {date ? date.toDateString() : "Select Date"}
              </Text>
              <Icon name="calendar-outline" size={20} color="#F59E0B" />
            </TouchableOpacity>
          </GradientField>
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

          <TouchableOpacity style={styles.searchButtonWrap} onPress={onSearchPress}>
            <LinearGradient
              colors={["#2563EB", "#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchGradient}
            >
              <Text style={styles.searchText}>Search rides</Text>
            </LinearGradient>
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
  input: {
    flex: 1,
    fontSize: 15,
    color: INPUT_COLORS.text,
  },
  dateTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: INPUT_COLORS.text,
  },
  searchButtonWrap: {
    marginTop: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.radius.md,
    overflow: "hidden",
  },
  searchGradient: {
    paddingVertical: LAYOUT.spacing.md,
    alignItems: "center",
    borderRadius: LAYOUT.radius.md,
  },
  searchText: {
    color: "#fff",
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
  },
  inlineDropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 200,
    marginBottom: 8,
    elevation: 8,
    zIndex: 60,
    shadowColor: "#6366F1",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: "hidden",
  },
  suggestion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionPressed: {
    backgroundColor: "#EFF6FF",
  },
  suggestionText: {
    fontSize: 15,
    color: "#111",
  },
  error: {
    color: "#DC2626",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
});
