import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { submitFeedback } from "../ApiService/feedbackApiService";
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "ride", label: "Ride" },
];

const FeedbackCard = () => {
  const { input } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      Alert.alert("Feedback", "Please write at least a few words.");
      return;
    }
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Please sign in again");
      const res = await submitFeedback(token, { message: trimmed, category });
      setMessage("");
      Alert.alert("Thank you", res.message || "Your feedback was sent to the admin team.");
    } catch (e) {
      Alert.alert("Could not send", e.message || "Try again later.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <LinearGradient colors={["#2563EB", "#4F46E5"]} style={styles.iconWrap}>
          <Icon name="chatbox-ellipses" size={22} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.title}>Send feedback</Text>
          <Text style={styles.adminNote}>
            Your feedback will be reviewed by our admin team.
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, category === c.id && styles.chipActive]}
            onPress={() => setCategory(c.id)}
          >
            <Text style={[styles.chipText, category === c.id && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={[
          styles.input,
          {
            borderColor: input.border,
            color: input.text,
            backgroundColor: input.background,
          },
        ]}
        placeholder="Tell us what went well or what we can improve…"
        placeholderTextColor={input.placeholder}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, sending && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={sending}
        activeOpacity={0.88}
      >
        <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.submitGradient}>
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>Submit to admin</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default FeedbackCard;

const createStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      marginHorizontal: LAYOUT.spacing.md,
      marginTop: LAYOUT.spacing.md,
      borderRadius: LAYOUT.radius.lg,
      padding: LAYOUT.spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 14,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    headerText: { flex: 1 },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    adminNote: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.chipBg,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primaryMuted,
      borderColor: c.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    chipTextActive: {
      color: c.primaryText,
    },
    input: {
      minHeight: 100,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      marginBottom: 12,
    },
    submitBtn: {
      borderRadius: 12,
      overflow: "hidden",
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
    },
    submitText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
