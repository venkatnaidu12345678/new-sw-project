import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

/* ICONS */
import calendarIcon from "../assets/dateIcon.png";
import clockIcon from "../assets/clock1.png";
import locationIcon from "../assets/toicon.png";
import seatIcon from "../assets/person.png";
import carIcon from "../assets/caricon1.png";
import BackButton from "../Components/BackButton";
/* COMPONENTS */
import RequestDetailPopover from "./ui/RequestDetailPopover";
import RelatedRideDetailPopover from "./ui/RelatedRideDetailPopover";
import RequestRelatedRidesSheet from "./ui/RequestRelatedRidesSheet";
import { buildMyRequestDetail } from "../Utils/driverParticipantDetails";
import { formatDisplayTime } from "../Utils/dateUtils";

/* API */
import {
  getMyPassengerRequests,
  getMyCourierRequests,
  deleteMyPassengerRequest,
  deleteMyCourierRequest,
  passengerSendRequestApi,
  courierSendRequestApi,
} from "../ApiService/ridesApiServices";
import Icon from "react-native-vector-icons/Ionicons";
import {
  filterOpenPassengerRequests,
  filterOpenCourierRequests,
  shouldRemoveMyRequestRow,
  isRequestLockedToOtherDriver,
  REQUEST_LOCKED_TO_DRIVER_MESSAGE,
} from "../Utils/myRequestUtils";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { formatRequestDate } from "../Utils";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AnimatedTabs from "./ui/AnimatedTabs";
import FadePanel from "./ui/FadePanel";
import { useMyRequestsSocket } from "../hooks/useAppSocket";
import ScreenContainer from "./ui/ScreenContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { profileData } from "../Navigation/AuthNavigator";
import {
  bookingHighlightLabel,
  goToDashboardWithRideHighlight,
} from "../Utils/navigateToDashboardHighlight";

const getRoleTheme = (c) => ({
  Passenger: {
    card: [c.tintGreen, c.background, c.card],
    border: c.successText,
    chip: c.successText,
    statusSoft: c.successBg,
    statusText: c.successText,
    price: c.successText,
  },
  Courier: {
    card: [c.tintOrange, c.background, c.card],
    border: c.warningText,
    chip: c.warningText,
    statusSoft: c.warningBg,
    statusText: c.warningText,
    price: c.warningText,
  },
});

const resolveRequestDate = (item) => {
  const primary = formatRequestDate(item?.date);
  if (primary !== "N/A") return primary;
  return formatRequestDate(item?.requestedAt || item?.createdAt);
};

const countRelatedRides = (raw) => {
  const linked = raw?.linkedRide ? 1 : 0;
  const matches = (raw?.matchingRides || []).filter(
    (r) => !raw?.linkedRide || String(r._id) !== String(raw.linkedRide._id)
  ).length;
  return linked + matches;
};

const normalizeRequestTab = (tab, tabOptions) => {
  if (!tab) return null;
  const key = String(tab).toLowerCase();
  return tabOptions.find((t) => t.toLowerCase() === key) || null;
};

const REQUEST_STATUS_PRIORITY = {
  pending: 0,
  accepted: 1,
  confirmed: 1,
  started: 2,
  completed: 3,
  rejected: 4,
  cancelled: 5,
};

const sortRequestsByPriority = (items = []) =>
  [...items].sort((a, b) => {
    const aPriority =
      REQUEST_STATUS_PRIORITY[String(a?.status || "").toLowerCase()] ?? 99;
    const bPriority =
      REQUEST_STATUS_PRIORITY[String(b?.status || "").toLowerCase()] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = new Date(a?.raw?.requestedAt || a?.raw?.createdAt || 0).getTime();
    const bTime = new Date(b?.raw?.requestedAt || b?.raw?.createdAt || 0).getTime();
    return bTime - aTime;
  });

const mapPassengerRequest = (item) => {
  const isRideJoin = item.requestKind === "ride_join";
  const driverName =
    item.driver?.name ||
    item.linkedRide?.creator?.name ||
    (isRideJoin ? "Driver ride" : "—");

  return {
    id: item.requestId,
    role: "Passenger",
    requestKind: item.requestKind || "standalone",
    from: item.from,
    to: item.to,
    date: resolveRequestDate(item),
    time:
      formatDisplayTime(item.startTime || item.linkedRide?.startTime) || "--",
    car: driverName,
    seats: item.seats || "-",
    price: `₹${item.amount || 0}`,
    status: item.status || "pending",
    relatedRideCount: countRelatedRides(item),
    raw: item,
  };
};

const mapCourierRequest = (item) => ({
  id: String(item.requestId || item._id || item.id || ""),
  role: "Courier",
  requestKind: "courier",
  from: item.from,
  to: item.to,
  date: resolveRequestDate(item),
  time: item.timeSlot || "--",
  car: item.courierNumber || item.receiver?.name || "Courier",
  seats: item.parcel || item.what_to_deliver || "-",
  price: `₹${item.amount || 0}`,
  status: item.status || "pending",
  relatedRideCount: countRelatedRides(item),
  raw: item,
});

const MyRequest = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    setRefreshUpcomingrides,
    setPendingHighlightRideId,
    setPendingHighlightLabel,
  } = profileData();
  const ROLE_THEME = getRoleTheme(colors);
  const [activeTab, setActiveTab] = useState("Passenger");
  const [passengerRides, setPassengerRides] = useState([]);
  const [courierRides, setCourierRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [selectedRide, setSelectedRide] = useState(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [popoverLoading, setPopoverLoading] = useState(false);
  const [joiningRideId, setJoiningRideId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [relatedRidePopoverVisible, setRelatedRidePopoverVisible] = useState(false);
  const [relatedRidePreview, setRelatedRidePreview] = useState(null);

  const tabs = ["Passenger", "Courier"];
  const activeIndex = tabs.indexOf(activeTab);

  const loadAllRequests = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setFetchError("");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setFetchError("Please sign in again.");
        setPassengerRides([]);
        setCourierRides([]);
        return;
      }

      const [passengerRes, courierRes] = await Promise.all([
        getMyPassengerRequests(token),
        getMyCourierRequests(token),
      ]);

      setPassengerRides(
        sortRequestsByPriority(
          filterOpenPassengerRequests(
            (passengerRes?.passengerRequests || []).map(mapPassengerRequest)
          )
        )
      );
      setCourierRides(
        sortRequestsByPriority(
          filterOpenCourierRequests(
            (courierRes?.courierRequests || []).map(mapCourierRequest)
          )
        )
      );
    } catch (err) {
      console.log("❌ MY REQUESTS ERROR:", err.message);
      setFetchError(getApiErrorMessage(err, "Could not load requests."));
      setPassengerRides([]);
      setCourierRides([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchPassengerRequests = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    setFetchError("");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setFetchError("Please sign in again.");
        setPassengerRides([]);
        return;
      }

      const res = await getMyPassengerRequests(token);
      setPassengerRides(
        sortRequestsByPriority(
          filterOpenPassengerRequests(
            (res?.passengerRequests || []).map(mapPassengerRequest)
          )
        )
      );
    } catch (err) {
      console.log("❌ PASSENGER REQUESTS ERROR:", err.message);
      setFetchError(getApiErrorMessage(err, "Could not load passenger requests."));
      setPassengerRides([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchCourierRequests = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    setFetchError("");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setFetchError("Please sign in again.");
        setCourierRides([]);
        return;
      }

      const res = await getMyCourierRequests(token);
      setCourierRides(
        sortRequestsByPriority(
          filterOpenCourierRequests(
            (res?.courierRequests || []).map(mapCourierRequest)
          )
        )
      );
    } catch (err) {
      console.log("❌ COURIER REQUESTS ERROR:", err.message);
      setFetchError(getApiErrorMessage(err, "Could not load courier requests."));
      setCourierRides([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadAllRequests({ showLoader: false });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadAllRequests, refreshing]);

  const fetchActiveTabRequests = useCallback(() => {
    if (activeTab === "Courier") {
      return fetchCourierRequests();
    }
    return fetchPassengerRequests();
  }, [activeTab, fetchCourierRequests, fetchPassengerRequests]);

  const didInitialLoadRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const paramTab = normalizeRequestTab(route.params?.activeTab, tabs);

      if (paramTab) {
        setActiveTab(paramTab);
        didInitialLoadRef.current = true;
        loadAllRequests({ showLoader: true });
        return;
      }

      if (!didInitialLoadRef.current) {
        didInitialLoadRef.current = true;
        loadAllRequests({ showLoader: true });
        return;
      }

      loadAllRequests({ showLoader: false });
    }, [route.params?.activeTab, loadAllRequests])
  );

  useMyRequestsSocket(
    useCallback(
      (_payload) => {
        loadAllRequests({ showLoader: false });
      },
      [loadAllRequests]
    )
  );

  const handleTabChange = (index) => {
    const nextTab = tabs[index];
    if (!nextTab || nextTab === activeTab) return;

    if (route.params?.activeTab != null) {
      navigation.setParams({ activeTab: undefined });
    }

    setActiveTab(nextTab);
    if (nextTab === "Courier") {
      fetchCourierRequests({ showLoader: courierRides.length === 0 });
    } else {
      fetchPassengerRequests({ showLoader: passengerRides.length === 0 });
    }
  };

  const filteredRides = activeTab === "Courier" ? courierRides : passengerRides;

  const buildSelectedRequest = (ride) =>
    buildMyRequestDetail({
      ...ride,
      matchingRides: ride.raw?.matchingRides || [],
      linkedRide: ride.raw?.linkedRide || null,
      requestKind: ride.raw?.requestKind,
      raw: ride.raw,
    });

  const openDetails = (ride) => {
    setSelectedRide(buildSelectedRequest(ride));
    setSheetVisible(false);
    setPopoverVisible(true);
    setPopoverLoading(true);
    requestAnimationFrame(() => {
      setTimeout(() => setPopoverLoading(false), 180);
    });
  };

  const openRelatedRides = (ride) => {
    setSelectedRide(buildSelectedRequest(ride));
    setPopoverVisible(false);
    setSheetVisible(true);
  };

  const closePopover = () => {
    setPopoverVisible(false);
    setPopoverLoading(false);
    if (!sheetVisible) {
      setSelectedRide(null);
      setJoiningRideId(null);
    }
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setRelatedRidePopoverVisible(false);
    setRelatedRidePreview(null);
    setSelectedRide(null);
    setJoiningRideId(null);
  };

  const closeRelatedRidePopover = () => {
    setRelatedRidePopoverVisible(false);
    setRelatedRidePreview(null);
  };

  const handleViewRide = (ride) => {
    setRelatedRidePreview(ride);
    setRelatedRidePopoverVisible(true);
  };

  const handleJoinPassenger = async (ride, requestItem) => {
    if (joiningRideId) return;
    if (isRequestLockedToOtherDriver(requestItem, ride._id)) {
      Alert.alert("Already linked", REQUEST_LOCKED_TO_DRIVER_MESSAGE);
      return;
    }
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Sign in required", "Please log in to request a seat.");
      return;
    }
    const seats = Number(requestItem?.raw?.seats) || 1;
    setJoiningRideId(ride._id);
    try {
      const response = await passengerSendRequestApi(token, {
        rideId: ride._id,
        requires_seats: seats,
        standalonePassengerRideId: requestItem?.id || requestItem?.raw?.requestId,
        from: requestItem?.from || requestItem?.raw?.from,
        to: requestItem?.to || requestItem?.raw?.to,
        amount_will: requestItem?.raw?.amount ?? requestItem?.raw?.amount_will,
      });
      if (response?.success) {
        if (response.bookingStatus === "confirmed") {
          const requestId = requestItem?.id || requestItem?.raw?.requestId;
          if (requestId) {
            setPassengerRides((prev) =>
              prev.filter((row) => String(row.id) !== String(requestId))
            );
          }
        }
        const title =
          response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
        await fetchActiveTabRequests();
        closeSheet();
        Alert.alert(
          title,
          response.message || "Your seat request was sent to the driver.",
          [
            {
              text: "OK",
              onPress: () =>
                goToDashboardWithRideHighlight({
                  navigation,
                  rideId: ride._id,
                  label: bookingHighlightLabel(response.bookingStatus),
                  setRefreshUpcomingrides,
                  setPendingHighlightRideId,
                  setPendingHighlightLabel,
                }),
            },
          ]
        );
      } else {
        Alert.alert(
          "Request failed",
          getApiErrorMessage(response, "Could not send your booking request.")
        );
      }
    } catch (error) {
      Alert.alert("Request failed", getApiErrorMessage(error));
    } finally {
      setJoiningRideId(null);
    }
  };

  const handleJoinCourier = async (ride, requestItem) => {
    if (joiningRideId) return;
    if (isRequestLockedToOtherDriver(requestItem, ride._id)) {
      Alert.alert("Already linked", REQUEST_LOCKED_TO_DRIVER_MESSAGE);
      return;
    }
    const raw = requestItem?.raw || {};
    const recv = raw.receiver || {};
    if (!raw.courier_img) {
      Alert.alert(
        "More details needed",
        "Open the ride to complete courier booking with your parcel photo.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open ride", onPress: () => handleViewRide(ride) },
        ]
      );
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Alert.alert("Sign in required", "Please log in to request courier delivery.");
      return;
    }

    const deliveryDate = raw.date?.startDate || raw.date;
    setJoiningRideId(ride._id);
    try {
      const response = await courierSendRequestApi(token, {
        rideId: ride._id,
        from: raw.from || ride.from,
        to: raw.to || ride.to,
        courier_type: raw.courier_type || "parcel",
        what_to_deliver: raw.what_to_deliver || raw.parcel,
        courier_img: raw.courier_img,
        amount_will: raw.amount_will || raw.amount,
        date: deliveryDate,
        receiver_name: recv.name,
        receiver_mobile: recv.mobile,
        receiver_alternate_mobile:
          recv.alternate_mobile || recv.alternateMobile || recv.mobile,
        receiver_address: recv.Address || recv.address,
        standaloneCourierId: requestItem?.id || raw.requestId,
      });
      if (response?.success) {
        if (response.bookingStatus === "confirmed") {
          const requestId = requestItem?.id || raw.requestId;
          if (requestId) {
            setCourierRides((prev) =>
              prev.filter((row) => String(row.id) !== String(requestId))
            );
          }
        }
        const title =
          response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
        await fetchActiveTabRequests();
        closeSheet();
        Alert.alert(
          title,
          response.message || "Courier request sent to the driver.",
          [
            {
              text: "OK",
              onPress: () =>
                goToDashboardWithRideHighlight({
                  navigation,
                  rideId: ride._id,
                  label: bookingHighlightLabel(response.bookingStatus),
                  setRefreshUpcomingrides,
                  setPendingHighlightRideId,
                  setPendingHighlightLabel,
                }),
            },
          ]
        );
      } else {
        Alert.alert(
          "Request failed",
          getApiErrorMessage(response, "Could not send courier request.")
        );
      }
    } catch (error) {
      Alert.alert("Request failed", getApiErrorMessage(error));
    } finally {
      setJoiningRideId(null);
    }
  };

  const canDeleteRequest = (item) =>
    String(item?.status || "").toLowerCase() === "pending";

  const canEditRequest = (item) => {
    if (!canDeleteRequest(item)) return false;
    const kind = String(item?.requestKind || "").toLowerCase();
    return kind === "standalone" || kind === "courier";
  };

  const handleEditRequest = (item) => {
    if (!canEditRequest(item)) {
      Alert.alert(
        "Cannot edit",
        "Only pending standalone requests can be edited."
      );
      return;
    }
    const editRequest = {
      requestId: item.id,
      from: item.from,
      to: item.to,
      seats: item.raw?.seats,
      amount: item.raw?.amount ?? item.raw?.amount_will,
      raw: item.raw || {},
    };
    if (item.role === "Courier") {
      navigation.navigate("CourierRequest", { editRequest });
      return;
    }
    navigation.navigate("PassengerRequest", { editRequest });
  };

  const handleDeleteRequest = (item) => {
    if (!canDeleteRequest(item)) {
      Alert.alert("Cannot delete", "Only pending requests can be removed.");
      return;
    }

    Alert.alert(
      "Delete request?",
      `Remove this ${item.role === "Courier" ? "courier" : "passenger"} request? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
              Alert.alert("Sign in required", "Please log in again.");
              return;
            }
            setDeletingId(item.id);
            try {
              if (activeTab === "Courier") {
                await deleteMyCourierRequest(token, item.id);
              } else {
                await deleteMyPassengerRequest(token, item.id);
              }
              if (selectedRide?.id === item.id) {
                closePopover();
                closeSheet();
              }
              await fetchActiveTabRequests();
            } catch (error) {
              Alert.alert("Delete failed", getApiErrorMessage(error));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleJoinFromRelatedRidePopover = (ride) => {
    closeRelatedRidePopover();
    handleJoinRide(ride);
  };

  const handleJoinRide = (ride) => {
    if (!selectedRide || joiningRideId) return;
    if (selectedRide.requestKind === "ride_join") {
      handleViewRide(ride);
      return;
    }
    if (isRequestLockedToOtherDriver(selectedRide, ride._id)) {
      Alert.alert("Already linked", REQUEST_LOCKED_TO_DRIVER_MESSAGE);
      return;
    }
    const pending =
      selectedRide.role === "Courier"
        ? ride.courierRequestPending
        : ride.passengerRequestPending;
    if (pending) {
      handleViewRide(ride);
      return;
    }
    if (selectedRide.role === "Courier") {
      handleJoinCourier(ride, selectedRide);
    } else {
      handleJoinPassenger(ride, selectedRide);
    }
  };

  const renderRide = ({ item }) => {
    const theme = ROLE_THEME[item.role] || ROLE_THEME.Passenger;
    const rideCount = item.relatedRideCount || 0;

    return (
      <LinearGradient
        colors={theme.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          { borderColor: theme.border },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.roleChip, { backgroundColor: theme.chip }]}>
            <Text style={styles.roleText}>
              {item.requestKind === "ride_join" ? "Ride join" : item.role}
            </Text>
          </View>

          <View style={styles.topRight}>
            {rideCount > 0 ? (
              <View style={styles.ridesBadge}>
                <Text style={styles.ridesBadgeText}>
                  {rideCount} ride{rideCount !== 1 ? "s" : ""}
                </Text>
              </View>
            ) : null}
            {canDeleteRequest(item) ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteRequest(item)}
                disabled={deletingId === item.id}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.75}
              >
                {deletingId === item.id ? (
                  <Text style={styles.deleteBtnText}>…</Text>
                ) : (
                  <Icon name="trash-outline" size={18} color={colors.errorText} />
                )}
              </TouchableOpacity>
            ) : null}
            {canEditRequest(item) ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleEditRequest(item)}
                disabled={deletingId === item.id}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.75}
              >
                <Icon name="create-outline" size={17} color={colors.infoText} />
              </TouchableOpacity>
            ) : null}
            <View style={[styles.statusChip, { backgroundColor: theme.statusSoft }]}>
              <Text style={[styles.statusText, { color: theme.statusText }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.routeRow}>
          <Image source={locationIcon} style={styles.icon} />
          <Text style={styles.routeText}>
            {item.from} → {item.to}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Image source={calendarIcon} style={styles.metaIcon} />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>

          {item.time && item.time !== "--" ? (
            <View style={styles.metaItem}>
              <Image source={clockIcon} style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
          ) : null}

          <View style={styles.metaItem}>
            <Image source={seatIcon} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.seats}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Image source={carIcon} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.car}
            </Text>
          </View>
        </View>

        <View style={styles.line} />
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Offer</Text>
          <Text style={[styles.price, { color: theme.price }]}>{item.price}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.cardBtn, styles.cardBtnOutline]}
            onPress={() => openDetails(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.cardBtnOutlineText}>View details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardBtn, styles.cardBtnPrimary]}
            onPress={() => openRelatedRides(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.cardBtnPrimaryText}>
              {rideCount > 0 ? `Related rides (${rideCount})` : "Related rides"}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>My Request</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh my requests"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="refresh" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={styles.skeletonPad}>
            <RideListSkeleton count={3} variant="request" />
          </View>
        }
        style={{ flex: 1 }}
      >
      {fetchError ? (
        <Text style={styles.errorText}>{fetchError}</Text>
      ) : null}

      <AnimatedTabs
        tabs={tabs}
        activeIndex={activeIndex}
        onChange={handleTabChange}
      />

      <FadePanel activeKey={activeTab} style={{ flex: 1 }}>
        <FlatList
          style={{ flex: 1 }}
          data={filteredRides}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderRide}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {fetchError ? "" : "No Requests Found"}
              </Text>
              {!fetchError ? (
                <TouchableOpacity
                  style={styles.emptyRefreshBtn}
                  onPress={onRefresh}
                  disabled={refreshing}
                  activeOpacity={0.85}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="refresh" size={16} color={colors.primary} />
                      <Text style={styles.emptyRefreshText}>Refresh</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          }
          contentContainerStyle={{
            paddingBottom: getScrollBottomPadding(insets.bottom),
            flexGrow: 1,
          }}
        />
      </FadePanel>

      <RequestDetailPopover
        visible={popoverVisible}
        request={selectedRide}
        loading={popoverLoading}
        onClose={closePopover}
      />

      <RequestRelatedRidesSheet
        visible={sheetVisible}
        request={selectedRide}
        joiningRideId={joiningRideId}
        onClose={closeSheet}
        onViewRide={handleViewRide}
        onJoinRide={handleJoinRide}
      />

      <RelatedRideDetailPopover
        visible={relatedRidePopoverVisible}
        ride={relatedRidePreview}
        requestContext={selectedRide}
        joiningRideId={joiningRideId}
        onClose={closeRelatedRidePopover}
        onJoinRide={
          selectedRide?.requestKind === "ride_join" ? undefined : handleJoinFromRelatedRidePopover
        }
      />
      </AnimatedLoad>
    </ScreenContainer>
  );
};

export default MyRequest;

/* STYLES */

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingBottom: LAYOUT.spacing.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitle: {
    flex: 1,
    fontSize: LAYOUT.font.title,
    fontWeight: "800",
    marginLeft: 10,
    color: c.text,
  },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primaryMuted,
    borderWidth: 1,
    borderColor: c.border,
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 16,
  },

  emptyText: {
    textAlign: "center",
    color: c.textMuted,
    fontSize: 15,
    marginBottom: 12,
  },

  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.primaryMuted,
    borderWidth: 1,
    borderColor: c.border,
  },

  emptyRefreshText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.primary,
  },

  errorText: {
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
    color: c.errorText,
    fontSize: 14,
    paddingHorizontal: 16,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },

  ridesBadge: {
    backgroundColor: c.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  ridesBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: c.primaryText,
  },

  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  roleText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "700",
  },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: { fontSize: 11, fontWeight: "700" },

  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.errorBg,
    borderWidth: 1,
    borderColor: c.errorBorder,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.errorText,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.infoBg,
    borderWidth: 1,
    borderColor: c.infoBorder,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  routeText: {
    marginLeft: 6,
    fontWeight: "700",
    flex: 1,
    color: c.text,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "48%",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  metaIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },

  metaText: {
    fontSize: 12,
    flexShrink: 1,
    color: c.textMuted,
  },

  line: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 10,
  },

  price: {
    fontWeight: "700",
    fontSize: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnOutline: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.textMuted,
  },
  cardBtnPrimary: {
    backgroundColor: c.primary,
  },
  cardBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: c.inverseText,
  },

  icon: {
    width: 14,
    height: 14,
  },

  skeletonPad: {
    padding: 16,
    flex: 1,
  },
});
