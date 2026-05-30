import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardPage from "../Screens/DashboardPage";
import UpcomingDetailsPage from "../Screens/UpcomingDetailsPage";

const Stack = createNativeStackNavigator();

/** Home tab stack — keeps bottom tabs visible when opening ride details from dashboard. */
export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardPage} />
      <Stack.Screen name="UpcomingDetailsPage" component={UpcomingDetailsPage} />
    </Stack.Navigator>
  );
}
