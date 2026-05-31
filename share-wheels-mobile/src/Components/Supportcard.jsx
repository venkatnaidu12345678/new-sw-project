import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const SupportCard = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ChartBoat")}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={[colors.primaryMuted, colors.surface]}
        style={styles.inner}
      >
        <LinearGradient colors={["#4F46E5", "#2563EB"]} style={styles.iconWrap}>
          <Icon name="headset" size={24} color="#FFFFFF" />
        </LinearGradient>

        <View style={styles.textWrap}>
          <Text style={styles.title}>Help & support</Text>
          <Text style={styles.subtitle}>Chat with our support assistant</Text>
        </View>

        <Icon name="chevron-forward" size={22} color={colors.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default SupportCard;

const createStyles = (c) =>
  StyleSheet.create({
    card: {
      marginHorizontal: LAYOUT.spacing.md,
      marginTop: LAYOUT.spacing.md,
      borderRadius: LAYOUT.radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    inner: {
      flexDirection: "row",
      alignItems: "center",
      padding: LAYOUT.spacing.md,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    subtitle: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 3,
    },
  });
