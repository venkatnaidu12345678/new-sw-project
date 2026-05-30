import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
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
import RequestRelatedRidesSheet from "./ui/RequestRelatedRidesSheet";
import { buildMyRequestDetail } from "../Utils/driverParticipantDetails";
import { formatDisplayTime } from "../Utils/dateUtils";

/* API */
import {
  getMyRequests,
  passengerSendRequestApi,
  courierSendRequestApi,
} from "../ApiService/ridesApiServices";
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

const ROLE_THEME = {
  Passenger: {
    card: ["#ECFDF5", "#F8FAFC", "#FFFFFF"],
    border: "#34D399",
    chip: "#059669",
    statusSoft: "#DCFCE7",
    statusText: "#166534",
    price: "#047857",
  },
  Courier: {
    card: ["#FFF7ED", "#FFFBEB", "#FFFFFF"],
    border: "#FB923C",
    chip: "#EA580C",
    statusSoft: "#FFEDD5",
    statusText: "#C2410C",
    price: "#C2410C",
  },
};

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

const MyRequest = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Passenger");
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [selectedRide, setSelectedRide] = useState(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [popoverLoading, setPopoverLoading] = useState(false);
  const [joiningRideId, setJoiningRideId] = useState(null);

  const tabs = ["Passenger", "Courier"];
  const activeIndex = tabs.indexOf(activeTab);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError("");

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setFetchError("Please sign in again.");
        setRides([]);
        return;
      }
      const res = await getMyRequests(token);

      const isOpenCourierRequest = (item) => {
        const status = String(item?.status || "pending").toLowerCase();
        return status === "pending" || status === "request_to_driver";
      };

      const passenger = (res?.passengerRequests || [])
        .filter(
          (item) =>
            (!item.status || item.status === "pending") &&
            !item.assignedRide
        )
        .map((item) => {
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
              formatDisplayTime(
                item.startTime || item.linkedRide?.startTime
              ) || "--",
            car: driverName,
            seats: item.seats || "-",
            price: `₹${item.amount || 0}`,
            status: item.status || "pending",
            relatedRideCount: countRelatedRides(item),
            raw: item,
          };
        });

      const courier = (res?.courierRequests || [])
        .filter(isOpenCourierRequest)
        .map((item) => ({
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
        }));

      setRides([...passenger, ...courier]);
    } catch (err) {
      console.log("❌ FETCH ERROR:", err.message);
      setFetchError(getApiErrorMessage(err, "Could not load your requests."));
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const nextTab = normalizeRequestTab(route.params?.activeTab, tabs);
      if (nextTab) {
        setActiveTab(nextTab);
      }
      fetchRequests();
    }, [fetchRequests, route.params?.activeTab])
  );

  useMyRequestsSocket(fetchRequests);

  const filteredRides = rides.filter(
    (r) => r.role.toLowerCase() === activeTab.toLowerCase()
  );

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
    setSelectedRide(null);
    setJoiningRideId(null);
  };

  const handleViewRide = (ride) => {
    setPopoverVisible(false);
    setSheetVisible(false);
    setSelectedRide(null);
    navigation.navigate("RideDetails", { ride });
  };

  const handleJoinPassenger = async (ride, requestItem) => {
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
      });
      if (response?.success) {
        Alert.alert(
          response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent",
          response.message || "Your seat request was sent to the driver."
        );
        await fetchRequests();
        closeSheet();
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
        from: ride.from,
        to: ride.to,
        courier_type: raw.courier_type || "parcel",
        what_to_deliver: raw.what_to_deliver || raw.parcel,
        courier_img: raw.courier_img,
        amount_will: raw.amount_will || raw.amount,
        date: deliveryDate,
        receiver_name: recv.name,
        receiver_mobile: recv.mobile,
        receiver_alternate_mobile: recv.alternate_mobile || recv.alternateMobile,
        receiver_address: recv.Address || recv.address,
      });
      if (response?.success) {
        Alert.alert(
          response.bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent",
          response.message || "Courier request sent to the driver."
        );
        await fetchRequests();
        closeSheet();
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

  const handleJoinRide = (ride) => {
    if (!selectedRide) return;
    if (selectedRide.requestKind === "ride_join" || ride.passengerRequestPending) {
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
        onChange={(index) => setActiveTab(tabs[index])}
      />

      <FadePanel activeKey={activeTab}>
        <FlatList
          data={filteredRides}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderRide}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {fetchError ? "" : "No Requests Found"}
            </Text>
          }
          contentContainerStyle={{
            paddingBottom: getScrollBottomPadding(insets.bottom),
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
      </AnimatedLoad>
    </ScreenContainer>
  );
};

export default MyRequest;

/* STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: LAYOUT.spacing.screen,
    paddingBottom: LAYOUT.spacing.sm,
  },

 header: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 16,
},

headerTitle: {
  fontSize: LAYOUT.font.title,
  fontWeight: "800",
  marginLeft: 10,
  color: "#111827",
},

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748B",
    fontSize: 15,
  },

  errorText: {
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
    color: "#DC2626",
    fontSize: 14,
    paddingHorizontal: 16,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.4,
    shadowColor: "#0F172A",
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
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  ridesBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3730A3",
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

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  routeText: {
    marginLeft: 6,
    fontWeight: "700",
    flex: 1,
    color: "#0F172A",
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
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
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
    color: "#475569",
  },

  line: {
    height: 1,
    backgroundColor: "#E5E7EB",
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
    color: "#64748B",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cardBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  cardBtnPrimary: {
    backgroundColor: "#2563EB",
  },
  cardBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
