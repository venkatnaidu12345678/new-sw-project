import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import ScreenContainer from "./ui/ScreenContainer";
import ScreenHeader from "./ui/ScreenHeader";
import { getLegalPolicies } from "../ApiService/legalApiService";
import { navigateRoot } from "../Utils/navigationRoot";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { LAYOUT } from "../theme/layout";

const TABS = [
  { key: "terms", label: "Terms", icon: "document-text", accent: "#4F46E5" },
  { key: "privacy", label: "Privacy", icon: "lock-closed", accent: "#0D9488" },
  { key: "disclaimer", label: "Disclaimer", icon: "information-circle", accent: "#D97706" },
];

const stripHtmlToPlain = (html) => {
  const raw = String(html || "").trim();
  if (!raw) return "";
  if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const splitParagraphs = (text) => {
  const plain = stripHtmlToPlain(text);
  if (!plain) return [];
  return plain.split(/\n\s*\n/g).map((t) => t.trim()).filter(Boolean);
};

export default function LegalPage() {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [activeKey, setActiveKey] = useState("terms");
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const activePolicy = policies?.[activeKey] ?? null;
  const activeTab = TABS.find((t) => t.key === activeKey) || TABS[0];
  const paragraphs = useMemo(
    () => splitParagraphs(activePolicy?.content),
    [activePolicy]
  );

  const heroColors = isDark
    ? ["#0F172A", "#1E3A8A", "#312E81"]
    : ["#1E1B4B", "#3730A3", "#4F46E5"];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError("");
    getLegalPolicies()
      .then((data) => {
        if (!mounted) return;
        const normalized = data?.terms
          ? data
          : data?.policies || data;
        setPolicies(normalized);
      })
      .catch((err) => {
        if (!mounted) return;
        setPolicies(null);
        setLoadError(err?.message || "Could not load policies");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenContainer style={styles.root} edges={["top", "bottom"]}>
      <ScreenHeader title="Legal" />

      <LinearGradient colors={heroColors} style={styles.hero}>
        <View style={styles.heroBadge}>
          <Icon name="shield-checkmark" size={22} color="#E0E7FF" />
        </View>
        <Text style={styles.heroTitle}>Legal & policies</Text>
        <Text style={styles.heroSub}>
          Clear terms for rides, payments, courier, and your account data.
        </Text>
      </LinearGradient>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabBtn,
                active && { borderColor: tab.accent, backgroundColor: `${tab.accent}18` },
              ]}
              onPress={() => setActiveKey(tab.key)}
              activeOpacity={0.88}
            >
              <Icon
                name={tab.icon}
                size={18}
                color={active ? tab.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  active && { color: tab.accent, fontWeight: "800" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.docCard, { borderLeftColor: activeTab.accent }]}>
          <View style={styles.docHeader}>
            <View style={[styles.docIcon, { backgroundColor: `${activeTab.accent}22` }]}>
              <Icon name={activeTab.icon} size={20} color={activeTab.accent} />
            </View>
            <View style={styles.docHeaderText}>
              <Text style={styles.docTitle}>{activeTab.label}</Text>
              <Text style={styles.docUpdated}>
                {activePolicy?.updatedAt
                  ? `Last updated ${new Date(activePolicy.updatedAt).toLocaleDateString()}`
                  : "Last updated —"}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={activeTab.accent} />
              <Text style={styles.muted}>Loading…</Text>
            </View>
          ) : loadError ? (
            <Text style={styles.error}>{loadError}</Text>
          ) : paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <Text key={`p-${i}`} style={styles.paragraph}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={styles.paragraph}>
              No content available right now. Please check back later.
            </Text>
          )}
        </View>

        <LinearGradient
          colors={isDark ? ["#1E293B", "#0F172A"] : ["#EEF2FF", "#F8FAFC"]}
          style={styles.supportCard}
        >
          <View style={styles.supportRow}>
            <View style={styles.supportIcon}>
              <Icon name="chatbubbles" size={22} color="#4F46E5" />
            </View>
            <View style={styles.supportCopy}>
              <Text style={styles.supportTitle}>Questions about these policies?</Text>
              <Text style={styles.supportSub}>
                Chat with our support assistant for rides, payments, and account help.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => navigateRoot(navigation, "ChartBoat")}
            activeOpacity={0.9}
          >
            <Text style={styles.supportBtnText}>Open Help & support</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (c) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: LAYOUT.spacing.screen,
    },
    hero: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },
    heroBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },
    heroSub: {
      fontSize: 14,
      color: "rgba(255,255,255,0.88)",
      marginTop: 6,
      lineHeight: 21,
    },
    tabBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    tabBtn: {
      minWidth: "31%",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 4,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 28,
    },
    docCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
      marginBottom: 16,
    },
    docHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 12,
    },
    docIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    docHeaderText: {
      flex: 1,
    },
    docTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    docUpdated: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    centerBox: {
      alignItems: "center",
      paddingVertical: 28,
      gap: 10,
    },
    muted: {
      fontSize: 13,
      color: c.textMuted,
    },
    error: {
      fontSize: 14,
      color: c.errorText,
      lineHeight: 22,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: c.text,
      marginBottom: 14,
    },
    supportCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    supportRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 14,
    },
    supportIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    supportCopy: {
      flex: 1,
    },
    supportTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    supportSub: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 19,
    },
    supportBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#4F46E5",
      paddingVertical: 13,
      borderRadius: 12,
    },
    supportBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
