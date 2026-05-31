import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardPage from "../Screens/DashboardPage";
import UpcomingDetailsPage from "../Screens/UpcomingDetailsPage";
import { useTheme } from "../context/ThemeContext";

const Stack = createNativeStackNavigator();

/** Home tab stack — keeps bottom tabs visible when opening ride details from dashboard. */
export default function HomeStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardPage} />
      <Stack.Screen name="UpcomingDetailsPage" component={UpcomingDetailsPage} />
    </Stack.Navigator>
  );
}
