import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
} from "react-native";

import clock1 from "../assets/clock1.png";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import person from "../assets/person.png";
import location from "../assets/location.png";
import { RideListSkeleton } from "./ui/Skeleton";
import AnimatedLoad from "./ui/AnimatedLoad";
import AdPlacement from "./ads/AdPlacement";

const AllridesComponent = ({ rides = [], loading, navigation }) => {
  if (!loading && (!rides || rides.length === 0)) {
    return <Text style={styles.centerText}>No rides found</Text>;
  }

  const renderRide = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("RideDetails", { ride: item })}
      >
        {/* 🚩 FROM → TO SECTION */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <Image source={location} style={styles.icon} />
            <Text style={styles.routeText}>{item.from || "From"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.routeRow}>
            <Image source={location} style={styles.icon} />
            <Text style={styles.routeText}>{item.to || "To"}</Text>
          </View>
        </View>

        {/* 👤 DRIVER + PRICE */}
        <View style={styles.driverRow}>
          <View style={styles.driverInfo}>
            <UserAvatar user={item?.creator} size={LAYOUT.sizes.avatarSm + 4} />
            <Text style={styles.driverName}>
              {item?.creator?.name || "Driver"}
            </Text>
          </View>

          <Text style={styles.price}>
            ₹{item?.ride_amount ?? 0}
          </Text>
        </View>

        {/* ⏱ FOOTER */}
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Image source={clock1} style={styles.smallIcon} />
            <Text style={styles.footerText}>
              {item?.date
                ? new Date(item.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"}
            </Text>
          </View>

          <View style={styles.footerItem}>
            <Image source={person} style={styles.smallIcon} />
            <Text style={styles.footerText}>
              {item.availableSeats || 0} seats
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  return (
    <View style={{ flex: 1 }}>
      <AnimatedLoad
        loading={loading}
        skeleton={
          <View style={styles.skeletonWrap}>
            <RideListSkeleton count={4} />
          </View>
        }
        style={{ flex: 1 }}
      >
        <FlatList
          data={rides}
          ListHeaderComponent={<AdPlacement placement="search_results" />}
          keyExtractor={(item, index) =>
            item?._id ? item._id.toString() : index.toString()
          }
          renderItem={renderRide}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
        />
      </AnimatedLoad>
    </View>
  );
};

export default React.memo(AllridesComponent);

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#fff",
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,

    // iOS Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,

    // Android Shadow
    elevation: 5,
  },

  /* 🚩 ROUTE SECTION */
  routeContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  routeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
    marginLeft: 20,
  },

  /* 👤 DRIVER */
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
  },

  driverName: {
    fontWeight: "600",
    fontSize: 14,
  },

  price: {
    fontWeight: "700",
    color: "#2563EB",
    fontSize: 16,
  },

  /* ⏱ FOOTER */
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  footerItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  footerText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  icon: {
    width: 14,
    height: 14,
    tintColor: "#6B7280",
  },

  smallIcon: {
    width: 14,
    height: 14,
    tintColor: "#6B7280",
  },

  skeletonWrap: {
    padding: 12,
    flex: 1,
  },
});