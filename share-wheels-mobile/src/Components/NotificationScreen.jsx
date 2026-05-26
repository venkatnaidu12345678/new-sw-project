import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "./ui/ScreenContainer";
import { useNotifications } from "../context/NotificationsContext";
import { handleNotificationOpen } from "../Notifications/notificationNavigation";
import { LAYOUT } from "../theme/layout";

const HEADER_GRADIENT = ["#2563EB", "#4F46E5", "#7C3AED"];

const TYPE_THEMES = {
  ride: { icon: "car-sport", colors: ["#2563EB", "#3B82F6"], accent: "#DBEAFE" },
  chat: { icon: "chatbubble-ellipses", colors: ["#7C3AED", "#A855F7"], accent: "#EDE9FE" },
  message: { icon: "chatbubble-ellipses", colors: ["#7C3AED", "#A855F7"], accent: "#EDE9FE" },
  courier: { icon: "cube", colors: ["#F59E0B", "#F97316"], accent: "#FFEDD5" },
  payment: { icon: "wallet", colors: ["#10B981", "#059669"], accent: "#D1FAE5" },
  request: { icon: "notifications", colors: ["#EC4899", "#F472B6"], accent: "#FCE7F3" },
  default: { icon: "notifications", colors: ["#6366F1", "#818CF8"], accent: "#E0E7FF" },
};

const getTheme = (type) => {
  const key = String(type || "").toLowerCase();
  if (key.includes("ride")) return TYPE_THEMES.ride;
  if (key.includes("chat") || key.includes("message")) return TYPE_THEMES.chat;
  if (key.includes("courier")) return TYPE_THEMES.courier;
  if (key.includes("pay")) return TYPE_THEMES.payment;
  if (key.includes("request")) return TYPE_THEMES.request;
  return TYPE_THEMES.default;
};

const formatTime = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const NotificationCard = ({ item, onPress }) => {
  const theme = getTheme(item.type);

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.88}
      style={styles.cardOuter}
    >
      <LinearGradient
        colors={theme.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardAccent}
      />
      <View style={[styles.card, !item.read && { backgroundColor: theme.accent }]}>
        <View style={styles.cardTop}>
          <LinearGradient colors={theme.colors} style={styles.iconBadge}>
            <Icon name={theme.icon} size={18} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.cardBody}>
            <View style={styles.cardRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.read ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.body} numberOfLines={3}>
              {item.body}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handlePress = async (item) => {
    if (!item.read) {
      await markRead(item._id);
    }
    const data = {
      ...(item.data || {}),
      type: item.type,
      notificationId: item._id,
      title: item.title,
      body: item.body,
    };
    await handleNotificationOpen(navigation, { data });
  };

  return (
    <ScreenContainer edges={["top"]} backgroundColor="#F8FAFC" style={styles.container}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                : "You're all caught up"}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>
      </LinearGradient>

      {loading && notifications.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#2563EB" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#2563EB" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <LinearGradient colors={HEADER_GRADIENT} style={styles.emptyIcon}>
                <Icon name="notifications-off-outline" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.empty}>Ride updates and alerts will appear here.</Text>
            </View>
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  headerGradient: {
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.lg,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginBottom: LAYOUT.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    marginTop: 4,
  },
  markAllBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  markAllPlaceholder: {
    width: 72,
  },
  markAll: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: LAYOUT.spacing.screen,
  },
  cardOuter: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  card: {
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 8,
  },
  body: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  empty: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
});
