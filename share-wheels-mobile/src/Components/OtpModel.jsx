import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

const OtpUI = ({ passengerName, onVerify }) => {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // move forward
    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    // auto submit
    if (index === 3 && value) {
      const finalOtp = [...newOtp].join("");
      onVerify && onVerify(finalOtp);
    }
  };

  const handleBackspace = (index) => {
    if (index > 0 && otp[index] === "") {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyClick = () => {
    const finalOtp = otp.join("");

    if (finalOtp.length < 4) {
      alert("Enter complete OTP");
      return;
    }

    onVerify && onVerify(finalOtp);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>

      <Text style={styles.name}>
        {passengerName || "Passenger"}
      </Text>

      {/* OTP BOXES */}
      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={styles.otpBox}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(val) => handleOtpChange(val, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace") {
                handleBackspace(index);
              }
            }}
          />
        ))}
      </View>

      {/* VERIFY BUTTON */}
      <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyClick}>
        <Text style={styles.verifyText}>Verify OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OtpUI;

/* ------------------ Styles ------------------ */

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  name: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  otpBox: {
    width: 55,
    height: 55,
    borderWidth: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
  },
  verifyBtn: {
    marginTop: 25,
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
  },
  verifyText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
});