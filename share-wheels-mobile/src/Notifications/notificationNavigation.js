import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUpcomingRides } from "../ApiService/ridesApiServices";

const RIDE_TYPES = new Set([
  "ride_accept",
  "ride_reject",
  "ride_removed",
  "passenger_request",
  "passenger_joined",
  "courier_request",
  "courier_joined",
  "courier_assigned",
  "ride_cancelled",
  "ride_postponed",
  "ride_started",
  "ride_completed",
  "ride_expired",
  "boarding_otp_issued",
  "boarding_otp_updated",
  "boarding_otp_verified",
]);

/**
 * Resolve navigation target from FCM data payload.
 */
export function parseNotificationPayload(remoteMessage) {
  const data = remoteMessage?.data || {};
  return {
    type: data.type || "general",
    rideId: data.rideId,
    peerId: data.peerId,
    peerName: data.peerName,
    peerRole: data.peerRole,
    peerProfileImg: data.senderAvatar || data.peerProfileImg,
    notificationId: data.notificationId,
    title: remoteMessage?.notification?.title || data.title,
    body: remoteMessage?.notification?.body || data.body,
  };
}

async function findRideForUser(rideId) {
  const token = await AsyncStorage.getItem("token");
  if (!token || !rideId) return null;
  try {
    const res = await getUpcomingRides(token);
    const list = res?.rides || [];
    return list.find(
      (r) => (r._id || r.id)?.toString() === rideId.toString()
    );
  } catch {
    return null;
  }
}

/**
 * Navigate from a notification tap (background, quit, or foreground).
 */
export async function handleNotificationOpen(navigation, remoteMessage) {
  if (!navigation?.isReady?.() && !navigation?.navigate) return;

  const payload = parseNotificationPayload(remoteMessage);
  const { type, rideId, peerId, peerName, peerRole, peerProfileImg } = payload;

  if (type === "chat_message" && rideId && peerId) {
    navigation.navigate("RideChat", {
      rideId,
      peerId,
      peerName: peerName || "Chat",
      peerRole: peerRole || "passenger",
      peerProfileImg,
      rideTitle: "Ride chat",
    });
    return;
  }

  if (rideId && RIDE_TYPES.has(type)) {
    const ride = await findRideForUser(rideId);
    if (ride) {
      navigation.navigate("Navigator", {
        screen: "Home",
        params: {
          screen: "UpcomingDetailsPage",
          params: { rideData: ride },
        },
      });
      return;
    }
  }

  navigation.navigate("NotificationScreen");
}
