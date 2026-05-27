import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { validatePrice } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const PriceCard = ({ rideData, updateRideData, submitted, compact = false, accent = false }) => {

  // ✅ Track interaction
  const [touched, setTouched] = useState(false);

  // ✅ Allow only numbers
  const handlePriceChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    setTouched(true);
    updateRideData("ride_amount", numericValue);
  };

  // ✅ Validation
  const priceError =
    submitted || touched
      ? validatePrice(rideData.ride_amount)
      : "";

  const isValid = !priceError;

  return (
    <View style={styles.mainContainer}>

      {/* Label + Star */}
      <Text style={[styles.priceLabel, compact && styles.priceLabelCompact]}>
        Price per seat
        {(submitted || touched) && !isValid && (
          <Text style={styles.required}> *</Text>
        )}
      </Text>

      {/* Input Box */}
      <View style={[
        styles.priceBox,
        compact && styles.priceBoxCompact,
        accent && styles.priceBoxAccent,
        (submitted || touched) && !isValid && styles.errorBorder
      ]}>
        <Text style={[styles.rupee, compact && styles.rupeeCompact, accent && styles.rupeeAccent]}>₹</Text>

        <TextInput
          style={[styles.priceInput, compact && styles.priceInputCompact]}
          value={rideData.ride_amount}
          onChangeText={handlePriceChange}
          keyboardType="numeric"
          placeholder="Enter price per seat (₹)"
          placeholderTextColor={INPUT_COLORS.placeholder}
          maxLength={7}
        />
      </View>

      {/* Error */}
      <Text style={styles.errorText}>
        {(submitted || touched) ? (priceError || " ") : " "}
      </Text>

    </View>
  );
};

export default PriceCard;

const styles = StyleSheet.create({
  mainContainer: {},

  priceLabel: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    color: "#1F2937",
  },

  priceLabelCompact: {
    fontSize: 14,
    marginBottom: 8,
    color: "#374151",
  },

  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: INPUT_COLORS.background,
  },

  priceBoxCompact: {
    borderRadius: 12,
    paddingVertical: 6,
  },

  priceBoxAccent: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  rupeeAccent: {
    color: "#D97706",
  },

  rupee: {
    fontSize: 24,
    fontWeight: "700",
    marginRight: 6,
    color: "#1F2937",
  },

  rupeeCompact: {
    fontSize: 20,
  },

  priceInput: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    color: INPUT_COLORS.text,
  },

  priceInputCompact: {
    fontSize: 20,
    fontWeight: "600",
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