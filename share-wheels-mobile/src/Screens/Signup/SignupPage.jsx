import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import AuthButton from "../../Components/AuthButton";
import AuthTextInput from "../../Components/AuthTextInput";
import { signupApi } from '../../ApiService/AuthApiService';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  validateName,
  validatePhone,
  validateEmail,
  validateGender,
  validatePassword,
  validateConfirmPassword,
} from "../../Utils";

const SignUpScreen = ({ navigation, triggerAuth }) => {
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
        // ✅ Allow only digits + max 10
        const cleaned = value.replace(/[^0-9]/g, "").slice(0, 10);
        setPhone(cleaned);
        error = validatePhone(cleaned);
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
    }

    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };


  const handleSignup = async () => {
    const nameError = validateName(name);
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const genderError = validateGender(gender);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    if (nameError || phoneError || emailError || genderError || passwordError || confirmError) {
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

    const payload = {
      name,
      email: email.trim().toLowerCase(),
      mobile: phone,
      gender,
      password,
    };

    setLoading(true);
    try {
      const response = await signupApi(payload);

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
    } catch (error) {
      console.log("Signup Network Error", error);
    } finally {
      setLoading(false);
    }
  };


  return (
   <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.heading}>Sign Up</Text>

        {/* Name */}
        <Text style={styles.label}>
          Name <Text style={styles.star}>*</Text>
        </Text>
        <AuthTextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={(text) => handleChange("name", text)}
        />
        {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}

        {/* Phone + Gender */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>
              Phone <Text style={styles.star}>*</Text>
            </Text>
            <AuthTextInput
              placeholder="Phone number"
              keyboardType="numeric"
              value={phone}
              maxLength={10}
              onChangeText={(text) => handleChange("phone", text)}
            />
            {!!errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>
              Gender <Text style={styles.star}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={(value) => handleChange("gender", value)}
              >
                <Picker.Item label="Select" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
            {!!errors.gender && <Text style={styles.error}>{errors.gender}</Text>}
          </View>
        </View>

        {/* Email */}
        <Text style={styles.label}>
          Email <Text style={styles.star}>*</Text>
        </Text>
        <AuthTextInput
          placeholder="Email address"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => handleChange("email", text)}
        />
        {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}

        <Text style={styles.label}>
          Password <Text style={styles.star}>*</Text>
        </Text>
        <AuthTextInput
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
          onChangeText={(text) => handleChange("password", text)}
        />
        {!!errors.password && <Text style={styles.error}>{errors.password}</Text>}

        <Text style={styles.label}>
          Confirm password <Text style={styles.star}>*</Text>
        </Text>
        <AuthTextInput
          placeholder="Re-enter password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(text) => handleChange("confirmPassword", text)}
        />
        {!!errors.confirmPassword && (
          <Text style={styles.error}>{errors.confirmPassword}</Text>
        )}
      </View>
      <AuthButton
        type="signup"
        onPress={handleSignup}
        loading={loading}
        style={{ marginTop: 0 }}
      />

      <Text style={styles.footerText}>
        Already have an account?{" "}
        <Text
          style={styles.signIn}
          onPress={() => navigation.navigate("Signin")}
        >
          Sign In
        </Text>
      </Text>
    </View>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "#fff",
  },

  form: {
    marginBottom: 10,
  },

  heading: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
   star: {
    color: "red",
  },
   error: {
    color: "red",
    fontSize: 12,
    marginBottom: 5,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },

  col: {
    flex: 1,
    marginHorizontal: 4,
  },

  pickerContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    justifyContent: "center",
  },

  footerText: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
  },

  signIn: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
