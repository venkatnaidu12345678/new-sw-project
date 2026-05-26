import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import AuthScreenLayout from "../../Components/auth/AuthScreenLayout";
import { signupApi } from "../../ApiService/AuthApiService";
import {
  validateName,
  validatePhone,
  validateEmail,
  validateGender,
  validatePassword,
  validateConfirmPassword,
} from "../../Utils";
import { AUTH_COLORS } from "../../theme/authTheme";
import { INPUT_COLORS } from "../../theme/inputTheme";

const SignupPage = ({ navigation, triggerAuth }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field, value) => {
    let error = "";
    switch (field) {
      case "name":
        setName(value);
        error = validateName(value);
        break;
      case "phone":
        setPhone(value.replace(/[^0-9]/g, "").slice(0, 10));
        error = validatePhone(value.replace(/[^0-9]/g, "").slice(0, 10));
        break;
      case "email":
        setEmail(value);
        error = validateEmail(value);
        break;
      case "gender":
        setGender(value);
        error = validateGender(value);
        break;
      case "password":
        setPassword(value);
        error = validatePassword(value);
        break;
      case "confirmPassword":
        setConfirmPassword(value);
        error = validateConfirmPassword(password, value);
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSignup = async () => {
    const nameError = validateName(name);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const genderError = validateGender(gender);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    if (
      nameError ||
      phoneError ||
      emailError ||
      genderError ||
      passwordError ||
      confirmError
    ) {
      setErrors({
        name: nameError,
        phone: phoneError,
        email: emailError,
        gender: genderError,
        password: passwordError,
        confirmPassword: confirmError,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await signupApi({
        name,
        email: email.trim().toLowerCase(),
        mobile: phone,
        gender,
        password,
      });

      if (response?.token) {
        await AsyncStorage.setItem("token", response.token);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
        if (response.user?.name) {
          await AsyncStorage.setItem("USER_NAME", response.user.name);
        }
        triggerAuth?.();
      } else {
        setErrors((prev) => ({
          ...prev,
          email: response?.message || "Registration failed",
        }));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        email: "Network error. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Create account"
      subtitle="Join Share Wheels to find rides or offer seats on your route."
      showBack
      onBack={() => navigation.goBack()}
      footer={
        <Text style={styles.footer}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Signin")}>
            Sign in
          </Text>
        </Text>
      }
    >
      <Text style={styles.label}>Full name *</Text>
      <AuthTextInput
        placeholder="Your name"
        value={name}
        onChangeText={(t) => handleChange("name", t)}
      />
      {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Phone *</Text>
          <AuthTextInput
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            value={phone}
            maxLength={10}
            onChangeText={(t) => handleChange("phone", t)}
          />
          {!!errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={gender}
              onValueChange={(v) => handleChange("gender", v)}
              style={styles.picker}
            >
              <Picker.Item label="Select" value="" color={INPUT_COLORS.placeholder} />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>
          {!!errors.gender && <Text style={styles.error}>{errors.gender}</Text>}
        </View>
      </View>

      <Text style={styles.label}>Email *</Text>
      <AuthTextInput
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(t) => handleChange("email", t)}
      />
      {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <Text style={styles.label}>Password *</Text>
      <AuthTextInput
        placeholder="At least 6 characters"
        secureTextEntry
        value={password}
        onChangeText={(t) => handleChange("password", t)}
      />
      {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}

      <Text style={styles.label}>Confirm password *</Text>
      <AuthTextInput
        placeholder="Re-enter password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={(t) => handleChange("confirmPassword", t)}
      />
      {!!errors.confirmPassword && (
        <Text style={styles.error}>{errors.confirmPassword}</Text>
      )}

      <AuthButton type="signup" onPress={handleSignup} loading={loading} />
    </AuthScreenLayout>
  );
};

export default SignupPage;

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  error: {
    color: AUTH_COLORS.error,
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  pickerBox: {
    height: 50,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: AUTH_COLORS.surface,
    marginBottom: 12,
    overflow: "hidden",
  },
  picker: { height: 50, color: INPUT_COLORS.text },
  footer: {
    fontSize: 15,
    color: AUTH_COLORS.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  link: { color: AUTH_COLORS.primary, fontWeight: "700" },
});
