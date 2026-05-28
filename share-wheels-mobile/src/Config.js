import Env from "react-native-config";

const PRODUCTION_URL =
  Env.PRODUCTION_URL || "https://share-wheels-backend-m3wp.onrender.com";

export const baseUrl = PRODUCTION_URL;

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
