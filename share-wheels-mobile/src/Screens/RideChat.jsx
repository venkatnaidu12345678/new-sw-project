import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BackButton from "../Components/BackButton";
import { getRideChatMessages, sendRideChatMessage } from "../ApiService/chatApiServices";
import { profileData } from "../Navigation/AuthNavigator";
import { useParticipantLocation } from "../hooks/useDriverLocation";
import { INPUT_COLORS } from "../theme/inputTheme";

const RideChat = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const {
    rideId,
    rideTitle,
    myRole,
    rideStatus,
    peerId,
    peerName,
    peerRole,
  } = route.params || {};
  const { ProfileDetails } = profileData();
  const myId = ProfileDetails?._id || ProfileDetails?.id;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState(null);
  const listRef = useRef(null);

  const isDirect = !!peerId;
  const isRideStarted =
    rideStatus === "started" || rideStatus === "Started";

  useParticipantLocation({
    enabled: isRideStarted && !!token && !!rideId,
    rideId,
    token,
  });

  const loadMessages = useCallback(async () => {
    if (!token || !rideId) return;
    try {
      const res = await getRideChatMessages(token, rideId, peerId || undefined);
      setMessages(res.messages || []);
    } catch (e) {
      console.log("Chat load error:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token, rideId, peerId]);

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
  }, []);

  useEffect(() => {
    if (token) loadMessages();
  }, [token, loadMessages]);

  useEffect(() => {
    if (!token) return undefined;
    const poll = setInterval(loadMessages, 4000);
    return () => clearInterval(poll);
  }, [token, loadMessages]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const res = await sendRideChatMessage(
        token,
        rideId,
        msg,
        peerId || undefined
      );
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setText("");
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.log("Send error:", e.message);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMine =
      item.senderId?.toString() === myId?.toString() ||
      item.senderId === myId;
    return (
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {!isMine && (
          <Text style={styles.senderName}>
            {item.senderName} · {item.senderRole}
          </Text>
        )}
        <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.message}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </Text>
      </View>
    );
  };

  const chatTitle = isDirect
    ? `Chat · ${peerName || "User"}`
    : "Group chat";

  return (
    <KeyboardAwareScreen
      style={styles.container}
      keyboardVerticalOffset={insets.top + (Platform.OS === "ios" ? 56 : 24)}
    >
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>{chatTitle}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {rideTitle || "Ride conversation"}
            {peerRole ? ` · ${peerRole}` : ""}
          </Text>
        </View>
      </View>

      {isRideStarted && (
        <View style={styles.trackingBanner}>
          <Text style={styles.trackingText}>
            Location sharing active — open Live map from ride details
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => item._id?.toString() || String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isDirect
                ? "No messages yet. Start a private conversation."
                : "No messages yet. Say hello to everyone on the ride!"}
            </Text>
          }
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isDirect ? "Private message…" : "Message the group…"}
          placeholderTextColor={INPUT_COLORS.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <Text style={styles.sendText}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScreen>
  );
};

export default RideChat;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerText: { marginLeft: 8, flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B" },
  trackingBanner: {
    backgroundColor: "#DCFCE7",
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  trackingText: { fontSize: 12, color: "#166534", textAlign: "center" },
  list: { padding: 16, paddingBottom: 8 },
  empty: { textAlign: "center", color: "#94A3B8", marginTop: 40 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  bubbleOther: {},
  senderName: { fontSize: 11, color: "#64748B", marginBottom: 4, fontWeight: "600" },
  msgText: { fontSize: 15, color: "#0F172A" },
  msgTextMine: { color: "#fff" },
  time: { fontSize: 10, color: "#94A3B8", marginTop: 6, alignSelf: "flex-end" },
  timeMine: { color: "#BFDBFE" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: INPUT_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    color: INPUT_COLORS.text,
    backgroundColor: INPUT_COLORS.background,
  },
  sendBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { color: "#fff", fontWeight: "700" },
});
