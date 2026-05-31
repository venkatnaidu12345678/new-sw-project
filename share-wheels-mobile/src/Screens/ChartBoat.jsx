import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BackButton from "../Components/BackButton";
import {
  getSupportContext,
  sendSupportMessage,
} from "../ApiService/supportApiService";
import { ChatListSkeleton } from "../Components/ui/Skeleton";
import AnimatedLoad from "../Components/ui/AnimatedLoad";
import ChatMessage from "../Components/ui/ChatMessage";
import TypingIndicator from "../Components/ui/TypingIndicator";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const FALLBACK_SUGGESTIONS = [
  "Full account summary",
  "My upcoming rides",
  "Rides available today",
  "My requests",
  "Driver inbox",
  "Courier help",
];

const QuickChip = ({ label, onPress, disabled, index }) => {
  const styles = useThemedStyles(createStyles);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 80 + index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay: 80 + index * 50,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.quickBtn}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.quickText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ChartBoat = () => {
  const { input: inputColors, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contextMeta, setContextMeta] = useState(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const toHistory = useCallback(
    (msgs) =>
      msgs
        .filter((m) => m.sender === "user" || m.sender === "bot")
        .slice(-10)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          text: m.text,
        })),
    []
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("Not logged in");

        const ctx = await getSupportContext(token);
        if (!mounted) return;

        setContextMeta(ctx.context);
        setSuggestions(ctx.suggestions || FALLBACK_SUGGESTIONS);
        setMessages([
          {
            id: "welcome",
            sender: "bot",
            text:
              ctx.greeting ||
              "Hi! I'm your Share Wheels support assistant. How can I help?",
          },
        ]);
      } catch {
        if (!mounted) return;
        setMessages([
          {
            id: "welcome-offline",
            sender: "bot",
            text: "Hi! I can help with rides, payments, courier, and your account. (Limited mode — check your connection.)",
          },
        ]);
        setSuggestions(FALLBACK_SUGGESTIONS);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: sending ? 0.92 : 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [sending, sendScale]);

  const sendMessage = async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || sending) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    scrollToEnd();

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await sendSupportMessage(token, {
        message: trimmed,
        history: toHistory(nextMessages),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: res.reply,
          escalate: res.escalate,
        },
      ]);

      if (res.suggestions?.length) {
        setSuggestions(res.suggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: "bot",
          text: getOfflineReply(trimmed.toLowerCase()),
        },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const renderItem = ({ item, index }) => (
    <ChatMessage item={item} index={index} />
  );

  return (
    <KeyboardAwareScreen
      style={styles.container}
      keyboardVerticalOffset={insets.top + 56}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <Text style={styles.adminBanner}>
            For feedback to admins, use Send feedback on your Profile screen.
          </Text>
          <Text style={styles.active} numberOfLines={2}>
            {contextMeta
              ? `Synced · ${contextMeta.upcomingRides ?? 0} upcoming · ${(contextMeta.passengerRequestsOpen ?? 0) + (contextMeta.courierRequestsOpen ?? 0)} requests`
              : "AI assistant · rides, payments & courier"}
          </Text>
        </View>
      </View>

      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={styles.centered}>
            <ChatListSkeleton />
            <Text style={styles.loadingText}>
              Reading your rides, requests & platform data...
            </Text>
          </View>
        }
        style={styles.body}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
            sending ? (
              <View style={styles.typingWrap}>
                <View style={styles.typingBubble}>
                  <TypingIndicator />
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.quickWrap}>
          {suggestions.map((issue, index) => (
            <QuickChip
              key={issue}
              label={issue}
              index={index}
              disabled={sending}
              onPress={() => sendMessage(issue)}
            />
          ))}
        </View>

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            placeholder="Ask about rides, payments, courier..."
            placeholderTextColor={inputColors.placeholder}
            value={input}
            onChangeText={setInput}
            style={styles.input}
            editable={!sending}
            onSubmitEditing={() => sendMessage(input)}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={sending}
              activeOpacity={0.85}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </AnimatedLoad>
    </KeyboardAwareScreen>
  );
};

function getOfflineReply(text) {
  if (text.includes("payment"))
    return "For payment issues, note your ride route and date. Pay the driver as agreed (price × seats).";
  if (text.includes("cancel"))
    return "Drivers can cancel or postpone at least 2 hours before start (postpone once, up to 2 hours). Check Upcoming for ride status.";
  if (text.includes("driver"))
    return "If the driver isn't responding, check Upcoming or search for another ride on the same route.";
  if (text.includes("courier"))
    return "Use Send Courier from the app menu. You need receiver details and a parcel image.";
  if (text.includes("vehicle") || text.includes("offer"))
    return "Add your vehicle in Profile before offering a ride.";
  if (text.includes("otp") || text.includes("login"))
    return "OTP expires in 5 minutes. Re-request from the login screen if needed.";
  return "I'm having trouble reaching the server. Try again shortly, or pick a quick topic below.";
}

export default ChartBoat;

const createStyles = (c) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  body: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: c.textMuted, fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  headerTextWrap: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: c.text },
  adminBanner: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  active: { fontSize: 12, color: c.primary, marginTop: 4, fontWeight: "500" },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },

  typingWrap: { alignSelf: "flex-start", marginVertical: 6 },
  typingBubble: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.border,
  },

  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  quickBtn: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
    margin: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  quickText: { fontSize: 12, color: c.primaryText, fontWeight: "600" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  input: {
    flex: 1,
    backgroundColor: c.inputBg,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    color: c.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: c.border,
  },
  sendBtn: {
    backgroundColor: c.primary,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.55 },
  sendIcon: { color: c.inverseText, fontSize: 18, fontWeight: "700" },
});
