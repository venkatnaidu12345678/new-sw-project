import React, { useState } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { forgotPasswordApi } from "../../ApiService/AuthApiService";
import { validateEmail } from "../../Utils";
import { AUTH_COLORS } from "../../theme/authTheme";
import { getApiErrorMessage } from "../../Utils/apiErrors";

const ForgotPasswordPage = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const emailError = validateEmail(email.trim());
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordApi({ email: email.trim().toLowerCase() });
      if (res?.success !== false) {
        Alert.alert(
          "Check your email",
          res?.message || "If this email is registered, a reset code has been sent.",
          [
            {
              text: "Enter code",
              onPress: () =>
                navigation.navigate("ResetPassword", {
                  email: email.trim().toLowerCase(),
                }),
            },
          ]
        );
      } else {
        Alert.alert("Could not send code", getApiErrorMessage(res, "Try again later."));
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
      title="Forgot password"
      subtitle="Enter your registered email. We will send a 6-digit reset code."
      footer={
        <Text style={styles.footer}>
          Remember your password?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Signin")}>
            Sign in
          </Text>
        </Text>
      }
    >
      <Text style={styles.label}>Email</Text>
      <AuthTextInput
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError("");
        }}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}

      <AuthButton type="signin" title="Send reset code" onPress={handleSendOtp} loading={loading} />
    </AuthScreenLayout>
  );
};

export default ForgotPasswordPage;

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
  footer: {
    fontSize: 15,
    color: AUTH_COLORS.textMutedOnDark,
    textAlign: "center",
  },
  link: {
    color: AUTH_COLORS.white,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
