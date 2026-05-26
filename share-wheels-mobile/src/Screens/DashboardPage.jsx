import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import ProfilePage from "../Components/HeaderImage";
import NotificationIcon from "../Components/NotificationIcon";
import SearchLocation from "../Components/SearchLocation";
import UpcomingRide from "../Components/UpcomingRide";
import CreatePage from "../Components/CreateRequestIcon";
import AllridesComponent from "../Components/AllridesComponent";
import TermsPopup from "../Components/TermsPopup";
import ScreenContainer from "../Components/ui/ScreenContainer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";

import { profileData } from "../Navigation/AuthNavigator";
import { getUpcomingRides, getAllRides } from "../ApiService/ridesApiServices";
import { RideListSkeleton } from "../Components/ui/Skeleton";
import AnimatedLoad from "../Components/ui/AnimatedLoad";
import AdPlacement from "../Components/ads/AdPlacement";
import { useAds } from "../context/AdsContext";

// Locations
const locations = [
  // Andhra Pradesh
  "Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Tirupati","Rajahmundry",
  "Kakinada","Anantapur","Kadapa","Eluru","Ongole","Chittoor","Machilipatnam","Adoni",
  "Tenali","Proddatur","Bhimavaram","Tadepalligudem","Narasaraopet","Vizianagaram",
  "Srikakulam","Amalapuram","Gudivada","Hindupur","Dharmavaram","Madanapalle","Nandyal",
  "Puttur","Palakollu","Kavali","Markapur","Rayachoti","Kadiri","Chilakaluripet","Repalle",
  "Bapatla","Parvathipuram",
  // Telangana
  "Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam","Mahbubnagar",
  "Nalgonda","Adilabad","Siddipet","Suryapet","Miryalaguda","Jagtial","Mancherial","Kamareddy",
  "Kothagudem","Bhongir","Wanaparthy","Vikarabad","Nagarkurnool","Gadwal","Medak","Sangareddy",
  "Zaheerabad","Shamshabad","Chevella","Tandur","Peddapalli","Huzurabad","Kodad"
];

const DashboardPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { refreshUpcomingRides, ProfileDetails,setRefresh } = profileData();

  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [rides, setRides] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [loadingAllRides, setLoadingAllRides] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [showAllRides, setShowAllRides] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const animation = useRef(new Animated.Value(1)).current;

  const user = ProfileDetails?.data?.personalInfo;
  const { refreshAds } = useAds();

  // FETCH UPCOMING RIDES
  const fetchUpcomingRides = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const resp = await getUpcomingRides(token);
      const upcomingOnly = (resp?.rides || []).filter(
        (ride) => ride?.status === "pending"
      );
      setRides(upcomingOnly);
    } catch (err) {
      console.log("Error fetching upcoming rides:", err.message);
      setErrorMsg("Failed to load upcoming rides.");
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUpcomingRides();
      refreshAds();
    }, [fetchUpcomingRides, refreshUpcomingRides, refreshAds])
  );

  // HANDLE SEARCH
  const handleSearch = async () => {
    collapseFilters();

    if (!fromValue || !toValue) {
      setErrorMsg("Please select From and To locations");
      return;
    }

    try {
      setLoadingAllRides(true);
      setShowAllRides(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAllRides([]);
        return;
      }

      const filters = {
        from: fromValue,
        to: toValue,
        date: date?.toISOString()?.split("T")[0],
      };

      const resp = await getAllRides(token, filters);
      setAllRides(resp);
    } catch (err) {
      console.log("Get All Rides Error:", err?.message);
      setAllRides([]);
    } finally {
      setLoadingAllRides(false);
    }
  };

  const handleClear = () => {
    setFromValue("");
    setToValue("");
    setSuggestions([]);
    setShowAllRides(false);
    setAllRides([]);
    setErrorMsg("");
  };

  const handleRidePress = useCallback(
    (ride) => {
      navigation.navigate("UpcomingDetailsPage", {
        rideData: ride,
        role: ride.myRole,
        refreshRides: fetchUpcomingRides,
      });
    },
    [navigation, fetchUpcomingRides]
  );

  const expandFilters = () => {
    if (!showFilters) {
      setShowFilters(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const collapseFilters = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setShowFilters(false));
  };

  const filterLocations = (text, field) => {
    expandFilters();

    if (field === "FROM") setFromValue(text);
    if (field === "TO") setToValue(text);

    setActiveField(field);

    const filtered = locations.filter((item) =>
      item.toLowerCase().includes(text.toLowerCase())
    );
    setSuggestions(filtered);
  };

  const selectLocation = (item) => {
    if (activeField === "FROM") setFromValue(item);
    if (activeField === "TO") setToValue(item);
    setSuggestions([]);
  };

  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const animatedOpacity = animation;
  const dropdownTop = activeField === "FROM" ? 70 : 142;

  const renderRide = ({ item }) => (
    <UpcomingRide data={item} onPress={() => handleRidePress(item)} />
  );

  const terms = ProfileDetails?.data?.terms;

  const listHeader = (
    <>
      <View style={styles.header}>
        <ProfilePage user={user} />
        <NotificationIcon />
      </View>

      {!isFocused && (
        <Text style={styles.title}>Where do you plan to go today?</Text>
      )}

      {!isFocused && <AdPlacement placement="home_banner" />}

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <SearchLocation
        fromValue={fromValue}
        toValue={toValue}
        activeField={activeField}
        suggestions={suggestions}
        date={date}
        showDate={showDate}
        showFilters={showFilters}
        dropdownTop={dropdownTop}
        animatedHeight={animatedHeight}
        animatedOpacity={animatedOpacity}
        setFromValue={setFromValue}
        setToValue={setToValue}
        setActiveField={setActiveField}
        setSuggestions={setSuggestions}
        setDate={setDate}
        setShowDate={setShowDate}
        expandFilters={expandFilters}
        collapseFilters={collapseFilters}
        filterLocations={filterLocations}
        selectLocation={selectLocation}
        handleSearch={handleSearch}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      <AdPlacement placement="home_video" />

      <Text style={styles.section}>Upcoming Rides</Text>
      <AdPlacement placement="home_native" />
    </>
  );

  return (
    <ScreenContainer edges={["top"]} backgroundColor="#fff" style={styles.container}>
      {terms === false ? <TermsPopup setRefresh={setRefresh} /> : null}

      {showAllRides ? (
        <View style={styles.flex}>
          <View style={styles.header}>
            <ProfilePage user={user} />
            <NotificationIcon />
          </View>
          <SearchLocation
            fromValue={fromValue}
            toValue={toValue}
            activeField={activeField}
            suggestions={suggestions}
            date={date}
            showDate={showDate}
            showFilters={showFilters}
            dropdownTop={dropdownTop}
            animatedHeight={animatedHeight}
            animatedOpacity={animatedOpacity}
            setFromValue={setFromValue}
            setToValue={setToValue}
            setActiveField={setActiveField}
            setSuggestions={setSuggestions}
            setDate={setDate}
            setShowDate={setShowDate}
            expandFilters={expandFilters}
            collapseFilters={collapseFilters}
            filterLocations={filterLocations}
            selectLocation={selectLocation}
            handleSearch={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <View style={styles.clearRow}>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <AllridesComponent
            rides={allRides}
            loading={loadingAllRides}
            navigation={navigation}
          />
        </View>
      ) : (
        <AnimatedLoad
          loading={loadingUpcoming}
          skeleton={<RideListSkeleton count={2} variant="upcoming" />}
          style={styles.flex}
        >
          <FlatList
            data={rides}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            renderItem={renderRide}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <Text style={styles.emptyRides}>No upcoming rides</Text>
            }
            contentContainerStyle={{
              paddingBottom: getScrollBottomPadding(insets.bottom, 72),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </AnimatedLoad>
      )}

      {!isFocused && (
        <View style={styles.createButtonWrapper}>
          <CreatePage />
        </View>
      )}
    </ScreenContainer>
  );
};

export default React.memo(DashboardPage);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: LAYOUT.spacing.screen,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md,
  },
  title: {
    fontSize: LAYOUT.font.title,
    fontWeight: "700",
    marginBottom: LAYOUT.spacing.md,
  },
  section: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    marginVertical: LAYOUT.spacing.md,
  },
  createButtonWrapper: {
    position: "absolute",
    bottom: LAYOUT.spacing.lg,
    right: LAYOUT.spacing.lg,
  },
  clearRow: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  clearText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#B91C1C",
    marginBottom: LAYOUT.spacing.sm,
  },
  emptyRides: {
    textAlign: "center",
    color: "#64748B",
    marginTop: LAYOUT.spacing.md,
  },
});