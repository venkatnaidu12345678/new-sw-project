import React, { useState } from "react";
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
const TABS = [
  { label: "Terms of Service", icon: "document-text-outline" },
  { label: "Privacy Policy", icon: "shield-checkmark-outline" },
  { label: "Disclaimer", icon: "alert-circle-outline" },
];

const LEGAL_CONTENT = {
  "Terms of Service": {
    lastUpdated: "January 11, 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By accessing and using ShareWheels, you agree to be bound by these terms and conditions.",
      },
      {
        heading: "2. User Responsibilities",
        body: "Users must provide accurate information and comply with all applicable laws and regulations.",
      },
      {
        heading: "3. Service Description",
        body: "ShareWheels connects drivers with passengers seeking transportation through a shared mobility platform.",
      },
      {
        heading: "4. Payment Terms",
        body: "All payments are processed securely through the platform. Users must ensure valid payment methods.",
      },
      {
        heading: "5. Termination",
        body: "Accounts that violate policies may be suspended or permanently terminated without prior notice.",
      },
    ],
  },

  "Privacy Policy": {
    lastUpdated: "January 11, 2026",
    sections: [
      {
        heading: "Information We Collect",
        body: "We collect personal information including name, phone number, location data, and device details.",
      },
      {
        heading: "How We Use Information",
        body: "This information is used to operate the platform, match drivers and riders, and improve services.",
      },
      {
        heading: "Information Confidentiality",
        body: "All collected information is stored securely and never shared with third parties without user consent.",
      },
    ],
  },

  Disclaimer: {
    lastUpdated: "January 11, 2026",
    sections: [
      {
        heading: "Service Availability",
        body: "ShareWheels services are provided as-is without guarantees of uninterrupted availability.",
      },
      {
        heading: "Limitation of Liability",
        body: "ShareWheels is not responsible for indirect, incidental, or consequential damages.",
      },
    ],
  },
};

export default function LegalPage() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Terms of Service");

  const tabKeys = Object.keys(LEGAL_CONTENT);
  const currentIndex = tabKeys.indexOf(activeTab);

  const goNext = () => {
    if (currentIndex < tabKeys.length - 1) {
      setActiveTab(tabKeys[currentIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setActiveTab(tabKeys[currentIndex - 1]);
    }
  };

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

  const content = LEGAL_CONTENT[activeTab];

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
          const active = activeTab === tab.label;

          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.label)}
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
          <Text style={styles.pageTitle}>{activeTab}</Text>

          <Text style={styles.updated}>
            Last Updated: {content.lastUpdated}
          </Text>

          {content.sections.map((section, index) => (
            <View key={index} style={styles.block}>
              <Text style={styles.heading}>{section.heading}</Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
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