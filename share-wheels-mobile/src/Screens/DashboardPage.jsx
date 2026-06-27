import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from "react-native";
import Reanimated, {
  createAnimatedComponent,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
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
import { LAYOUT, getScrollBottomPadding, verticalScale } from "../theme/layout";

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
import {
  attachDashboardListRef,
  dashboardListScrollRefs,
  scrollDashboardListToLocation,
  scrollDashboardListToOffset,
} from "../Utils/dashboardListScroll";

const AnimatedSectionList = createAnimatedComponent(SectionList);

const STICKY_HEADER_KEY = "upcoming";

const PINNED_FADE_PX = 28;

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
  const scrollY = useSharedValue(0);
  const topHeightSv = useSharedValue(0);
  const upcomingEnterAnim = useRef(new Animated.Value(0)).current;
  const dashboardTopHeightRef = useRef(0);
  const searchSectionYRef = useRef(0);
  const upcomingSectionScrollOffsetRef = useRef(0);
  const blurTimerRef = useRef(null);
  const scrollSearchTimerRef = useRef(null);
  const selectingLocationRef = useRef(false);
  const searchRequestIdRef = useRef(0);
  const { registerScrollPreparer, unregisterScrollPreparer } = useCoachMarks();

  const upcomingSections = useMemo(
    () => [{ key: STICKY_HEADER_KEY, data: rides }],
    [rides]
  );

  useEffect(() => () => attachDashboardListRef(null), []);

  const user = ProfileDetails?.data?.personalInfo;
  const myUserId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    user?._id ||
    user?.id;
  const { refreshAds } = useAds();
  const { searchPlaces, resolvePlace, reload: reloadLocations } =
    useLocationSuggestions();

  const scrollSearchIntoView = useCallback((field) => {
    if (scrollSearchTimerRef.current) {
      clearTimeout(scrollSearchTimerRef.current);
    }
    scrollSearchTimerRef.current = setTimeout(() => {
      scrollSearchTimerRef.current = null;
      const fieldOffset = field === "TO" ? verticalScale(72) : 0;
      scrollDashboardListToOffset({
        offset: Math.max(0, searchSectionYRef.current + fieldOffset),
        animated: true,
      });
    }, 80);
  }, []);

  const dashboardScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const upcomingHeaderStickyStyle = useAnimatedStyle(() => {
    const threshold = topHeightSv.value;
    const strength = interpolate(
      scrollY.value,
      [threshold, threshold + PINNED_FADE_PX],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      shadowOpacity: strength * 0.18,
      elevation: strength * 8,
    };
  });

  const upcomingTitleStyle = useAnimatedStyle(() => {
    const threshold = topHeightSv.value;
    const strength = interpolate(
      scrollY.value,
      [threshold, threshold + PINNED_FADE_PX],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      color: interpolateColor(strength, [0, 1], [colors.text, colors.primary]),
      transform: [{ scale: interpolate(strength, [0, 1], [1, 1.02]) }],
    };
  });

  const scrollToNormalPosition = useCallback(() => {
    if (scrollSearchTimerRef.current) {
      clearTimeout(scrollSearchTimerRef.current);
      scrollSearchTimerRef.current = null;
    }

    requestAnimationFrame(() => {
      scrollDashboardListToOffset({ offset: 0, animated: true });
    });
  }, []);

  useEffect(
    () => () => {
      if (scrollSearchTimerRef.current) {
        clearTimeout(scrollSearchTimerRef.current);
      }
    },
    []
  );

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

  useEffect(() => {
    if (loadingUpcoming) {
      upcomingEnterAnim.setValue(0);
      return;
    }
    Animated.spring(upcomingEnterAnim, {
      toValue: 1,
      tension: 72,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [loadingUpcoming, upcomingEnterAnim]);

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

    const listIndex = index;

    const scrollTimer = setTimeout(() => {
      collapseFilters();
      try {
        if (
          !scrollDashboardListToLocation({
            sectionIndex: 0,
            itemIndex: listIndex,
            animated: true,
            viewPosition: 0.12,
          })
        ) {
          scrollDashboardListToOffset({
            offset: Math.max(0, upcomingSectionScrollOffsetRef.current),
            animated: true,
          });
        }
      } catch {
        scrollDashboardListToOffset({
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
        if (!dashboardListScrollRefs.list && !dashboardListScrollRefs.native) {
          resolve();
          return;
        }

        dismissSuggestions();
        collapseFilters();
        const offset = Math.max(0, upcomingSectionScrollOffsetRef.current);
        scrollDashboardListToOffset({ offset, animated: true });

        const finish = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        };

        if (rides.length > 0) {
          setTimeout(() => {
            scrollDashboardListToOffset({
              offset: Math.max(0, upcomingSectionScrollOffsetRef.current),
              animated: true,
            });
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
    const requestId = ++searchRequestIdRef.current;
    searchPlaces(query).then((results) => {
      if (requestId !== searchRequestIdRef.current) return;
      setSuggestions(results);
      setSuggestionsLoading(false);
    });
  };

  const selectLocation = async (item, field = activeField) => {
    searchRequestIdRef.current += 1;
    try {
      const resolved = await resolvePlace(item);
      const label =
        typeof resolved === "object" && resolved?.label
          ? resolved.label
          : typeof item === "string"
            ? item
            : item?.label || "";
      if (field === "FROM") {
        setFromValue(label);
        setFromSelected(true);
      }
      if (field === "TO") {
        setToValue(label);
        setToSelected(true);
      }
      setActiveField(null);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
      Keyboard.dismiss();
      scrollToNormalPosition();
    }
  };

  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const animatedOpacity = animation;
  const dropdownTop = activeField === "FROM" ? 70 : 142;

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

      const value = field === "FROM" ? fromValue : toValue;
      const selected = field === "FROM" ? fromSelected : toSelected;
      const query = String(value || "").trim();
      if (query.length >= 2 && !selected) {
        filterLocations(value, field, { selected: false });
      }

      requestAnimationFrame(() => {
        scrollSearchIntoView(field);
      });
    },
    onBlur: () => {
      blurTimerRef.current = setTimeout(() => {
        if (selectingLocationRef.current) return;
        blurTimerRef.current = null;
      }, 160);
    },
    onSelectionStart: () => {
      selectingLocationRef.current = true;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    },
    onSelectionEnd: () => {
      selectingLocationRef.current = false;
    },
  };

  const upcomingSectionTitle = (
    <View style={styles.sectionRow}>
      <Reanimated.Text style={[styles.section, upcomingTitleStyle]}>
        Upcoming Rides
      </Reanimated.Text>
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

  const upcomingHeaderAnimatedStyle = {
    transform: [
      {
        translateY: upcomingEnterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const renderUpcomingSectionHeader = useCallback(
    () => (
      <Reanimated.View
        collapsable={false}
        style={[styles.upcomingHeaderSticky, upcomingHeaderStickyStyle]}
      >
        <Animated.View style={upcomingHeaderAnimatedStyle}>
          <View style={[styles.upcomingHeaderGradient, styles.upcomingHeaderSolidBg]}>
            <View style={styles.upcomingHeaderContent}>{upcomingSectionTitle}</View>
          </View>
        </Animated.View>
      </Reanimated.View>
    ),
    [
      styles.upcomingHeaderSticky,
      styles.upcomingHeaderGradient,
      styles.upcomingHeaderSolidBg,
      upcomingTitleStyle,
      upcomingHeaderStickyStyle,
      upcomingHeaderAnimatedStyle,
      upcomingSectionTitle,
    ]
  );

  const renderRide = useCallback(
    ({ item, index }) => {
      const isHighlighted =
        !!highlightRideId &&
        String(item?._id || item?.id) === highlightRideId;

      const card = (
        <View style={styles.rideItemPad}>
          <UpcomingRide
            data={item}
            highlighted={isHighlighted}
            highlightLabel={isHighlighted ? highlightLabel : undefined}
            onPress={() => {
              dismissSuggestions();
              handleRidePress(item);
            }}
          />
        </View>
      );

      if (index === 0) {
        return (
          <CoachMarkAnchor id="home_upcoming" style={styles.upcomingAnchor}>
            {card}
          </CoachMarkAnchor>
        );
      }

      return card;
    },
    [
      highlightRideId,
      highlightLabel,
      styles.rideItemPad,
      styles.upcomingAnchor,
      handleRidePress,
    ]
  );

  const dashboardListHeader = (
    <View
      style={styles.listContentPad}
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        dashboardTopHeightRef.current = height;
        upcomingSectionScrollOffsetRef.current = height;
        topHeightSv.value = height;
      }}
    >
      <Text style={styles.title}>Where do you plan to go today?</Text>

      <View style={styles.bannerWrap}>
        <AdPlacement placement="home_banner" />
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <View
        onLayout={(e) => {
          searchSectionYRef.current = e.nativeEvent.layout.y;
        }}
      >
        <CoachMarkAnchor id="home_search">
          <SearchLocation {...searchProps} />
        </CoachMarkAnchor>
      </View>

      <AdPlacement placement="home_video" />
      <AdPlacement placement="home_native" />
    </View>
  );

  const renderUpcomingList = () => (
    <View style={styles.upcomingSection}>
      <AnimatedSectionList
        ref={attachDashboardListRef}
        sections={upcomingSections}
        keyExtractor={(item, index) => `${item._id || item.id}-${index}`}
        renderItem={renderRide}
        renderSectionHeader={renderUpcomingSectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={dashboardListHeader}
        ListFooterComponent={
          !loadingUpcoming && rides.length === 0 ? (
            <View style={styles.listContentPad}>
              <CoachMarkAnchor id="home_upcoming" style={styles.upcomingAnchor}>
                <Text style={styles.emptyRides}>No upcoming rides</Text>
              </CoachMarkAnchor>
            </View>
          ) : null
        }
        style={styles.upcomingList}
        onScroll={dashboardScrollHandler}
        scrollEventThrottle={16}
        decelerationRate={Platform.OS === "ios" ? 0.998 : 0.985}
        overScrollMode="always"
        bounces
        automaticallyAdjustKeyboardInsets
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={9}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={refreshingUpcoming}
            onRefresh={onRefreshUpcoming}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onScrollToLocationFailed={(info) => {
          const average = info.averageItemLength || 220;
          scrollDashboardListToOffset({
            offset: Math.max(
              0,
              upcomingSectionScrollOffsetRef.current + average * info.index
            ),
            animated: true,
          });
        }}
        contentContainerStyle={{
          paddingBottom: getScrollBottomPadding(insets.bottom, 72),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator
        persistentScrollbar={Platform.OS === "android"}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      />
    </View>
  );

  return (
    <ScreenContainer edges={["top"]} style={styles.screen}>
      {terms === false ? <TermsPopup setRefresh={setRefresh} /> : null}

      {/* Fixed top nav — does not scroll */}
      <DashboardTopNav user={user} />

      {showAllRides ? (
        <View style={styles.body}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + verticalScale(56) : 0}
          >
            <View style={styles.flex}>
              <ScreenHeader
                title="Search results"
                onBack={exitSearchResults}
                style={styles.searchHeader}
              />
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}
              <AllridesComponent
                rides={allRides}
                loading={loadingAllRides}
                navigation={navigation}
                currentUserId={myUserId}
                searchFrom={fromValue}
                searchTo={toValue}
                headerContent={
                  <CoachMarkAnchor id="home_search">
                    <SearchLocation {...searchProps} compact />
                  </CoachMarkAnchor>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : loadingUpcoming && rides.length === 0 ? (
        <View style={styles.body}>
          <DashboardSkeleton />
        </View>
      ) : (
        renderUpcomingList()
      )}
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
    listContentPad: {
      paddingHorizontal: LAYOUT.spacing.screen,
    },
    rideItemPad: {
      paddingHorizontal: LAYOUT.spacing.screen,
    },
    upcomingSection: {
      flex: 1,
      width: LAYOUT.screenWidth,
      alignSelf: "center",
    },
    upcomingHeaderSticky: {
      width: LAYOUT.screenWidth,
      alignSelf: "center",
      zIndex: 10,
      backgroundColor: "transparent",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      shadowOpacity: 0,
      elevation: 0,
    },
    upcomingHeaderGradient: {
      width: "100%",
      overflow: "hidden",
    },
    upcomingHeaderSolidBg: {
      backgroundColor: c.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    upcomingHeaderContent: {
      paddingHorizontal: LAYOUT.spacing.screen,
    },
    section: {
      fontSize: LAYOUT.font.section,
      fontWeight: "700",
      color: c.text,
      flex: 1,
    },
    upcomingList: {
      flex: 1,
      width: LAYOUT.screenWidth,
      alignSelf: "center",
    },
    title: {
      fontSize: LAYOUT.font.title,
      fontWeight: "700",
      marginBottom: LAYOUT.spacing.md,
      color: c.text,
    },
    bannerWrap: {
      marginBottom: LAYOUT.spacing.sm,
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
