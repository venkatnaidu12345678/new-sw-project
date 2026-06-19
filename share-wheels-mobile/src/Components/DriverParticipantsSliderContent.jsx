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
import UserAvatar from "./ui/UserAvatar";
import CourierParcelPreview, {
  formatCourierParcelLine,
} from "./CourierParcelPreview";
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
  "Pax requests": "Pax req.",
  "Courier requests": "Courier req.",
};

const TAB_ICON = {
  All: "layers",
  Passengers: "people",
  Couriers: "cube",
  "Pax requests": "person-add",
  "Courier requests": "archive",
};

const getUser = (item) => item?.userId || item?.user || item;

const tabCount = (tab, passengers, couriers, passengerRequests, courierRequests) => {
  switch (tab) {
    case "All":
      return passengers.length + couriers.length;
    case "Passengers":
      return passengers.length;
    case "Couriers":
      return couriers.length;
    case "Pax requests":
      return passengerRequests.length;
    case "Courier requests":
      return courierRequests.length;
    default:
      return 0;
  }
};

const RequestCard = ({
  user,
  name,
  lines,
  fare,
  role,
  onAccept,
  onDecline,
  styles,
  colors,
  children,
}) => (
  <View style={styles.requestCard}>
    <View
      style={[
        styles.requestAccent,
        role === "courier" && styles.requestAccentCourier,
      ]}
    />
    <View style={styles.requestBody}>
      <View style={styles.requestMain}>
        <UserAvatar user={user} size={46} />
        <View style={styles.requestInfo}>
          <Text style={styles.requestName} numberOfLines={1}>
            {name}
          </Text>
          {lines.map((line, i) => (
            <Text key={`${line}-${i}`} style={styles.requestLine} numberOfLines={2}>
              {line}
            </Text>
          ))}
          {children}
        </View>
      </View>
      <View style={styles.requestFooter}>
        <View style={styles.farePill}>
          <Text style={styles.farePillLabel}>Offer</Text>
          <Text style={styles.farePillValue}>₹{fare}</Text>
        </View>
        <View style={styles.requestBtnRow}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onDecline}
            activeOpacity={0.85}
          >
            <Icon name="close" size={17} color={colors.errorText} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Icon name="checkmark" size={17} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

/** Title + tabs — render inside BottomSlider drag zone (drag down to close). */
export const DriverParticipantsSheetHeader = ({
  tabs,
  activeTabIndex,
  onTabChange,
  passengers,
  couriers,
  passengerRequests,
  courierRequests,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  const count = tabCount(
    activeTab,
    passengers,
    couriers,
    passengerRequests,
    courierRequests
  );

  return (
    <View style={styles.headerInDragZone}>
      <Text style={styles.subtitle}>
        {count} {count === 1 ? "item" : "items"} · {TAB_SHORT[activeTab] || activeTab}
      </Text>

      <View style={styles.segmentBar}>
        {tabs.map((tab, index) => {
          const count = tabCount(
            tab,
            passengers,
            couriers,
            passengerRequests,
            courierRequests
          );
          const active = index === activeTabIndex;
          const hasPending = tab.includes("req") && count > 0;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.segment,
                active && styles.segmentActive,
                tabs.length > 2 && styles.segmentCompact,
              ]}
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
              {count > 0 ? (
                <View
                  style={[
                    styles.segmentBadge,
                    active && styles.segmentBadgeActive,
                    hasPending && !active && styles.segmentBadgeWarn,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      active && styles.segmentBadgeTextActive,
                    ]}
                  >
                    {count}
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
  passengerRequests,
  courierRequests,
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
  onAcceptPassenger,
  onRejectPassenger,
  onAcceptCourier,
  onRejectCourier,
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
      case "Pax requests":
        if (!passengerRequests.length) return [{ key: "empty", type: "empty" }];
        return passengerRequests.map((item, i) => ({
          key: item._id || item.userId?._id || `pr-${i}`,
          type: "paxRequest",
          item,
        }));
      case "Courier requests":
        if (!courierRequests.length) return [{ key: "empty", type: "empty" }];
        return courierRequests.map((item, i) => ({
          key: item._id || `cr-${i}`,
          type: "courierRequest",
          item,
        }));
      default:
        return [];
    }
  }, [
    activeTab,
    detailsLoading,
    passengers,
    couriers,
    passengerRequests,
    courierRequests,
  ]);

  const emptyCopy = useMemo(() => {
    const hasPending =
      passengerRequests.length > 0 || courierRequests.length > 0;
    switch (activeTab) {
      case "All":
        return {
          icon: "layers-outline",
          title: "No participants yet",
          sub: hasPending
            ? "Open Pax requests or Courier requests tabs to review pending joiners."
            : "Accepted passengers and couriers appear here.",
        };
      case "Passengers":
        return {
          icon: "people-outline",
          title: "No passengers yet",
          sub: "Accepted passengers appear here.",
        };
      case "Couriers":
        return {
          icon: "cube-outline",
          title: "No couriers yet",
          sub: "Parcel couriers on this ride appear here.",
        };
      case "Pax requests":
        return {
          icon: "mail-open-outline",
          title: "No passenger requests",
          sub: "New requests will show here to accept or decline.",
        };
      default:
        return {
          icon: "archive-outline",
          title: "No courier requests",
          sub: "Parcel requests for this ride appear here.",
        };
    }
  }, [activeTab, passengerRequests.length, courierRequests.length]);

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
      if (row.type === "paxRequest") {
        const item = row.item;
        return (
          <RequestCard
            user={item?.userId}
            name={item?.userId?.name || "Passenger"}
            role="passenger"
            fare={getPassengerFare(item)}
            lines={[
              `${item?.userId?.gender || "N/A"} · ${item?.requires_seats || 1} seat(s)`,
              item?.userId?.email || "No email",
            ]}
            onAccept={() => onAcceptPassenger(item?.userId?._id)}
            onDecline={() => onRejectPassenger(item?.userId?._id)}
            styles={styles}
            colors={colors}
          />
        );
      }
      if (row.type === "courierRequest") {
        const item = row.item;
        const user = getUser(item);
        return (
          <RequestCard
            user={user}
            name={user?.name || "Courier"}
            role="courier"
            fare={getCourierFare(item)}
            lines={[formatCourierParcelLine(item), user?.email || "No email"]}
            onAccept={() => onAcceptCourier(item._id)}
            onDecline={() => onRejectCourier(item._id)}
            styles={styles}
            colors={colors}
          >
            <CourierParcelPreview courier={item} compact />
          </RequestCard>
        );
      }
      return null;
    },
    [
      styles,
      colors,
      emptyCopy,
      rideFrom,
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
      onAcceptPassenger,
      onRejectPassenger,
      onAcceptCourier,
      onRejectCourier,
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
    segmentCompact: {
      minHeight: 56,
      paddingVertical: 8,
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
    segmentBadgeWarn: {
      backgroundColor: c.warningBg,
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
    requestCard: {
      flexDirection: "row",
      marginBottom: 12,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    requestAccent: {
      width: 4,
      backgroundColor: c.primary,
    },
    requestAccentCourier: {
      backgroundColor: "#EA580C",
    },
    requestBody: {
      flex: 1,
      padding: 12,
    },
    requestMain: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    requestInfo: {
      flex: 1,
      marginLeft: 10,
    },
    requestName: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      marginBottom: 4,
    },
    requestLine: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 16,
    },
    requestFooter: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    farePill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.primaryMuted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    farePillLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
    },
    farePillValue: {
      fontSize: 17,
      fontWeight: "800",
      color: c.primary,
    },
    requestBtnRow: {
      flexDirection: "row",
      gap: 8,
    },
    declineBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.errorBorder,
      backgroundColor: c.errorBg,
    },
    declineText: {
      color: c.errorText,
      fontWeight: "700",
      fontSize: 13,
    },
    acceptBtn: {
      flex: 1.15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 11,
      borderRadius: 11,
      backgroundColor: c.primary,
    },
    acceptText: {
      color: c.inverseText,
      fontWeight: "700",
      fontSize: 13,
    },
  });
