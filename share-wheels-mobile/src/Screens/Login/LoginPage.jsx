import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { loginApi } from "../../ApiService/AuthApiService";
import { getDeviceTokenWithPermission } from "../../Notifications/FCMService";
import { syncFcmTokenWithBackend } from "../../Notifications/registerToken";
import { requestAppPermissionsOnSignIn } from "../../Utils/locationPermissions";
import {
  validateEmailOrMobile,
  validatePassword,
  buildLoginPayload,
  isLoginEmailIdentifier,
  formatLoginIdentifierInput,
} from "../../Utils";
import { AUTH_COLORS } from "../../theme/authTheme";
import { getApiErrorMessage } from "../../Utils/apiErrors";

const LoginPage = ({ navigation, route, triggerAuth }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ identifier: "", password: "" });

  useEffect(() => {
    const prefill = route.params?.identifier || route.params?.email;
    if (prefill) {
      setIdentifier(formatLoginIdentifierInput(String(prefill)));
    }
  }, [route.params?.identifier, route.params?.email]);

  const isEmailMode = isLoginEmailIdentifier(identifier);

  const identifierPlaceholder = !identifier
    ? "Email or mobile number"
    : isEmailMode
      ? "you@example.com"
      : "10-digit mobile number";

  const handleLogin = async () => {
    const identifierError = validateEmailOrMobile(identifier.trim());
    const passwordError = validatePassword(password);

    if (identifierError || passwordError) {
      setErrors({ identifier: identifierError, password: passwordError });
      return;
    }

    setLoading(true);
    try {
      await requestAppPermissionsOnSignIn();
      const fcmToken = await getDeviceTokenWithPermission();

      const res = await loginApi({
        ...buildLoginPayload(identifier, password),
        ...(fcmToken ? { fcmToken } : {}),
      });

      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (res?.success !== false && token) {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user || {}));
        if (user?.name) {
          await AsyncStorage.setItem("USER_NAME", user.name);
        }
        await syncFcmTokenWithBackend({ force: true });
        triggerAuth?.();
      } else {
        Alert.alert(
          "Login failed",
          getApiErrorMessage(res, "Invalid email/mobile or password")
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
      centerContent
      title="Sign in"
      subtitle="Use your registered email or 10-digit mobile number with your password."
      footer={
        <Text style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Signup")}>
            Create account
          </Text>
        </Text>
      }
    >
      <Text style={styles.label}>Email or mobile number</Text>
      <AuthTextInput
        placeholder={identifierPlaceholder}
        keyboardType={isEmailMode ? "email-address" : identifier ? "phone-pad" : "default"}
        autoCapitalize="none"
        value={identifier}
        maxLength={isEmailMode ? undefined : 10}
        onChangeText={(t) => {
          setIdentifier(formatLoginIdentifierInput(t));
          setErrors((e) => ({ ...e, identifier: "" }));
        }}
      />
      {!!errors.identifier && <Text style={styles.error}>{errors.identifier}</Text>}

      <Text style={styles.label}>Password</Text>
      <AuthTextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setErrors((e) => ({ ...e, password: "" }));
        }}
      />
      {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}

      <TouchableOpacity
        style={styles.forgotWrap}
        onPress={() => navigation.navigate("ForgotPassword")}
        activeOpacity={0.7}
      >
        <Text style={styles.forgotLink}>Forgot password?</Text>
      </TouchableOpacity>

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
    color: AUTH_COLORS.textOnDark,
    textAlign: "center",
  },
  link: {
    color: AUTH_COLORS.white,
    fontWeight: "800",
    fontSize: 16,
    textDecorationLine: "underline",
    textDecorationColor: AUTH_COLORS.white,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 12,
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotLink: {
    color: AUTH_COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: AUTH_COLORS.primary,
  },
});
