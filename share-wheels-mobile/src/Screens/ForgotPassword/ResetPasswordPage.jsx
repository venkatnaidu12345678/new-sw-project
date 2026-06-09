import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { forgotPasswordApi, resetPasswordApi } from "../../ApiService/AuthApiService";
import { validateEmail, validatePassword, validateConfirmPassword } from "../../Utils";
import { AUTH_COLORS, AUTH_GRADIENTS } from "../../theme/authTheme";
import { getApiErrorMessage } from "../../Utils/apiErrors";
import { LAYOUT, scale } from "../../theme/layout";

const OTP_LENGTH = 6;

const maskEmail = (value) => {
  const email = String(value || "").trim();
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || ""}•••@${domain}`;
  return `${local.slice(0, 2)}•••${local.slice(-1)}@${domain}`;
};

const ResetPasswordPage = ({ navigation, route }) => {
  const initialEmail = route.params?.email || "";
  const [email] = useState(initialEmail);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigation.replace("ForgotPassword");
      return;
    }
    inputs.current[0]?.focus();
  }, [email, navigation]);

  useEffect(() => {
    if (timer === 0) return undefined;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text, index) => {
    if (/[^0-9]/.test(text)) return;
    const next = [...otp];
    next[index] = text;
    setOtp(next);
    setOtpError("");
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email || resending || timer > 0) return;
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert("Invalid email", emailError);
      return;
    }

    setResending(true);
    try {
      const res = await forgotPasswordApi({ email });
      if (res?.success !== false) {
        setTimer(45);
        setOtp(Array(OTP_LENGTH).fill(""));
        inputs.current[0]?.focus();
        Alert.alert("Code sent", res?.message || "A new reset code has been sent to your email.");
      } else {
        Alert.alert("Could not resend", getApiErrorMessage(res, "Try again later."));
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Could not connect to server."));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setOtpError("Enter the 6-digit code from your email");
      return;
    }

    const newError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    if (newError || confirmError) {
      setPasswordErrors({ newPassword: newError, confirmPassword: confirmError });
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordApi({
        email,
        otp: code,
        newPassword,
        confirmPassword,
      });

      if (res?.success !== false) {
        Alert.alert("Password updated", res?.message || "You can sign in with your new password.", [
          { text: "Sign in", onPress: () => navigation.navigate("Signin") },
        ]);
      } else {
        Alert.alert("Reset failed", getApiErrorMessage(res, "Invalid or expired code."));
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Could not connect to server."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      showBack
      onBack={() => navigation.goBack()}
      title="Reset password"
      subtitle={`Enter the code sent to ${maskEmail(email)} and choose a new password.`}
      footer={
        <Text style={styles.footer}>
          <Text
            style={[styles.resend, (timer > 0 || resending) && styles.resendDisabled]}
            onPress={handleResend}
          >
            {resending ? "Sending…" : timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
          </Text>
        </Text>
      }
    >
      <Text style={styles.label}>Verification code</Text>
      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <LinearGradient
            key={index}
            colors={AUTH_GRADIENTS.cardBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.otpCellBorder}
          >
            <TextInput
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(t) => handleOtpChange(t, index)}
              onKeyPress={(e) => handleOtpKeyPress(e, index)}
            />
          </LinearGradient>
        ))}
      </View>
      {!!otpError && <Text style={styles.error}>{otpError}</Text>}

      <Text style={styles.label}>New password</Text>
      <AuthTextInput
        placeholder="At least 6 characters"
        secureTextEntry
        value={newPassword}
        onChangeText={(t) => {
          setNewPassword(t);
          setPasswordErrors((e) => ({ ...e, newPassword: "" }));
        }}
      />
      {!!passwordErrors.newPassword && (
        <Text style={styles.error}>{passwordErrors.newPassword}</Text>
      )}

      <Text style={styles.label}>Confirm password</Text>
      <AuthTextInput
        placeholder="Re-enter new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          setPasswordErrors((e) => ({ ...e, confirmPassword: "" }));
        }}
      />
      {!!passwordErrors.confirmPassword && (
        <Text style={styles.error}>{passwordErrors.confirmPassword}</Text>
      )}

      <AuthButton type="signin" title="Update password" onPress={handleReset} loading={loading} />
    </AuthScreenLayout>
  );
};

export default ResetPasswordPage;

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_COLORS.text,
    marginBottom: 6,
  },
  error: {
    color: AUTH_COLORS.error,
    fontSize: 12,
    marginBottom: 8,
    marginTop: -6,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: scale(6),
  },
  otpCellBorder: {
    flex: 1,
    borderRadius: LAYOUT.radiusMd,
    padding: 1,
  },
  otpInput: {
    height: scale(48),
    borderRadius: LAYOUT.radiusMd - 1,
    backgroundColor: AUTH_COLORS.inputBg,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: AUTH_COLORS.text,
  },
  footer: {
    fontSize: 15,
    color: AUTH_COLORS.textMutedOnDark,
    textAlign: "center",
  },
  resend: {
    color: AUTH_COLORS.white,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  resendDisabled: {
    opacity: 0.55,
  },
});
