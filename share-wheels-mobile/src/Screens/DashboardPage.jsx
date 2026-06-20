import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import SearchLocation from "../Components/SearchLocation";
import UpcomingRide from "../Components/UpcomingRide";
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
import { DashboardSkeleton } from "../Components/ui/Skeleton";
import AnimatedLoad from "../Components/ui/AnimatedLoad";
import AdPlacement from "../Components/ads/AdPlacement";
import { useAds } from "../context/AdsContext";
import { useLocationSuggestions } from "../hooks/useLocationSuggestions";
import { formatLocalISODate } from "../Utils/dateUtils";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import CoachMarkAnchor from "../Components/coachMarks/CoachMarkAnchor";
import { useCoachMarks } from "../context/CoachMarksContext";

const UPCOMING_STATUS_PRIORITY = {
  started: 0,
  pending: 1,
};

const sortUpcomingByPriority = (rides = []) =>
  [...rides].sort((a, b) => {
    const aPriority =
      UPCOMING_STATUS_PRIORITY[String(a?.status || "").toLowerCase()] ?? 99;
    const bPriority =
      UPCOMING_STATUS_PRIORITY[String(b?.status || "").toLowerCase()] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = new Date(a?.date || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.date || b?.createdAt || 0).getTime();
    return aTime - bTime;
  });

const moveRideToFront = (rides = [], rideId) => {
  if (!rideId) return rides;
  const targetId = String(rideId);
  const index = rides.findIndex(
    (ride) => String(ride?._id || ride?.id) === targetId
  );
  if (index <= 0) return rides;
  const ordered = [...rides];
  const [match] = ordered.splice(index, 1);
  return [match, ...ordered];
};

const DashboardPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { refreshUpcomingRides, ProfileDetails, setRefresh, pendingHighlightRideId, setPendingHighlightRideId, pendingHighlightLabel, setPendingHighlightLabel } =
    profileData();

  const [highlightRideId, setHighlightRideId] = useState(null);
  const [highlightLabel, setHighlightLabel] = useState(null);
  const highlightRideIdRef = useRef(null);
  const pendingHighlightRideIdRef = useRef(pendingHighlightRideId);
  pendingHighlightRideIdRef.current = pendingHighlightRideId;
  const pendingHighlightLabelRef = useRef(pendingHighlightLabel);
  pendingHighlightLabelRef.current = pendingHighlightLabel;

  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [fromSelected, setFromSelected] = useState(false);
  const [toSelected, setToSelected] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [rides, setRides] = useState([]);
  const [allRides, setAllRides] = useState([]);
  const [loadingAllRides, setLoadingAllRides] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [refreshingUpcoming, setRefreshingUpcoming] = useState(false);
  const [showAllRides, setShowAllRides] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const animation = useRef(new Animated.Value(1)).current;
  const listRef = useRef(null);
  const blurTimerRef = useRef(null);
  const headerBeforeUpcomingHeightRef = useRef(0);
  const upcomingSectionScrollOffsetRef = useRef(0);
  const { registerScrollPreparer, unregisterScrollPreparer } = useCoachMarks();

  const user = ProfileDetails?.data?.personalInfo;
  const myUserId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    user?._id ||
    user?.id;
  const { refreshAds } = useAds();
  const { searchPlaces, resolvePlace, reload: reloadLocations } =
    useLocationSuggestions();

  const fetchUpcomingRides = useCallback(async ({ isRefresh = false, highlightId } = {}) => {
    try {
      if (isRefresh) setRefreshingUpcoming(true);
      else setLoadingUpcoming(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const resp = await getUpcomingRides(token);
      const upcomingOnly = sortUpcomingByPriority(
        (resp?.rides || []).filter((ride) =>
          ["pending", "started"].includes(ride?.status)
        )
      );
      const activeHighlightId =
        highlightId || highlightRideIdRef.current || null;
      setRides(moveRideToFront(upcomingOnly, activeHighlightId));
      setErrorMsg("");
    } catch (err) {
      console.log("Error fetching upcoming rides:", err.message);
      setErrorMsg(getApiErrorMessage(err, "Failed to load upcoming rides."));
      setRides([]);
    } finally {
      setLoadingUpcoming(false);
      setRefreshingUpcoming(false);
    }
  }, []);

  const onRefreshUpcoming = useCallback(() => {
    fetchUpcomingRides({ isRefresh: true });
    refreshAds();
    reloadLocations(true);
  }, [fetchUpcomingRides, refreshAds, reloadLocations]);

  useFocusEffect(
    useCallback(() => {
      let nextHighlightId = null;
      const pendingId = pendingHighlightRideIdRef.current;
      const pendingLabel = pendingHighlightLabelRef.current;
      if (pendingId) {
        nextHighlightId = String(pendingId);
        highlightRideIdRef.current = nextHighlightId;
        setHighlightRideId(nextHighlightId);
        setHighlightLabel(pendingLabel || "Your new ride");
        setPendingHighlightRideId(null);
        setPendingHighlightLabel(null);
      }
      fetchUpcomingRides({ highlightId: nextHighlightId });
      refreshAds();
      reloadLocations(true);
    }, [
      fetchUpcomingRides,
      refreshUpcomingRides,
      refreshAds,
      reloadLocations,
      setPendingHighlightRideId,
      setPendingHighlightLabel,
    ])
  );

  useEffect(() => {
    if (!highlightRideId || loadingUpcoming || rides.length === 0) return undefined;

    const index = rides.findIndex(
      (ride) => String(ride?._id || ride?.id) === highlightRideId
    );
    if (index < 0) return undefined;

    const scrollTimer = setTimeout(() => {
      collapseFilters();
      try {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.15,
        });
      } catch {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, upcomingSectionScrollOffsetRef.current),
          animated: true,
        });
      }
    }, 350);

    const clearTimer = setTimeout(() => {
      setHighlightRideId(null);
      setHighlightLabel(null);
      highlightRideIdRef.current = null;
    }, 5000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightRideId, loadingUpcoming, rides]);

  useEffect(() => {
    const scrollToUpcoming = () =>
      new Promise((resolve) => {
        const list = listRef.current;
        if (!list) {
          resolve();
          return;
        }

        dismissSuggestions();
        collapseFilters();

        const offset = Math.max(0, upcomingSectionScrollOffsetRef.current);
        list.scrollToOffset({ offset, animated: true });

        const finish = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        };

        if (rides.length > 0) {
          setTimeout(() => {
            try {
              list.scrollToIndex({
                index: 0,
                animated: true,
                viewPosition: 0.12,
              });
            } catch {
              /* scrollToOffset above is sufficient */
            }
            setTimeout(finish, 420);
          }, 280);
          return;
        }

        setTimeout(finish, 520);
      });

    registerScrollPreparer("home_upcoming", scrollToUpcoming);
    return () => unregisterScrollPreparer("home_upcoming");
  }, [registerScrollPreparer, unregisterScrollPreparer, rides.length]);

  const handleSearch = async () => {
    collapseFilters();

    if (!fromValue || !toValue) {
      setErrorMsg("Please select From and To locations");
      return;
    }

    if (!fromSelected || !toSelected) {
      setErrorMsg("Please select From and To from the suggestions list");
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
        date: formatLocalISODate(date),
        rideType: "long",
      };

      const list = await getAllRides(token, filters);
      setAllRides(Array.isArray(list) ? list : []);
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
    setFromSelected(false);
    setToSelected(false);
    setSuggestions([]);
    setShowAllRides(false);
    setAllRides([]);
    setErrorMsg("");
    expandFilters();
  };

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    []
  );

  const dismissSuggestions = () => {
    setSuggestions([]);
  };

  const handleRidePress = useCallback(
    (ride) => {
      navigation.navigate("UpcomingDetailsPage", {
        rideData: ride,
        role: ride.myRole,
      });
    },
    [navigation]
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

  const filterLocations = (text, field, options = {}) => {
    expandFilters();
    const selected = options.selected !== false;

    if (field === "FROM") {
      setFromValue(text);
      setFromSelected(selected);
      if (!selected) {
        setToValue("");
        setToSelected(false);
      }
    }
    if (field === "TO") {
      setToValue(text);
      setToSelected(selected);
    }
    setActiveField(field);

    const query = String(text || "").trim();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    searchPlaces(query).then((results) => {
      setSuggestions(results);
      setSuggestionsLoading(false);
    });
  };

  const selectLocation = async (item) => {
    const resolved = await resolvePlace(item);
    const label =
      typeof resolved === "object" && resolved?.label
        ? resolved.label
        : typeof item === "string"
          ? item
          : item?.label || "";
    if (activeField === "FROM") {
      setFromValue(label);
      setFromSelected(true);
    }
    if (activeField === "TO") {
      setToValue(label);
      setToSelected(true);
    }
    setSuggestions([]);
    setSuggestionsLoading(false);
  };

  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const animatedOpacity = animation;
  const dropdownTop = activeField === "FROM" ? 70 : 142;

  const renderRide = ({ item, index }) => {
    const isHighlighted =
      !!highlightRideId &&
      String(item?._id || item?.id) === highlightRideId;

    const card = (
      <UpcomingRide
        data={item}
        highlighted={isHighlighted}
        highlightLabel={isHighlighted ? highlightLabel : undefined}
        onPress={() => {
          dismissSuggestions();
          handleRidePress(item);
        }}
      />
    );

    if (index === 0) {
      return (
        <CoachMarkAnchor id="home_upcoming" style={styles.upcomingAnchor}>
          {card}
        </CoachMarkAnchor>
      );
    }

    return card;
  };

  const terms = ProfileDetails?.data?.terms;

  const searchProps = {
    fromValue,
    toValue,
    fromSelected,
    toSelected,
    activeField,
    suggestions,
    suggestionsLoading,
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
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setActiveField(field);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    },
    onBlur: () => {
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
      }, 120);
    },
    onDismissSuggestions: dismissSuggestions,
  };

  const upcomingSectionTitle = (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>Upcoming Rides</Text>
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={onRefreshUpcoming}
        disabled={refreshingUpcoming || loadingUpcoming}
        accessibilityRole="button"
        accessibilityLabel="Refresh upcoming rides"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {refreshingUpcoming ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon name="refresh" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );

  const scrollListHeader = (
    <>
      <View
        onLayout={(e) => {
          headerBeforeUpcomingHeightRef.current = e.nativeEvent.layout.height;
          upcomingSectionScrollOffsetRef.current =
            headerBeforeUpcomingHeightRef.current;
        }}
      >
        <Text style={styles.title}>Where do you plan to go today?</Text>

        <View style={styles.bannerWrap}>
          <AdPlacement placement="home_banner" />
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <CoachMarkAnchor id="home_search">
          <SearchLocation {...searchProps} />
        </CoachMarkAnchor>

        <AdPlacement placement="home_video" />
      </View>

      <View
        onLayout={(e) => {
          upcomingSectionScrollOffsetRef.current =
            headerBeforeUpcomingHeightRef.current;
        }}
      >
        {rides.length === 0 ? (
          <CoachMarkAnchor id="home_upcoming" style={styles.upcomingAnchor}>
            {upcomingSectionTitle}
            <Text style={styles.emptyRides}>No upcoming rides</Text>
          </CoachMarkAnchor>
        ) : (
          upcomingSectionTitle
        )}
      </View>
      <AdPlacement placement="home_native" />
    </>
  );

  return (
    <ScreenContainer edges={["top"]} style={styles.screen}>
      {terms === false ? <TermsPopup setRefresh={setRefresh} /> : null}

      {/* Fixed top nav — does not scroll */}
      <DashboardTopNav user={user} />

      <View style={styles.body}>
        {showAllRides ? (
          <View style={styles.flex}>
            <ScreenHeader
              title="Search results"
              onBack={exitSearchResults}
              style={styles.searchHeader}
            />
            <CoachMarkAnchor id="home_search">
        <SearchLocation {...searchProps} />
      </CoachMarkAnchor>
            <AllridesComponent
              rides={allRides}
              loading={loadingAllRides}
              navigation={navigation}
              currentUserId={myUserId}
              searchFrom={fromValue}
              searchTo={toValue}
            />
          </View>
        ) : loadingUpcoming && rides.length === 0 ? (
          <View style={styles.flex}>
            <DashboardSkeleton />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 4 : 0}
          >
            <FlatList
              ref={listRef}
              data={rides}
              keyExtractor={(item, index) => `${item._id}-${index}`}
              renderItem={renderRide}
              ListHeaderComponent={scrollListHeader}
              ListEmptyComponent={null}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingUpcoming}
                  onRefresh={onRefreshUpcoming}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              onScrollToIndexFailed={(info) => {
                const average = info.averageItemLength || 220;
                listRef.current?.scrollToOffset({
                  offset: Math.max(
                    0,
                    upcomingSectionScrollOffsetRef.current + average * info.index
                  ),
                  animated: true,
                });
              }}
              contentContainerStyle={{
                paddingBottom: getScrollBottomPadding(insets.bottom, 72),
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={dismissSuggestions}
            />
          </KeyboardAvoidingView>
        )}
      </View>
    </ScreenContainer>
  );
};

export default React.memo(DashboardPage);

const createStyles = (c) =>
  StyleSheet.create({
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
      color: c.text,
    },
    bannerWrap: {
      marginBottom: LAYOUT.spacing.sm,
    },
    section: {
      fontSize: LAYOUT.font.section,
      fontWeight: "700",
      color: c.text,
      flex: 1,
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: LAYOUT.spacing.md,
    },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primaryMuted,
      borderWidth: 1,
      borderColor: c.border,
    },
    errorText: {
      color: c.errorText,
      marginBottom: LAYOUT.spacing.sm,
    },
    emptyRides: {
      textAlign: "center",
      color: c.textMuted,
      marginTop: LAYOUT.spacing.md,
      marginBottom: LAYOUT.spacing.sm,
    },
    upcomingAnchor: {
      width: "100%",
    },
    searchHeader: {
      paddingHorizontal: LAYOUT.spacing.screen,
      paddingTop: LAYOUT.spacing.xs,
    },
  });
