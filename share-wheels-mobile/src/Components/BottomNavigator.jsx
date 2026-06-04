import React, { useRef } from "react";
import { View, StyleSheet, Image, Platform, Pressable } from "react-native";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { useIsFocused, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

import HomeStack from "../Navigation/HomeStack";
import RideHistory from "../Components/RideHistory";
import MyRequest from "../Components/MyRequest";
import MyProfile from "../Components/MyProfile";
import CreateOptionsCard from "./CreateRequestIcon";
import AnimatedTabIcon from "./ui/AnimatedTabIcon";
import CoachMarkAnchor from "./coachMarks/CoachMarkAnchor";
import { LAYOUT, scale, getTabBarInset } from "../theme/layout";
import { shouldShowCreateFab } from "../Utils/mainTabNavigation";
import { useTheme } from "../context/ThemeContext";
import { CoachMarksProvider } from "../context/CoachMarksContext";
import { profileData } from "../Navigation/AuthNavigator";
import { TAB_ANCHOR_BY_ROUTE } from "../coachMarks/mainAppTour";

import requestIcon from "../assets/requesticon.png";

const Tab = createBottomTabNavigator();

function BottomNavigatorInner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabNavRef = useRef(null);
  const termsAccepted = profileData()?.ProfileDetails?.data?.terms === true;

  const bottomPad =
    Platform.OS === "ios"
      ? Math.max(insets.bottom, 8)
      : Math.max(insets.bottom, 8);
  const tabHeight = LAYOUT.sizes.tabBarHeight + bottomPad;

  const isNavigatorFocused = useIsFocused();
  const showCreateFabOnTab = useNavigationState((state) =>
    shouldShowCreateFab(state)
  );
  const showCreateFab = isNavigatorFocused && showCreateFabOnTab;

  return (
    <CoachMarksProvider
      tabNavigationRef={tabNavRef}
      autoStartEnabled={termsAccepted && isNavigatorFocused}
    >
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        <Tab.Navigator
          initialRouteName="Home"
          detachInactiveScreens={false}
          tabBar={(props) => {
            tabNavRef.current = props.navigation;
            return <BottomTabBar {...props} />;
          }}
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarHideOnKeyboard: true,
            lazy: false,
            tabBarStyle: {
              height: tabHeight,
              paddingBottom: bottomPad,
              paddingTop: 6,
              backgroundColor: colors.tabBar,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.tabBarBorder,
              elevation: 0,
              shadowOpacity: 0,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 0,
            },
            tabBarItemStyle: styles.tabItem,
            sceneStyle: { backgroundColor: colors.background, flex: 1 },
            tabBarButton: (props) => {
              const anchorId = TAB_ANCHOR_BY_ROUTE[route.name];
              const button = (
                <Pressable
                  {...props}
                  style={({ pressed }) => [
                    props.style,
                    pressed && { opacity: 0.85 },
                  ]}
                />
              );
              if (!anchorId) return button;
              return (
                <CoachMarkAnchor id={anchorId} style={styles.tabAnchor}>
                  {button}
                </CoachMarkAnchor>
              );
            },

            tabBarIcon: ({ focused }) => {
              if (route.name === "Request") {
                return (
                  <AnimatedTabIcon focused={focused}>
                    <Image
                      source={requestIcon}
                      style={[
                        styles.requestIcon,
                        { tintColor: focused ? colors.primary : colors.tabInactive },
                      ]}
                    />
                  </AnimatedTabIcon>
                );
              }

              let iconName;
              if (route.name === "Home") {
                iconName = focused ? "home" : "home-outline";
              } else if (route.name === "Ride") {
                iconName = focused ? "time" : "time-outline";
              } else if (route.name === "Profile") {
                iconName = focused ? "person" : "person-outline";
              }

              return (
                <AnimatedTabIcon focused={focused}>
                  <Icon
                    name={iconName}
                    size={scale(20)}
                    color={focused ? colors.primary : colors.tabInactive}
                  />
                </AnimatedTabIcon>
              );
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Ride" component={RideHistory} />
          <Tab.Screen name="Request" component={MyRequest} />
          <Tab.Screen name="Profile" component={MyProfile} />
        </Tab.Navigator>

        <View
          style={[
            styles.fabLayer,
            { bottom: getTabBarInset(insets.bottom) },
            !showCreateFab && styles.fabLayerHidden,
          ]}
          pointerEvents={showCreateFab ? "box-none" : "none"}
        >
          <CreateOptionsCard visible={showCreateFab} />
        </View>
      </View>
    </CoachMarksProvider>
  );
}

export default function BottomNavigator() {
  return <BottomNavigatorInner />;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  tabItem: {
    paddingVertical: 6,
  },
  tabAnchor: {
    flex: 1,
  },
  requestIcon: {
    width: scale(20),
    height: scale(20),
    resizeMode: "contain",
  },
  fabLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    elevation: 24,
  },
  fabLayerHidden: {
    opacity: 0,
  },
});
