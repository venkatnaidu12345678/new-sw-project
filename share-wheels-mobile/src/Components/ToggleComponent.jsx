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

        <View style={styles.textWrap}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, compact && styles.subtitleCompact]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Switch
        style={styles.switch}
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
    width: "100%",
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 16,
    marginBottom: 25,
    elevation: 3,
    overflow: "hidden",
  },
  cardCompact: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 0,
    backgroundColor: "#F8FAFC",
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    marginRight: 8,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
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
  titleCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 17,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  switch: {
    flexShrink: 0,
    transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }],
  },
});
