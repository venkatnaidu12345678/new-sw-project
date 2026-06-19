import { Platform } from "react-native";
import Env from "react-native-config";
import { DEV_API_URL } from "./devConfig";

const trimUrl = (url) => (url ? String(url).trim().replace(/\/$/, "") : "");

const PRODUCTION_URL =
  trimUrl(Env.PRODUCTION_URL) || "https://sharewheels-backend.onrender.com";

/** Android emulator → host machine. iOS simulator → localhost. */
const getPlatformDefaultLocalUrl = () => {
  if (Platform.OS === "android") {
    const model = String(Platform.constants?.Model || "");
    const fingerprint = String(Platform.constants?.Fingerprint || "");
    const isEmulator =
      /sdk|emulator|google_sdk|Android SDK built for x86/i.test(model) ||
      /generic|sdk|emulator|ranchu|goldfish/i.test(fingerprint);
    if (isEmulator) return "http://10.0.2.2:3001";
    // Physical device: localhost only works with `npm run adb:reverse`
    return "http://localhost:3001";
  }
  return "http://localhost:3001";
};

const envLocalFlag = String(Env.USE_LOCAL_BACKEND || "").toLowerCase();
const useLocalBackend =
  __DEV__ && envLocalFlag !== "false" && envLocalFlag !== "0";

const resolveLocalBaseUrl = () => {
  // 1) .env (react-native-config, set at native build)
  const fromEnv = trimUrl(Env.LOCAL_API_URL);
  if (fromEnv) return fromEnv;

  // 2) devConfig.js override (Metro reload, no rebuild)
  const fromDev = trimUrl(DEV_API_URL);
  if (fromDev) return fromDev;

  // 3) Platform fallback
  return getPlatformDefaultLocalUrl();
};

export const baseUrl = useLocalBackend ? resolveLocalBaseUrl() : PRODUCTION_URL;

export const getApiConnectionHint = () => {
  if (!useLocalBackend) {
    return `Using remote API: ${baseUrl}`;
  }
  if (Platform.OS === "android" && /localhost|127\.0\.0\.1/.test(baseUrl)) {
    return (
      "Using localhost on a device requires USB debugging and:\n" +
      "  npm run adb:reverse\n" +
      "Or set LOCAL_API_URL in .env to your PC IP (npm run dev:ip), then rebuild the app."
    );
  }
  if (Platform.OS === "android" && baseUrl.includes("10.0.2.2")) {
    return "Emulator URL (10.0.2.2). On a physical phone, set LOCAL_API_URL to your PC Wi‑Fi IP in .env.";
  }
  return `Local API: ${baseUrl} — ensure Share-wheels-backend is running on port 3001.`;
};

if (__DEV__) {
  console.log("[ShareWheels] API baseUrl:", baseUrl, useLocalBackend ? "(local)" : "(remote)");
  console.log("[ShareWheels]", getApiConnectionHint());
}

export const endPoints = {
  signup: "/auth/register",
  login: "/auth/login",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  changePassword: "/auth/change-password",
  verifyOtp: "/auth/verify-otp",
  verifyToken: "/auth/verify-token",
  upcomingRideurl: "/rides/upcoming-rides",
  createRideurl: "/rides/create-ride",
  cancelRideurl: "/rides/ride/cancel",
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
  getMyPassengerRequestsurl: "/rides/my-passenger-requests",
  getMyCourierRequestsurl: "/rides/my-courier-requests",
  deleteMyPassengerRequesturl: "/rides/my-passenger-requests",
  deleteMyCourierRequesturl: "/rides/my-courier-requests",
  updateMyPassengerRequesturl: "/rides/my-passenger-requests",
  updateMyCourierRequesturl: "/rides/my-courier-requests",
  uploadImageurl: "/auth/upload-image",
  AddVechileurl: "/auth/add-vehicle",
  editVechileurl: "/auth/edit-vehicle",
  pickupCourierurl: "/driver-rides/driver/pick-courier",
  pickupPassengerurl: "/passenger-rides/driver/pick-passenger",
  passengerSendRequesturl: "/rides/passenger/send-request",
  segmentFareurl: "/rides/segment-fare",
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
  clearFcmTokenurl: "/auth/clear-fcm-token",
  pushStatusurl: "/auth/push-status",
  legalPoliciesurl: "/legal/policies",
  subscriptionPlansurl: "/subscriptions/plans",
  mySubscriptionurl: "/subscriptions/me",
  subscribePlanurl: "/subscriptions/subscribe",
  subscriptionCreateOrderurl: "/subscriptions/create-order",
  subscriptionVerifyPaymenturl: "/subscriptions/verify-payment",
  fareQuoteurl: "/fare/quote",
  fareRulesurl: "/fare/rules",
  scanVehicleDocumenturl: "/auth/scan-vehicle-document",
};
