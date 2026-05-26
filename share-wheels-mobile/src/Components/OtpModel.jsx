import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import { DS, scale } from "../theme/designSystem";

const OtpUI = ({
  passengerName,
  userNo = "",
  userNoEditable = true,
  onVerify,
  verifying = false,
  subtitle,
}) => {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [userNoValue, setUserNoValue] = useState(userNo || "");
  const inputs = useRef([]);

  useEffect(() => {
    setUserNoValue(userNo || "");
  }, [userNo]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      const finalOtp = [...newOtp].join("");
      onVerify && onVerify({ userNo: userNoValue.trim(), otp: finalOtp });
    }
  };

  const handleBackspace = (index) => {
    if (index > 0 && otp[index] === "") {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyClick = () => {
    const finalOtp = otp.join("");
    const normalizedUserNo = userNoValue.trim();

    if (!/^\d{6}$/.test(normalizedUserNo)) {
      alert("Enter a valid 6-digit user ID");
      return;
    }
    if (finalOtp.length < 4) {
      alert("Enter complete 4-digit OTP");
      return;
    }

    onVerify && onVerify({ userNo: normalizedUserNo, otp: finalOtp });
  };

  return (
    <KeyboardAwareScreen scrollable contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verify boarding</Text>
      <Text style={styles.name}>{passengerName || "Participant"}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <Text style={styles.label}>User ID (6 digits)</Text>
      <TextInput
        style={styles.userNoInput}
        keyboardType="number-pad"
        maxLength={6}
        value={userNoValue}
        editable={userNoEditable && !verifying}
        onChangeText={(t) => setUserNoValue(t.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        placeholderTextColor={DS.colors.textMuted}
      />

      <Text style={[styles.label, { marginTop: DS.spacing.md }]}>Boarding OTP</Text>
      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={styles.otpBox}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            editable={!verifying}
            onChangeText={(val) => handleOtpChange(val, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace") {
                handleBackspace(index);
              }
            }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]}
        onPress={handleVerifyClick}
        disabled={verifying}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyText}>Verify OTP</Text>
        )}
      </TouchableOpacity>
    </KeyboardAwareScreen>
  );
};

export default OtpUI;

const styles = StyleSheet.create({
  container: {
    padding: DS.spacing.lg,
    paddingBottom: DS.spacing.xl,
  },
  title: {
    fontSize: DS.font.section,
    fontWeight: "700",
    color: DS.colors.text,
  },
  name: {
    marginTop: DS.spacing.sm,
    fontSize: DS.font.body,
    color: DS.colors.textMuted,
  },
  subtitle: {
    marginTop: DS.spacing.xs,
    fontSize: DS.font.small,
    color: DS.colors.textMuted,
  },
  label: {
    marginTop: DS.spacing.md,
    fontSize: DS.font.label,
    fontWeight: "600",
    color: DS.colors.text,
  },
  userNoInput: {
    marginTop: DS.spacing.sm,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
    fontSize: DS.font.body,
    letterSpacing: 2,
    color: DS.colors.text,
    backgroundColor: DS.colors.surface,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: DS.spacing.md,
    gap: scale(8),
  },
  otpBox: {
    width: DS.sizes.otpBox,
    height: DS.sizes.otpBox,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.md,
    textAlign: "center",
    fontSize: DS.font.title,
    color: DS.colors.text,
    backgroundColor: DS.colors.surface,
  },
  verifyBtn: {
    marginTop: DS.spacing.xl,
    backgroundColor: DS.colors.primary,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.radius.md,
    minHeight: DS.sizes.buttonHeight,
    justifyContent: "center",
  },
  verifyBtnDisabled: {
    opacity: 0.7,
  },
  verifyText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: DS.font.button,
  },
});
