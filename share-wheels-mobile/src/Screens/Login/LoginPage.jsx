import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import { loginApi } from "../../ApiService/AuthApiService";
import { validateEmail, validatePassword } from "../../Utils";

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

      if (res?.token) {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        if (res.user?.name) {
          await AsyncStorage.setItem("USER_NAME", res.user.name);
        }
        triggerAuth?.();
      } else {
        Alert.alert("Login failed", res?.message || "Invalid email or password");
      }
    } catch (err) {
      Alert.alert("Error", "Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>
          Welcome back — sign in with your email and password
        </Text>

        <Text style={styles.label}>Email</Text>
        <AuthTextInput
          placeholder="you@example.com"
          keyboardType="email-address"
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
        {!!errors.password && (
          <Text style={styles.error}>{errors.password}</Text>
        )}

        <AuthButton
          type="signin"
          onPress={handleLogin}
          loading={loading}
          style={styles.btn}
        />

        <Text style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate("Signup")}
          >
            Sign Up
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 28,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 8,
    marginTop: -6,
  },
  btn: { marginTop: 8 },
  footer: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 20,
    textAlign: "center",
  },
  link: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
