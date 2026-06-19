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
import { userTermsApi } from "../ApiService/AuthApiService";
import { getLegalPolicies } from "../ApiService/legalApiService";
import { setPendingAppTour } from "../coachMarks/storage";
import { splitParagraphs } from "../Utils/htmlUtils";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const TermsPopup = ({ visible = true, onSuccess, setRefresh }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
      setTermsText("");
    } finally {
      setPoliciesLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible) loadTerms();
  }, [visible]);

  const renderParagraphs = (text) => {
    const parts = splitParagraphs(text);
    if (!parts.length) return null;
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

      const resp = await userTermsApi(token, true);

      if (resp && resp.success) {
        await setPendingAppTour();
        Alert.alert("Success", "Terms accepted successfully");
        setRefresh((prev) => prev + 1);
        if (onSuccess) onSuccess();
      } else {
        Alert.alert("Error", resp?.message || "Failed to accept terms. Try again.");
      }
    } catch (error) {
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
                <ActivityIndicator color={colors.primary} />
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
            style={[styles.button, !agreed && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={!agreed || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.inverseText} />
            ) : (
              <Text style={styles.buttonText}>Accept & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TermsPopup;

const createStyles = (c) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      width: "90%",
      height: "75%",
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 20,
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: c.border,
    },
    heading: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: "center",
      color: c.text,
    },
    scrollContainer: { flex: 1, marginBottom: 10 },
    clauseContainer: { marginBottom: 15 },
    clauseText: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    checkboxTick: {
      width: 10,
      height: 10,
      backgroundColor: c.inverseText,
      borderRadius: 2,
    },
    checkboxText: {
      marginLeft: 10,
      fontSize: 14,
      color: c.textSecondary,
      flexShrink: 1,
    },
    button: {
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: c.primary,
    },
    buttonDisabled: {
      backgroundColor: c.textMuted,
    },
    buttonText: { color: c.inverseText, fontWeight: "bold", fontSize: 16 },
  });
