import React, {
  useState,
  useMemo,
  useEffect,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";

import carIcon from "../assets/caricon.png";
import courierIcon from "../assets/courier.png";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enrouteRequest,
  pickCourierApi,
  pickPassengerApi,
} from "../ApiService/ridesApiServices";

/* ================= CARD ================= */
const PassengerCard = memo(({ item, onSendRequest, isSent }) => {
  const isCourier = item.type === "courier";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        
        {/* LEFT: IMAGE + DETAILS */}
        <View style={{ flexDirection: "row", flex: 1 }}>
          <Image
  source={
    item.profile
      ? { uri: item.profile }
      : { uri: "https://via.placeholder.com/100" } // fallback from internet
  }
  style={styles.profileImage}
/>
          
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>{item.details}</Text>
            <Text style={styles.pickup}>{item.route}</Text>
          </View>
        </View>

        {/* RIGHT: PRICE */}
        <View style={styles.priceContainer}>
          <Image
            source={isCourier ? courierIcon : carIcon}
            style={styles.typeIcon}
          />
          <Text style={styles.price}>₹{item.price}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isSent && styles.sentButton]}
        onPress={() => onSendRequest(item)}
        disabled={isSent}
      >
        <Text style={[styles.buttonText, isSent && styles.sentText]}>
          {isSent
            ? isCourier
              ? "✓ Courier Picked"
              : "✓ Passenger Picked"
            : isCourier
            ? "Pick Courier"
            : "Pick Passenger"}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

/* ================= MAIN ================= */
const EnRoutePassengers = ({ from, to, date, rideId }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [sentRequests, setSentRequests] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadapi, setReloadApi] = useState(true);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      const payload = { from, to, date };

      const response = await enrouteRequest(token, payload);

      if (response?.success && response?.requests?.length) {
        const formatted = response.requests.map((item, index) => {
          const isCourier = item.request_type
            ?.toLowerCase()
            .includes("courier");

          return {
            id: item._id || index,
            rideId: item.rideId || item.ride_id,
            courierId: item.courierId || item.courier_id,
            passengerId: item.passengerId || item.passenger_id,
            name: item.name || "Unknown",
            profile: item.profile || null, // ✅ PROFILE IMAGE
            details: isCourier
              ? item.what_to_deliver || "Courier Item"
              : `Seats: ${item.seats_needed || 1}`,
            route: `${from} → ${to}`,
            price: item.amount ?? item.amount_will ?? 0,
            type: isCourier ? "courier" : "passenger",
          };
        });

        setData(formatted);
      } else {
        setData([]);
      }
    } catch (error) {
      console.log("FETCH ERROR:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (from && to) {
      fetchData();
    }
  }, [from, to, date, reloadapi]);

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
    if (activeTab === "all") return data;
    return data.filter((item) => item.type === activeTab);
  }, [activeTab, data]);

  /* ================= SEND REQUEST ================= */
  const handleSendRequest = async (item) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      let response;

      if (item.type === "courier") {
        const payload = {
          rideId: rideId,
          courierId: item.courierId,
        };

        response = await pickCourierApi(token, payload);
      } else {
        const payload = {
          rideId: rideId,
          passenger_rideId: item.passengerId,
        };

        response = await pickPassengerApi(token, payload);
      }

      if (response?.success) {
        setSentRequests((prev) => ({
          ...prev,
          [item.id]: true,
        }));

        setReloadApi((prev) => !prev);

        Alert.alert(
          "Success",
          item.type === "courier"
            ? "Courier picked successfully"
            : "Passenger picked successfully"
        );
      } else {
        Alert.alert("Error", response?.message || "Failed");
      }
    } catch (error) {
      console.log("SEND ERROR:", error);
      Alert.alert("Error", "Something went wrong");
    }
  };

  /* ================= RENDER ================= */
  const renderItem = ({ item }) => (
    <PassengerCard
      item={item}
      onSendRequest={handleSendRequest}
      isSent={sentRequests[item.id]}
    />
  );

  const TabButton = ({ label, value }) => {
    const isActive = activeTab === value;

    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.activeTab]}
        onPress={() => setActiveTab(value)}
      >
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>En Route Requests</Text>

      <View style={styles.tabs}>
        <TabButton label="All" value="all" />
        <TabButton label="Passengers" value="passenger" />
        <TabButton label="Courier" value="courier" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : filteredData.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No data found
        </Text>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

export default EnRoutePassengers;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB", padding: 16 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 16 },

  tabs: { flexDirection: "row", marginBottom: 16 },

  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#E5E7EB",
  },

  activeTab: { backgroundColor: "#1F2937" },
  tabText: { color: "#6B7280" },
  activeTabText: { color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E5E7EB",
  },

  name: { fontSize: 15, fontWeight: "600" },
  details: { fontSize: 13, color: "#6B7280" },
  pickup: { fontSize: 13, color: "#6B7280" },

  priceContainer: { alignItems: "center" },
  typeIcon: { width: 20, height: 20, marginBottom: 4 },
  price: { fontWeight: "600" },

  button: {
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  sentButton: {
    backgroundColor: "#E6F7F0",
    borderWidth: 1,
    borderColor: "#22C55E",
  },

  buttonText: { color: "#fff", fontWeight: "600" },
  sentText: { color: "#22C55E" },
});