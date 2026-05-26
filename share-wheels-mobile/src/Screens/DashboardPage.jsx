import React, { useState, useCallback, useRef } from "react";
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

import SearchLocation from "../Components/SearchLocation";
import UpcomingRide from "../Components/UpcomingRide";
import CreatePage from "../Components/CreateRequestIcon";
import AllridesComponent from "../Components/AllridesComponent";
import TermsPopup from "../Components/TermsPopup";
import ScreenContainer from "../Components/ui/ScreenContainer";
import ScreenHeader from "../Components/ui/ScreenHeader";
import DashboardTopNav from "../Components/dashboard/DashboardTopNav";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";

import { profileData } from "../Navigation/AuthNavigator";
import { getUpcomingRides, getAllRides } from "../ApiService/ridesApiServices";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { RideListSkeleton } from "../Components/ui/Skeleton";
import AnimatedLoad from "../Components/ui/AnimatedLoad";
import AdPlacement from "../Components/ads/AdPlacement";
import { useAds } from "../context/AdsContext";

const locations = [
  "Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Tirupati","Rajahmundry",
  "Kakinada","Anantapur","Kadapa","Eluru","Ongole","Chittoor","Machilipatnam","Adoni",
  "Tenali","Proddatur","Bhimavaram","Tadepalligudem","Narasaraopet","Vizianagaram",
  "Srikakulam","Amalapuram","Gudivada","Hindupur","Dharmavaram","Madanapalle","Nandyal",
  "Puttur","Palakollu","Kavali","Markapur","Rayachoti","Kadiri","Chilakaluripet","Repalle",
  "Bapatla","Parvathipuram",
  "Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam","Mahbubnagar",
  "Nalgonda","Adilabad","Siddipet","Suryapet","Miryalaguda","Jagtial","Mancherial","Kamareddy",
  "Kothagudem","Bhongir","Wanaparthy","Vikarabad","Nagarkurnool","Gadwal","Medak","Sangareddy",
  "Zaheerabad","Shamshabad","Chevella","Tandur","Peddapalli","Huzurabad","Kodad",
];

const DashboardPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { refreshUpcomingRides, ProfileDetails, setRefresh } = profileData();

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
  const myUserId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    user?._id ||
    user?.id;
  const { refreshAds } = useAds();

  const fetchUpcomingRides = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const resp = await getUpcomingRides(token);
      const upcomingOnly = (resp?.rides || []).filter((ride) =>
        ["pending", "started"].includes(ride?.status)
      );
      setRides(upcomingOnly);
      setErrorMsg("");
    } catch (err) {
      console.log("Error fetching upcoming rides:", err.message);
      setErrorMsg(getApiErrorMessage(err, "Failed to load upcoming rides."));
      setRides([]);
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

  const handleSearch = async () => {
    collapseFilters();

    if (!fromValue || !toValue) {
      setErrorMsg("Please select From and To locations");
      return;
    }

    try {
      setLoadingAllRides(true);
      setShowAllRides(true);
      setErrorMsg("");

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
      const list = Array.isArray(resp) ? resp : resp?.rides || [];
      setAllRides(list);
    } catch (err) {
      console.log("Get All Rides Error:", err?.message);
      setErrorMsg(getApiErrorMessage(err, "Could not search rides."));
      setAllRides([]);
    } finally {
      setLoadingAllRides(false);
    }
  };

  const exitSearchResults = () => {
    setFromValue("");
    setToValue("");
    setSuggestions([]);
    setShowAllRides(false);
    setAllRides([]);
    setErrorMsg("");
    setIsFocused(false);
    expandFilters();
  };

  const dismissSuggestions = () => {
    setSuggestions([]);
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
    <UpcomingRide
      data={item}
      onPress={() => {
        dismissSuggestions();
        handleRidePress(item);
      }}
    />
  );

  const terms = ProfileDetails?.data?.terms;

  const searchProps = {
    fromValue,
    toValue,
    activeField,
    suggestions,
    date,
    showDate,
    showFilters,
    dropdownTop,
    animatedHeight,
    animatedOpacity,
    setFromValue,
    setToValue,
    setActiveField,
    setSuggestions,
    setDate,
    setShowDate,
    expandFilters,
    collapseFilters,
    filterLocations,
    selectLocation,
    handleSearch,
    onFocus: (field) => {
      setIsFocused(true);
      setActiveField(field);
    },
    onDismissSuggestions: dismissSuggestions,
  };

  const scrollListHeader = (
    <>
      {!isFocused && (
        <Text style={styles.title}>Where do you plan to go today?</Text>
      )}

      {!isFocused && <AdPlacement placement="home_banner" />}

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <SearchLocation {...searchProps} />

      <AdPlacement placement="home_video" />

      <Text style={styles.section}>Upcoming Rides</Text>
      <AdPlacement placement="home_native" />
    </>
  );

  return (
    <ScreenContainer edges={["top"]} backgroundColor="#F8FAFC" style={styles.screen}>
      {terms === false ? <TermsPopup setRefresh={setRefresh} /> : null}

      {/* Fixed top nav — does not scroll */}
      <DashboardTopNav user={user} />

      <View style={styles.body}>
        {showAllRides ? (
          <View style={styles.flex}>
            <ScreenHeader title="Search results" onBack={exitSearchResults} />
            <SearchLocation {...searchProps} />
            <AllridesComponent
              rides={allRides}
              loading={loadingAllRides}
              navigation={navigation}
              currentUserId={myUserId}
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
              ListHeaderComponent={scrollListHeader}
              ListEmptyComponent={
                <Text style={styles.emptyRides}>No upcoming rides</Text>
              }
              contentContainerStyle={{
                paddingBottom: getScrollBottomPadding(insets.bottom, 72),
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={dismissSuggestions}
            />
          </AnimatedLoad>
        )}
      </View>

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
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.screen,
  },
  flex: { flex: 1 },
  title: {
    fontSize: LAYOUT.font.title,
    fontWeight: "700",
    marginBottom: LAYOUT.spacing.md,
    color: LAYOUT.colors.text,
  },
  section: {
    fontSize: LAYOUT.font.section,
    fontWeight: "700",
    marginVertical: LAYOUT.spacing.md,
    color: LAYOUT.colors.text,
  },
  createButtonWrapper: {
    position: "absolute",
    bottom: LAYOUT.spacing.lg,
    right: LAYOUT.spacing.lg,
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
