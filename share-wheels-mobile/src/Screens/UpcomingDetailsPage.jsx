import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from "react-native";

import BottomSlider from "../Components/BottomSlider";
import OtpModel from "../Components/OtpModel";
import EnRoute from "../Components/EnRoute";
import RemovePassengerModal from "../Components/RemovePassenger";
import FixedButton from "../Components/FixedButton";

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
  updateRideSeats,
  cancelRideApi,
} from "../ApiService/ridesApiServices";
import RideDriverActionForm from "../Components/RideDriverActionForm";
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import priceIcon from "../assets/priceIcon.png";
import clock from "../assets/clock2.png";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import lineIcon from "../assets/lineicon.png";
import UserAvatar from "../Components/ui/UserAvatar";
import ScreenContainer from "../Components/ui/ScreenContainer";
import ScreenHeader from "../Components/ui/ScreenHeader";
import ParticipantCard from "../Components/ParticipantCard";
import DriverParticipantPopover from "../Components/ui/DriverParticipantPopover";
import {
  buildDriverPassengerDetail,
  buildDriverCourierDetail,
} from "../Utils/driverParticipantDetails";
import DriverContactCard from "../Components/DriverContactCard";
import VehicleInfoStrip from "../Components/VehicleInfoStrip";
import CourierParcelPreview, {
  formatCourierParcelLine,
} from "../Components/CourierParcelPreview";
import EditableRideSeats from "../Components/EditableRideSeats";
import RideDriverSettings from "../Components/RideDriverSettings";
import MessageIndicator from "../Components/ui/MessageIndicator";
import { getRideChatMessages } from "../ApiService/chatApiServices";
import { profileData } from "../Navigation/AuthNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding, scale } from "../theme/layout";
import { DS } from "../theme/designSystem";
import caricon from "../assets/caricon.png";
import courier from "../assets/courier.png"
import { useRoute, useNavigation } from "@react-navigation/native";
import { convertDate } from '../Utils';
import { formatDisplayTime } from '../Utils/dateUtils';
import { formatLocalISODate } from "../Utils/dateUtils";
import { getRideDisplayFare, getPassengerFare, getCourierFare } from '../Utils/fareUtils'
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

const UpcomingDetailsPage = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { rideData } = route.params || {};
  const { setRefreshUpcomingrides } = profileData() || {};

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
  const [loadingRide, setLoadingRide] = useState(false);
  const [rideActionLoading, setRideActionLoading] = useState(false);
  const [rideStarted, setRideStarted] = useState(
    rideData?.status === "started" || rideData?.ride_status === "started"
  );
  const [passengers, setPassengers] = useState([]);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
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
  const [quickReserve, setQuickReserve] = useState(!!rideData?.QuickReserve);
  const [courierRequests, setCourierRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [rideStatus, setRideStatus] = useState(
    () => rideData?.status || rideData?.ride_status || "pending"
  );
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [driverToken, setDriverToken] = useState(null);
  const [verification, setVerification] = useState(null);
  const [myBoarding, setMyBoarding] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [seatsSaving, setSeatsSaving] = useState(false);
  const [chatUnread, setChatUnread] = useState({ driver: 0 });
  const [rideMeta, setRideMeta] = useState({});
  const [scheduleInfo, setScheduleInfo] = useState({
    date: rideData?.date,
    startTime: rideData?.startTime,
  });
  const [driverActionSubmitting, setDriverActionSubmitting] = useState(false);
  const { ProfileDetails } = profileData();
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
    if (data.QuickReserve != null) {
      setQuickReserve(!!data.QuickReserve);
    }
    if (data.date != null || data.startTime != null) {
      setScheduleInfo((prev) => ({
        date: data.date ?? prev.date,
        startTime: data.startTime ?? prev.startTime,
      }));
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

  useRideSocket(rideIdStr, {
    onParticipantsUpdated: refreshRideDetailsQuiet,
    onRequestUpdated: refreshRideDetailsQuiet,
  });

  useFocusEffect(
    useCallback(() => {
      fetchRideDetails({ showLoading: true });
    }, [fetchRideDetails])
  );

  const handleEnroutePickSuccess = useCallback(
    (_item, response) => {
      if (response?.details) {
        applyRideDetails(response.details);
      }
      fetchRideDetails();
      refreshUpcomingList();
    },
    [applyRideDetails, fetchRideDetails, refreshUpcomingList]
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
    date: scheduleInfo.date ?? rideData?.date,
    startTime: scheduleInfo.startTime ?? rideData?.startTime,
  };

  const bookedSeats = (passengers || []).reduce(
    (sum, p) => sum + (Number(p?.requires_seats) || 0),
    0
  );

  const canEditSeats =
    isDriver &&
    (normalizedRideStatus === "pending" || normalizedRideStatus === "started");

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

  const rideNavParams = () => ({
    rideId: rideData?._id,
    rideTitle: `${rideData?.from} → ${rideData?.to}`,
    myRole: isDriver ? "driver" : isCourier ? "courier" : "passenger",
    rideStatus: rideStatus || rideData?.status,
  });

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

  const openLiveMap = () => {
    navigation.navigate("RideLiveMap", rideNavParams());
  };

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

  const handleRemovePassenger = async (passengerId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const payload = {
        rideId: rideData?._id,
        passenger_userId: passengerId,
      };
      const response = await removepassenger(token, payload);
      if (response?.status) {
        Alert.alert("Removed", response.message);
        fetchRideDetails();
      } else {
        Alert.alert("Error", response.message);
      }
      refreshUpcomingList();
    } catch (error) {
      console.log("Remove Error:", error);
      Alert.alert("Error", error.message);
    }
  };

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


  const refreshVerification = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const data = await listVerificationParticipants(token, rideData?._id);
      if (data?.success) {
        setVerification({
          total: data.total,
          pending: data.pending,
          allVerified: data.allVerified,
          participants: data.participants,
        });
      }
    } catch (err) {
      console.log("Verification refresh:", err.message);
    }
  };

  const openOtpSlider = async () => {
    setActiveSlider("otp");
    setVerifyTarget(null);
    await refreshVerification();
  };

  const handleVerifyBoarding = async ({ userNo, otp }) => {
    try {
      setVerifyLoading(true);
      const token = await AsyncStorage.getItem("token");
      const res = await verifyBoardingParticipant(token, rideData?._id, { userNo, otp });
      Alert.alert("Verified", res?.message || "Participant verified");
      if (res?.verification) {
        setVerification({
          total: res.verification.total,
          pending: res.verification.pending,
          allVerified: res.verification.allVerified,
          participants: res.verification.participants,
        });
      }
      fetchRideDetails();
      if (res?.verification?.allVerified) {
        setActiveSlider(null);
        setVerifyTarget(null);
      }
    } catch (err) {
      Alert.alert("Verification failed", err.message);
    } finally {
      setVerifyLoading(false);
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

    if (isDriver && verification?.pending > 0 && !schedulePassed && !scheduleEarly) {
      Alert.alert(
        "Verification required",
        `Verify ${verification.pending} passenger(s)/courier(s) before starting, or start anyway.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter OTP", onPress: openOtpSlider },
          { text: "Start anyway", onPress: runStartRide },
        ]
      );
      return;
    }

    if (isDriver && verification?.pending > 0 && (schedulePassed || scheduleEarly)) {
      Alert.alert(
        scheduleEarly ? "Start early?" : "Start ride?",
        scheduleEarly
          ? `Scheduled for ${formatScheduledStart(rideData)}. ${verification.pending} participant(s) not verified — you can still start now.`
          : `${verification.pending} participant(s) not verified — you can still start now.`,
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
      Alert.alert("Error", "Failed to complete ride");
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

  const getUser = (item) => {
    return typeof item.userId === "object" ? item.userId : {};
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
    <ScreenContainer
      backgroundColor="#fff"
      style={{ paddingHorizontal: LAYOUT.spacing.screen }}
    >
      <ScreenHeader title="Ride details" backgroundColor="#fff" />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.roleButton, { backgroundColor: roleColor + "20" }]}
        >
          <Text style={[styles.roleText, { color: roleColor }]}>
            {isDriver ? "Driver" : isCourier ? "Courier" : "Passenger"}
          </Text>
        </TouchableOpacity>

        {isDriver && (
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

        {driverPendingRide && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: "#DC2626", marginLeft: 8 }]}
            onPress={openCancelRide}
          >
            <Text style={[styles.otpText, { color: "#DC2626" }]}>Cancel ride</Text>
          </TouchableOpacity>
        )}

        {!isDriver && (
          <TouchableOpacity
            style={[styles.otpButton, styles.chipWithBadge, { borderColor: "#2563EB", marginLeft: 8 }]}
            onPress={() => openDirectChat({ userId: rideData?.creator, role: "driver" })}
            disabled={!rideData?.creator}
          >
            <Text style={[styles.otpText, { color: "#2563EB" }]}>💬 Message</Text>
            <MessageIndicator count={chatUnread.driver} style={styles.chipBadge} />
          </TouchableOpacity>
        )}
        {isRideStarted && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: "#16A34A", marginLeft: 8 }]}
            onPress={openLiveMap}
          >
            <Text style={[styles.otpText, { color: "#16A34A" }]}>Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 📜 SCROLLABLE CONTENT */}
      <ScrollView
        contentContainerStyle={{
          padding: 2,
          paddingBottom: getScrollBottomPadding(
            insets.bottom,
            isDriver ? scale(72) : scale(16)
          ),
        }}
        showsVerticalScrollIndicator={false}
      >

        {driverPendingRide && (
          <View style={styles.driverActionsCard}>
            <Text style={styles.driverActionsTitle}>Driver actions</Text>
            <Text style={styles.driverActionsHint}>
              {canCancelNow
                ? "You may cancel until 2 hours before the scheduled start."
                : `Cancel unlocks 2+ hours before start (${formatLeadTimeHint(effectiveRide)}).`}
            </Text>
            <TouchableOpacity
              style={[
                styles.driverActionBtn,
                styles.driverActionCancel,
                !canCancelNow && styles.driverActionMuted,
              ]}
              onPress={openCancelRide}
            >
              <Text style={styles.driverActionCancelText}>Cancel ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDriver && normalizedRideStatus === "pending" && scheduleEarly && (
          <View style={[styles.verificationBanner, { backgroundColor: "#EFF6FF" }]}>
            <Text style={styles.verificationBannerText}>
              Scheduled for {formatScheduledStart(rideData)} — you can start this ride early.
            </Text>
          </View>
        )}

        {isDriver && normalizedRideStatus === "pending" && schedulePassed && (
          <View style={[styles.verificationBanner, { backgroundColor: "#EFF6FF" }]}>
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
                  ? DS.colors.successMuted
                  : DS.colors.warningMuted,
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
                  : `${verification.pending} of ${verification.total} still need OTP verification.`}
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
                ? "Verified by driver ✓"
                : normalizedRideStatus === "started"
                  ? "Ride in progress — keep your User ID and OTP visible for the driver if needed."
                  : "Share your User ID and OTP with the driver before the ride starts."}
            </Text>
          </View>
        )}

        {/* ROUTE */}
        <View style={styles.detailsCard}>
          <View style={styles.routeRow}>
            <Image source={madhapurIcon} style={styles.routeIcon} />
            <Text style={styles.locationTitle}>{rideData?.from}</Text>
          </View>

          <Image source={lineIcon} style={styles.verticalLineImage} />

          <View style={styles.routeRow}>
            <Image source={kondapurIcon} style={styles.routeIcon} />
            <Text style={styles.locationTitle}>{rideData?.to}</Text>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoCards}>
          {!isDriver && displayVehicle ? (
            <View style={[styles.card, styles.fullWidth, { backgroundColor: "#F3E8FF" }]}>
              <Text style={styles.label}>
                <Image source={car} style={styles.icon} /> Vehicle
              </Text>
              <VehicleInfoStrip vehicle={displayVehicle} compact />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: "#F3E8FF" }]}>
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
                    quickReserve={quickReserve}
                    disabled={!driverToken}
                    onUpdated={(opts) => {
                      if (opts.CanCarryCourier != null) {
                        setCanCarryCourier(!!opts.CanCarryCourier);
                      }
                      if (opts.QuickReserve != null) {
                        setQuickReserve(!!opts.QuickReserve);
                      }
                    }}
                  />
                </View>
              )}
            </>
          ) : (
            <View style={[styles.card, { backgroundColor: "#FFF7ED" }]}>
              <Text style={styles.label}>
                <Image source={seat} style={styles.icon} /> Available Seats
              </Text>
              <Text style={styles.value}>{localAvailableSeats}</Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: "#F0FDFA" }]}>
            <Text style={styles.label}>
              <Image source={dateIcon} style={styles.icon} /> Date
            </Text>
            <Text style={styles.value}>{convertDate(rideData?.date)}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#E0FDF4" }]}>
            <Text style={styles.label}>
              <Image source={priceIcon} style={styles.icon} />{" "}
              {isDriver ? "Price / Seat" : "Your Fare"}
            </Text>
            <Text style={styles.value}>₹ {getRideDisplayFare(rideData)}</Text>
          </View>

          <View
            style={[styles.card, styles.fullWidth, { backgroundColor: "#EFF6FF" }]}
          >
            <Text style={styles.label}>
              <Image source={clock} style={styles.icon} /> Start Time
            </Text>
            <Text style={styles.value}>
              {formatDisplayTime(effectiveRide?.startTime) || "—"}
            </Text>
          </View>
        </View>

        {quickReserve && isDriver && canEditSeats ? (
          <View style={styles.quickReserveBanner}>
            <Text style={styles.quickReserveBannerText}>
              Quick Reserve is ON — passengers & couriers join without your approval
            </Text>
          </View>
        ) : null}

        {/* DRIVER VIEW */}
        {isDriver && (
          <>
            <Text style={styles.section}>My Passengers</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : passengers.length === 0 ? (
              <Text style={styles.emptyList}>No passengers yet</Text>
            ) : (
              <ScrollView
                nestedScrollEnabled
                style={styles.participantListScroll}
                contentContainerStyle={styles.participantListContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {passengers.map((item, index) => (
                  <ParticipantCard
                    key={item._id || item.userId?._id || index}
                    user={item?.userId}
                    role="passenger"
                    subtitleLines={[
                      item?.userId?.email || "No email",
                      `Pickup: ${rideData?.from}`,
                      `${item?.requires_seats || 1} seat(s)`,
                    ]}
                    fare={getPassengerFare(item)}
                    fareLabel="Fare"
                    verified={!!item?.isBoardingVerified}
                    showVerify={
                      !item?.isBoardingVerified &&
                      (rideStatus === "pending" || rideStatus === "started")
                    }
                    onVerify={() => {
                      setVerifyTarget({
                        name: item?.userId?.name,
                        userNo: item?.userId?.userNo,
                        role: "passenger",
                      });
                      setActiveSlider("otp");
                    }}
                    onCall={() =>
                      handleCall(item?.userId?.mobile, "passenger")
                    }
                    onMessage={() =>
                      openDirectChat({ userId: item.userId, role: "passenger" })
                    }
                    onRemove={() => {
                      setSelectedPassenger(item);
                      setActiveSlider("removePassenger");
                    }}
                    onPress={() => openParticipantDetails(item, "passenger")}
                  />
                ))}
              </ScrollView>
            )}

            <Text style={styles.section}>My Couriers</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : couriers.length === 0 ? (
              <Text style={styles.emptyList}>No couriers yet</Text>
            ) : (
              <ScrollView
                nestedScrollEnabled
                style={styles.participantListScroll}
                contentContainerStyle={styles.participantListContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {couriers.map((item, index) => (
                  <ParticipantCard
                    key={item._id || item.userId?._id || index}
                    user={item?.userId}
                    role="courier"
                    courier={item}
                    subtitleLines={[
                      item?.userId?.email || "No email",
                      item?.userId?.mobile || "",
                    ]}
                    fare={item?.amount_will || 0}
                    fareLabel="Amount"
                    verified={!!item?.isBoardingVerified}
                    showVerify={
                      !item?.isBoardingVerified &&
                      (rideStatus === "pending" || rideStatus === "started")
                    }
                    onVerify={() => {
                      setVerifyTarget({
                        name: item?.userId?.name,
                        userNo: item?.userId?.userNo,
                        role: "courier",
                      });
                      setActiveSlider("otp");
                    }}
                    onCall={() =>
                      handleCall(item?.userId?.mobile, "courier")
                    }
                    onMessage={() =>
                      openDirectChat({ userId: item.userId, role: "courier" })
                    }
                    onRemove={() => handleRemoveCourier(item._id)}
                    onPress={() => openParticipantDetails(item, "courier")}
                  />
                ))}
              </ScrollView>
            )}
            {/* SEND REQUEST */}
            <TouchableOpacity
              style={styles.sendRequestBtn}
              onPress={() => setActiveSlider("enroute")}
            >
              <Text style={styles.sendRequestText}>
                Send Request to en route Passengers
              </Text>
            </TouchableOpacity>

            {!quickReserve && (
            <>
            <Text style={styles.section}>Passenger Requests</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : passengerRequests.length === 0 ? (
              <Text style={{ textAlign: "center" }}>No Requests</Text>
            ) : (
              passengerRequests.map((item, index) => (
                <View key={index} style={styles.requestCard}>
                  <View style={styles.requestTopRow}>
                    <View style={styles.requestLeft}>
                      <UserAvatar user={item?.userId} size={44} />

                      <View>
                        <Text style={styles.requestName}>
                          {item?.userId?.name || "Passenger"}
                        </Text>

                        <Text style={styles.requestSub}>
                          {item?.userId?.gender || "N/A"} •{" "}
                          {item?.requires_seats} Seat
                        </Text>

                        <Text style={styles.requestPickup}>
                          {item?.userId?.email || "No email"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceContainer}>
                      <Image source={caricon} style={styles.carIcon} />

                    </View>

                    <Text style={styles.requestPrice}>
                      ₹ {getPassengerFare(item)}
                    </Text>

                  </View>

                  <View style={styles.requestBtnRow}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() =>
                        handleAcceptPassenger(item?.userId?._id)
                      }
                    >
                      <Text style={styles.acceptText}>✓ Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() =>
                        handleRejectPassenger(
                          item?.userId?._id
                        )
                      }
                    >
                      <Text style={styles.declineText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>

                </View>


              ))
            )}
            <Text style={styles.section}>Courier Requests</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : courierRequests.length === 0 ? (
              <Text style={{ textAlign: "center" }}>
                No Courier Requests
              </Text>
            ) : (
              courierRequests.map((item, index) => {
                                const user = getUser(item);

            return (
            <View key={index} style={styles.requestCard}>
              <View style={styles.requestTopRow}>
                <View style={styles.requestLeft}>
                  <UserAvatar user={user} size={44} />

                  <View>
                    <Text style={styles.requestName}>
                      {user?.name || "Courier"}
                    </Text>

                    <Text style={styles.requestSub}>
                      {formatCourierParcelLine(item)}
                    </Text>

                    <Text style={styles.requestPickup}>
                      {user?.email || "No email"}
                    </Text>
                    <CourierParcelPreview courier={item} compact />
                  </View>
                </View>

                <Text style={styles.requestPrice}>
                  ₹ {getCourierFare(item)}
                </Text>
              </View>

              <View style={styles.requestBtnRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptCourier(item._id)}
                >
                  <Text style={styles.acceptText}>✓ Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleRejectCourier(item._id)}
                >
                  <Text style={styles.declineText}>✕ Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
            );
  })
)}
            </>
            )}
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

            {couriers.map((item, index) => (
              <View key={index} style={styles.myPassengerCard}>
                <Text style={styles.name}>Your Parcel</Text>
                <CourierParcelPreview courier={item} />
                <Text style={styles.pickup}>
                  Amount: ₹{getCourierFare(item)}
                </Text>
              </View>
            ))}

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

      </ScrollView>

      <BottomSlider
        visible={activeSlider !== null}
        onClose={() => setActiveSlider(null)}
        scrollable={
          activeSlider === "otp" ||
          activeSlider === "enroute" ||
          activeSlider === "removePassenger"
        }
        height={
          activeSlider === "otp"
            ? 420
            : activeSlider === "cancelRide"
              ? 480
              : 100
        }
      >

        {/* OTP */}
        {activeSlider === "otp" && (
          <View>
            {verification?.participants?.length > 0 && (
              <View style={styles.participantPicker}>
                <Text style={styles.participantPickerTitle}>Tap to verify</Text>
                {verification.participants.map((p, idx) => (
                  <TouchableOpacity
                    key={`${p.userNo}-${idx}`}
                    style={[
                      styles.participantChip,
                      p.isBoardingVerified && styles.participantChipDone,
                      verifyTarget?.userNo === p.userNo && styles.participantChipActive,
                    ]}
                    onPress={() =>
                      setVerifyTarget({
                        name: p.name,
                        userNo: p.userNo,
                        role: p.role,
                      })
                    }
                  >
                    <Text style={styles.participantChipText}>
                      {p.name} ({p.role}) — {p.userNo || "?"}{" "}
                      {p.isBoardingVerified ? "✓" : "•"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <OtpModel
              passengerName={
                verifyTarget?.name ||
                (verifyTarget?.role === "courier" ? "Courier" : "Passenger")
              }
              userNo={verifyTarget?.userNo || ""}
              userNoEditable={!verifyTarget?.userNo}
              verifying={verifyLoading}
              subtitle="Ask for their 6-digit User ID and 4-digit boarding OTP"
              onVerify={handleVerifyBoarding}
            />
          </View>
        )}

        {/* ENROUTE */}
        {activeSlider === "enroute" && (
          <EnRoute
            from={rideData?.from}
            to={rideData?.to}
            date={formatLocalISODate(rideData?.date)}
            rideId={rideData?._id}
            onPickSuccess={handleEnroutePickSuccess}
          />
        )}

        {/* REMOVE PASSENGER */}
        {activeSlider === "removePassenger" && selectedPassenger && (
          <RemovePassengerModal
            passenger={selectedPassenger}
            onClose={() => setActiveSlider(null)}
            onRemove={handleRemovePassenger}
          />
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
            (normalizedRideStatus === "started" && loadingRide)
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
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
    gap: 8,
  },
  driverActionsCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  driverActionsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 4,
  },
  driverActionsHint: {
    fontSize: 12,
    color: "#7F1D1D",
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
    backgroundColor: "#fff",
    borderColor: "#DC2626",
  },
  driverActionMuted: {
    opacity: 0.55,
  },
  driverActionCancelText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
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
    color: DS.colors.text,
    lineHeight: scale(20),
  },
  boardingCard: {
    backgroundColor: DS.colors.primaryMuted,
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.spacing.md,
  },
  boardingTitle: {
    fontWeight: "700",
    fontSize: LAYOUT.font.section,
    marginBottom: LAYOUT.spacing.sm,
    color: DS.colors.text,
  },
  boardingLine: {
    fontSize: LAYOUT.font.body,
    color: DS.colors.textMuted,
    marginBottom: LAYOUT.spacing.xs,
  },
  boardingHighlight: {
    fontWeight: "700",
    color: DS.colors.primary,
    letterSpacing: 1,
  },
  boardingHint: {
    marginTop: LAYOUT.spacing.sm,
    fontSize: LAYOUT.font.small,
    color: DS.colors.textMuted,
  },
  userNoText: {
    fontSize: LAYOUT.font.small,
    color: DS.colors.textMuted,
    marginTop: 2,
  },
  verifyChip: {
    backgroundColor: DS.colors.primary,
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
  participantPicker: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.sm,
  },
  participantPickerTitle: {
    fontSize: LAYOUT.font.label,
    fontWeight: "600",
    marginBottom: LAYOUT.spacing.sm,
    color: DS.colors.text,
  },
  participantChip: {
    padding: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: DS.colors.border,
    marginBottom: LAYOUT.spacing.xs,
    backgroundColor: DS.colors.surface,
  },
  participantChipActive: {
    borderColor: DS.colors.primary,
    backgroundColor: DS.colors.primaryMuted,
  },
  participantChipDone: {
    borderColor: DS.colors.success,
    backgroundColor: DS.colors.successMuted,
  },
  participantChipText: {
    fontSize: LAYOUT.font.small,
    color: DS.colors.text,
  },
  participantDetailsWrap: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  participantDetailsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  participantDetailsCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
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
    backgroundColor: "#fff",
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.screen,
    marginBottom: LAYOUT.spacing.md,
  },

  routeRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },

  routeIcon: { width: 26, height: 26, marginRight: 10 },

  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
  },

  fullWidth: { width: "100%" },

  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },

  value: { fontSize: 15, fontWeight: "700" },
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
    borderColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  chatChip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
  chatChipText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },

  removeButton: {
    width: 100,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  callText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500",
  },

  removeText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },

  section: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 16,
  },
  quickReserveBanner: {
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  quickReserveBannerText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  sendRequestBtn: {
    backgroundColor: "#E8F0FF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#2F6BFF",
  },

  sendRequestText: {
    color: "#2F6BFF",
    fontWeight: "600",
    fontSize: 14,
  },
  myPassengerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 17,
    elevation: 4,
  },

  myRow: { flexDirection: "row", alignItems: "center", padding: 10 },

  avatarLg: { width: 50, height: 50, borderRadius: 25 },

  priceContainer: { alignItems: "flex-end", justifyContent: "center" },

  carIcon: { width: 20, height: 20, marginBottom: 4 },

  priceText: { fontSize: 15, fontWeight: "600" },

  myActions: { flexDirection: "row", marginTop: 10 },

  callBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },

  callText: { color: "#2563EB", fontWeight: "600" },

  removeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },

  removeText: { color: "#EF4444", fontWeight: "600" },

  filter: { flexDirection: "row", marginBottom: 14 },

  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },

  activeTab: { backgroundColor: "#111827" },

  tabText: { fontSize: 13, color: "#374151" },

  activeTabText: { color: "#fff" },

  requestCard: {
    backgroundColor: "#fff",
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
    backgroundColor: "#D1D5DB",
    marginRight: 10,
  },

  requestName: { fontSize: 15, fontWeight: "600" },

  requestSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  requestPickup: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  requestPrice: { fontSize: 14, fontWeight: "600" },

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
    backgroundColor: "#EEF4FF",
    borderRadius: 14,
    padding: 16,
    marginTop: 15,
  },

  driverCard: {
    backgroundColor: "#EEF4FF",
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
  },
  participantListScroll: {
    maxHeight: scale(300),
    marginBottom: LAYOUT.spacing.md,
    borderWidth: 1,
    borderColor: LAYOUT.colors.border,
    borderRadius: LAYOUT.radius?.lg || 14,
    backgroundColor: "#FAFBFC",
  },
  participantListContent: {
    padding: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.md,
  },
  emptyList: {
    textAlign: "center",
    color: LAYOUT.colors.textMuted,
    marginBottom: LAYOUT.spacing.md,
    fontSize: 14,
  },
});