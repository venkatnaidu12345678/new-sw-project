import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { validatePrice } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const PriceCard = ({ rideData, updateRideData, submitted }) => {

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
      <Text style={styles.priceLabel}>
        Amount
        {(submitted || touched) && !isValid && (
          <Text style={styles.required}> *</Text>
        )}
      </Text>

      {/* Input Box */}
      <View style={[
        styles.priceBox,
        (submitted || touched) && !isValid && styles.errorBorder
      ]}>
        <Text style={styles.rupee}>₹</Text>

        <TextInput
          style={styles.priceInput}
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

  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderColor:"#0e0c0c",
  },

  rupee: {
    fontSize: 24,
    fontWeight: "700",
    marginRight: 6,
  },

  priceInput: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    color: INPUT_COLORS.text,
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