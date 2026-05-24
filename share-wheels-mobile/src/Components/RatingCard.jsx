import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const RatingCard = () => {
  const rating = 4.8;

  return (
    <View style={styles.card}>
      {/* Left */}
      <View>
        <Text style={styles.title}>Your Rating</Text>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Ionicons
              key={item}
              name={item <= 4 ? "star" : "star-half"}
              size={22}
              color="#FFA500"
              style={{ marginRight: 4 }}
            />
          ))}

          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      {/* Right Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Excellent</Text>
      </View>
    </View>
  );
};

export default RatingCard;
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EAF2FF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
    marginHorizontal: 16,
    marginTop: 16,
  },
  title: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
    color: "#111827",
  },
  badge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});
