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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ScreenContainer from "./ui/ScreenContainer";
import ScreenHeader from "./ui/ScreenHeader";
import { useNotifications } from "../context/NotificationsContext";
import { handleNotificationOpen } from "../Notifications/notificationNavigation";
import { LAYOUT } from "../theme/layout";

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

const NotificationCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.card, !item.read && styles.cardUnread]}
    onPress={() => onPress(item)}
    activeOpacity={0.85}
  >
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
  </TouchableOpacity>
);

const NotificationsScreen = () => {
  const navigation = useNavigation();
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
    <ScreenContainer style={styles.container}>
      <ScreenHeader
        title="Notifications"
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <Text style={styles.subHeader}>
        {unreadCount > 0
          ? `${unreadCount} unread`
          : "You're all caught up"}
      </Text>

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
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No notifications yet</Text>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenContainer>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.screen,
  },
  subHeader: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 12,
  },
  markAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardUnread: {
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFC",
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
  empty: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 48,
    fontSize: 15,
  },
});
