import React, { useState } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { loginApi } from "../../ApiService/AuthApiService";
import { syncFcmTokenWithBackend } from "../../Notifications/registerToken";
import { requestAppPermissionsOnSignIn } from "../../Utils/locationPermissions";
import { validateEmail, validatePassword } from "../../Utils";
import { AUTH_COLORS } from "../../theme/authTheme";
import { getApiErrorMessage } from "../../Utils/apiErrors";

const LoginPage = ({ navigation, triggerAuth }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const handleLogin = async () => {
    const emailError = validateEmail(email.trim());
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi({
        email: email.trim().toLowerCase(),
        password,
      });

      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (res?.success !== false && token) {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user || {}));
        if (user?.name) {
          await AsyncStorage.setItem("USER_NAME", user.name);
        }
        await requestAppPermissionsOnSignIn();
        await syncFcmTokenWithBackend({ force: true });
        triggerAuth?.();
      } else {
        Alert.alert(
          "Login failed",
          getApiErrorMessage(res, "Invalid email or password")
        );
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Could not connect to server. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Sign in"
      subtitle="Welcome back. Enter your email and password to continue."
      footer={
        <Text style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
            Create account
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
          setErrors((e) => ({ ...e, email: "" }));
        }}
      />
      {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <Text style={styles.label}>Password</Text>
      <AuthTextInput
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setErrors((e) => ({ ...e, password: "" }));
        }}
      />
      {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}

      <AuthButton type="signin" onPress={handleLogin} loading={loading} />
    </AuthScreenLayout>
  );
};

export default LoginPage;

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
    color: AUTH_COLORS.link,
    fontWeight: "700",
  },
});
