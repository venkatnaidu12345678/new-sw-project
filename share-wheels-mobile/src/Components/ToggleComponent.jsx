import React from "react";
import { View, Text, StyleSheet, Switch, Image } from "react-native";

const ToggleComponent = ({
  title,
  subtitle,
  icon,
  iconBg,
  value,
  onChange,
  compact = false,
}) => {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Image source={icon} style={styles.icon} />
        </View>

        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
};

export default ToggleComponent;
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 16,
    marginBottom: 25,
    elevation: 3,
  },
  cardCompact: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
});
