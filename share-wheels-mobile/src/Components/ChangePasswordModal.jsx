import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import AuthTextInput from "./AuthTextInput";
import { changePasswordApi } from "../ApiService/AuthApiService";
import { validatePassword, validateConfirmPassword } from "../Utils";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { useTheme } from "../context/ThemeContext";
import { LAYOUT, scale } from "../theme/layout";

const ChangePasswordModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    const currentError = !currentPassword ? "Current password is required" : "";
    const newError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);

    if (currentError || newError || confirmError) {
      setErrors({
        currentPassword: currentError,
        newPassword: newError,
        confirmPassword: confirmError,
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Session expired", "Please sign in again.");
        handleClose();
        return;
      }

      const res = await changePasswordApi(token, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res?.success !== false) {
        Alert.alert("Success", res?.message || "Password updated successfully");
        handleClose();
      } else {
        Alert.alert("Could not update", getApiErrorMessage(res, "Failed to change password"));
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Could not change password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Change password</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={12} disabled={loading}>
                  <Icon name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>
                Enter your current password, then choose a new one (at least 6 characters).
              </Text>

              <Text style={styles.label}>Current password</Text>
              <AuthTextInput
                placeholder="Current password"
                secureTextEntry
                value={currentPassword}
                onChangeText={(t) => {
                  setCurrentPassword(t);
                  setErrors((e) => ({ ...e, currentPassword: "" }));
                }}
              />
              {!!errors.currentPassword && (
                <Text style={styles.error}>{errors.currentPassword}</Text>
              )}

              <Text style={styles.label}>New password</Text>
              <AuthTextInput
                placeholder="New password"
                secureTextEntry
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  setErrors((e) => ({ ...e, newPassword: "" }));
                }}
              />
              {!!errors.newPassword && <Text style={styles.error}>{errors.newPassword}</Text>}

              <Text style={styles.label}>Confirm new password</Text>
              <AuthTextInput
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrors((e) => ({ ...e, confirmPassword: "" }));
                }}
              />
              {!!errors.confirmPassword && (
                <Text style={styles.error}>{errors.confirmPassword}</Text>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Update password</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ChangePasswordModal;

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: LAYOUT.radius.xl,
      borderTopRightRadius: LAYOUT.radius.xl,
      paddingHorizontal: LAYOUT.spacing.lg,
      paddingTop: LAYOUT.spacing.lg,
      paddingBottom: LAYOUT.spacing.xl + scale(8),
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: LAYOUT.spacing.sm,
    },
    title: {
      fontSize: LAYOUT.font.section,
      fontWeight: "800",
      color: colors.text,
    },
    hint: {
      fontSize: LAYOUT.font.small,
      color: colors.textMuted,
      lineHeight: scale(18),
      marginBottom: LAYOUT.spacing.md,
    },
    label: {
      fontSize: LAYOUT.font.label,
      fontWeight: "600",
      color: colors.text,
      marginBottom: scale(6),
      marginTop: scale(2),
    },
    error: {
      color: "#EF4444",
      fontSize: 12,
      marginBottom: scale(8),
      marginTop: scale(-4),
    },
    saveBtn: {
      marginTop: LAYOUT.spacing.md,
      backgroundColor: colors.primary,
      borderRadius: LAYOUT.radius.md,
      paddingVertical: LAYOUT.spacing.md,
      alignItems: "center",
      minHeight: scale(48),
      justifyContent: "center",
    },
    saveBtnDisabled: {
      opacity: 0.7,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: LAYOUT.font.body,
      fontWeight: "700",
    },
  });
