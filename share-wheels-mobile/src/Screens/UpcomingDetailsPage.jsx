import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  DeviceEventEmitter,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import BottomSlider from "../Components/BottomSlider";
import EnRoute, {
  buildEnrouteDragHeader,
  enrouteSheetStyles,
} from "../Components/EnRoute";
import DriverEnrouteHub from "../Components/DriverEnrouteHub";
import { useEnrouteRequests } from "../hooks/useEnrouteRequests";
import { collectRideParticipantUserIds } from "../Utils/enrouteRequestUtils";
import { getMySubscription } from "../ApiService/subscriptionApiService";
import FixedButton from "../Components/FixedButton";
import UpcomingRouteLines from "../Components/ui/UpcomingRouteLines";
import { getUpcomingRideRoutes } from "../Utils/upcomingRideRouteUtils";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  driveracceptspassengerrequest,
  driverrejectrequest,
  acceptCourier,   // ✅ NEW
  driverrejectcourierrequest,        // ✅ NEW
  removepassenger,
  removeCourier,
  rideDetails,
  startride,
  endRide,
  driverrejectpassengerrequest,
  listVerificationParticipants,
  verifyBoardingParticipant,
  dropPassengerOnRide,
  deliverCourierOnRide,
  updateRideSeats,
  cancelRideApi,
} from "../ApiService/ridesApiServices";
import RideDriverActionForm from "../Components/RideDriverActionForm";
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import priceIcon from "../assets/priceIcon.png";
import clock from "../assets/clock2.png";
import UserAvatar from "../Components/ui/UserAvatar";
import ScreenContainer from "../Components/ui/ScreenContainer";
import ScreenHeader from "../Components/ui/ScreenHeader";
import DriverParticipantPopover from "../Components/ui/DriverParticipantPopover";
import {
  buildDriverPassengerDetail,
  buildDriverCourierDetail,
} from "../Utils/driverParticipantDetails";
import DriverContactCard from "../Components/DriverContactCard";
import VehicleInfoStrip from "../Components/VehicleInfoStrip";
import CourierParcelPreview from "../Components/CourierParcelPreview";
import EditableRideSeats from "../Components/EditableRideSeats";
import RideDriverSettings from "../Components/RideDriverSettings";
import DriverParticipantsHub from "../Components/DriverParticipantsHub";
import DriverParticipantsSheet, {
  buildParticipantsDragHeader,
  participantsSheetStyles,
} from "../Components/ui/DriverParticipantsPopover";
import VerifyBoardingPopover from "../Components/ui/VerifyBoardingPopover";
import RemovePassengerPopover from "../Components/ui/RemovePassengerPopover";
import DriverStopoversPopover from "../Components/ui/DriverStopoversPopover";
import {
  getParticipantUserId,
  normalizeNavigationParamId,
  getParticipantUserNo,
} from "../Utils/participantIds";
import VerifyBoardingPanel from "../Components/VerifyBoardingPanel";
import MessageIndicator from "../Components/ui/MessageIndicator";
import { getRideChatMessages } from "../ApiService/chatApiServices";
import { profileData } from "../Navigation/AuthNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding, scale } from "../theme/layout";
import { useThemedStyles } from "../theme/useThemedStyles";
import { useTheme } from "../context/ThemeContext";
import courier from "../assets/courier.png"
import { useRoute, useNavigation } from "@react-navigation/native";
import { convertDate } from '../Utils';
import { formatDisplayTime } from '../Utils/dateUtils';
import { formatLocalISODate } from "../Utils/dateUtils";
import { getRideDisplayFare, getPassengerFare, getCourierFare } from '../Utils/fareUtils';
import {
  tripStatusLabel,
  canDriverCompleteRide,
  countActiveBookedSeats,
  getDriverCompleteRideBlockers,
} from "../Utils/participantTripStatus";
import { NOTIFICATIONS_REFRESH_EVENT } from "../context/NotificationsContext";
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from "react-native";
import { pushDriverLocationNow } from "../hooks/useDriverLocation";
import { hasLocationPermission } from "../Utils/locationPermissions";
import {
  setActiveRideTracking,
  clearActiveRideTracking,
} from "../Utils/activeRideTracking";
import {
  isRideScheduledTimePassed,
  isRideScheduledTimeFuture,
  formatScheduledStart,
  canDriverCancel,
  formatLeadTimeHint,
} from "../Utils/rideSchedule";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { openPhoneCall } from "../Utils/phoneCall";
import { useRideSocket } from "../hooks/useAppSocket";
import { normalizeRideId } from "../liveTracking/liveTrackingState";

const UpcomingDetailsPage = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const participantSheetStyles = useThemedStyles(participantsSheetStyles);
  const enrouteSheetThemedStyles = useThemedStyles(enrouteSheetStyles);
  const { rideData } = route.params || {};
  const { setRefreshUpcomingrides, ProfileDetails } = profileData() || {};

  const refreshUpcomingList = useCallback(() => {
    setRefreshUpcomingrides?.((prev) => !prev);
  }, [setRefreshUpcomingrides]);

  const role = rideData?.myRole || route.params?.role;
  const creatorId =
    rideData?.creator?._id ||
    rideData?.creator?.id ||
    rideData?.creator;
  const isDriverByRole = role === "driver";
  const isCourier = role === "courier";

  const [activeSlider, setActiveSlider] = useState(null);
  const [participantTabIndex, setParticipantTabIndex] = useState(0);
  const [enrouteTabIndex, setEnrouteTabIndex] = useState(0);
  const [driverSubscription, setDriverSubscription] = useState(null);
  const [loadingRide, setLoadingRide] = useState(false);
  const [rideActionLoading, setRideActionLoading] = useState(false);
  const [rideStarted, setRideStarted] = useState(
    rideData?.status === "started" || rideData?.ride_status === "started"
  );
  const [passengers, setPassengers] = useState([]);
  const [stopoversPopoverVisible, setStopoversPopoverVisible] = useState(false);
  const [participantPopoverVisible, setParticipantPopoverVisible] = useState(false);
  const [participantPopoverLoading, setParticipantPopoverLoading] = useState(false);
  const [participantPopoverDetail, setParticipantPopoverDetail] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [localAvailableSeats, setLocalAvailableSeats] = useState(
    rideData?.availableSeats
  );
  const [canCarryCourier, setCanCarryCourier] = useState(
    !!rideData?.CanCarryCourier
  );
  const [courierRequests, setCourierRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [rideStatus, setRideStatus] = useState(
    () => rideData?.status || rideData?.ride_status || "pending"
  );
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [refreshingPage, setRefreshingPage] = useState(false);
  const [fareMeta, setFareMeta] = useState(() => ({
    ride_amount:
      rideData?.viewerDisplayFare ??
      rideData?.displayFare ??
      rideData?.ride_amount,
    displayFare:
      rideData?.viewerDisplayFare ??
      rideData?.displayFare ??
      rideData?.ride_amount,
    viewerDisplayFare: rideData?.viewerDisplayFare,
    perSeatFare: rideData?.perSeatFare,
    fareSource: rideData?.fareSource,
  }));
  const [driverToken, setDriverToken] = useState(null);
  const [verification, setVerification] = useState(null);
  const [myBoarding, setMyBoarding] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [passengerToRemove, setPassengerToRemove] = useState(null);
  const [removingPassenger, setRemovingPassenger] = useState(false);
  const [seatsSaving, setSeatsSaving] = useState(false);
  const [chatUnread, setChatUnread] = useState({ driver: 0 });
  const [rideMeta, setRideMeta] = useState({});
  const [scheduleInfo, setScheduleInfo] = useState({
    date: rideData?.date,
    startTime: rideData?.startTime,
  });
  const [routeMeta, setRouteMeta] = useState({
    stopovers: rideData?.stopovers || [],
    routePolyline: rideData?.routePolyline || "",
  });
  const [bookingMeta, setBookingMeta] = useState({
    from: rideData?.bookedFrom || rideData?.activeData?.from || "",
    to: rideData?.bookedTo || rideData?.activeData?.to || "",
  });
  const [driverActionSubmitting, setDriverActionSubmitting] = useState(false);
  const myUserId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    ProfileDetails?.data?.personalInfo?._id;

  const isDriver =
    isDriverByRole ||
    (!!myUserId &&
      !!creatorId &&
      String(creatorId) === String(myUserId));

  const displayVehicle = rideMeta?.vehicle || rideData?.vehicle;
  const displayCreator = rideMeta?.creator || rideData?.creator;
  const isMountedRef = useRef(true);
  const popoverTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("token").then((token) => {
      if (isMountedRef.current) setDriverToken(token);
    });
  }, []);

  const rideIdStr = rideData?._id?.toString?.() || rideData?._id;

  const applyRideDetails = useCallback((data) => {
    if (!data) return;
    setPassengers(data.passengers || []);
    setCouriers(data.all_deliveries || []);
    setPassengerRequests(data.passenger_requested_ride || []);
    setCourierRequests(data.users_request_Couriers || []);
    if (data.status != null) setRideStatus(data.status);
    setVerification(data.verification || null);
    setMyBoarding(data.myBoarding || null);
    if (data.vehicle || data.creator) {
      setRideMeta({
        vehicle: data.vehicle,
        creator: data.creator,
      });
    }
    if (data.availableSeats != null) {
      setLocalAvailableSeats(data.availableSeats);
    }
    if (data.CanCarryCourier != null) {
      setCanCarryCourier(!!data.CanCarryCourier);
    }
    if (data.date != null || data.startTime != null) {
      setScheduleInfo((prev) => ({
        date: data.date ?? prev.date,
        startTime: data.startTime ?? prev.startTime,
      }));
    }
    if (data.stopovers != null || data.routePolyline != null) {
      setRouteMeta((prev) => ({
        stopovers:
          Array.isArray(data.stopovers) && data.stopovers.length
            ? data.stopovers
            : prev.stopovers || [],
        routePolyline:
          String(data.routePolyline || "").trim() || prev.routePolyline || "",
      }));
    }
    if (data.bookedFrom && data.bookedTo) {
      setBookingMeta({
        from: data.bookedFrom,
        to: data.bookedTo,
      });
    }
    if (
      data.ride_amount != null ||
      data.displayFare != null ||
      data.viewerDisplayFare != null ||
      data.perSeatFare != null
    ) {
      const viewerFare =
        data.viewerDisplayFare ?? data.displayFare ?? data.ride_amount;
      setFareMeta({
        ride_amount: viewerFare,
        displayFare: viewerFare,
        viewerDisplayFare: data.viewerDisplayFare,
        perSeatFare: data.viewerPerSeatFare ?? data.perSeatFare,
        fareSource: data.fareSource,
      });
    }
  }, []);

  const fetchRideDetails = useCallback(
    async ({ showLoading = false } = {}) => {
      const token = await AsyncStorage.getItem("token");
      const rideId = rideIdStr || rideData?._id;
      if (!token || !rideId) return;

      try {
        if (showLoading && isMountedRef.current) setDetailsLoading(true);
        const res = await rideDetails(token, rideId);
        if (!isMountedRef.current) return;
        if (res?.success === true) {
          applyRideDetails(res.data);
        }
      } catch (err) {
        console.log("Ride details error:", err.message);
      } finally {
        if (showLoading && isMountedRef.current) setDetailsLoading(false);
      }
    },
    [rideIdStr, rideData?._id, applyRideDetails]
  );

  const refreshRideDetailsQuiet = useCallback(
    () => fetchRideDetails({ showLoading: false }),
    [fetchRideDetails]
  );

  const enrouteStopovers = routeMeta.stopovers?.length
    ? routeMeta.stopovers
    : rideData?.stopovers || [];
  const enrouteRoutePolyline =
    routeMeta.routePolyline || rideData?.routePolyline || "";

  const rideParticipantUserIds = useMemo(
    () =>
      collectRideParticipantUserIds({
        passengers,
        couriers,
        passengerRequests,
        courierRequests,
      }),
    [passengers, couriers, passengerRequests, courierRequests]
  );

  const [pendingPickUserIds, setPendingPickUserIds] = useState(() => new Set());

  useEffect(() => {
    setPendingPickUserIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set(
        [...prev].filter((id) => !rideParticipantUserIds.has(id))
      );
      return next.size === prev.size ? prev : next;
    });
  }, [rideParticipantUserIds]);

  const mergedParticipantUserIds = useMemo(() => {
    const ids = new Set(rideParticipantUserIds);
    pendingPickUserIds.forEach((id) => ids.add(id));
    return ids;
  }, [rideParticipantUserIds, pendingPickUserIds]);

  const upcomingRoutes = useMemo(() => {
    return getUpcomingRideRoutes(
      {
        ...rideData,
        from: rideData?.from,
        to: rideData?.to,
        myRole: role,
        passengers,
        passengerRequests,
        couriers,
        courierRequests,
        activeData: rideData?.activeData,
        bookedFrom: bookingMeta.from || rideData?.bookedFrom,
        bookedTo: bookingMeta.to || rideData?.bookedTo,
      },
      { myUserId }
    );
  }, [
    rideData,
    role,
    passengers,
    passengerRequests,
    couriers,
    courierRequests,
    myUserId,
    bookingMeta,
  ]);

  const enrouteRequests = useEnrouteRequests({
    from: rideData?.from,
    to: rideData?.to,
    date: scheduleInfo.date || rideData?.date,
    rideId: rideIdStr,
    stopovers: enrouteStopovers,
    routePolyline: enrouteRoutePolyline,
    enabled:
      isDriver &&
      !!rideData?.from &&
      !!rideData?.to &&
      !detailsLoading,
  });

  useRideSocket(rideIdStr, {
    onParticipantsUpdated: (payload) => {
      const action = String(payload?.action || "").toLowerCase();
      const userId = String(payload?.userId || "");
      if (
        userId &&
        (action === "passenger_removed" || action === "courier_removed")
      ) {
        setPendingPickUserIds((prev) => {
          if (!prev.has(userId)) return prev;
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
      refreshRideDetailsQuiet();
      enrouteRequests.refresh();
    },
    onRequestUpdated: () => {
      refreshRideDetailsQuiet();
      enrouteRequests.refresh();
    },
  });

  const loadDriverSubscription = useCallback(async () => {
    if (!isDriver) return;
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await getMySubscription(token);
      if (isMountedRef.current) {
        setDriverSubscription(res?.subscription || null);
      }
    } catch (err) {
      if (__DEV__) console.warn("[subscription]", err?.message);
    }
  }, [isDriver]);

  const handleRefreshPage = useCallback(async () => {
    setRefreshingPage(true);
    try {
      await fetchRideDetails({ showLoading: false });
      if (isDriver) {
        await enrouteRequests.refresh();
        await loadDriverSubscription();
      }
      refreshUpcomingList();
    } finally {
      if (isMountedRef.current) setRefreshingPage(false);
    }
  }, [
    fetchRideDetails,
    isDriver,
    enrouteRequests.refresh,
    loadDriverSubscription,
    refreshUpcomingList,
  ]);

  const handleEnroutePickSuccess = useCallback(
    async (_item, response, pickPayload) => {
      if (pickPayload?.userId) {
        const userId = String(pickPayload.userId);
        setPendingPickUserIds((prev) => new Set([...prev, userId]));
        enrouteRequests.removePickedFromList(pickPayload);
      }
      if (response?.details) {
        applyRideDetails(response.details);
      }
      await fetchRideDetails({ showLoading: false });
      await enrouteRequests.refresh();
      loadDriverSubscription();
      refreshUpcomingList();
    },
    [
      applyRideDetails,
      fetchRideDetails,
      enrouteRequests.removePickedFromList,
      enrouteRequests.refresh,
      loadDriverSubscription,
      refreshUpcomingList,
    ]
  );

  const openDriverSubscription = useCallback(() => {
    navigation.navigate("DriverSubscription");
  }, [navigation]);

  const handleSubscriptionRequired = useCallback(
    (response) => {
      Alert.alert(
        "Subscription required",
        response?.message ||
          "Choose a driver subscription plan to pick en route passengers and couriers.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "View plans", onPress: openDriverSubscription },
        ]
      );
    },
    [openDriverSubscription]
  );

  useFocusEffect(
    useCallback(() => {
      fetchRideDetails({ showLoading: true });
      loadDriverSubscription();
    }, [fetchRideDetails, loadDriverSubscription])
  );

  const countIncoming = (messages, userId) => {
    if (!messages?.length || !userId) return 0;
    const uid = userId.toString();
    return messages.filter(
      (m) => (m.senderId?._id || m.senderId)?.toString() !== uid
    ).length;
  };

  const loadChatUnread = useCallback(async () => {
    if (!driverToken || !rideIdStr) return;
    try {
      const creatorId =
        rideData?.creator?._id || rideData?.creator?.id || rideData?.creator;
      const directRes = creatorId
        ? await getRideChatMessages(driverToken, rideIdStr, creatorId)
        : { messages: [] };
      if (isMountedRef.current) {
        setChatUnread({
          driver: countIncoming(directRes?.messages, myUserId),
        });
      }
    } catch {
      /* ignore */
    }
  }, [driverToken, rideIdStr, isDriver, rideData?.creator, myUserId]);

  useFocusEffect(
    useCallback(() => {
      loadChatUnread();
    }, [loadChatUnread])
  );

  const handleCall = (phone, label = "contact") => {
    openPhoneCall(phone, label);
  };

  const openParticipantDetails = (item, roleType) => {
    const detail =
      roleType === "courier"
        ? buildDriverCourierDetail(item, rideData?.from, rideData?.to)
        : buildDriverPassengerDetail(item, rideData?.from, rideData?.to);
    setParticipantPopoverDetail(detail);
    setParticipantPopoverVisible(true);
    setParticipantPopoverLoading(true);
    if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    popoverTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setParticipantPopoverLoading(false);
    }, 200);
  };

  const closeParticipantPopover = () => {
    setParticipantPopoverVisible(false);
    setParticipantPopoverLoading(false);
    setParticipantPopoverDetail(null);
  };

  const normalizedRideStatus = String(
    rideStatus || rideData?.status || rideData?.ride_status || "pending"
  ).toLowerCase();

  const isRideStarted = normalizedRideStatus === "started";
  const effectiveRide = {
    ...rideData,
    ...fareMeta,
    myRole: role,
    activeData: rideData?.activeData,
    displayFare:
      fareMeta.viewerDisplayFare ??
      fareMeta.displayFare ??
      fareMeta.ride_amount ??
      rideData?.displayFare ??
      rideData?.ride_amount,
    ride_amount:
      fareMeta.ride_amount ??
      rideData?.ride_amount ??
      rideData?.activeData?.ride_amount,
    date: scheduleInfo.date ?? rideData?.date,
    startTime: scheduleInfo.startTime ?? rideData?.startTime,
  };

  const bookedSeats = countActiveBookedSeats(passengers);

  const canEditSeats =
    isDriver &&
    (normalizedRideStatus === "pending" || normalizedRideStatus === "started");

  const participantTabs = useMemo(
    () => ["All", "Passengers", "Couriers"],
    []
  );

  const openParticipantsSlider = useCallback(
    (tabIndex) => {
      const resolved = typeof tabIndex === "number" ? tabIndex : 0;
      const max = Math.max(0, participantTabs.length - 1);
      setParticipantTabIndex(Math.min(Math.max(0, resolved), max));
      setActiveSlider("participants");
    },
    [participantTabs.length]
  );

  /** Courier role: only this user's parcel — not every delivery on the ride. */
  const myCourierParcels = useMemo(() => {
    if (!isCourier) return [];
    const uid = normalizeRideId(myUserId);
    if (uid) {
      const mine = (couriers || []).filter(
        (c) => normalizeRideId(c.userId) === uid
      );
      if (mine.length > 0) return mine;
    }
    if (rideData?.activeData) return [rideData.activeData];
    return [];
  }, [isCourier, couriers, myUserId, rideData?.activeData]);

  const driverRideForCompletion = useMemo(
    () => ({
      passengers: passengers.length ? passengers : rideData?.passengers || [],
      all_deliveries: couriers.length ? couriers : rideData?.all_deliveries || [],
    }),
    [passengers, couriers, rideData?.passengers, rideData?.all_deliveries]
  );

  const driverCanCompleteRide = useMemo(
    () => canDriverCompleteRide(driverRideForCompletion),
    [driverRideForCompletion]
  );

  useEffect(() => {
    if (participantTabIndex >= participantTabs.length) {
      setParticipantTabIndex(0);
    }
  }, [participantTabs.length, participantTabIndex]);

  const handleSaveSeats = async (totalSeats) => {
    try {
      setSeatsSaving(true);
      const token = await AsyncStorage.getItem("token");
      const res = await updateRideSeats(token, {
        rideId: rideData?._id,
        totalSeats,
      });
      if (res?.availableSeats != null) {
        setLocalAvailableSeats(res.availableSeats);
      }
      fetchRideDetails();
      Alert.alert("Updated", res.message || "Seats updated successfully");
    } catch (err) {
      Alert.alert("Could not update seats", err.message);
    } finally {
      setSeatsSaving(false);
    }
  };

  const schedulePassed =
    rideData?.isSchedulePassed ?? isRideScheduledTimePassed(effectiveRide);
  const scheduleEarly =
    rideData?.isScheduleFuture ?? isRideScheduledTimeFuture(effectiveRide);

  const driverPendingRide = isDriver && normalizedRideStatus === "pending";
  const canCancelNow = canDriverCancel(effectiveRide);

  const openCancelRide = () => {
    if (!canCancelNow) {
      Alert.alert(
        "Cannot cancel yet",
        `Rides can only be cancelled at least 2 hours before the scheduled start.\n\n${formatLeadTimeHint(effectiveRide) || "Check the scheduled time."}`
      );
      return;
    }
    setActiveSlider("cancelRide");
  };

  const showBoardingOtp =
    !isDriver &&
    myBoarding &&
    (normalizedRideStatus === "pending" || normalizedRideStatus === "started");

  // Background GPS via DriverLocationTracker (setActiveRideTracking below)
  useEffect(() => {
    if (
      normalizedRideStatus === "completed" ||
      normalizedRideStatus === "cancelled" ||
      normalizedRideStatus === "expired"
    ) {
      clearActiveRideTracking();
    } else if (isRideStarted && rideIdStr) {
      setActiveRideTracking(rideIdStr);
    }
  }, [isRideStarted, rideStatus, rideIdStr]);

  const roleColor = isDriver ? "#007AFF" : isCourier ? "#F59E0B" : "#10B981";

  const detailsViewTitle = useMemo(() => {
    if (isDriver) return "Driver View";
    if (isCourier) return "Courier View";
    return "Passenger View";
  }, [isDriver, isCourier]);

  const rideNavParams = (focusParticipantId = null) => {
    const focusId = normalizeNavigationParamId(focusParticipantId);
    const polyline =
      String(routeMeta.routePolyline || rideData?.routePolyline || "").trim();
    return {
      rideId: rideData?._id,
      rideTitle: `${rideData?.from} → ${rideData?.to}`,
      myRole: isDriver ? "driver" : isCourier ? "courier" : "passenger",
      rideStatus: rideStatus || rideData?.status,
      ...(polyline ? { routePolyline: polyline } : {}),
      ...(focusId ? { focusParticipantId: focusId } : {}),
    };
  };

  const openDirectChat = (peer) => {
    const peerUser = peer?.userId || peer;
    const peerId = peerUser?._id || peerUser?.id || peerUser;
    if (!peerId) return;
    navigation.navigate("RideChat", {
      ...rideNavParams(),
      peerId,
      peerName: peerUser?.name || "User",
      peerProfileImg: peerUser?.profile_img,
      peerRole:
        peer?.role ||
        (peerId?.toString?.() === rideData?.creator?._id?.toString?.()
          ? "driver"
          : "passenger"),
    });
  };

  const openLiveMap = (focusParticipantId = null) => {
    navigation.navigate("RideLiveMap", rideNavParams(focusParticipantId));
  };

  const openParticipantRoute = useCallback(
    (item) => {
      const focusId = item?._id || getParticipantUserId(item);
      if (!focusId) {
        openLiveMap();
        return;
      }
      setActiveSlider(null);
      openLiveMap(String(focusId));
    },
    [navigation, rideData, isDriver, isCourier, rideStatus]
  );

  const handleAcceptPassenger = useCallback(async (passengerId) => {
    const token = await AsyncStorage.getItem("token");
    const payload = {
      rideId: rideData?._id,
      passenger_userId: passengerId,
    };
    driveracceptspassengerrequest(token, payload)
      .then((res) => {
        if (res?.status) {
          Alert.alert("Success", res.message);
          fetchRideDetails();
        } else {
          Alert.alert("Error", res?.message || "Something went wrong");
        }
      })
      .catch((err) => {
        console.log("Accept Error:", err);
        Alert.alert("Error", err.message);
      });
  }, [fetchRideDetails, rideData?._id]);

  const handleRemovePassenger = useCallback(
    async (passengerId) => {
      const normalizedId = String(passengerId || "");
      if (!normalizedId) {
        Alert.alert("Error", "Could not identify passenger.");
        return false;
      }

      const passenger = passengers.find(
        (p) => getParticipantUserId(p) === normalizedId
      );
      if (passenger?.isBoardingVerified) {
        Alert.alert(
          "Cannot remove",
          "This passenger is already verified and cannot be removed."
        );
        return false;
      }

      const stillOnRide = passengers.some(
        (p) => getParticipantUserId(p) === normalizedId
      );
      if (!stillOnRide) {
        Alert.alert(
          "Already removed",
          "This passenger is no longer on the ride."
        );
        fetchRideDetails();
        return false;
      }

      try {
        const token = await AsyncStorage.getItem("token");
        const response = await removepassenger(token, {
          rideId: rideData?._id,
          passenger_userId: normalizedId,
        });
        if (response?.status) {
          Alert.alert("Removed", response.message);
          if (response.availableSeats != null) {
            setLocalAvailableSeats(response.availableSeats);
          }
          await fetchRideDetails();
          refreshUpcomingList();
          return true;
        }
        Alert.alert("Error", response?.message || "Could not remove passenger");
        return false;
      } catch (error) {
        const message = error?.message || "Could not remove passenger";
        if (message.toLowerCase().includes("not found")) {
          fetchRideDetails();
        }
        Alert.alert("Error", message);
        return false;
      }
    },
    [passengers, rideData?._id, fetchRideDetails, refreshUpcomingList]
  );

  const handleRejectPassenger = async (passengerId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await driverrejectpassengerrequest(token, {
        rideId: rideData?._id,
        passenger_userId: passengerId,
      });

      if (res?.status) {
        Alert.alert("Removed", res.message);
        fetchRideDetails();
      } else {
        Alert.alert("Error", res?.message);
      }

    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };


  const refreshVerification = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !rideData?._id) return null;
      const data = await listVerificationParticipants(token, rideData._id);
      if (data?.success) {
        setVerification({
          total: data.total,
          pending: data.pending,
          allVerified: data.allVerified,
          participants: data.participants,
        });
        return data;
      }
      return null;
    } catch (err) {
      console.log("Verification refresh:", err.message);
      return null;
    }
  }, [rideData?._id]);

  const prepareVerifyParticipant = useCallback(
    async (item, role) => {
      const user = item?.userId;
      const data = await refreshVerification();
      const uid = getParticipantUserId(item);
      const list = data?.participants || verification?.participants || [];
      const match = list.find(
        (p) =>
          (uid && String(p.userId) === uid) ||
          (user?.userNo && p.userNo === String(user.userNo)) ||
          (user?.name && p.name === user.name && p.role === role)
      );
      const userNo =
        getParticipantUserNo(item) || match?.userNo || "";
      if (!userNo) {
        Alert.alert(
          "User ID missing",
          "Could not load this participant's 6-digit User ID. Pull to refresh ride details, or enter their ID manually."
        );
      }
      return {
        name: user?.name || match?.name || "Participant",
        userNo,
        role: role || match?.role || "passenger",
      };
    },
    [refreshVerification, verification?.participants]
  );

  const closeBottomSlider = useCallback(() => {
    setActiveSlider(null);
    setVerifyTarget(null);
    setPassengerToRemove(null);
  }, []);

  const closeRemovePopover = useCallback(() => {
    if (removingPassenger) return;
    setPassengerToRemove(null);
  }, [removingPassenger]);

  const requestRemovePassenger = useCallback(
    (item) => {
      if (item?.isBoardingVerified) return;
      const id = getParticipantUserId(item);
      if (!id) return;
      const stillOnRide = passengers.some(
        (p) => getParticipantUserId(p) === id
      );
      if (!stillOnRide) return;
      setPassengerToRemove(item);
    },
    [passengers]
  );

  const confirmRemovePassenger = useCallback(
    async (passengerId) => {
      if (removingPassenger) return false;
      const normalizedId = String(passengerId || "");
      if (!normalizedId) return false;

      const stillOnRide = passengers.some(
        (p) => getParticipantUserId(p) === normalizedId
      );
      if (!stillOnRide) {
        setPassengerToRemove(null);
        return false;
      }

      setRemovingPassenger(true);
      try {
        const ok = await handleRemovePassenger(normalizedId);
        if (ok) setPassengerToRemove(null);
        return !!ok;
      } finally {
        setRemovingPassenger(false);
      }
    },
    [removingPassenger, passengers, handleRemovePassenger]
  );

  const closeVerifyPopover = useCallback(() => {
    if (verifyLoading) return;
    setVerifyTarget(null);
  }, [verifyLoading]);

  const startVerifyFromParticipants = useCallback(
    async (item, role) => {
      if (!isRideStarted) {
        Alert.alert(
          "Start ride first",
          "Start the ride before verifying passenger or courier OTP."
        );
        return;
      }
      if (item?.isBoardingVerified) return;
      const prepared = await prepareVerifyParticipant(item, role);
      if (!prepared) return;
      setVerifyTarget(prepared);
    },
    [prepareVerifyParticipant, isRideStarted]
  );

  const openOtpSlider = async () => {
    if (!isRideStarted) {
      Alert.alert(
        "Start ride first",
        "Start the ride before verifying passenger or courier OTP."
      );
      return;
    }
    setActiveSlider("otp");
    setVerifyTarget(null);
    await refreshVerification();
  };

  const handleVerifyBoarding = useCallback(
    async ({ userNo, otp }) => {
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await verifyBoardingParticipant(token, rideData?._id, {
          userNo,
          otp,
        });
        Alert.alert(
          "Picked up",
          res?.message || "OTP verified — marked Picked Up"
        );
        DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
        if (res?.verification) {
          setVerification({
            total: res.verification.total,
            pending: res.verification.pending,
            allVerified: res.verification.allVerified,
            participants: res.verification.participants,
          });
        }
        await fetchRideDetails();
        if (verifyTarget) {
          setVerifyTarget(null);
        } else if (res?.verification?.allVerified && activeSlider === "otp") {
          setActiveSlider(null);
          setVerifyTarget(null);
        }
        return true;
      } catch (err) {
        Alert.alert("Verification failed", err.message);
        return false;
      }
    },
    [rideData?._id, fetchRideDetails, activeSlider, verifyTarget]
  );

  const handleDropPassenger = async (item) => {
    const participantId = item?._id;
    if (!participantId || !rideIdStr) return;
    if (!isRideStarted) {
      Alert.alert(
        "Start ride first",
        "Start the ride before marking a passenger as dropped."
      );
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await dropPassengerOnRide(token, rideIdStr, participantId);
      Alert.alert("Dropped", res?.message || "Passenger marked as Dropped");
      if (res?.availableSeats != null) {
        setLocalAvailableSeats(res.availableSeats);
      }
      DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
      fetchRideDetails();
    } catch (err) {
      Alert.alert("Could not update", getApiErrorMessage(err, "Try again."));
    }
  };

  const handleDeliverCourier = async (item) => {
    const participantId = item?._id;
    if (!participantId || !rideIdStr) return;
    if (!isRideStarted) {
      Alert.alert(
        "Start ride first",
        "Start the ride before marking a courier as delivered."
      );
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await deliverCourierOnRide(token, rideIdStr, participantId);
      Alert.alert("Delivered", res?.message || "Courier marked as Delivered");
      DeviceEventEmitter.emit(NOTIFICATIONS_REFRESH_EVENT);
      fetchRideDetails();
    } catch (err) {
      Alert.alert("Could not update", getApiErrorMessage(err, "Try again."));
    }
  };

  const runStartRide = async () => {
    const rid = rideIdStr;
    if (!rid) {
      Alert.alert("Error", "Ride information is missing. Go back and open the ride again.");
      return;
    }

    setRideActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Please log in again.");
        return;
      }

      const response = await startride(token, { rideId: rid });

      if (response?.success) {
        setRideStatus("started");
        setRideStarted(true);
        setDriverToken(token);
        applyRideDetails({ status: "started" });
        refreshUpcomingList();
        setActiveRideTracking(rid).catch(() => {});
        refreshRideDetailsQuiet().catch(() => {});

        (async () => {
          try {
            if (await hasLocationPermission()) {
              await pushDriverLocationNow(rid, token);
            }
          } catch (gpsErr) {
            if (__DEV__) console.warn("[GPS] post-start:", gpsErr?.message);
          }
        })();
      } else {
        Alert.alert("Error", getApiErrorMessage(response, "Could not start ride"));
      }
    } catch (error) {
      const msg = getApiErrorMessage(error, "");
      Alert.alert("Could not start ride", msg || "Check backend is running and phone can reach your PC IP.");
    } finally {
      setRideActionLoading(false);
    }
  };

  const handleStartRide = () => {
    if (rideActionLoading || normalizedRideStatus === "started") return;

    if (isDriver && (schedulePassed || scheduleEarly)) {
      Alert.alert(
        scheduleEarly ? "Start early?" : "Start ride?",
        scheduleEarly
          ? `Scheduled for ${formatScheduledStart(rideData)}. Start now?`
          : "Scheduled time has passed. Start now?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Start ride", onPress: runStartRide },
        ]
      );
      return;
    }

    runStartRide();
  };

  const handleEndRide = async () => {
    if (rideActionLoading || rideStatus !== "started") return;

    const completionBlockers = getDriverCompleteRideBlockers(driverRideForCompletion);
    if (!completionBlockers.ok) {
      Alert.alert(
        "Cannot complete ride",
        completionBlockers.message ||
          "Mark all passengers Dropped and all couriers Delivered before completing the ride."
      );
      return;
    }

    try {
      setLoadingRide(true);

      const token = await AsyncStorage.getItem("token");

      const response = await endRide(token, {
        rideId: rideData._id,
      });

      if (response?.success) {
        await clearActiveRideTracking();
        setRideStatus("completed"); // ✅ update status
        Alert.alert("Success", "Ride Completed Successfully");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "Failed to complete ride"
      );
    } finally {
      setLoadingRide(false);
    }
  };
  const handleContactDriver = () => {
    handleCall(
      rideData?.creator?.mobile ||
        rideData?.driver?.phone ||
        rideData?.phone,
      "driver"
    );
  };

  const handleAcceptCourier = async (courierId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        rideId: rideData?._id,
        courierId: courierId, // ✅ correct
      };

      const response = await acceptCourier(token, payload);

      if (response?.success) {
        Alert.alert("Success", response.message);
        fetchRideDetails();
      } else {
        Alert.alert("Error", response?.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };


  const handleRejectCourier = async (courierId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        rideId: rideData?._id,
        courierId: courierId, // ✅ correct
      };
      const response = await driverrejectcourierrequest(token, payload);

      if (response?.success) {
        Alert.alert("Success", response.message);
        fetchRideDetails();
      } else {
        Alert.alert("Error", response?.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleCancelRideSubmit = async ({ reason }) => {
    try {
      setDriverActionSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      await cancelRideApi(token, { rideId: rideData._id, reason });
      refreshUpcomingList();
      setActiveSlider(null);
      Alert.alert("Ride cancelled", "All participants have been notified.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Could not cancel", getApiErrorMessage(err, err.message));
      if (isMountedRef.current) setDriverActionSubmitting(false);
    }
  };

  const handleRemoveCourier = async (courierId) => {
    const courier = couriers.find((c) => String(c?._id) === String(courierId));
    if (courier?.isBoardingVerified) {
      Alert.alert(
        "Cannot remove",
        "This courier is already verified and cannot be removed."
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        rideId: rideData?._id,
        courierId: courierId, // ✅ correct
      };
      const response = await removeCourier(token, payload);

      if (response?.success) {
        Alert.alert("Success", response.message);
        fetchRideDetails();
      } else {
        Alert.alert("Error", response?.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  }


  return (
    <ScreenContainer style={{ paddingHorizontal: LAYOUT.spacing.screen }}>
      <ScreenHeader
        title={detailsViewTitle}
        rightElement={
          <TouchableOpacity
            onPress={handleRefreshPage}
            disabled={refreshingPage}
            accessibilityRole="button"
            accessibilityLabel="Refresh ride details"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {refreshingPage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="refresh" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.roleButton, { backgroundColor: roleColor + "20" }]}
        >
          <Text style={[styles.roleText, { color: roleColor }]}>
            {detailsViewTitle}
          </Text>
        </TouchableOpacity>

        {isDriver && isRideStarted && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: roleColor }]}
            onPress={openOtpSlider}
          >
            <Text style={[styles.otpText, { color: roleColor }]}>
              Enter OTP
              {verification?.pending > 0 ? ` (${verification.pending})` : ""}
            </Text>
          </TouchableOpacity>
        )}

        {!isDriver && (
          <TouchableOpacity
            style={[styles.otpButton, styles.chipWithBadge, { borderColor: colors.primary, marginLeft: 8 }]}
            onPress={() => openDirectChat({ userId: rideData?.creator, role: "driver" })}
            disabled={!rideData?.creator}
          >
            <Text style={[styles.otpText, { color: colors.primary }]}>💬 Message</Text>
            <MessageIndicator count={chatUnread.driver} style={styles.chipBadge} />
          </TouchableOpacity>
        )}
        {isRideStarted && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: colors.successText, marginLeft: 8 }]}
            onPress={() => openLiveMap()}
          >
            <Text style={[styles.otpText, { color: colors.successText }]}>Map</Text>
          </TouchableOpacity>
        )}
        {isDriver && enrouteStopovers.length > 0 && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: colors.primary, marginLeft: 8 }]}
            onPress={() => setStopoversPopoverVisible(true)}
          >
            <Text style={[styles.otpText, { color: colors.primary }]}>
              Stops ({enrouteStopovers.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 📜 SCROLLABLE CONTENT */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshingPage}
            onRefresh={handleRefreshPage}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          padding: 2,
          paddingBottom: getScrollBottomPadding(
            insets.bottom,
            isDriver ? scale(72) : driverPendingRide ? scale(24) : scale(16)
          ),
        }}
        showsVerticalScrollIndicator={false}
      >

        {isDriver && normalizedRideStatus === "pending" && scheduleEarly && (
          <View style={[styles.verificationBanner, { backgroundColor: colors.infoBg }]}>
            <Text style={styles.verificationBannerText}>
              Scheduled for {formatScheduledStart(rideData)} — you can start this ride early.
            </Text>
          </View>
        )}

        {isDriver && normalizedRideStatus === "pending" && schedulePassed && (
          <View style={[styles.verificationBanner, { backgroundColor: colors.infoBg }]}>
            <Text style={styles.verificationBannerText}>
              Scheduled time has passed — you can still start this ride now.
            </Text>
          </View>
        )}

        {isDriver &&
          (normalizedRideStatus === "pending" || normalizedRideStatus === "started") &&
          verification?.total > 0 && (
          <View
            style={[
              styles.verificationBanner,
              {
                backgroundColor: verification.allVerified
                  ? colors.successBg
                  : colors.warningBg,
              },
            ]}
          >
            <Text style={styles.verificationBannerText}>
              {verification.allVerified
                ? normalizedRideStatus === "started"
                  ? "All passengers and couriers verified."
                  : "All passengers and couriers verified. You can start the ride."
                : normalizedRideStatus === "started"
                  ? `${verification.pending} of ${verification.total} still need OTP verification — verify anytime during the ride.`
                  : `${verification.pending} of ${verification.total} need OTP verification after you start the ride.`}
            </Text>
          </View>
        )}

        {showBoardingOtp && (
          <View style={styles.boardingCard}>
            <Text style={styles.boardingTitle}>Your boarding details</Text>
            <Text style={styles.boardingLine}>
              User ID: <Text style={styles.boardingHighlight}>{myBoarding.userNo || "—"}</Text>
            </Text>
            <Text style={styles.boardingLine}>
              OTP:{" "}
              <Text style={styles.boardingHighlight}>
                {myBoarding.boardingOtp || "Ask driver after acceptance"}
              </Text>
            </Text>
            <Text style={styles.boardingHint}>
              {myBoarding.isBoardingVerified
                ? `Status: ${tripStatusLabel(myBoarding.tripStatus || "picked_up")} ✓`
                : normalizedRideStatus === "started"
                  ? "Ride in progress — keep your User ID and OTP visible for the driver if needed."
                  : "Share your User ID and OTP with the driver before the ride starts."}
            </Text>
          </View>
        )}

        {/* ROUTE */}
        <View style={styles.detailsCard}>
          <UpcomingRouteLines
            rideRoute={upcomingRoutes.rideRoute}
            bookedRoute={upcomingRoutes.bookedRoute}
            role={role === "courier" ? "courier" : "passenger"}
          />
          {isDriver && enrouteStopovers.length > 0 ? (
            <TouchableOpacity
              style={styles.stopoversLink}
              onPress={() => setStopoversPopoverVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.stopoversLinkText, { color: colors.primary }]}>
                View {enrouteStopovers.length} stopover
                {enrouteStopovers.length === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* INFO */}
        <View style={styles.infoCards}>
          {!isDriver && displayVehicle ? (
            <View style={[styles.card, styles.fullWidth, { backgroundColor: colors.tintPurple }]}>
              <Text style={styles.label}>
                <Image source={car} style={styles.icon} /> Vehicle
              </Text>
              <VehicleInfoStrip vehicle={displayVehicle} compact />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.tintPurple }]}>
              <Text style={styles.label}>
                <Image source={car} style={styles.icon} /> Car Type
              </Text>
              <Text style={styles.value}>
                {displayVehicle?.company || rideData?.vehicle?.company || "—"}
                {displayVehicle?.car_no || rideData?.vehicle?.car_no
                  ? ` (${displayVehicle?.car_no || rideData?.vehicle?.car_no})`
                  : ""}
              </Text>
            </View>
          )}

          {isDriver ? (
            <>
              <EditableRideSeats
                availableSeats={localAvailableSeats}
                bookedSeats={bookedSeats}
                canEdit={canEditSeats}
                saving={seatsSaving}
                onSave={handleSaveSeats}
              />

              {canEditSeats && (
                <View style={[styles.card, styles.driverOptionsCard]}>
                  <RideDriverSettings
                    rideId={rideData?._id}
                    token={driverToken}
                    canCarryCourier={canCarryCourier}
                    disabled={!driverToken}
                    onUpdated={(opts) => {
                      if (opts.CanCarryCourier != null) {
                        setCanCarryCourier(!!opts.CanCarryCourier);
                      }
                    }}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.tintOrange }]}>
              <Text style={styles.label}>
                <Image source={seat} style={styles.icon} /> Available Seats
              </Text>
              <Text style={styles.value}>{localAvailableSeats}</Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: colors.tintTeal }]}>
            <Text style={styles.label}>
              <Image source={dateIcon} style={styles.icon} /> Date
            </Text>
            <Text style={styles.value}>{convertDate(rideData?.date)}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.tintGreen }]}>
            <Text style={styles.label}>
              <Image source={priceIcon} style={styles.icon} />{" "}
              {isDriver ? "Price / Seat" : "Your Fare"}
            </Text>
            <Text style={styles.value}>₹ {getRideDisplayFare(effectiveRide)}</Text>
          </View>

          <View
            style={[styles.card, styles.fullWidth, { backgroundColor: colors.infoBg }]}
          >
            <Text style={styles.label}>
              <Image source={clock} style={styles.icon} /> Start Time
            </Text>
            <Text style={styles.value}>
              {formatDisplayTime(effectiveRide?.startTime) || "—"}
            </Text>
          </View>
        </View>

        {/* DRIVER VIEW — participants in popover */}
        {isDriver && (
          <>
            <DriverParticipantsHub
              passengerCount={passengers.length}
              courierCount={couriers.length}
              onOpen={() => openParticipantsSlider("default")}
            />

            <DriverEnrouteHub
              passengerCount={enrouteRequests.counts.passengers}
              courierCount={enrouteRequests.counts.couriers}
              loading={enrouteRequests.loading}
              picksRemaining={driverSubscription?.picksRemaining}
              unlimitedPicks={driverSubscription?.unlimitedPicks}
              planName={driverSubscription?.plan?.name}
              subscriptionActive={driverSubscription?.isActive !== false}
              isDeactivated={!!driverSubscription?.isDeactivated}
              onOpen={() => {
                enrouteRequests.refresh();
                loadDriverSubscription();
                setEnrouteTabIndex(0);
                setActiveSlider("enroute");
              }}
            />
          </>
        )}
        {!isDriver && (
          <>
            <Text style={styles.section}>
              {isCourier ? "Ride Driver" : "Your Driver"}
            </Text>
            <DriverContactCard
              driver={displayCreator}
              vehicle={displayVehicle}
              messageUnread={chatUnread.driver}
              onMessage={() =>
                openDirectChat({ userId: rideData?.creator, role: "driver" })
              }
              onCall={() => handleCall(rideData?.creator?.mobile, "driver")}
            />
          </>
        )}
        {isCourier && (
          <>
            {/* Parcel Info */}
            <Text style={styles.section}>Your Parcel</Text>

            {myCourierParcels.length === 0 ? (
              <Text style={styles.pickup}>Your parcel details are not available yet.</Text>
            ) : (
              myCourierParcels.map((item, index) => (
                <View
                  key={normalizeRideId(item.userId) || item._id || `parcel-${index}`}
                  style={styles.myPassengerCard}
                >
                  <CourierParcelPreview courier={item} />
                  <Text style={styles.pickup}>
                    Amount: ₹{getCourierFare(item)}
                  </Text>
                </View>
              ))
            )}

            {/* Other Passengers */}
            <Text style={styles.section}>Passengers in Ride</Text>

            {passengers.map((item, index) => (
              <View key={index} style={styles.myPassengerCard}>
                <View style={styles.myRow}>
                      <UserAvatar user={item?.userId} size={50} />

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.name}>
                      {item?.userId?.name || "Passenger"}
                    </Text>

                    <Text style={styles.pickup}>
                      {item?.userId?.email || "No email"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {driverPendingRide ? (
          <View style={styles.cancelSection}>
            <Text style={styles.cancelSectionTitle}>Cancel this ride</Text>
            <Text style={styles.cancelSectionHint}>
              {canCancelNow
                ? "You may cancel until 2 hours before the scheduled start. This is a secondary action — use only if you cannot drive."
                : `Cancel becomes available 2+ hours before start (${formatLeadTimeHint(effectiveRide)}).`}
            </Text>
            <TouchableOpacity
              style={[
                styles.cancelSectionBtn,
                !canCancelNow && styles.cancelSectionBtnMuted,
              ]}
              onPress={openCancelRide}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelSectionBtnText}>Cancel ride</Text>
            </TouchableOpacity>
          </View>
        ) : null}

      </ScrollView>

      <BottomSlider
        visible={activeSlider !== null}
        onClose={closeBottomSlider}
        scrollable={activeSlider === "cancelRide" || activeSlider === "otp"}
        heightRatio={
          activeSlider === "participants"
            ? 0.88
            : activeSlider === "otp"
              ? 0.78
              : activeSlider === "cancelRide"
                ? 0.55
                : activeSlider === "enroute"
                  ? 0.88
                  : 0.65
        }
        dragHeader={
          activeSlider === "participants"
            ? buildParticipantsDragHeader({
                styles: participantSheetStyles,
                colors,
                tabs: participantTabs,
                activeTabIndex: participantTabIndex,
                onTabChange: setParticipantTabIndex,
                passengers,
                couriers,
              })
            : activeSlider === "enroute"
              ? buildEnrouteDragHeader({
                  styles: enrouteSheetThemedStyles,
                  colors,
                  activeTabIndex: enrouteTabIndex,
                  onTabChange: setEnrouteTabIndex,
                  passengers: enrouteRequests.counts.passengers,
                  couriers: enrouteRequests.counts.couriers,
                })
              : null
        }
      >
        {activeSlider === "participants" && (
          <DriverParticipantsSheet
            visible
            tabs={participantTabs}
            activeTabIndex={participantTabIndex}
            detailsLoading={detailsLoading}
            passengers={passengers}
            couriers={couriers}
            rideFrom={rideData?.from}
            rideTo={rideData?.to}
            rideStatus={normalizedRideStatus}
            isRideStarted={isRideStarted}
            onViewParticipantRoute={openParticipantRoute}
            onStartVerify={startVerifyFromParticipants}
            onDropPassenger={handleDropPassenger}
            onDeliverCourier={handleDeliverCourier}
            onCall={handleCall}
            onMessage={(item, role) => {
              setActiveSlider(null);
              openDirectChat({ userId: item.userId, role });
            }}
            onRemovePassenger={requestRemovePassenger}
            onRemoveCourier={handleRemoveCourier}
            onPressPassenger={(item) =>
              openParticipantDetails(item, "passenger")
            }
            onPressCourier={(item) => openParticipantDetails(item, "courier")}
          />
        )}

        {/* OTP */}
        {activeSlider === "otp" && (
          <View style={styles.otpSliderBody}>
            {verification?.participants?.length > 0 ? (
              <View style={styles.participantPicker}>
                <Text style={styles.participantPickerTitle}>
                  Select participant
                </Text>
                {verification.participants.map((p, idx) => (
                  <TouchableOpacity
                    key={`${p.userNo}-${idx}`}
                    style={[
                      styles.participantChip,
                      p.isBoardingVerified && styles.participantChipDone,
                      verifyTarget?.userNo === p.userNo &&
                        styles.participantChipActive,
                    ]}
                    onPress={() =>
                      setVerifyTarget({
                        name: p.name,
                        userNo: p.userNo || "",
                        role: p.role,
                      })
                    }
                    disabled={p.isBoardingVerified}
                  >
                    <Text style={styles.participantChipText}>
                      {p.name} ({p.role}) — {p.userNo || "?"}{" "}
                      {p.isBoardingVerified ? "✓" : "•"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <VerifyBoardingPanel
              participantName={
                verifyTarget?.name ||
                (verifyTarget?.role === "courier" ? "Courier" : "Passenger")
              }
              role={verifyTarget?.role || "passenger"}
              userNo={verifyTarget?.userNo || ""}
              verifying={verifyLoading}
              onVerify={async (payload) => {
                setVerifyLoading(true);
                try {
                  return await handleVerifyBoarding(payload);
                } finally {
                  setVerifyLoading(false);
                }
              }}
            />
          </View>
        )}

        {/* ENROUTE */}
        {activeSlider === "enroute" && (
          <View style={enrouteSheetThemedStyles.body}>
            <EnRoute
              from={rideData?.from}
              to={rideData?.to}
              date={scheduleInfo.date || rideData?.date}
              rideId={rideData?._id}
              stopovers={enrouteStopovers}
              routePolyline={enrouteRoutePolyline}
              onPickSuccess={handleEnroutePickSuccess}
              onSubscriptionRequired={handleSubscriptionRequired}
              participantUserIds={mergedParticipantUserIds}
              data={enrouteRequests.data}
              loading={enrouteRequests.loading}
              onRefresh={enrouteRequests.refresh}
              removeItem={enrouteRequests.removeItem}
              activeTabIndex={enrouteTabIndex}
              onTabChange={setEnrouteTabIndex}
            />
          </View>
        )}

        {activeSlider === "cancelRide" && (
          <RideDriverActionForm
            submitting={driverActionSubmitting}
            onSubmit={handleCancelRideSubmit}
            onClose={() => setActiveSlider(null)}
          />
        )}

      </BottomSlider>

      <DriverParticipantPopover
        visible={participantPopoverVisible}
        detail={participantPopoverDetail}
        loading={participantPopoverLoading}
        onClose={closeParticipantPopover}
      />

      <VerifyBoardingPopover
        visible={!!verifyTarget && activeSlider === "participants"}
        participantName={verifyTarget?.name}
        role={verifyTarget?.role || "passenger"}
        userNo={verifyTarget?.userNo || ""}
        verifying={verifyLoading}
        onClose={closeVerifyPopover}
        onVerify={async (payload) => {
          setVerifyLoading(true);
          try {
            return await handleVerifyBoarding(payload);
          } finally {
            setVerifyLoading(false);
          }
        }}
      />

      <RemovePassengerPopover
        visible={!!passengerToRemove && activeSlider === "participants"}
        passenger={passengerToRemove}
        rideFrom={rideData?.from}
        removing={removingPassenger}
        onClose={closeRemovePopover}
        onRemove={confirmRemovePassenger}
      />

      <DriverStopoversPopover
        visible={stopoversPopoverVisible}
        onClose={() => setStopoversPopoverVisible(false)}
        from={rideData?.from}
        to={rideData?.to}
        stopovers={enrouteStopovers}
      />

      {isDriver && (
        <FixedButton
          title={
            !rideStatus
              ? "Loading..."
              : rideActionLoading && normalizedRideStatus === "pending"
                ? "Starting ride…"
              : normalizedRideStatus === "pending"
                ? "Start Ride"
                : normalizedRideStatus === "started"
                  ? "Complete Ride"
                  : "Ride Completed"
          }
          onPress={
            normalizedRideStatus === "pending"
              ? handleStartRide
              : normalizedRideStatus === "started"
                ? handleEndRide
                : null
          }
          disabled={
            !normalizedRideStatus ||
            normalizedRideStatus === "completed" ||
            normalizedRideStatus === "cancelled" ||
            normalizedRideStatus === "expired" ||
            rideActionLoading ||
            (normalizedRideStatus === "started" && loadingRide) ||
            (normalizedRideStatus === "started" && !driverCanCompleteRide)
          }
          loading={
            rideActionLoading ||
            (normalizedRideStatus === "started" && loadingRide)
          }
          bottomInset={insets.bottom + scale(8)}
        />
      )}
    </ScreenContainer>
  );
};

export default UpcomingDetailsPage;

const createStyles = (c) => {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },

  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
    gap: 8,
  },
  driverActionsCard: {
    backgroundColor: c.errorBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.errorBorder,
  },
  driverActionsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.errorText,
    marginBottom: 4,
  },
  driverActionsHint: {
    fontSize: 12,
    color: c.errorText,
    lineHeight: 17,
    marginBottom: 12,
  },
  driverActionBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  driverActionCancel: {
    backgroundColor: c.surface,
    borderColor: c.errorText,
  },
  driverActionMuted: {
    opacity: 0.55,
  },
  driverActionCancelText: {
    color: c.errorText,
    fontWeight: "700",
    fontSize: 14,
  },
  cancelSection: {
    marginTop: 28,
    marginBottom: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  cancelSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textMuted,
    marginBottom: 6,
  },
  cancelSectionHint: {
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  cancelSectionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.errorBorder,
    backgroundColor: c.surface,
  },
  cancelSectionBtnMuted: {
    opacity: 0.5,
  },
  cancelSectionBtnText: {
    color: c.errorText,
    fontWeight: "600",
    fontSize: 15,
  },
  chipWithBadge: {
    position: "relative",
    paddingRight: 14,
  },
  chipBadge: {
    position: "absolute",
    top: -6,
    right: -4,
  },

  roleButton: {
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.radius.xl,
  },

  roleText: { fontWeight: "700" },

  verificationBanner: {
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.spacing.md,
  },
  verificationBannerText: {
    fontSize: LAYOUT.font.label,
    color: c.text,
    lineHeight: scale(20),
  },
  boardingCard: {
    backgroundColor: c.primaryMuted,
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.spacing.md,
  },
  boardingTitle: {
    fontWeight: "700",
    fontSize: LAYOUT.font.section,
    marginBottom: LAYOUT.spacing.sm,
    color: c.text,
  },
  boardingLine: {
    fontSize: LAYOUT.font.body,
    color: c.textMuted,
    marginBottom: LAYOUT.spacing.xs,
  },
  boardingHighlight: {
    fontWeight: "700",
    color: c.primary,
    letterSpacing: 1,
  },
  boardingHint: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.font.small,
    color: c.textMuted,
  },
  userNoText: {
    fontSize: LAYOUT.font.small,
    color: c.textMuted,
    marginTop: 2,
  },
  verifyChip: {
    backgroundColor: c.primary,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.sm,
    marginRight: LAYOUT.spacing.sm,
  },
  verifyChipText: {
    color: "#fff",
    fontSize: LAYOUT.font.small,
    fontWeight: "600",
  },
  otpSliderBody: {
    flex: 1,
    paddingBottom: 8,
  },
  participantPicker: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.sm,
    marginBottom: 4,
  },
  participantPickerTitle: {
    fontSize: LAYOUT.font.label,
    fontWeight: "600",
    marginBottom: LAYOUT.spacing.sm,
    color: c.text,
  },
  participantChip: {
    padding: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: LAYOUT.spacing.xs,
    backgroundColor: c.surface,
  },
  participantChipActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryMuted,
  },
  participantChipDone: {
    borderColor: c.successText,
    backgroundColor: c.successBg,
  },
  participantChipText: {
    fontSize: LAYOUT.font.small,
    color: c.text,
  },
  participantDetailsWrap: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  participantDetailsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: c.text,
    marginBottom: 10,
  },
  participantDetailsCard: {
    backgroundColor: c.surfaceAlt,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  otpButton: {
    borderWidth: 1,
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.radius.xl,
  },

  otpText: { fontWeight: "700" },

  detailsCard: {
    backgroundColor: c.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.screen,
    marginBottom: LAYOUT.spacing.md,
  },

  stopoversLink: {
    marginTop: 10,
    alignSelf: "flex-start",
  },

  stopoversLinkText: {
    fontSize: 13,
    fontWeight: "700",
  },

  routeRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },

  routeIcon: { width: 26, height: 26, marginRight: 10 },

  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.text,
  },

  rideStopsHint: {
    marginTop: 10,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
  },

  verticalLineImage: {
    width: 4,
    height: 50,
    resizeMode: "contain",
    marginLeft: 12,
    marginVertical: 4,
  },

  infoCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  card: { width: "48%", padding: 16, borderRadius: 16 },

  driverOptionsCard: {
    backgroundColor: c.primaryMuted,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  },

  fullWidth: { width: "100%" },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: c.textSecondary,
  },

  value: { fontSize: 15, fontWeight: "700", color: c.text },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: c.text,
    marginBottom: 4,
  },

  pickup: {
    fontSize: 13,
    color: c.textMuted,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 12,
  },

  callButton: {
    width: 100,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.surface,
  },
  chatChip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.primary,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.primaryMuted,
  },
  chatChipText: {
    color: c.primary,
    fontWeight: "600",
    fontSize: 13,
  },

  removeButton: {
    width: 100,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.errorText,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.surface,
  },

  callText: {
    color: c.primary,
    fontSize: 14,
    fontWeight: "500",
  },

  removeText: {
    color: c.errorText,
    fontSize: 14,
    fontWeight: "500",
  },

  section: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 16,
    color: c.text,
  },
  sendRequestBtn: {
    backgroundColor: c.primaryMuted,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 15,
    borderWidth: 1,
    borderColor: c.primary,
  },

  sendRequestText: {
    color: c.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  myPassengerCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 17,
    elevation: 4,
  },

  myRow: { flexDirection: "row", alignItems: "center", padding: 10 },

  avatarLg: { width: 50, height: 50, borderRadius: 25 },

  priceContainer: { alignItems: "flex-end", justifyContent: "center" },

  carIcon: { width: 20, height: 20, marginBottom: 4 },

  priceText: { fontSize: 15, fontWeight: "600", color: c.text },

  myActions: { flexDirection: "row", marginTop: 10 },

  callBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },

  removeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.errorText,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },

  removeText: { color: c.errorText, fontWeight: "600" },

  filter: { flexDirection: "row", marginBottom: 14 },

  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: c.chipBg,
    marginRight: 8,
  },

  activeTab: { backgroundColor: c.primary },

  tabText: { fontSize: 13, color: c.textSecondary },

  activeTabText: { color: c.inverseText },

  requestCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
  },

  requestTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  requestLeft: { flexDirection: "row", alignItems: "center" },

  requestAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: c.surfaceAlt,
    marginRight: 10,
  },

  requestName: { fontSize: 15, fontWeight: "600", color: c.text },

  requestSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  requestPickup: { fontSize: 11, color: c.textMuted, marginTop: 2 },

  requestPrice: { fontSize: 14, fontWeight: "600", color: c.text },

  requestBtnRow: { flexDirection: "row", marginTop: 12 },

  acceptBtn: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },

  acceptText: { color: "#fff", fontWeight: "600" },

  declineBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  declineText: { color: "#fff", fontWeight: "600" },
  driverCard: {
    backgroundColor: c.primaryMuted,
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
  },

  driverRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  driverCarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  carText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: c.text,
  },
  emptyList: {
    textAlign: "center",
    color: c.textMuted,
    marginBottom: LAYOUT.spacing.md,
    fontSize: 14,
  },
});
};