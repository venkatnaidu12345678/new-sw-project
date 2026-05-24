import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthButton from "../../Components/AuthButton";
import { INPUT_COLORS } from "../../theme/inputTheme";
import { verifyOtpApi } from "../../ApiService/AuthApiService";

const OTP_LENGTH = 6;

const OtpVerificationPage = ({ navigation, route, triggerAuth }) => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState(false);
  const [timer, setTimer] = useState(45);

  const inputs = useRef([]);
console.log(route.params)
  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // ⏱ Countdown timer
  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text, index) => {
    if (/[^0-9]/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError(false);

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // ✅ VERIFY OTP
  const handleVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== OTP_LENGTH) {
      setError(true);
      return;
    }

    try {
      const payload = {
        userId: route.params?.userId,
        otp: enteredOtp,
      };

      const res = await verifyOtpApi(payload);

      if (res?.token) {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));

        triggerAuth(); // ✅ TRIGGER AUTH CHECK
      } else {
        setError(true);
      }
    } catch (err) {
      console.log("OTP verify error", err);
      setError(true);
    }
  };

  const handleResend = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setTimer(45);
    setError(false);
    inputs.current[0]?.focus();
  };

// directly loading otp

useEffect(() => {
  if (route?.params?.otp) {
    const otpFromRoute = route.params.otp.toString().slice(0, OTP_LENGTH);
    const otpArray = otpFromRoute.split("");
    setOtp([...otpArray, ...Array(OTP_LENGTH - otpArray.length).fill("")]);
  } else {
    setOtp(Array(OTP_LENGTH).fill(""));
  }
}, [route]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>We just sent an SMS</Text>
      <Text style={styles.subtitle}>Enter the security code we sent to</Text>

      <View style={styles.phoneRow}>
        <Text style={styles.phoneText}>+91 **********</Text>
        <Text style={styles.editText}>Edit</Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={[styles.otpInput, error && styles.errorInput]}
            placeholder="·"
            placeholderTextColor={INPUT_COLORS.placeholder}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
          />
        ))}
      </View>

      {error && (
        <Text style={styles.errorText}>
          ❌ Invalid OTP. Please try again.
        </Text>
      )}

      <AuthButton title="Verify" onPress={handleVerify} />

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn’t get the code?</Text>
        {timer > 0 ? (
          <Text style={styles.timerText}>{timer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default OtpVerificationPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 24,
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 10 },
  subtitle: { fontSize: 16, marginBottom: 6 },
  phoneRow: { flexDirection: "row", marginBottom: 30 },
  phoneText: { fontSize: 16 },
  editText: { color: "#2563EB", marginLeft: 8, fontWeight: "600" },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 18,
    color: INPUT_COLORS.text,
    backgroundColor: INPUT_COLORS.background,
  },
  errorInput: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", marginBottom: 12 },
  resendRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  resendText: { fontWeight: "bold", marginRight: 10 },
  resendLink: { color: "#2563EB", fontWeight: "600" },
  timerText: { color: "#999" },
});
