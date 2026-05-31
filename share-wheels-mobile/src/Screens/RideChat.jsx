import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useNavigation } from "@react-navigation/native";
import ScreenHeader from "../Components/ui/ScreenHeader";
import KeyboardAwareScreen from "../Components/ui/KeyboardAwareScreen";
import UserAvatar from "../Components/ui/UserAvatar";
import { getRideChatMessages, sendRideChatMessage } from "../ApiService/chatApiServices";
import { profileData } from "../Navigation/AuthNavigator";
import { setActiveRideTracking } from "../Utils/activeRideTracking";
import { LAYOUT } from "../theme/layout";
import { getProfileImageUri, profileFromUrl } from "../Utils/profileImage";
import { useTheme } from "../context/ThemeContext";

const ROLE_COLORS = {
  driver: "#2563EB",
  passenger: "#10B981",
  courier: "#F59E0B",
};

const messageKey = (m, index) => {
  const id = m?._id?.toString?.() || m?.id?.toString?.();
  if (id) return `chat-${id}`;
  return `chat-${index}-${m?.createdAt || ""}-${m?.message?.slice?.(0, 12) || ""}`;
};

const mergeChatMessages = (existing, incoming) => {
  const byId = new Map();
  [...existing, ...incoming].forEach((m, index) => {
    const key = messageKey(m, index);
    if (!byId.has(key) || m._id) byId.set(key, m);
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );
};

const RideChat = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute();
  const {
    rideId,
    rideTitle,
    rideStatus,
    peerId,
    peerName,
    peerRole,
    peerProfileImg,
  } = route.params || {};
  const { ProfileDetails } = profileData();
  const myId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    ProfileDetails?.data?.personalInfo?._id ||
    ProfileDetails?.data?.personalInfo?.id;
  const myProfile =
    ProfileDetails?.data?.personalInfo || ProfileDetails?.data || ProfileDetails;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState(null);
  const [storedUserId, setStoredUserId] = useState(null);
  const listRef = useRef(null);

  const resolvedMyId =
    myId ||
    storedUserId ||
    ProfileDetails?.data?.personalInfo?._id ||
    ProfileDetails?.data?.personalInfo?.id;

  const isRideStarted =
    rideStatus === "started" || rideStatus === "Started";
  const peerColor = ROLE_COLORS[peerRole] || "#64748B";
  const peerAvatarUser = profileFromUrl(peerProfileImg) || {
    name: peerName,
    profile_img: peerProfileImg,
  };

  const avatarForMessage = (item, isMine) => {
    if (isMine) return myProfile;
    const fromMsg = getProfileImageUri({
      profile_img: item.senderAvatar,
      name: item.senderName,
    });
    if (fromMsg) return { profile_img: fromMsg, name: item.senderName };
    if (
      (item.senderId?._id || item.senderId)?.toString?.() ===
      peerId?.toString?.()
    ) {
      return peerAvatarUser;
    }
    return { name: item.senderName, profile_img: item.senderAvatar };
  };

  useEffect(() => {
    if (!peerId) {
      navigation.goBack();
    }
  }, [peerId, navigation]);

  useEffect(() => {
    if (isRideStarted && rideId) {
      setActiveRideTracking(rideId);
    }
  }, [isRideStarted, rideId]);

  const loadMessages = useCallback(async () => {
    if (!token || !rideId || !peerId) return;
    try {
      const res = await getRideChatMessages(token, rideId, peerId);
      setMessages((prev) => mergeChatMessages(prev, res.messages || []));
    } catch (e) {
      console.log("Chat load error:", e.message);
    } finally {
      setLoading(false);
    }
  }, [token, rideId, peerId]);

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
    AsyncStorage.getItem("user").then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setStoredUserId(parsed?._id || parsed?.id || null);
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (token && peerId) loadMessages();
  }, [token, peerId, loadMessages]);

  useEffect(() => {
    if (!token || !peerId) return undefined;
    const poll = setInterval(loadMessages, 4000);
    return () => clearInterval(poll);
  }, [token, peerId, loadMessages]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || sending || !peerId) return;
    setSending(true);
    try {
      const res = await sendRideChatMessage(token, rideId, msg, peerId);
      if (res.message) {
        setMessages((prev) => mergeChatMessages(prev, [res.message]));
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
    const senderId = item.senderId?._id || item.senderId;
    const isMine = senderId?.toString?.() === resolvedMyId?.toString?.();
    const roleColor = ROLE_COLORS[item.senderRole] || "#64748B";
    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    if (isMine) {
      return (
        <View style={styles.messageRow}>
          <View style={styles.rowMine}>
            <View style={styles.colMine}>
              <View style={[styles.bubble, styles.bubbleMine]}>
                <Text style={styles.msgTextMine}>{item.message}</Text>
              </View>
              <Text style={styles.timeMine}>{timeStr}</Text>
            </View>
            <UserAvatar user={avatarForMessage(item, true)} size={32} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageRow}>
        <View style={styles.rowOther}>
          <UserAvatar user={avatarForMessage(item, false)} size={32} />
          <View style={styles.colOther}>
            <Text style={styles.senderLabel}>
              {item.senderName || peerName || "User"}
              {item.senderRole ? (
                <Text style={[styles.roleTag, { color: roleColor }]}>
                  {" "}
                  · {item.senderRole}
                </Text>
              ) : null}
            </Text>
            <View style={[styles.bubble, styles.bubbleOther]}>
              <Text style={styles.msgTextOther}>{item.message}</Text>
            </View>
            <Text style={styles.timeOther}>{timeStr}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!peerId) return null;

  const subtitle = [rideTitle, peerRole].filter(Boolean).join(" · ");

  const chatHeader = (
    <View style={[styles.headerBlock, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={peerName || "Chat"}
        backgroundColor={colors.background}
        rightElement={
          <UserAvatar user={peerAvatarUser} size={36} borderColor={colors.border} />
        }
      />
      <View style={styles.peerBar}>
        <View style={[styles.peerDot, { backgroundColor: peerColor }]} />
        <View style={styles.peerMeta}>
          <Text style={styles.peerRole}>
            {(peerRole || "participant").toString()}
          </Text>
          {subtitle ? (
            <Text style={styles.peerRide} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {isRideStarted ? (
        <View style={styles.trackingBanner}>
          <Text style={styles.trackingText}>
            Live ride — location sharing is active
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAwareScreen
      style={[styles.screen, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={insets.top + 56}
      header={chatHeader}
      headerStyle={{ backgroundColor: colors.background }}
    >
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => messageKey(item, i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.empty}>
                Send a message to {peerName || "this person"}.
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScreen>
  );
};

export default RideChat;

const createStyles = (colors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    headerBlock: {
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingBottom: 4,
    },
    peerBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: LAYOUT.spacing.sm,
    },
    peerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    peerMeta: { flex: 1 },
    peerRole: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
    peerRide: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    trackingBanner: {
      backgroundColor: colors.successBg,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 8,
    },
    trackingText: {
      fontSize: 12,
      color: colors.successText,
      textAlign: "center",
      fontWeight: "600",
    },
    loader: { marginTop: 48 },
    list: {
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingTop: 8,
      paddingBottom: 12,
      flexGrow: 1,
    },
    emptyWrap: {
      alignItems: "center",
      marginTop: 48,
      paddingHorizontal: 24,
    },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    empty: {
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    messageRow: {
      width: "100%",
      marginBottom: 14,
    },
    rowMine: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "flex-end",
      gap: 8,
    },
    colMine: {
      maxWidth: "78%",
      alignItems: "flex-end",
    },
    rowOther: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    colOther: {
      maxWidth: "78%",
    },
    senderLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 4,
      marginLeft: 4,
    },
    roleTag: {
      fontWeight: "700",
      textTransform: "capitalize",
    },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    bubbleMine: {
      backgroundColor: colors.bubbleMine,
      borderBottomRightRadius: 4,
    },
    bubbleOther: {
      backgroundColor: colors.bubbleOther,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    msgTextMine: { fontSize: 15, color: "#FFFFFF", lineHeight: 21 },
    msgTextOther: { fontSize: 15, color: colors.text, lineHeight: 21 },
    timeMine: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      marginRight: 4,
    },
    timeOther: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      marginLeft: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingTop: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 100,
      color: colors.text,
      backgroundColor: colors.inputBg,
      fontSize: 15,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 22,
      minWidth: 64,
      alignItems: "center",
    },
    sendDisabled: { opacity: 0.45 },
    sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  });
