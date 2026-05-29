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
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthButton from "../../Components/AuthButton";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { AUTH_COLORS, AUTH_GRADIENTS } from "../../theme/authTheme";
import { verifyOtpApi } from "../../ApiService/AuthApiService";
import { getDeviceToken } from "../../Notifications/FCMService";
import { syncFcmTokenWithBackend } from "../../Notifications/registerToken";
import { getApiErrorMessage } from "../../Utils/apiErrors";
import { LAYOUT, scale } from "../../theme/layout";

const OTP_LENGTH = 6;

const maskMobile = (mobile) => {
  const digits = String(mobile || "").replace(/\D/g, "").slice(-10);
  if (digits.length < 4) return "+91 ••••••••••";
  return `+91 ${digits.slice(0, 2)}•••••${digits.slice(-2)}`;
};

const OtpVerificationPage = ({ navigation, route, triggerAuth }) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);

  const userId = route.params?.userId;
  const mobile = route.params?.mobile;

  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer === 0) return undefined;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (route?.params?.otp) {
      const otpFromRoute = route.params.otp.toString().slice(0, OTP_LENGTH);
      const otpArray = otpFromRoute.split("");
      setOtp([...otpArray, ...Array(OTP_LENGTH - otpArray.length).fill("")]);
    } else {
      setOtp(Array(OTP_LENGTH).fill(""));
    }
  }, [route?.params?.otp]);

  const handleChange = (text, index) => {
    if (/[^0-9]/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError("");

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== OTP_LENGTH) {
      setError("Enter the full 6-digit code");
      return;
    }
    if (!userId) {
      Alert.alert("Session error", "Missing user session. Please sign up or sign in again.");
      navigation.navigate("Signin");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const fcmToken = await getDeviceToken();
      const res = await verifyOtpApi({
        userId,
        otp: enteredOtp,
        ...(fcmToken ? { fcmToken } : {}),
      });

      if (res?.success !== false && res?.token) {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        if (res.user?.name) {
          await AsyncStorage.setItem("USER_NAME", res.user.name);
        }
        await syncFcmTokenWithBackend();
        triggerAuth?.();
      } else {
        setError(getApiErrorMessage(res, "Invalid OTP. Please try again."));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not verify OTP. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setTimer(45);
    setError("");
    inputs.current[0]?.focus();
    Alert.alert(
      "Resend OTP",
      "OTP resend is not available in this build. Use email sign-in or contact support."
    );
  };

  return (
    <AuthScreenLayout
      title="Verify your number"
      subtitle="Enter the 6-digit security code we sent to your mobile."
      showBack
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn&apos;t get the code?</Text>
          {timer > 0 ? (
            <Text style={styles.timerText}>Resend in {timer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    >
      <View style={styles.phoneRow}>
        <Text style={styles.phoneText}>{maskMobile(mobile)}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <LinearGradient
            key={index}
            colors={error ? ["#FCA5A5", "#EF4444"] : AUTH_GRADIENTS.otpBorder}
            style={styles.otpBorder}
          >
            <View style={[styles.otpInner, error && styles.otpInnerError]}>
              <TextInput
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={styles.otpInput}
                placeholder="·"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            </View>
          </LinearGradient>
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <AuthButton type="verify" onPress={handleVerify} loading={loading} />
    </AuthScreenLayout>
  );
};

export default OtpVerificationPage;

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.lg,
    gap: 8,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: AUTH_COLORS.text,
  },
  editText: {
    color: AUTH_COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: LAYOUT.spacing.md,
    gap: scale(6),
  },
  otpBorder: {
    flex: 1,
    maxWidth: scale(48),
    borderRadius: 12,
    padding: 1.5,
  },
  otpInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
  },
  otpInnerError: {
    backgroundColor: "#FEF2F2",
  },
  otpInput: {
    height: scale(52),
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: AUTH_COLORS.text,
  },
  errorText: {
    color: AUTH_COLORS.error,
    marginBottom: LAYOUT.spacing.sm,
    fontSize: 13,
    fontWeight: "500",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  resendText: {
    color: AUTH_COLORS.textMutedOnDark,
    fontWeight: "600",
  },
  resendLink: {
    color: AUTH_COLORS.link,
    fontWeight: "700",
  },
  timerText: {
    color: AUTH_COLORS.textMutedOnDark,
  },
});
