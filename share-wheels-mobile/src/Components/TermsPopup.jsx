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
import { getLegalPolicies } from "../ApiService/legalApiService";

const TermsPopup = ({ visible = true, onSuccess, setRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [termsText, setTermsText] = useState("");
  const [policiesLoading, setPoliciesLoading] = useState(false);

  const loadTerms = async () => {
    setPoliciesLoading(true);
    try {
      const policies = await getLegalPolicies();
      setTermsText(policies?.terms?.content || policies?.terms?.content || "");
    } catch (e) {
      // Keep UX stable even if the request fails.
      setTermsText("");
    } finally {
      setPoliciesLoading(false);
    }
  };

  // Load policies when modal becomes visible.
  React.useEffect(() => {
    if (visible) loadTerms();
  }, [visible]);

  const renderParagraphs = (text) => {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const parts = raw.split(/\n\s*\n/g);
    return parts.map((p, i) => (
      <View key={`${i}`} style={styles.clauseContainer}>
        <Text style={styles.clauseText}>{p}</Text>
      </View>
    ));
  };

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
            {policiesLoading ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#2563EB" />
              </View>
            ) : (
              renderParagraphs(termsText) || (
                <Text style={styles.clauseText}>
                  Terms are not available right now. Please try again later.
                </Text>
              )
            )}
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
  clauseText: { fontSize: 14, color: "#555", lineHeight: 20 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#555", borderRadius: 4, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: "#007bff", borderColor: "#007bff" },
  checkboxTick: { width: 10, height: 10, backgroundColor: "#fff", borderRadius: 2 },
  checkboxText: { marginLeft: 10, fontSize: 14, color: "#555", flexShrink: 1 },
  button: { padding: 15, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});