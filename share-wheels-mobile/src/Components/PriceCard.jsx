import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { validatePrice } from "../Utils";
import { INPUT_COLORS } from "../theme/inputTheme";

const PriceCard = ({
  rideData,
  updateRideData,
  submitted,
  compact = false,
  accent = false,
  hint = "",
  loading = false,
  routeKm = null,
  suggestedPrice = null,
  onAutoFare,
  fareResetKey = "",
  readOnly = false,
}) => {
  useEffect(() => {
    if (readOnly && suggestedPrice != null && onAutoFare) {
      onAutoFare(suggestedPrice);
    }
  }, [readOnly, suggestedPrice, onAutoFare]);

  const displayValue =
    rideData.ride_amount ||
    (suggestedPrice != null ? String(suggestedPrice) : "");

  const priceError = submitted ? validatePrice(displayValue) : "";
  const isValid = !priceError;
  const showLoader = loading && !displayValue;

  return (
    <View style={styles.mainContainer}>
      <Text style={[styles.priceLabel, compact && styles.priceLabelCompact]}>
        Ride fare
        {submitted && !isValid ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.priceBox,
          compact && styles.priceBoxCompact,
          accent && styles.priceBoxAccent,
          readOnly && styles.priceBoxReadOnly,
          submitted && !isValid && styles.errorBorder,
        ]}
      >
        <Text style={[styles.rupee, compact && styles.rupeeCompact, accent && styles.rupeeAccent]}>
          ₹
        </Text>

        {showLoader ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator size="small" color={INPUT_COLORS.text} />
            <Text style={styles.loadingText}>Calculating…</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.priceDisplay,
              compact && styles.priceDisplayCompact,
              !displayValue && styles.pricePlaceholder,
            ]}
          >
            {displayValue || (loading ? "Calculating…" : "—")}
          </Text>
        )}
      </View>

      {readOnly ? (
        <Text style={styles.lockedNote}>Auto-calculated from route distance · cannot be edited</Text>
      ) : null}

      {routeKm != null ? (
        <Text style={styles.distanceText}>Route: {Number(routeKm).toFixed(1)} km</Text>
      ) : null}

      {hint ? <Text style={styles.hintText}>{hint}</Text> : null}

      <Text style={styles.errorText}>{submitted ? priceError || " " : " "}</Text>
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
    minHeight: 48,
  },

  priceBoxCompact: {
    borderRadius: 12,
    paddingVertical: 6,
  },

  priceBoxAccent: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },

  priceBoxReadOnly: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
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

  priceDisplay: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
    color: INPUT_COLORS.text,
  },

  priceDisplayCompact: {
    fontSize: 20,
    fontWeight: "600",
  },

  pricePlaceholder: {
    color: INPUT_COLORS.placeholder,
    fontWeight: "600",
  },

  loaderRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },

  loadingText: {
    fontSize: 15,
    color: INPUT_COLORS.placeholder,
    fontWeight: "600",
  },

  lockedNote: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "500",
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

  hintText: {
    color: "#059669",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },

  distanceText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});
