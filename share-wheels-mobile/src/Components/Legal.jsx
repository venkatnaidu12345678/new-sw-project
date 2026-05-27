import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  PanResponder,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BackButton from "../Components/BackButton";
import { getLegalPolicies } from "../ApiService/legalApiService";

const TABS = [
  { key: "terms", label: "Terms of Service", icon: "document-text-outline" },
  { key: "privacy", label: "Privacy Policy", icon: "shield-checkmark-outline" },
  { key: "disclaimer", label: "Disclaimer", icon: "alert-circle-outline" },
];

const splitParagraphs = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw.split(/\n\s*\n/g).map((t) => t.trim()).filter(Boolean);
};

export default function LegalPage() {
  const navigation = useNavigation();
  const [activeKey, setActiveKey] = useState("terms");
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);

  const activePolicy = policies ? policies[activeKey] : null;
  const paragraphs = useMemo(() => splitParagraphs(activePolicy?.content), [activePolicy]);

  const tabKeys = useMemo(() => TABS.map((t) => t.key), []);
  const currentIndex = tabKeys.indexOf(activeKey);

  const goNext = () => {
    if (currentIndex < tabKeys.length - 1) {
      setActiveKey(tabKeys[currentIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setActiveKey(tabKeys[currentIndex - 1]);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLegalPolicies()
      .then((data) => {
        // backend returns: {terms, privacy, disclaimer}
        if (!mounted) return;
        setPolicies(data?.terms ? data : data?.policies || data);
      })
      .catch(() => {
        if (!mounted) return;
        setPolicies(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        goPrev();
      } else if (gestureState.dx < -50) {
        goNext();
      }
    },
  });

  const activeLabel = TABS.find((t) => t.key === activeKey)?.label || "Legal";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
     <View style={styles.header}>
  <BackButton />

  <Text style={styles.headerTitle}>Legal</Text>

  <View style={{ width: 40 }} /> 
</View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
      >
        {TABS.map((tab) => {
          const active = activeKey === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveKey(tab.key)}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={active ? "#2979ff" : "#777"}
                />

                <Text
                  style={[
                    styles.tabText,
                    active && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </View>

              {active && <View style={styles.activeLine} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} {...panResponder.panHandlers}>
        <View style={styles.card}>
          <Text style={styles.pageTitle}>{activeLabel}</Text>

          <Text style={styles.updated}>
            {activePolicy?.updatedAt
              ? `Last Updated: ${new Date(activePolicy.updatedAt).toLocaleDateString()}`
              : "Last Updated: —"}
          </Text>

          {loading ? (
            <Text style={styles.body}>Loading…</Text>
          ) : paragraphs.length ? (
            paragraphs.map((p, i) => (
              <View key={i} style={styles.block}>
                <Text style={styles.body}>{p}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.body}>
              No content available. Please check back later.
            </Text>
          )}
        </View>

        {/* Support Box */}
        <View style={styles.supportBox}>
          <Text style={styles.supportTitle}>Questions?</Text>

          <Text style={styles.supportText}>
            If you have any questions about our legal policies,
            please contact our support team.
          </Text>

          {/* UPDATED BUTTON */}
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => navigation.navigate("ChartBoat")}
          >
            <Text style={styles.supportButtonText}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
  },

  header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 14,
  paddingVertical: 14,
  backgroundColor: "#fff",
},

headerTitle: {
  flex: 1,
  textAlign: "center",
  fontSize: 18,
  fontWeight: "600",
},

  tabs: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  tabItem: {
    marginHorizontal: 10,
    paddingVertical: 12,
  },

  tabContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  tabText: {
    fontSize: 13,
    marginLeft: 5,
    color: "#777",
  },

  activeTabText: {
    color: "#2979ff",
    fontWeight: "600",
  },

  activeLine: {
    height: 2,
    backgroundColor: "#2979ff",
    marginTop: 6,
  },

  content: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 18,
  },

  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  updated: {
    fontSize: 12,
    color: "#888",
    marginBottom: 18,
  },

  block: {
    marginBottom: 16,
  },

  heading: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },

  body: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },

  supportBox: {
    backgroundColor: "#eaf2ff",
    padding: 18,
    borderRadius: 10,
    marginTop: 18,
  },

  supportTitle: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },

  supportText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 12,
  },

  supportButton: {
    backgroundColor: "#2979ff",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  supportButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});