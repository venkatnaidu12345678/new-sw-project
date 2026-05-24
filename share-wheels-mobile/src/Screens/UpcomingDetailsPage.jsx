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
  driverrejectpassengerrequest
} from "../ApiService/ridesApiServices";
import seat from "../assets/seatIcon.png";
import car from "../assets/car.png";
import dateIcon from "../assets/dateIcon.png";
import priceIcon from "../assets/priceIcon.png";
import clock from "../assets/clock2.png";
import madhapurIcon from "../assets/madhapuricon.png";
import kondapurIcon from "../assets/kondapuricon.png";
import lineIcon from "../assets/lineicon.png";
import profileIcon from "../assets/profile.png";
import caricon from "../assets/caricon.png";
import courier from "../assets/courier.png"
import { useRoute, useNavigation } from "@react-navigation/native";
import { convertDate, convertTime } from '../Utils'
import { getRideDisplayFare, getPassengerFare, getCourierFare } from '../Utils/fareUtils'
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from "react-native";
const UpcomingDetailsPage = ({ route }) => {
  const navigation = useNavigation();
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
  const [rideStatus, setRideStatus] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(true);


  const roleColor = isDriver ? "#007AFF" : isCourier ? "#F59E0B" : "#10B981";

  const openRideChat = () => {
    navigation.navigate("RideChat", {
      rideId: rideData?._id,
      rideTitle: `${rideData?.from} → ${rideData?.to}`,
      myRole: isDriver ? "driver" : "passenger",
      rideStatus: rideStatus || rideData?.status,
    });
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
        setCourierRequests(res?.data?.users_request_Couriers)
        setRideStatus(res?.data?.status)
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


  const handleStartRide = async () => {
    if (rideActionLoading || rideStatus === "started") return;

    try {
      setLoadingRide(true);

      const token = await AsyncStorage.getItem("token");

      const response = await startride(token, {
        rideId: rideData._id,
      });

      if (response?.success) {
        setRideStatus("started"); // ✅ update status
        Alert.alert("Success", response.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoadingRide(false);
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
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
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
            onPress={() => setActiveSlider("otp")}
          >
            <Text style={[styles.otpText, { color: roleColor }]}>
              Enter OTP
            </Text>
          </TouchableOpacity>
        )}

        {(isDriver || role === "passenger") && (
          <TouchableOpacity
            style={[styles.otpButton, { borderColor: "#2563EB", marginLeft: 8 }]}
            onPress={openRideChat}
          >
            <Text style={[styles.otpText, { color: "#2563EB" }]}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 📜 SCROLLABLE CONTENT */}
      <ScrollView
        contentContainerStyle={{
          padding: 2,
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
      >

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
                    <Image
                      source={
                        item?.userId?.profile_img
                          ? { uri: item.userId.profile_img }
                          : profileIcon
                      }
                      style={styles.avatarLg}
                    />

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.name}>
                        {item?.userId?.name || "Passenger"}
                      </Text>

                      <Text style={styles.pickup}>
                        {item?.userId?.email || "No email"}
                      </Text>

                      <Text style={styles.pickup}>
                        Pickup: {rideData?.from}
                      </Text>
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.callButton}>
                          <Text style={styles.callText}>Call</Text>
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
                    <Image
                      source={
                        item?.userId?.profile_img
                          ? { uri: item.userId.profile_img }
                          : profileIcon
                      }
                      style={styles.avatarLg}
                    />

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.name}>
                        {item?.userId?.name || "Courier"}
                      </Text>

                      <Text style={styles.pickup}>
                        {item?.userId?.email || "No email"}
                      </Text>

                      <Text style={styles.pickup}>
                        Parcel: {item?.weight || "N/A"} kg
                      </Text>

                      {/* ✅ SAME BUTTONS LIKE PASSENGER */}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.callButton}>
                          <Text style={styles.callText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveCourier(item._id)}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>

                        {/* OPTIONAL REMOVE BUTTON */}
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
                      <Image
                        source={
                          item?.userId?.profile_img
                            ? { uri: item.userId.profile_img }
                            : profileIcon
                        }
                        style={styles.requestAvatar}
                      />

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
                  <Image
                    source={
                      user?.profile_img
                        ? { uri: user.profile_img }
                        : profileIcon
                    }
                    style={styles.requestAvatar}
                  />

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
                <Image
                  source={
                    rideData?.creator?.profile_img
                      ? { uri: rideData.creator.profile_img }
                      : profileIcon
                  }
                  style={styles.avatarLg}
                />

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
                <Image
                  source={
                    rideData?.creator?.profile_img
                      ? { uri: rideData.creator.profile_img }
                      : profileIcon
                  }
                  style={styles.avatarLg}
                />

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
              </View>
            </View>

            {/* Parcel Info */}
            <Text style={styles.section}>Your Parcel</Text>

            {couriers.map((item, index) => (
              <View key={index} style={styles.myPassengerCard}>
                <View style={styles.myRow}>
                  <Image source={profileIcon} style={styles.avatarLg} />

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
                  <Image
                    source={
                      item?.userId?.profile_img
                        ? { uri: item.userId.profile_img }
                        : profileIcon
                    }
                    style={styles.avatarLg}
                  />

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
        height={activeSlider === "otp" ? 200 : 100}
      >

        {/* OTP */}
        {activeSlider === "otp" && (
          <OtpModel  // ✅ use UI version (NOT modal)
            passengerName="John Doe"
            onVerify={(otp) => {
              console.log("OTP:", otp);
              setActiveSlider(null);
            }}
          />
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
        disabled={!rideStatus || rideStatus === "completed" || loadingRide}
      />
    </View>
  );
};

export default UpcomingDetailsPage;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 20,
  },

  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
  },

  roleText: { fontWeight: "700" },

  otpButton: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
  },

  otpText: { fontWeight: "700" },

  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
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
    fontSize: 18,
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