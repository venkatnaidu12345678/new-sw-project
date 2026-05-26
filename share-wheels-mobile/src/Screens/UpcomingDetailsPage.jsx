import React, { useState, useCallback, useEffect } from "react";
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
} from "../ApiService/ridesApiServices";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding, scale } from "../theme/layout";
import { DS } from "../theme/designSystem";
import caricon from "../assets/caricon.png";
import courier from "../assets/courier.png"
import { useRoute, useNavigation } from "@react-navigation/native";
import { convertDate, convertTime } from '../Utils'
import { getRideDisplayFare, getPassengerFare, getCourierFare } from '../Utils/fareUtils'
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from "react-native";
import {
  useParticipantLocation,
  pushDriverLocationNow,
  ensureLocationReadyForRide,
} from "../hooks/useDriverLocation";
import {
  setActiveRideTracking,
  clearActiveRideTracking,
} from "../Utils/activeRideTracking";

const UpcomingDetailsPage = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { rideData, refreshRides } = route.params;


  const role = rideData?.myRole;
  const isDriver = role === "driver";
  const isCourier = role === "courier";

  const [activeSlider, setActiveSlider] = useState(null);
  const [loadingRide, setLoadingRide] = useState(false);
  const [rideActionLoading, setRideActionLoading] = useState(false);
  const [rideStarted, setRideStarted] = useState(rideData?.ride_status === "started");
  const [passengers, setPassengers] = useState([])
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [reloadapi, setReloadApi] = useState(true)
  const [courierRequests, setCourierRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [rideStatus, setRideStatus] = useState(rideData?.status || "");
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [driverToken, setDriverToken] = useState(null);
  const [verification, setVerification] = useState(null);
  const [myBoarding, setMyBoarding] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("token").then(setDriverToken);
  }, []);

  const rideIdStr = rideData?._id?.toString?.() || rideData?._id;

  const isRideStarted = rideStatus === "started";

  useParticipantLocation({
    enabled: isRideStarted && !!driverToken && !!rideIdStr,
    rideId: rideIdStr,
    token: driverToken,
  });

  // Resume GPS for rides already started (e.g. before this fix was deployed)
  useEffect(() => {
    if (isDriver && rideStatus === "started" && rideIdStr) {
      setActiveRideTracking(rideIdStr);
    }
  }, [isDriver, rideStatus, rideIdStr]);

  const roleColor = isDriver ? "#007AFF" : isCourier ? "#F59E0B" : "#10B981";

  const rideNavParams = () => ({
    rideId: rideData?._id,
    rideTitle: `${rideData?.from} → ${rideData?.to}`,
    myRole: isDriver ? "driver" : isCourier ? "courier" : "passenger",
    rideStatus: rideStatus || rideData?.status,
  });

  const openGroupChat = () => {
    navigation.navigate("RideChat", rideNavParams());
  };

  const openDirectChat = (peer) => {
    const peerUser = peer?.userId || peer;
    const peerId = peerUser?._id || peerUser?.id || peerUser;
    if (!peerId) return;
    navigation.navigate("RideChat", {
      ...rideNavParams(),
      peerId,
      peerName: peerUser?.name || "User",
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
          setReloadApi((prev) => !prev); // refresh data
        } else {
          Alert.alert("Error", res?.message || "Something went wrong");
        }
      })
      .catch((err) => {
        console.log("Accept Error:", err);
        Alert.alert("Error", err.message);
      });
  }, []);


  const getRideDetails = async () => {
    try {
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem("token");

      const rideId = rideData?._id; // ✅ FIXED

      if (!rideId) return;

      const res = await rideDetails(token, rideId);
      console.log("res", res);

      if (res?.success == true) {
        setPassengers(res?.data?.passengers || []);
        setCouriers(res?.data?.all_deliveries || []);
        setPassengerRequests(res?.data?.passenger_requested_ride);
        setCourierRequests(res?.data?.users_request_Couriers);
        setRideStatus(res?.data?.status);
        setVerification(res?.data?.verification || null);
        setMyBoarding(res?.data?.myBoarding || null);
      }
    } catch (err) {
      console.log("Error 👉", err.message);
    }
    finally {
      setDetailsLoading(false); // ✅ STOP LOADING
    }
  };

  useFocusEffect(
    useCallback(() => {
      getRideDetails();
    }, [reloadapi])
  );

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
        setReloadApi(!reloadapi)
      } else {
        Alert.alert("Error", response.message);
      }
      if (refreshRides) {
        refreshRides();
      }
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
        setReloadApi(!reloadapi)
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
      setReloadApi(!reloadapi);
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

  const handleStartRide = async () => {
    if (rideActionLoading || rideStatus === "started") return;

    if (isDriver && verification && verification.pending > 0) {
      Alert.alert(
        "Verification required",
        `Verify ${verification.pending} passenger(s)/courier(s) before starting the ride.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter OTP", onPress: openOtpSlider },
        ]
      );
      return;
    }

    try {
      setRideActionLoading(true);
      setLoadingRide(true);

      const coords = await ensureLocationReadyForRide();

      const token = await AsyncStorage.getItem("token");

      const response = await startride(token, {
        rideId: rideData._id,
      });

      if (response?.success) {
        setRideStatus("started");
        setDriverToken(token);
        await setActiveRideTracking(rideIdStr);
        try {
          await pushDriverLocationNow(rideIdStr, token, coords);
        } catch (gpsErr) {
          Alert.alert(
            "Location error",
            `Ride could not share GPS with admin. ${gpsErr.message}`
          );
          return;
        }
        Alert.alert("Success", response.message);
      } else {
        Alert.alert("Error", response?.message || "Could not start ride");
      }
    } catch (error) {
      Alert.alert(
        "Location required",
        error?.message ||
          "Enable location permission and GPS before starting a ride."
      );
    } finally {
      setLoadingRide(false);
      setRideActionLoading(false);
    }
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
  console.log('ridestat:', rideStatus)
  const handleContactDriver = () => {
    const driverPhone =
      rideData?.driver?.phone ||
      rideData?.phone ||
      rideData?.AlternatePhoneNumber;

    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    } else {
      Alert.alert("Driver phone number not available");
    }
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
        setReloadApi(!reloadapi);
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
        setReloadApi(!reloadapi);
      } else {
        Alert.alert("Error", response?.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
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
        setReloadApi(!reloadapi);
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
      {/* 🔒 FIXED HEADER */}
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

        {isDriver ? (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: "#2563EB", marginLeft: 8 }]}
            onPress={openGroupChat}
          >
            <Text style={[styles.otpText, { color: "#2563EB" }]}>Group</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: "#2563EB", marginLeft: 8 }]}
            onPress={() => openDirectChat({ userId: rideData?.creator, role: "driver" })}
            disabled={!rideData?.creator}
          >
            <Text style={[styles.otpText, { color: "#2563EB" }]}>Driver</Text>
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
          paddingBottom: getScrollBottomPadding(insets.bottom, scale(72)),
        }}
        showsVerticalScrollIndicator={false}
      >

        {isDriver && rideStatus === "pending" && verification?.total > 0 && (
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
                ? "All passengers and couriers verified. You can start the ride."
                : `${verification.pending} of ${verification.total} still need OTP verification.`}
            </Text>
          </View>
        )}

        {!isDriver && myBoarding && rideStatus === "pending" && (
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
          <View style={[styles.card, { backgroundColor: "#F3E8FF" }]}>
            <Text style={styles.label}>
              <Image source={car} style={styles.icon} /> Car Type
            </Text>
            <Text style={styles.value}>
              {rideData?.vehicle?.company} ({rideData?.vehicle?.car_no})
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: "#FFF7ED" }]}>
            <Text style={styles.label}>
              <Image source={seat} style={styles.icon} /> Available Seats
            </Text>
            <Text style={styles.value}>{rideData?.availableSeats}</Text>
          </View>

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
            <Text style={styles.value}>{convertTime(rideData?.startTime)}</Text>
          </View>
        </View>

        {/* DRIVER VIEW */}
        {isDriver && (
          <>
            <Text style={styles.section}>My Passenger</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : passengers.length === 0 ? (
              <Text style={{ textAlign: "center" }}>No Passengers</Text>
            ) : (
              passengers.map((item, index) => (
                <View key={index} style={styles.myPassengerCard}>
                  <View style={styles.myRow}>
                      <UserAvatar user={item?.userId} size={50} />

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.name}>
                        {item?.userId?.name || "Passenger"}
                      </Text>
                      <Text style={styles.userNoText}>
                        ID: {item?.userId?.userNo || "—"}
                        {item?.isBoardingVerified ? " • Verified ✓" : " • Pending"}
                      </Text>

                      <Text style={styles.pickup}>
                        {item?.userId?.email || "No email"}
                      </Text>

                      <Text style={styles.pickup}>
                        Pickup: {rideData?.from}
                      </Text>
                      <View style={styles.buttonRow}>
                        {!item?.isBoardingVerified && rideStatus === "pending" && (
                          <TouchableOpacity
                            style={styles.verifyChip}
                            onPress={() => {
                              setVerifyTarget({
                                name: item?.userId?.name,
                                userNo: item?.userId?.userNo,
                                role: "passenger",
                              });
                              setActiveSlider("otp");
                            }}
                          >
                            <Text style={styles.verifyChipText}>Verify</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.callButton}>
                          <Text style={styles.callText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.chatChip}
                          onPress={() =>
                            openDirectChat({ userId: item.userId, role: "passenger" })
                          }
                        >
                          <Text style={styles.chatChipText}>Message</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => {
                            setSelectedPassenger(item);
                            setActiveSlider("removePassenger");
                          }}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.priceContainer}>
                      <Image source={caricon} style={styles.carIcon} />
                      <Text style={styles.priceText}>
                        ₹{getPassengerFare(item)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}


            <Text style={styles.section}>My Couriers</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : couriers.length === 0 ? (
              <Text style={{ textAlign: "center" }}>No Couriers</Text>
            ) : (
              couriers.map((item, index) => (
                <View key={index} style={styles.myPassengerCard}>
                  <View style={styles.myRow}>
                      <UserAvatar user={item?.userId} size={50} />

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.name}>
                        {item?.userId?.name || "Courier"}
                      </Text>
                      <Text style={styles.userNoText}>
                        ID: {item?.userId?.userNo || "—"}
                        {item?.isBoardingVerified ? " • Verified ✓" : " • Pending"}
                      </Text>

                      <Text style={styles.pickup}>
                        {item?.userId?.email || "No email"}
                      </Text>

                      <Text style={styles.pickup}>
                        Parcel: {item?.weight || "N/A"} kg
                      </Text>

                      <View style={styles.buttonRow}>
                        {!item?.isBoardingVerified && rideStatus === "pending" && (
                          <TouchableOpacity
                            style={styles.verifyChip}
                            onPress={() => {
                              setVerifyTarget({
                                name: item?.userId?.name,
                                userNo: item?.userId?.userNo,
                                role: "courier",
                              });
                              setActiveSlider("otp");
                            }}
                          >
                            <Text style={styles.verifyChipText}>Verify</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.callButton}>
                          <Text style={styles.callText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.chatChip}
                          onPress={() =>
                            openDirectChat({ userId: item.userId, role: "courier" })
                          }
                        >
                          <Text style={styles.chatChipText}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveCourier(item._id)}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.priceContainer}>
                      <Image source={courier} style={styles.carIcon} />
                      <Text style={styles.priceText}>
                        ₹{item?.amount_will}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
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

            {/* REQUESTS */}
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
                      Parcel • {item?.weight || "N/A"} kg
                    </Text>

                    <Text style={styles.requestPickup}>
                      {user?.email || "No email"}
                    </Text>
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
        {!isDriver && (
          <>
            <Text style={styles.section}>Your Driver</Text>

            <View style={styles.driverCard}>
              <View style={styles.driverRow}>
                <UserAvatar user={rideData?.creator} size={50} />

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>
                    {rideData?.creator?.name || "Driver"}
                  </Text>

                  <Text style={styles.pickup}>
                    {rideData?.creator?.email || "No email"}
                  </Text>

                  <Text style={styles.pickup}>
                    {rideData?.creator?.mobile || "No phone"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.chatChip, { marginTop: 8, alignSelf: "flex-start" }]}
                    onPress={() =>
                      openDirectChat({ userId: rideData?.creator, role: "driver" })
                    }
                  >
                    <Text style={styles.chatChipText}>Message driver</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.driverCarRow}>
                <Image source={caricon} style={styles.carIcon} />
                <Text style={styles.carText}>
                  {rideData?.vehicle?.company} ({rideData?.vehicle?.car_no})
                </Text>
              </View>
            </View>
          </>
        )}
        {isCourier && (
          <>
            <Text style={styles.section}>Ride Driver</Text>

            <View style={styles.driverCard}>
              <View style={styles.driverRow}>
                <UserAvatar user={rideData?.creator} size={50} />

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>
                    {rideData?.creator?.name || "Driver"}
                  </Text>

                  <Text style={styles.pickup}>
                    {rideData?.creator?.mobile || "No phone"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(rideData?.creator?.mobile)}
                >
                  <Text style={styles.callText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatChip}
                  onPress={() =>
                    openDirectChat({ userId: rideData?.creator, role: "driver" })
                  }
                >
                  <Text style={styles.chatChipText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Parcel Info */}
            <Text style={styles.section}>Your Parcel</Text>

            {couriers.map((item, index) => (
              <View key={index} style={styles.myPassengerCard}>
                <View style={styles.myRow}>
                  <UserAvatar user={rideData?.creator} size={50} />

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.name}>Parcel Details</Text>

                    <Text style={styles.pickup}>
                      Weight: {item?.weight || "N/A"} kg
                    </Text>

                    <Text style={styles.pickup}>
                      Amount: ₹{getCourierFare(item)}
                    </Text>
                  </View>
                </View>
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
        height={activeSlider === "otp" ? 420 : 100}
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
            date={rideData?.date}
            rideId={rideData?._id}
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

      </BottomSlider>


      <FixedButton
        title={
          !rideStatus
            ? "Loading..."
            : rideStatus === "pending"
              ? "Start Ride"
              : rideStatus === "started"
                ? "Complete Ride"
                : "Ride Completed"
        }
        onPress={
          rideStatus === "pending"
            ? handleStartRide
            : rideStatus === "started"
              ? handleEndRide
              : null
        }
        disabled={
          !rideStatus ||
          rideStatus === "completed" ||
          loadingRide ||
          (isDriver &&
            rideStatus === "pending" &&
            verification?.total > 0 &&
            !verification?.allVerified)
        }
        loading={loadingRide}
        bottomInset={insets.bottom + scale(8)}
      />
    </ScreenContainer>
  );
};

export default UpcomingDetailsPage;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
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
});