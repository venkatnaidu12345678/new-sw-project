import React, { useState } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { forgotPasswordApi } from "../../ApiService/AuthApiService";
import { sendFirebasePasswordResetEmail } from "../../Utils/firebaseAuth";
import { validateEmail } from "../../Utils";
import { AUTH_COLORS } from "../../theme/authTheme";
import { getApiErrorMessage } from "../../Utils/apiErrors";

const firebaseAuthNotEnabledMessage =
  "Password reset is not set up in Firebase yet. In Firebase Console open Authentication → Sign-in method and enable Email/Password.";

const mapFirebaseClientError = (err) => {
  const code = String(err?.code || "");
  const message = String(err?.message || "");
  if (
    code.includes("configuration-not-found") ||
    message.toLowerCase().includes("configuration")
  ) {
    return firebaseAuthNotEnabledMessage;
  }
  if (code.includes("user-not-found")) {
    return "No account found for this email.";
  }
  return message || "Could not send reset email.";
};

const ForgotPasswordPage = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    const emailError = validateEmail(email.trim());
    if (emailError) {
      setError(emailError);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await forgotPasswordApi({ email: normalizedEmail });

      if (res?.success !== false && !res?.useClientReset) {
        Alert.alert(
          "Check your email",
          res?.message ||
            "Password reset email sent. Check spam or junk if it is not in your inbox, open the link, set a new password, then sign in.",
          [{ text: "Back to sign in", onPress: () => navigation.navigate("Signin") }]
        );
        return;
      }

      if (res?.useClientReset || res?.code === "FIREBASE_AUTH_NOT_ENABLED") {
        try {
          await sendFirebasePasswordResetEmail(normalizedEmail);
          Alert.alert(
            "Check your email",
            "A password reset link has been sent. Open it, set a new password, then sign in.",
            [{ text: "Back to sign in", onPress: () => navigation.navigate("Signin") }]
          );
          return;
        } catch (clientErr) {
          Alert.alert(
            "Could not send link",
            mapFirebaseClientError(clientErr) ||
              getApiErrorMessage(res, "Try again later.")
          );
          return;
        }
      }

      Alert.alert("Could not send link", getApiErrorMessage(res, "Try again later."));
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
      subtitle="Enter your registered email. We will send a secure password reset link to your inbox."
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

      <AuthButton
        type="signin"
        title="Send reset link"
        onPress={handleSendResetLink}
        loading={loading}
      />
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
