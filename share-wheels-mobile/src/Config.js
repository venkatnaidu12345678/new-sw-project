import { Platform } from "react-native";

/**
 * Local backend connection
 * ─────────────────────────────────────────────────────────────
 * Physical Android phone (same Wi‑Fi): set LAN_HOST to your PC IP (ipconfig).
 * Android emulator: set USE_ANDROID_EMULATOR = true (uses 10.0.2.2).
 * iOS simulator: uses localhost automatically.
 */
export const LAN_HOST = "192.168.0.116";
const API_PORT = 3001;

/** true = emulator (10.0.2.2) | false = physical phone on same Wi‑Fi (LAN_HOST) */
export const USE_ANDROID_EMULATOR = false;

/** true = http://YOUR_PC:3001 | false = production Render URL */
export const USE_LOCAL_BACKEND = __DEV__;

const PRODUCTION_URL = "https://share-wheels-backend-m3wp.onrender.com";

const resolveLocalBaseUrl = () => {
  if (Platform.OS === "android") {
    const host = USE_ANDROID_EMULATOR ? "10.0.2.2" : LAN_HOST;
    return `http://${host}:${API_PORT}`;
  }
  // iOS Simulator → localhost; physical iPhone → set USE_IOS_SIMULATOR = false
  const USE_IOS_SIMULATOR = true;
  const host = USE_IOS_SIMULATOR ? "localhost" : LAN_HOST;
  return `http://${host}:${API_PORT}`;
};

export const baseUrl = USE_LOCAL_BACKEND
  ? resolveLocalBaseUrl()
  : PRODUCTION_URL;

if (__DEV__) {
  console.log("[ShareWheels] API baseUrl:", baseUrl);
}

export const endPoints = {
  signup: "/auth/register",
  login: "/auth/login",
  verifyOtp: "/auth/verify-otp",
  verifyToken: "/auth/verify-token",
  upcomingRideurl: "/rides/upcoming-rides",
  createRideurl: "/rides/create-ride",
  driveracceptspassengerrequesturl:
    "/driver-rides/driver-accept-passenger-request",
  acceptCourierurl: "/courier/accept-courier",
  driverrejectpassengerrequesturl:
    "/driver-rides/driver-reject-passenger-request",
  driverrejectcourierrequesturl: "/courier/reject-courier",
  rideDetailsurl: "/rides/ride-details",
  removepassengerurl: "/driver-rides/driver-remove-passenger",
  removeCourierurl: "/courier/remove-delivery",
  startrideurl: "/driver-rides/start-ride",
  updateRideSeatsurl: "/driver-rides/update-seats",
  updateRideOptionsurl: "/driver-rides/update-ride-options",
  createpassengerrequesturl: "/passenger-rides/create-passenger-request",
  courierRequesturl: "/courier/create-courier-request",
  getallridesurl: "/rides/get-rides",
  enrouteRequesturl: "/driver-rides/enroute-requests",
  endRideurl: "/driver-rides/end-ride",
  rideHistoryurl: "/rides/history-rides",
  userProfileurl: "/auth/user-profile",
  userTermsurl: "/auth/user/terms",
  pickPassengerCourierurl: "/courier/driver/pick-courier-passenger",
  getMyRequestsurl: "/rides/my-requests",
  uploadImageurl: "/auth/upload-image",
  AddVechileurl: "/auth/add-vehicle",
  editVechileurl: "/auth/edit-vehicle",
  pickupCourierurl: "/driver-rides/driver/pick-courier",
  pickupPassengerurl: "/passenger-rides/driver/pick-passenger",
  passengerSendRequesturl: "/rides/passenger/send-request",
  courierSendRequesturl: "/courier/request-courier",
  supportContexturl: "/support/context",
  supportChaturl: "/support/chat",
  supportSnapshoturl: "/support/snapshot",
  verificationParticipantsurl: "/driver-rides",
  verifyParticipanturl: "/driver-rides",
  activeAdsurl: "/ads/active",
  activeLocationsurl: "/locations/active",
  feedbackurl: "/feedback",
  notificationsurl: "/notifications",
  registerFcmTokenurl: "/auth/register-fcm-token",
  legalPoliciesurl: "/legal/policies",
};
