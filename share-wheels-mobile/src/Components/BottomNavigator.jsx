import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";

import DashboardPage from "../Screens/DashboardPage";
import RideHistory from "../Components/RideHistory";
import MyRequest from "../Components/MyRequest";
import MyProfile from "../Components/MyProfile";
import AnimatedTabIcon from "./ui/AnimatedTabIcon";
import { LAYOUT, scale } from "../theme/layout";

import requestIcon from "../assets/requesticon.png";
const Tab = createBottomTabNavigator();

export default function BottomNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        animation: "fade",
        sceneStyle: { backgroundColor: "#F8FAFC", flex: 1 },

        tabBarIcon: ({ focused }) => {
          if (route.name === "Request") {
            return (
              <AnimatedTabIcon focused={focused}>
                <Image
                  source={requestIcon}
                  style={[
                    styles.requestIcon,
                    { tintColor: focused ? "#2563EB" : "#94A3B8" },
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
                color={focused ? "#2563EB" : "#94A3B8"}
              />
            </AnimatedTabIcon>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardPage} />
      <Tab.Screen name="Ride" component={RideHistory} />
      <Tab.Screen name="Request" component={MyRequest} />
      <Tab.Screen name="Profile" component={MyProfile} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: LAYOUT.sizes.tabBarHeight,
    position: "absolute",
    left: scale(16),
    right: scale(16),
    bottom: LAYOUT.sizes.tabBarBottom,
    borderRadius: scale(18),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    paddingTop: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  tabItem: {
    paddingVertical: 6,
  },
  requestIcon: {
    width: scale(20),
    height: scale(20),
    resizeMode: "contain",
  },
});
