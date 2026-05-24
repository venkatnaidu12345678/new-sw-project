import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userTermsApi } from "../ApiService/AuthApiService"; // ✅ make sure this path is correct

const TermsPopup = ({ visible, onSuccess, setRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const termsData = [
    { clause: "Permissions & Data Usage", paragraph: "To ensure optimal functionality and an enhanced user experience, the application may request access to the following permissions:" },
    { clause: "1. Camera & Photo Library", paragraph: "Access to the camera and photo library is required to enable users to capture, upload, and manage images within the application. Images are used strictly for application-related features and are not accessed or shared without user authorization." },
    { clause: "2. Location Information", paragraph: "The application may collect location data (GPS or network-based) to support location-dependent features such as verification, tagging, and service availability. Location data is used only for these purposes." },
    { clause: "3. Notifications", paragraph: "Notification permission is requested to deliver important updates, service alerts, reminders, and other essential communications related to the application. Users retain full control over notification preferences and may enable or disable notifications at any time through device settings." },
    { clause: "Data Security & Privacy", paragraph: "All personal data is handled with strict confidentiality and protected using industry-standard security measures. User information is never sold, rented, or misused." },
  ];

  const handleAccept = async () => {
    if (!agreed) {
      Alert.alert("Agreement required", "Please agree to the terms to continue.");
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Session expired. Please login again.");
        return;
      }

      // ✅ Correct API call
      const resp = await userTermsApi(token, true);

      console.log("Terms API Response:", resp);

      if (resp && resp.success) {
        Alert.alert("Success", "Terms accepted successfully");
        setRefresh(prev => prev + 1);

        // ✅ notify parent
        if (onSuccess) {
          onSuccess();
        }
      } else {
        Alert.alert(
          "Error",
          resp?.message || "Failed to accept terms. Try again."
        );
      }
    } catch (error) {
      console.log("Terms API Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.heading}>Terms of Service</Text>

          <ScrollView style={styles.scrollContainer}>
            {termsData.map((item, index) => (
              <View key={index} style={styles.clauseContainer}>
                <Text style={styles.clauseTitle}>{item.clause}</Text>
                <Text style={styles.clauseText}>{item.paragraph}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <View style={styles.checkboxTick} />}
            </View>
            <Text style={styles.checkboxText}>I agree to the terms and conditions</Text>
          </Pressable>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: agreed ? "#007bff" : "#999" }]}
            onPress={handleAccept}
            disabled={!agreed || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept & Continue</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TermsPopup;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  container: { width: "90%", height: "75%", backgroundColor: "#fff", borderRadius: 20, padding: 20, justifyContent: "space-between" },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  scrollContainer: { flex: 1, marginBottom: 10 },
  clauseContainer: { marginBottom: 15 },
  clauseTitle: { fontWeight: "bold", marginBottom: 5, fontSize: 16 },
  clauseText: { fontSize: 14, color: "#555", lineHeight: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#555", borderRadius: 4, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#007bff", borderColor: "#007bff" },
  checkboxTick: { width: 10, height: 10, backgroundColor: "#fff", borderRadius: 2 },
  checkboxText: { marginLeft: 10, fontSize: 14, color: "#555", flexShrink: 1 },
  button: { padding: 15, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});