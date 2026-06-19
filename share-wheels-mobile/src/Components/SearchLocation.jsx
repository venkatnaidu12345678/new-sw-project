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
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import GradientField from "./ui/GradientField";

import {
  validateForm,
  validateLocation,
  validateDate,
  validatePlaceFromDropdown,
} from "../Utils";
import { getSuggestionKey, getSuggestionLabel } from "../Utils/placeSuggestions";

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
  suggestionsLoading,
  handleSearch,
  onFocus,
  onBlur,
  onDismissSuggestions,
  activeField,
  fromSelected = false,
  toSelected = false,
}) => {
  const { input, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [errors, setErrors] = useState({});

  const onSearchPress = () => {
    const validationErrors = validateForm({
      from: {
        value: fromValue,
        rules: [
          (v) => validateLocation(v, "From"),
          () => validatePlaceFromDropdown(fromSelected, "From"),
        ],
      },
      to: {
        value: toValue,
        rules: [
          (v) => validateLocation(v, "To"),
          () => validatePlaceFromDropdown(toSelected, "To"),
        ],
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
    if (activeField !== field) return null;
    if (!suggestions?.length && !suggestionsLoading) return null;

    return (
      <View style={styles.inlineDropdown}>
        {suggestionsLoading && !suggestions?.length ? (
          <Text style={[styles.suggestionText, styles.loadingSuggestion]}>
            Searching places…
          </Text>
        ) : null}
        {suggestions.map((item, index) => (
          <Pressable
            key={`${field}-${getSuggestionKey(item, index)}`}
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
            <Text style={styles.suggestionText}>{getSuggestionLabel(item)}</Text>
            {item?.description ? (
              <Text style={styles.suggestionSubtext} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
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
          placeholderTextColor={input.placeholder}
          value={fromValue}
          blurOnSubmit={false}
          onChangeText={(text) => {
            setFromValue(text);
            filterLocations(text, "FROM", { selected: false });
            setErrors((prev) => ({ ...prev, from: "", to: "" }));
          }}
          onFocus={() => onFocus?.("FROM")}
          onBlur={() => onBlur?.()}
          style={styles.input}
        />
        <Icon name="radio-button-on" size={18} color={colors.primary} />
      </GradientField>
      {errors.from && <Text style={styles.error}>{errors.from}</Text>}
      {renderSuggestions("FROM")}

      <GradientField variant="to">
        <TextInput
          placeholder={
            fromSelected
              ? "To — destination city"
              : "Select From from suggestions first"
          }
          placeholderTextColor={input.placeholder}
          value={toValue}
          editable={fromSelected}
          blurOnSubmit={false}
          onChangeText={(text) => {
            if (!fromSelected) return;
            setToValue(text);
            filterLocations(text, "TO", { selected: false });
            setErrors((prev) => ({ ...prev, to: "" }));
          }}
          onFocus={() => {
            if (!fromSelected) {
              setErrors((prev) => ({
                ...prev,
                from:
                  prev.from ||
                  "Please select From from the suggestions list first",
              }));
              onFocus?.("FROM");
              return;
            }
            onFocus?.("TO");
          }}
          onBlur={() => onBlur?.()}
          style={[styles.input, !fromSelected && styles.inputDisabled]}
        />
        <Icon name="radio-button-on" size={18} color={colors.successText} />
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
              <Icon name="calendar-outline" size={20} color={colors.warningText} />
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
              colors={colors.heroGradient}
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

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: c.text,
  },
  inputDisabled: {
    opacity: 0.55,
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
    color: c.text,
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
    color: c.inverseText,
    fontSize: LAYOUT.font.body,
    fontWeight: "700",
  },
  inlineDropdown: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    maxHeight: 200,
    marginBottom: 8,
    elevation: 8,
    zIndex: 60,
    shadowColor: c.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: "hidden",
  },
  suggestion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  suggestionPressed: {
    backgroundColor: c.primaryMuted,
  },
  suggestionText: {
    fontSize: 15,
    color: c.text,
    fontWeight: "600",
  },
  suggestionSubtext: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  loadingSuggestion: {
    fontWeight: "500",
    padding: 14,
  },
  error: {
    color: c.errorText,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
});
