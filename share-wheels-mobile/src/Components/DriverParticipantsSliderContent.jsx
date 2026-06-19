import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/Ionicons";
import ParticipantCard from "./ParticipantCard";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { getPassengerFare, getCourierFare } from "../Utils/fareUtils";
import {
  canDropPassenger,
  canDeliverCourier,
} from "../Utils/participantTripStatus";

const TAB_SHORT = {
  All: "All",
  Passengers: "Passengers",
  Couriers: "Couriers",
};

const TAB_ICON = {
  All: "layers",
  Passengers: "people",
  Couriers: "cube",
};

const tabCount = (tab, passengers, couriers) => {
  switch (tab) {
    case "All":
      return passengers.length + couriers.length;
    case "Passengers":
      return passengers.length;
    case "Couriers":
      return couriers.length;
    default:
      return 0;
  }
};

/** Title + tabs — render inside BottomSlider drag zone (drag down to close). */
export const DriverParticipantsSheetHeader = ({
  tabs,
  activeTabIndex,
  onTabChange,
  passengers,
  couriers,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  const count = tabCount(activeTab, passengers, couriers);

  return (
    <View style={styles.headerInDragZone}>
      <Text style={styles.subtitle}>
        {count} {count === 1 ? "item" : "items"} · {TAB_SHORT[activeTab] || activeTab}
      </Text>

      <View style={styles.segmentBar}>
        {tabs.map((tab, index) => {
          const itemCount = tabCount(tab, passengers, couriers);
          const active = index === activeTabIndex;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => onTabChange(index)}
              activeOpacity={0.9}
            >
              <Icon
                name={TAB_ICON[tab] || "ellipse"}
                size={14}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text
                style={[styles.segmentLabel, active && styles.segmentLabelActive]}
                numberOfLines={1}
              >
                {TAB_SHORT[tab] || tab}
              </Text>
              {itemCount > 0 ? (
                <View
                  style={[
                    styles.segmentBadge,
                    active && styles.segmentBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      active && styles.segmentBadgeTextActive,
                    ]}
                  >
                    {itemCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const DriverParticipantsSliderContent = ({
  tabs,
  activeTabIndex,
  detailsLoading,
  passengers,
  couriers,
  rideFrom,
  rideTo,
  rideStatus,
  isRideStarted,
  onVerifyPassenger,
  onVerifyCourier,
  onDropPassenger,
  onDeliverCourier,
  onCall,
  onMessage,
  onRemovePassenger,
  onRemoveCourier,
  onPressPassenger,
  onPressCourier,
  onViewParticipantRoute,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  const listData = useMemo(() => {
    if (detailsLoading) return [{ key: "loading", type: "loading" }];
    switch (activeTab) {
      case "All": {
        const merged = [
          ...passengers.map((item, i) => ({
            key: item._id || item.userId?._id || `p-${i}`,
            type: "passenger",
            item,
          })),
          ...couriers.map((item, i) => ({
            key: item._id || item.userId?._id || `c-${i}`,
            type: "courier",
            item,
          })),
        ];
        if (!merged.length) return [{ key: "empty", type: "empty" }];
        return merged;
      }
      case "Passengers":
        if (!passengers.length) return [{ key: "empty", type: "empty" }];
        return passengers.map((item, i) => ({
          key: item._id || item.userId?._id || `p-${i}`,
          type: "passenger",
          item,
        }));
      case "Couriers":
        if (!couriers.length) return [{ key: "empty", type: "empty" }];
        return couriers.map((item, i) => ({
          key: item._id || item.userId?._id || `c-${i}`,
          type: "courier",
          item,
        }));
      default:
        return [];
    }
  }, [activeTab, detailsLoading, passengers, couriers]);

  const emptyCopy = useMemo(() => {
    switch (activeTab) {
      case "All":
        return {
          icon: "layers-outline",
          title: "No participants yet",
          sub: "Accepted passengers and couriers appear here.",
        };
      case "Passengers":
        return {
          icon: "people-outline",
          title: "No passengers yet",
          sub: "Accepted passengers appear here.",
        };
      default:
        return {
          icon: "cube-outline",
          title: "No couriers yet",
          sub: "Parcel couriers on this ride appear here.",
        };
    }
  }, [activeTab]);

  const renderItem = useCallback(
    ({ item: row }) => {
      if (row.type === "loading") {
        return (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.centerText}>Loading…</Text>
          </View>
        );
      }
      if (row.type === "empty") {
        return (
          <View style={styles.centerBox}>
            <View style={styles.emptyIcon}>
              <Icon name={emptyCopy.icon} size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
            <Text style={styles.emptySub}>{emptyCopy.sub}</Text>
          </View>
        );
      }
      if (row.type === "passenger") {
        const item = row.item;
        return (
          <ParticipantCard
            user={item?.userId}
            role="passenger"
            subtitleLines={[
              item?.userId?.email || "No email",
              `${item?.from || rideFrom || "—"} → ${item?.to || rideTo || "—"}`,
              `${item?.requires_seats || 1} seat(s)`,
            ]}
            fare={getPassengerFare(item)}
            verified={!!item?.isBoardingVerified}
            tripStatus={item?.status}
            showVerify={!item?.isBoardingVerified && isRideStarted}
            onVerify={() => onVerifyPassenger(item)}
            onDrop={
              canDropPassenger(item)
                ? () => onDropPassenger(item)
                : undefined
            }
            highlightDrop={canDropPassenger(item)}
            onCall={() => onCall(item?.userId?.mobile, "passenger")}
            onMessage={() => onMessage(item, "passenger")}
            onRemove={
              !item?.isBoardingVerified
                ? () => onRemovePassenger(item)
                : undefined
            }
            onViewRoute={
              isRideStarted && onViewParticipantRoute
                ? () => onViewParticipantRoute(item, "passenger")
                : undefined
            }
            onPress={() => onPressPassenger(item)}
          />
        );
      }
      if (row.type === "courier") {
        const item = row.item;
        return (
          <ParticipantCard
            user={item?.userId}
            role="courier"
            courier={item}
            subtitleLines={[
              item?.userId?.email || "No email",
              `${item?.from || rideFrom || "—"} → ${item?.to || rideTo || "—"}`,
            ]}
            fare={getCourierFare(item)}
            fareLabel="Amount"
            verified={!!item?.isBoardingVerified}
            tripStatus={item?.status}
            showVerify={!item?.isBoardingVerified && isRideStarted}
            onVerify={() => onVerifyCourier(item)}
            onDeliver={
              canDeliverCourier(item)
                ? () => onDeliverCourier(item)
                : undefined
            }
            highlightDeliver={canDeliverCourier(item)}
            onCall={() => onCall(item?.userId?.mobile, "courier")}
            onMessage={() => onMessage(item, "courier")}
            onRemove={
              !item?.isBoardingVerified
                ? () => onRemoveCourier(item._id)
                : undefined
            }
            onViewRoute={
              isRideStarted && onViewParticipantRoute
                ? () => onViewParticipantRoute(item, "courier")
                : undefined
            }
            onPress={() => onPressCourier(item)}
          />
        );
      }
      return null;
    },
    [
      styles,
      colors,
      emptyCopy,
      rideFrom,
      rideTo,
      rideStatus,
      isRideStarted,
      onVerifyPassenger,
      onVerifyCourier,
      onDropPassenger,
      onDeliverCourier,
      onCall,
      onMessage,
      onRemovePassenger,
      onRemoveCourier,
      onPressPassenger,
      onPressCourier,
      onViewParticipantRoute,
    ]
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={listData}
        key={activeTab}
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.listContent}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        windowSize={8}
      />
    </View>
  );
};

export default DriverParticipantsSliderContent;

const createStyles = (c) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    listContent: {
      paddingTop: 12,
      paddingBottom: 24,
      flexGrow: 1,
    },
    list: {
      flex: 1,
    },
    headerInDragZone: {
      paddingHorizontal: 2,
      paddingBottom: 8,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
      lineHeight: 17,
      marginBottom: 10,
    },
    segmentBar: {
      flexDirection: "row",
      backgroundColor: c.chipBg,
      borderRadius: 14,
      padding: 5,
      gap: 5,
      borderWidth: 1,
      borderColor: c.border,
    },
    segment: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 11,
      minHeight: 62,
    },
    segmentActive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    segmentLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: c.textMuted,
      marginTop: 4,
      textAlign: "center",
    },
    segmentLabelActive: {
      color: c.primary,
      fontWeight: "800",
    },
    segmentBadge: {
      marginTop: 4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentBadgeActive: {
      backgroundColor: c.primary,
    },
    segmentBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: c.textMuted,
    },
    segmentBadgeTextActive: {
      color: c.inverseText,
    },
    centerBox: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 20,
    },
    centerText: {
      marginTop: 12,
      fontSize: 14,
      color: c.textMuted,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    emptySub: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 18,
    },
  });
