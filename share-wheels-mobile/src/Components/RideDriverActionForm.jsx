import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

const CANCEL_SUGGESTIONS = [
  "Vehicle breakdown or maintenance issue",
  "Personal emergency — unable to drive",
  "Unsafe weather or road conditions",
  "Schedule conflict — cannot make this trip",
];

const RideDriverActionForm = ({ submitting, onSubmit, onClose }) => {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= 10 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ reason: trimmedReason });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cancel ride</Text>
      <Text style={styles.subtitle}>
        A clear reason is required (at least 10 characters). All participants will be
        notified.
      </Text>

      <Text style={styles.fieldLabel}>Reason</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Why are you cancelling this ride?"
        value={reason}
        onChangeText={setReason}
        textAlignVertical="top"
      />

      <Text style={styles.suggestLabel}>Quick suggestions</Text>
      <View style={styles.chips}>
        {CANCEL_SUGGESTIONS.map((s) => (
          <TouchableOpacity key={s} style={styles.chip} onPress={() => setReason(s)}>
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={submitting}>
          <Text style={styles.secondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Cancel ride</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RideDriverActionForm;

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 12, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    minHeight: 88,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  suggestLabel: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { fontSize: 11, color: "#1D4ED8" },
  actions: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  secondaryText: { fontWeight: "600", color: "#475569" },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { fontWeight: "700", color: "#fff" },
});
