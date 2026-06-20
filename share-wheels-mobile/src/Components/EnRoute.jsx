import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import UserAvatar from "./ui/UserAvatar";
import DriverParticipantPopover from "./ui/DriverParticipantPopover";
import { profileFromUrl } from "../Utils/profileImage";
import { buildEnrouteDetail } from "../Utils/driverParticipantDetails";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pickCourierApi, pickPassengerApi } from "../ApiService/ridesApiServices";
import {
  countEnrouteByType,
  filterEnrouteByParticipants,
  getEnroutePickConflict,
  getEnrouteSiblingNote,
  ENROUTE_ALREADY_PICKED_MESSAGE,
  isEnrouteRequestUnavailableError,
  isEnrouteSubscriptionError,
} from "../Utils/enrouteRequestUtils";
import { useEnrouteRequests } from "../hooks/useEnrouteRequests";

const TABS = ["All", "Passengers", "Couriers"];

const TAB_KEY = {
  All: "all",
  Passengers: "passenger",
  Couriers: "courier",
};

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

const isPickSuccess = (response) =>
  response?.success === true || response?.status === true;

const EnrouteRequestCard = ({
  item,
  onPick,
  onShowDetails,
  picking,
  pickDisabled = false,
  pickDisabledLabel = "Please wait",
  styles,
  colors,
}) => {
  const isCourier = item.type === "courier";
  const accent = isCourier ? "#EA580C" : colors.successText;

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onShowDetails(item)}
          style={styles.cardMain}
        >
          <UserAvatar
            user={profileFromUrl(item.profile)}
            size={46}
          />
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.rolePill, { backgroundColor: `${accent}18` }]}>
                <Text style={[styles.rolePillText, { color: accent }]}>
                  {isCourier ? "Courier" : "Passenger"}
                </Text>
              </View>
            </View>
            <Text style={styles.detailLine} numberOfLines={2}>
              {item.details}
            </Text>
            <Text style={styles.routeLine} numberOfLines={1}>
              {item.route}
            </Text>
            {item.timeSlot ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                {item.timeSlot}
              </Text>
            ) : null}
            <Text style={styles.tapHint}>Tap for full details</Text>
          </View>
          <View style={styles.fareCol}>
            <Text style={styles.fareLabel}>{isCourier ? "Amount" : "Fare"}</Text>
            <Text style={styles.fareValue}>₹{item.price}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pickBtn,
            (picking || pickDisabled) && styles.pickBtnDisabled,
          ]}
          onPress={() => onPick(item)}
          disabled={picking || pickDisabled}
          activeOpacity={0.85}
        >
          {picking ? (
            <ActivityIndicator size="small" color={colors.inverseText} />
          ) : (
            <>
              <Icon
                name={pickDisabled ? "lock-closed" : isCourier ? "cube" : "person-add"}
                size={17}
                color={colors.inverseText}
              />
              <Text style={styles.pickBtnText}>
                {pickDisabled
                  ? picking
                    ? "Picking…"
                    : pickDisabledLabel
                  : isCourier
                    ? "Pick courier"
                    : "Pick passenger"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const EnrouteSheetHeader = ({
  tabs = TABS,
  activeTabIndex,
  onTabChange,
  passengers,
  couriers,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createHeaderStyles);
  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  const tabCount = (tab) => {
    switch (tab) {
      case "All":
        return passengers + couriers;
      case "Passengers":
        return passengers;
      case "Couriers":
        return couriers;
      default:
        return 0;
    }
  };

  const count = tabCount(activeTab);

  return (
    <View style={styles.headerInDragZone}>
      <Text style={styles.subtitle}>
        {count} {count === 1 ? "item" : "items"} · {TAB_SHORT[activeTab] || activeTab}
      </Text>

      <View style={styles.segmentBar}>
        {tabs.map((tab, index) => {
          const value = tabCount(tab);
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
              {value > 0 ? (
                <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      active && styles.segmentBadgeTextActive,
                    ]}
                  >
                    {value}
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

export const buildEnrouteDragHeader = ({
  styles,
  colors,
  activeTabIndex,
  onTabChange,
  passengers,
  couriers,
}) => (
  <View style={styles.dragHeader}>
    <View style={styles.titleRow}>
      <View style={styles.titleLeft}>
        <View style={[styles.titleIcon, { backgroundColor: colors.infoText || colors.primary }]}>
          <Icon name="navigate" size={20} color={colors.inverseText} />
        </View>
        <View style={styles.titleTextCol}>
          <Text style={styles.cardTitle}>En route requests</Text>
          <Text style={styles.cardSubtitle}>
            Drag down to close · pick nearby passengers & couriers
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.summaryRow}>
      <View style={[styles.summaryChip, { backgroundColor: colors.successBg }]}>
        <Icon name="person" size={16} color={colors.successText} />
        <Text style={styles.summaryValue}>{passengers}</Text>
        <Text style={styles.summaryLabel}>Passengers</Text>
      </View>
      <View style={[styles.summaryChip, { backgroundColor: colors.tintOrange }]}>
        <Icon name="cube" size={16} color="#EA580C" />
        <Text style={styles.summaryValue}>{couriers}</Text>
        <Text style={styles.summaryLabel}>Couriers</Text>
      </View>
      <View style={[styles.summaryChip, { backgroundColor: colors.primaryMuted }]}>
        <Icon name="layers" size={16} color={colors.primary} />
        <Text style={styles.summaryValue}>{passengers + couriers}</Text>
        <Text style={styles.summaryLabel}>Total</Text>
      </View>
    </View>

    <EnrouteSheetHeader
      activeTabIndex={activeTabIndex}
      onTabChange={onTabChange}
      passengers={passengers}
      couriers={couriers}
    />
  </View>
);

export const enrouteSheetStyles = (c) =>
  StyleSheet.create({
    dragHeader: {
      paddingHorizontal: 2,
      paddingTop: 0,
      paddingBottom: 4,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    titleLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    titleIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    cardSubtitle: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    titleTextCol: {
      flex: 1,
    },
    summaryRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    summaryChip: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
      marginTop: 4,
    },
    summaryLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.35,
    },
    body: {
      flex: 1,
    },
  });

const EnRoutePassengers = ({
  from,
  to,
  date,
  rideId,
  stopovers = [],
  routePolyline = "",
  onPickSuccess,
  data: externalData,
  loading: externalLoading,
  onRefresh: externalRefresh,
  removeItem: externalRemoveItem,
  activeTabIndex: externalTabIndex,
  onTabChange: externalOnTabChange,
  showInlineHeader = false,
  onSubscriptionRequired,
  participantUserIds,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const usesExternalData = externalData !== undefined;
  const internalEnroute = useEnrouteRequests({
    from,
    to,
    date,
    rideId,
    stopovers,
    routePolyline,
    enabled: !usesExternalData,
  });
  const [internalTabIndex, setInternalTabIndex] = useState(0);
  const data = usesExternalData ? externalData : internalEnroute.data;
  const loading = usesExternalData ? !!externalLoading : internalEnroute.loading;
  const onRefresh = usesExternalData ? externalRefresh : internalEnroute.refresh;
  const removeItem = usesExternalData ? externalRemoveItem : internalEnroute.removeItem;
  const activeTabIndex = externalTabIndex ?? internalTabIndex;
  const onTabChange = externalOnTabChange ?? setInternalTabIndex;
  const resolvedShowInlineHeader = showInlineHeader || !usesExternalData;
  const pickInFlightRef = useRef(false);
  const [pickingId, setPickingId] = useState(null);
  const [pickQueueBusy, setPickQueueBusy] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverLoading, setPopoverLoading] = useState(false);
  const [popoverDetail, setPopoverDetail] = useState(null);
  const [popoverItem, setPopoverItem] = useState(null);

  const visibleData = useMemo(
    () => filterEnrouteByParticipants(data, participantUserIds),
    [data, participantUserIds]
  );

  const counts = useMemo(() => countEnrouteByType(visibleData), [visibleData]);
  const activeTab = TABS[activeTabIndex] ?? TABS[0];
  const filterKey = TAB_KEY[activeTab] || "all";

  const filteredData = useMemo(() => {
    if (filterKey === "all") return visibleData;
    return visibleData.filter((item) => item.type === filterKey);
  }, [visibleData, filterKey]);

  const openDetails = (item) => {
    const siblingNote = getEnrouteSiblingNote(item, visibleData);
    const conflict = getEnroutePickConflict(item, participantUserIds);
    setPopoverItem(item);
    setPopoverDetail({
      ...buildEnrouteDetail(item, from, to, date),
      conflictMessage: conflict?.message || "",
      siblingNote,
      pickDisabled: !!conflict,
    });
    setPopoverVisible(true);
    setPopoverLoading(true);
    requestAnimationFrame(() => {
      setTimeout(() => setPopoverLoading(false), 180);
    });
  };

  const closePopover = useCallback(() => {
    setPopoverVisible(false);
    setPopoverLoading(false);
    setPopoverDetail(null);
    setPopoverItem(null);
  }, []);

  const handlePick = useCallback(
    async (item) => {
      if (pickInFlightRef.current) {
        Alert.alert(
          "Please wait",
          "Finish the current pick before starting another."
        );
        return;
      }

      const conflict = getEnroutePickConflict(item, participantUserIds);
      if (conflict) {
        Alert.alert("Cannot pick", conflict.message);
        return;
      }

      pickInFlightRef.current = true;
      setPickQueueBusy(true);

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Error", "User not authenticated");
          return;
        }

        setPickingId(item.id);

        let response;
        if (item.type === "courier") {
          response = await pickCourierApi(token, {
            rideId,
            courierId: item.courierId,
          });
        } else {
          response = await pickPassengerApi(token, {
            rideId,
            passenger_rideId: item.passengerId,
          });
        }

        if (isPickSuccess(response)) {
          const pickPayload =
            item.type === "courier"
              ? {
                  type: "courier",
                  courierId: String(item.courierId || ""),
                  userId: String(item.creatorId || ""),
                }
              : {
                  type: "passenger",
                  passengerRideId: String(item.passengerId || ""),
                  userId: String(item.creatorId || ""),
                };

          await onPickSuccess?.(item, response, pickPayload);
          closePopover();
          Alert.alert(
            "Success",
            item.type === "courier"
              ? "Courier picked successfully"
              : "Passenger picked successfully"
          );
        } else if (
          response?.code === "PARTICIPANT_CONFLICT" ||
          response?.code === "ALREADY_PASSENGER" ||
          response?.code === "ALREADY_COURIER"
        ) {
          Alert.alert(
            "Cannot pick",
            response?.message || "This user is already on your ride."
          );
        } else if (isEnrouteRequestUnavailableError(response)) {
          removeItem?.(item.id);
          onRefresh?.();
          Alert.alert("Already picked", ENROUTE_ALREADY_PICKED_MESSAGE);
        } else if (isEnrouteSubscriptionError(response) && onSubscriptionRequired) {
          onSubscriptionRequired(response);
        } else {
          Alert.alert("Error", response?.message || "Failed");
        }
      } catch (error) {
        console.log("Pick enroute error:", error);
        const unavailable = isEnrouteRequestUnavailableError({
          message: error?.message,
        });
        if (unavailable) {
          removeItem?.(item.id);
          onRefresh?.();
          Alert.alert("Already picked", ENROUTE_ALREADY_PICKED_MESSAGE);
        } else {
          Alert.alert("Error", error?.message || "Something went wrong");
        }
      } finally {
        pickInFlightRef.current = false;
        setPickQueueBusy(false);
        setPickingId(null);
      }
    },
    [
      rideId,
      onPickSuccess,
      onSubscriptionRequired,
      participantUserIds,
      closePopover,
      removeItem,
      onRefresh,
    ]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const conflict = getEnroutePickConflict(item, participantUserIds);
      const pickDisabled = pickQueueBusy || !!conflict;
      const pickDisabledLabel = conflict
        ? "Already on ride"
        : "Please wait";
      return (
      <EnrouteRequestCard
        item={item}
        onPick={handlePick}
        onShowDetails={openDetails}
        picking={pickingId === item.id}
        pickDisabled={pickDisabled}
        pickDisabledLabel={pickDisabledLabel}
        styles={styles}
        colors={colors}
      />
      );
    },
    [
      handlePick,
      pickingId,
      styles,
      colors,
      participantUserIds,
      openDetails,
      pickQueueBusy,
    ]
  );

  const emptyCopy = useMemo(() => {
    switch (activeTab) {
      case "Passengers":
        return {
          icon: "people-outline",
          title: "No passenger requests",
          sub: "Passengers on the same route will appear here.",
        };
      case "Couriers":
        return {
          icon: "cube-outline",
          title: "No courier requests",
          sub: "Parcel requests on the same route will appear here.",
        };
      default:
        return {
          icon: "navigate-outline",
          title: "No en route requests",
          sub: "Nearby passengers and couriers on your route appear here.",
        };
    }
  }, [activeTab]);

  const listEmpty = loading ? (
    <View style={styles.centerBox}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerText}>Loading nearby requests…</Text>
    </View>
  ) : (
    <View style={styles.centerBox}>
      <View style={styles.emptyIcon}>
        <Icon name={emptyCopy.icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
      <Text style={styles.emptySub}>{emptyCopy.sub}</Text>
      {onRefresh ? (
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Icon name="refresh" size={16} color={colors.primary} />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {resolvedShowInlineHeader ? (
        <EnrouteSheetHeader
          activeTabIndex={activeTabIndex}
          onTabChange={onTabChange}
          passengers={counts.passengers}
          couriers={counts.couriers}
        />
      ) : null}

      {pickQueueBusy ? (
        <View style={styles.pickQueueBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pickQueueBannerText}>
            Processing pick… wait before picking another request.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={filteredData}
        key={activeTab}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.listContent}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        windowSize={8}
        ListEmptyComponent={listEmpty}
        refreshing={loading}
        onRefresh={onRefresh}
        scrollEnabled={!pickQueueBusy}
      />

      <DriverParticipantPopover
        visible={popoverVisible}
        detail={popoverDetail}
        loading={popoverLoading}
        onClose={closePopover}
        picking={pickQueueBusy}
        onPick={
          popoverItem && !popoverDetail?.pickDisabled && !pickQueueBusy
            ? () => handlePick(popoverItem)
            : undefined
        }
      />
    </View>
  );
};

export default EnRoutePassengers;

const createHeaderStyles = (c) =>
  StyleSheet.create({
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
  });

const createStyles = (c) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingTop: 8,
      paddingBottom: 24,
      flexGrow: 1,
    },
    pickQueueBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.primaryMuted,
      borderWidth: 1,
      borderColor: c.border,
    },
    pickQueueBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
      lineHeight: 18,
    },
    card: {
      flexDirection: "row",
      marginBottom: 12,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardAccent: {
      width: 4,
    },
    cardBody: {
      flex: 1,
      padding: 12,
    },
    cardMain: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    cardInfo: {
      flex: 1,
      marginLeft: 10,
      marginRight: 8,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    name: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      flexShrink: 1,
    },
    rolePill: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    rolePillText: {
      fontSize: 10,
      fontWeight: "700",
    },
    detailLine: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 16,
    },
    routeLine: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    metaLine: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 2,
    },
    tapHint: {
      fontSize: 11,
      color: c.primary,
      marginTop: 6,
      fontWeight: "600",
    },
    fareCol: {
      alignItems: "flex-end",
      minWidth: 56,
    },
    fareLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    fareValue: {
      fontSize: 17,
      fontWeight: "800",
      color: c.primary,
      marginTop: 2,
    },
    pickBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 12,
      paddingVertical: 11,
      borderRadius: 11,
      backgroundColor: c.primary,
    },
    pickBtnDisabled: {
      opacity: 0.7,
    },
    pickBtnText: {
      color: c.inverseText,
      fontWeight: "700",
      fontSize: 13,
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
    refreshBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    refreshBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.primary,
    },
  });
