import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ICONS */
import calendarIcon from "../assets/dateIcon.png";
import clockIcon from "../assets/clock1.png";
import locationIcon from "../assets/toicon.png";
import seatIcon from "../assets/person.png";
import carIcon from "../assets/caricon1.png";
import BackButton from "../Components/BackButton";
/* COMPONENTS */
import RequestDetailPopover from "./ui/RequestDetailPopover";
import { buildMyRequestDetail } from "../Utils/driverParticipantDetails";

/* API */
import { getMyRequests } from "../ApiService/ridesApiServices";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { formatRequestDate } from "../Utils";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AnimatedTabs from "./ui/AnimatedTabs";
import FadePanel from "./ui/FadePanel";
import { useFocusEffect } from "@react-navigation/native";
import { useMyRequestsSocket } from "../hooks/useAppSocket";
import ScreenContainer from "./ui/ScreenContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";

const resolveRequestDate = (item) => {
  const primary = formatRequestDate(item?.date);
  if (primary !== "N/A") return primary;
  return formatRequestDate(item?.requestedAt || item?.createdAt);
};

const MyRequest = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Passenger");
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [selectedRide, setSelectedRide] = useState(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverLoading, setPopoverLoading] = useState(false);

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

      /* ✅ PASSENGER — only open / unassigned requests */
      const passenger = (res?.passengerRequests || [])
        .filter(
          (item) =>
            (!item.status || item.status === "pending") &&
            !item.assignedRide
        )
        .map((item) => ({
          id: item.requestId,
          role: "Passenger",
          from: item.from,
          to: item.to,
          date: resolveRequestDate(item),
          time: item.startTime || "--",
          car: item.driver?.name || "—",
          seats: item.seats || "-",
          price: `₹${item.amount || 0}`,
          status: item.status || "pending",
          raw: item,
      }));

      /* ✅ COURIER — hide once a driver has picked the parcel */
      const courier = (res?.courierRequests || [])
        .filter(
          (item) =>
            ["pending", "request_to_driver"].includes(item.status) &&
            !item.assignedRide
        )
        .map((item) => ({
          id: item.requestId,
          role: "Courier",
          from: item.from,
          to: item.to,
          date: resolveRequestDate(item),
          time: item.timeSlot || "--",
          car: item.courierNumber || item.receiver?.name || "Courier",
          seats: item.parcel || item.what_to_deliver || "-",
          price: `₹${item.amount || 0}`,
          status: item.status || "pending",
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
      fetchRequests();
    }, [fetchRequests])
  );

  useMyRequestsSocket(fetchRequests);

  const getBorderColor = (role) =>
    role === "Passenger" ? "#16A34A" : "#F97316";

  const filteredRides = rides.filter(
    (r) => r.role.toLowerCase() === activeTab.toLowerCase()
  );

  const handleRidePress = (ride) => {
    setSelectedRide(buildMyRequestDetail(ride));
    setPopoverVisible(true);
    setPopoverLoading(true);
    requestAnimationFrame(() => {
      setTimeout(() => setPopoverLoading(false), 180);
    });
  };

  const closePopover = () => {
    setPopoverVisible(false);
    setPopoverLoading(false);
    setSelectedRide(null);
  };

  const renderRide = ({ item }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => handleRidePress(item)}>
      <LinearGradient
        colors={["#F1F5F9", "#F8FAFC"]}
        style={[
          styles.card,
          { borderColor: getBorderColor(item.role) },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.roleChip(item.role)}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>

          <View style={styles.statusChip(item.role)}>
            <Text style={styles.statusText(item.role)}>
              {item.status}
            </Text>
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
        <Text style={styles.price}>{item.price}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

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
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1.5,
  
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  roleChip: (role) => ({
    backgroundColor:
      role === "Passenger" ? "#16A34A" : "#F97316",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  }),

  roleText: {
    color: "#fff",
    fontSize: 11,
  },

  statusChip: (role) => ({
    backgroundColor:
      role === "Passenger" ? "#DCFCE7" : "#FFE4CC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  }),

  statusText: (role) => ({
    color:
      role === "Passenger" ? "#16A34A" : "#EA580C",
    fontSize: 11,
  }),

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  routeText: {
    marginLeft: 6,
    fontWeight: "600",
    flex: 1,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "48%",
  },

  metaIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },

  metaText: {
    fontSize: 12,
    flexShrink: 1,
  },

  line: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  price: {
    fontWeight: "700",
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
