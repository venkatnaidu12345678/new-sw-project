import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  UIManager,
  LayoutAnimation,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { launchCamera } from "react-native-image-picker";
import { courierSendRequestApi,
  passengerSendRequestApi,
 } from "../ApiService/ridesApiServices";
/* 🔹 ICON IMPORTS */
import backIcon from "../assets/backicon.png";
import calendarIcon from "../assets/calender.png";
import startIcon from "../assets/locationstart.png";
import endIcon from "../assets/locationend.png";
import passengerIcon from "../assets/toicon.png";
import seatsicon from "../assets/person.png";
import person from "../assets/upcomingperson.png"
import courierIcon from "../assets/courier.png";
import noSmokingIcon from "../assets/nosmokingicon.png";
import noPetsIcon from "../assets/nowithpets.png";
import bookingInfoIcon from "../assets/yourbookingicon.png";
import verifiedProfileIcon from "../assets/verifiedprofile.png";
import neverCancelIcon from "../assets/nevercancelrideicon.png";
import UserAvatar from "./ui/UserAvatar";
import VehicleInfoStrip from "./VehicleInfoStrip";
import KeyboardAwareScreen from "./ui/KeyboardAwareScreen";
import ScreenContainer from "./ui/ScreenContainer";
import ScreenHeader from "./ui/ScreenHeader";
import { formatDisplayTime } from "../Utils/dateUtils";
import { LAYOUT } from "../theme/layout";
import { profileData } from "../Navigation/AuthNavigator";

// LayoutAnimation on Android New Architecture does not need this (no-op when enabled).
const isBridgeless =
  typeof global !== "undefined" &&
  (global.RN$Bridgeless === true || global.__turboModuleProxy != null);

if (
  Platform.OS === "android" &&
  !isBridgeless &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const refUserId = (ref) =>
  ref?._id?.toString?.() || ref?.toString?.() || "";

const RideDetails = ({ navigation, route }) => {
  const { ride } = route.params || {};
  const { input } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { ProfileDetails } = profileData();
  const myUserId = refUserId(
    ProfileDetails?._id ||
      ProfileDetails?.id ||
      ProfileDetails?.data?.personalInfo?._id ||
      ProfileDetails?.data?.personalInfo?.id
  );
  const isOwnRide =
    !!myUserId && !!ride?.creator && refUserId(ride.creator) === myUserId;

  /* 🔹 ACCORDION */
  const [showPassenger, setShowPassenger] = useState(true);
  const [showCourier, setShowCourier] = useState(true);

  /* 🔹 PASSENGER */
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);

  const maxSeats = Math.max(0, Number(ride?.availableSeats) || 0);
  const seatFare = Number(ride?.ride_amount) || 0;
  const totalFare = seatFare * seats;
  const quickReserve = !!ride?.QuickReserve;
  const canCarryCourier = !!ride?.CanCarryCourier;

  /* 🔹 COURIER */
  const [courierData, setCourierData] = useState({
    courier_type: "",
    what_to_deliver: "",
    courier_img: "",
    amount_will: "",
    startDate: "",
    endDate: "",
    timeSlot: "",
    receiver_name: "",
    receiver_mobile: "",
    receiver_alternate_mobile: "",
    receiver_address: "",
  });

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [timeSlot, setTimeSlot] = useState(new Date());

  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showTimeSlot, setShowTimeSlot] = useState(false);

  if (!ride) {
    return (
      <View style={styles.center}>
        <Text>No ride data found</Text>
      </View>
    );
  }

  const rideDate = ride?.date ? new Date(ride.date) : null;
  const formattedRideDate = rideDate
    ? rideDate.toDateString()
    : "Date not available";

  const formattedRideTime = formatDisplayTime(ride?.startTime || rideDate) || "N/A";

  const formattedTime = formatDisplayTime(time) || "N/A";

  /* 🔹 TOGGLE */
  const togglePassenger = () => {
    LayoutAnimation.easeInEaseOut();
    setShowPassenger(!showPassenger);
  };

  const toggleCourier = () => {
    LayoutAnimation.easeInEaseOut();
    setShowCourier(!showCourier);
  };

  /* 🔹 SEATS */
  const increaseSeats = () => {
    if (seats < maxSeats) setSeats(seats + 1);
  };

  const decreaseSeats = () => {
    if (seats > 1) setSeats(seats - 1);
  };

  useEffect(() => {
    if (maxSeats > 0 && seats > maxSeats) setSeats(maxSeats);
  }, [maxSeats, seats]);

  /* 🔹 INPUT */
  const handleCourierChange = (key, value) => {
    setCourierData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /* 🔹 CAMERA */
  const openCamera = () => {
    launchCamera(
      { mediaType: "photo", quality: 0.8, includeBase64: false },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        const asset = res.assets?.[0];
        if (!asset?.uri) return;
        setCourierData((prev) => ({
          ...prev,
          courier_img: {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || "courier.jpg",
          },
        }));
      }
    );
  };
  const handleBookPassenger = async () => {
    if (booking) return;
    if (isOwnRide) {
      Alert.alert(
        "Your ride",
        "You are the driver for this ride. You cannot book as a passenger on your own trip."
      );
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Sign in required", "Please log in to book a seat.");
        return;
      }

      if (maxSeats < 1) {
        Alert.alert("No seats", "This ride has no seats available.");
        return;
      }

      setBooking(true);
      const response = await passengerSendRequestApi(token, {
        rideId: ride._id,
        requires_seats: seats,
      });

      if (response?.success) {
        const title =
          response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
        Alert.alert(
          title,
          response.message ||
            `Your request for ${seats} seat(s) (₹${response.calculated_amount ?? totalFare}) was sent to the driver.`,
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Navigator", { screen: "Home" }),
            },
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          "Booking failed",
          getApiErrorMessage(response, "Could not send your booking request.")
        );
      }
    } catch (error) {
      Alert.alert("Booking failed", getApiErrorMessage(error));
    } finally {
      setBooking(false);
    }
  };
  const handleBookCourier = async () => {
    if (isOwnRide) {
      Alert.alert(
        "Your ride",
        "You are the driver for this ride. Couriers cannot be added by the driver on the same trip."
      );
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      // ✅ validation
      if (
        !courierData.courier_type ||
        !courierData.what_to_deliver ||
        !courierData.amount_will ||
        !courierData.receiver_name ||
        !courierData.receiver_mobile ||
        !courierData.receiver_alternate_mobile ||
        !courierData.receiver_address
      ) {
        Alert.alert("Error", "Please fill all fields");
        return;
      }

      if (!courierData.courier_img) {
        Alert.alert("Error", "Upload image first");
        return;
      }

      const payload = {
        rideId: ride?._id,
        from: ride?.from,
        to: ride?.to,
        courier_type: courierData.courier_type,
        what_to_deliver: courierData.what_to_deliver,
        courier_img: courierData.courier_img,
        amount_will: courierData.amount_will,
        date: startDate.toISOString(),
        timeSlot: timeSlot.toISOString(),
        receiver_name: courierData.receiver_name,
        receiver_mobile: courierData.receiver_mobile,
        receiver_alternate_mobile:
          courierData.receiver_alternate_mobile,
        receiver_address: courierData.receiver_address,
      };

      console.log("📦 Payload:", payload);

      const response = await courierSendRequestApi(token, payload);

      console.log("📦 Response:", response);

      if (response?.success) {
      const courierTitle =
        response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
      Alert.alert(
        courierTitle,
        response.message || "Courier booked successfully",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Navigator", { screen: "Home" });
            },
          },
        ],
        { cancelable: false }
      );
        // reset form
        setCourierData({
          courier_type: "",
          what_to_deliver: "",
          courier_img: "",
          amount_will: "",
          receiver_name: "",
          receiver_mobile: "",
          receiver_alternate_mobile: "",
          receiver_address: "",
        });
      } else {
        Alert.alert(
          "Booking failed",
          getApiErrorMessage(response, "Courier booking failed.")
        );
      }
    } catch (error) {
      Alert.alert("Booking failed", getApiErrorMessage(error));
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom"]}>
      <ScreenHeader title="Ride Details " style={styles.fixedHeader} />
      <KeyboardAwareScreen style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >

        {/* DATE */}
        <View style={styles.dateRow}>
          <Image source={calendarIcon} style={styles.smallIcon} />
          <Text style={styles.dateText}>{formattedRideDate}</Text>
        </View>

        {/* ROUTE */}
        <View style={styles.card}>
          <View style={styles.routeRow}>
            <Image source={startIcon} style={styles.routeIcon} />
            <Text style={styles.city}>{ride.from || "N/A"}</Text>
            <Text style={styles.time}>{formattedRideTime}</Text>
          </View>

          <View style={styles.verticalLine} />

          <View style={styles.routeRow}>
            <Image source={endIcon} style={styles.routeIcon} />
            <Text style={styles.city}>{ride.to || "N/A"}</Text>
          </View>
        </View>

        {/* PRICE */}
        <View style={styles.priceRow}>
          <View style={styles.passengerRow}>
            <Image source={passengerIcon} style={styles.passengerIcon} />
            <Text style={styles.passengerText}>
              {maxSeats} seat{maxSeats !== 1 ? "s" : ""} available
            </Text>
          </View>
          <Text style={styles.price}>₹{seatFare}/seat</Text>
        </View>

        {/* DRIVER */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <UserAvatar user={ride?.creator} size={48} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>
                {ride?.creator?.name || "Driver"}
              </Text>
              <Text style={styles.verified}>Verified</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Image source={verifiedProfileIcon} style={styles.infoIcon} />
            <Text style={styles.infoText}>Verified Profile</Text>
          </View>

          <View style={styles.infoRow}>
            <Image source={neverCancelIcon} style={styles.infoIcon} />
            <Text style={styles.infoText}>Never cancels rides</Text>
          </View>

          {ride?.vehicle ? (
            <VehicleInfoStrip vehicle={ride.vehicle} compact />
          ) : null}
        </View>

        {isOwnRide ? (
          <View style={[styles.warningBox, styles.ownRideBox]}>
            <Image source={bookingInfoIcon} style={styles.infoIcon} />
            <Text style={styles.ownRideText}>
              This is your ride as the driver. Manage passengers from Upcoming Rides — you cannot book yourself as a passenger.
            </Text>
          </View>
        ) : quickReserve ? (
          <View style={[styles.warningBox, styles.quickReserveBox]}>
            <Image source={bookingInfoIcon} style={styles.infoIcon} />
            <Text style={styles.quickReserveText}>
              Quick Reserve — your booking is confirmed instantly (no driver approval needed).
            </Text>
          </View>
        ) : (
          <View style={styles.warningBox}>
            <Image source={bookingInfoIcon} style={styles.infoIcon} />
            <Text style={styles.warningText}>
              Driver must approve your booking before you are on the ride.
            </Text>
          </View>
        )}

        {/* PREFERENCES */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ride Preferences</Text>
          <View style={styles.prefRow}>
            <Image source={noSmokingIcon} style={styles.prefIcon} />
            <Text>No smoking</Text>
          </View>
          <View style={styles.prefRow}>
            <Image source={noPetsIcon} style={styles.prefIcon} />
            <Text>No pets</Text>
          </View>
        </View>

        {!isOwnRide && (
        <>
        {/* PASSENGER */}
        <TouchableOpacity style={styles.accordionHeader} onPress={togglePassenger}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={person} style={styles.courierIcon} />
          <Text style={styles.accordionTitle}>Passenger Booking</Text>
             </View>
          <Text>{showPassenger ? "−" : "+"}</Text>
        
        </TouchableOpacity>

        {showPassenger && (
          <View style={styles.accordionContent}> 
            <View style={styles.seatBox}>
              <Image source={seatsicon} style={styles.courierIcon} />
              <TouchableOpacity onPress={decreaseSeats} disabled={seats <= 1}>
                <Text style={[styles.seatBtn, seats <= 1 && styles.seatBtnDisabled]}>−</Text>
              </TouchableOpacity>

              <Text style={styles.seatCount}>
                {maxSeats < 1
                  ? "No seats left"
                  : `${seats} / ${maxSeats} seat${maxSeats !== 1 ? "s" : ""}`}
              </Text>

              <TouchableOpacity onPress={increaseSeats} disabled={seats >= maxSeats}>
                <Text style={[styles.seatBtn, seats >= maxSeats && styles.seatBtnDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fareHint}>
              Total: ₹{totalFare} ({seats} × ₹{seatFare})
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, booking && styles.primaryBtnDisabled]}
              onPress={handleBookPassenger}
              disabled={booking || maxSeats < 1}
            >
              <Text style={styles.btnText}>
                {booking ? "Sending…" : "Book Passenger"}
              </Text>
            </TouchableOpacity>
            
          </View>
        )}

        {canCarryCourier && (
        <>
        <TouchableOpacity style={styles.accordionHeader} onPress={toggleCourier}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={courierIcon} style={styles.courierIcon} />
            <Text style={styles.accordionTitle}>Courier Booking</Text>
          </View>
          <Text>{showCourier ? "−" : "+"}</Text>
        </TouchableOpacity>

        {showCourier && (
          <View style={styles.accordionContent}>

            <TextInput
              placeholder="Courier type (e.g. document, parcel)"
              placeholderTextColor={input.placeholder}
              style={styles.input}
              onChangeText={(v) => handleCourierChange("courier_type", v)}
            />

            <TextInput
              placeholder="What to deliver"
              placeholderTextColor={input.placeholder}
              style={styles.input}
              onChangeText={(v) => handleCourierChange("what_to_deliver", v)}
            />

            <TextInput
              placeholder="Declared value (₹)"
              placeholderTextColor={input.placeholder}
              keyboardType="numeric"
              style={styles.input}
              onChangeText={(v) => handleCourierChange("amount_will", v)}
            />

            <TouchableOpacity style={styles.imageUpload} onPress={openCamera}>
              <Text style={styles.imageUploadText}>📸 Upload Image</Text>
            </TouchableOpacity>

            {courierData.courier_img && (
              <Image
                source={{
                  uri:
                    courierData.courier_img?.uri ||
                    courierData.courier_img,
                }}
                style={styles.previewImage}
              />
            )}

            <TextInput
              placeholder="Receiver full name"
              placeholderTextColor={input.placeholder}
              style={styles.input}
              onChangeText={(v) => handleCourierChange("receiver_name", v)}
            />

            <TextInput
              placeholder="Receiver mobile"
              placeholderTextColor={input.placeholder}
              keyboardType="phone-pad"
              style={styles.input}
              onChangeText={(v) => handleCourierChange("receiver_mobile", v)}
            />

            <TextInput
              placeholder="Alternate mobile"
              placeholderTextColor={input.placeholder}
              keyboardType="phone-pad"
              style={styles.input}
              onChangeText={(v) => handleCourierChange("receiver_alternate_mobile", v)}
            />

            <TextInput
              placeholder="Full delivery address"
              placeholderTextColor={input.placeholder}
              multiline
              style={styles.input}
              onChangeText={(v) => handleCourierChange("receiver_address", v)}
            />

            <TouchableOpacity style={styles.primaryBtn}onPress={handleBookCourier}>
              <Text style={styles.btnText}>Book Courier</Text>
            </TouchableOpacity>
            

          </View>
        )}
        </>
        )}
        </>
        )}

      </ScrollView>
    </KeyboardAwareScreen>
    </ScreenContainer>
  );
};

export default RideDetails;

const createStyles = (c) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  fixedHeader: {
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingTop: LAYOUT.spacing.xs,
    marginBottom: LAYOUT.spacing.xs,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingBottom: 32,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 14, paddingTop: 8 },
  backIcon: { width: 24, height: 24 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "600", marginLeft: 10 },
  dateRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  smallIcon: { width: 16, height: 16, marginRight: 6 },
  dateText: { color: c.textSecondary },
  card: { backgroundColor: c.card, margin: 16, padding: 16, borderRadius: 16 },
  routeRow: { flexDirection: "row", alignItems: "center" },
  routeIcon: { width: 16, height: 16, marginRight: 10 },
  verticalLine: { height: 40, width: 2, backgroundColor: c.border, marginLeft: 7, marginVertical: 6 },
  city: { fontWeight: "600", flex: 1, color: c.text },
  time: { color: c.primary },
  priceRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: c.primaryMuted, marginHorizontal: 16, padding: 16, borderRadius: 14 },
  passengerRow: { flexDirection: "row", alignItems: "center" },
  passengerIcon: { width: 20, height: 20, marginRight: 8 },
  passengerText: { fontWeight: "600", color: c.text },
  price: { fontSize: LAYOUT.font.title, fontWeight: "700", color: c.primary },
  driverRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  driverName: { fontWeight: "600", color: c.text },
  verified: { color: "green", fontSize: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  infoIcon: { width: 22, height: 22, marginRight: 8 },
  infoText: { color: c.textSecondary },
  warningBox: { flexDirection: "row", backgroundColor: c.warningBg, marginHorizontal: 16, padding: 12, borderRadius: 12, alignItems: "center" },
  warningText: { flex: 1, marginLeft: 10, color: c.warningText },
  quickReserveBox: { backgroundColor: c.successBg },
  quickReserveText: { flex: 1, marginLeft: 10, color: c.successText, fontWeight: "600" },
  ownRideBox: { backgroundColor: c.infoBg },
  ownRideText: { flex: 1, marginLeft: 10, color: c.infoText, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: c.text },
  prefRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  prefIcon: { width: 22, height: 22, marginRight: 8 },
 accordionHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: c.surface,
  padding: 14,
  marginHorizontal: 16,
  borderRadius: 14,
  marginBottom: 8,

  // 🔹 SHADOW (iOS)
  shadowColor: c.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,

  // 🔹 ELEVATION (Android)
  elevation: 3,
},
  accordionTitle: { fontWeight: "600", fontSize: 16, color: c.text },
  accordionContent: {
  marginHorizontal: 16,
  marginBottom: 12,
  backgroundColor: c.surface,
  borderRadius: 14,
  padding: 14,

  // 🔹 SHADOW
  shadowColor: c.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
},
  input: {
    backgroundColor: c.inputBg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    color: c.text,
    fontSize: 15,
  },
  seatBox: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: c.card, padding: 10, borderRadius: 10, marginBottom: 20,marginTop:10 },
  seatBtn: { fontSize: 22, paddingHorizontal: 10 },
  seatCount: { fontSize: 16, fontWeight: "600", minWidth: 100, textAlign: "center" },
  seatBtnDisabled: { opacity: 0.35 },
  fareHint: {
    textAlign: "center",
    color: c.textMuted,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  courierIcon: { width: 20, height: 20, marginRight: 8 },
  imageUpload: { backgroundColor: c.primaryMuted, padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 12 },
  imageUploadText: { color: c.primary, fontWeight: "600" },
  previewImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
  primaryBtn: { backgroundColor: c.primary, padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: c.inverseText, fontWeight: "600" },
});
