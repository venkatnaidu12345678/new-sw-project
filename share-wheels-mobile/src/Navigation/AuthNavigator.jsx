import React, { createContext, useContext, useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RideHistory from "../Components/RideHistory";
import SplashBottomSection from "../Components/SplashComponents/SplashBottomSection";
import LoginPage from "../Screens/Login/LoginPage";
import SignupPage from "../Screens/Signup/SignupPage";

import BottomNavigator from "../Components/BottomNavigator";
import DashboardPage from "../Screens/DashboardPage";
import CreateRidePage from "../Screens/CreateRidePage";
import PassengerRequest from "../Screens/PassengerRequest";
import { userProfile } from "../ApiService/ridesApiServices";
import CourierRequest from "../Screens/CourierRequest"
import ChartBoat from "../Screens/ChartBoat"
import RideDetails from "../Components/RideDetails"
import RideCreated from "../Components/EnRoute"
import Request from "../Components/MyRequest"
import UpcomingDetailsPage from "../Screens/UpcomingDetailsPage"
import RideChat from "../Screens/RideChat"
import { verifyTokenApi } from "../ApiService/AuthApiService";
import Legal from "../Components/Legal"
import NotificationScreen from "../Components/NotificationScreen"
const Stack = createNativeStackNavigator();

const ProfileContext = createContext();

export const profileData = () => useContext(ProfileContext);

const AuthNavigator = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refresh, setRefresh] = useState(0); // ✅ trigger state
  const [userData, setUserData] = useState(null);
  const [refreshUpcomingRides, setRefreshUpcomingrides] = useState(true);
  const [ProfileDetails, SetProfileDetails] = useState([]);
console.log("userData:",ProfileDetails)

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const res = await verifyTokenApi(token);

      if (res?.success) {
        setIsAuthenticated(true);
        getProfileData(token)
      } else {
        await AsyncStorage.removeItem("token");
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.log("Auth error", err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const getProfileData = async (token) => {
    console.log("Token:", token);

    try {
      const response = await userProfile(token);
      SetProfileDetails(response);

    } catch (error) {
      console.log("Profile Error:", error);
    }
  };
  console.log('response:', ProfileDetails);
  useEffect(() => {
    checkAuth();
  }, [refresh]); // ✅ re-run when triggered

  if (loading) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen name="Splash" component={SplashBottomSection} />
      </Stack.Navigator>
    );
  }

  return (
    <ProfileContext.Provider value={{ userData, setUserData, refresh, setRefresh, refreshUpcomingRides, setRefreshUpcomingrides, ProfileDetails, SetProfileDetails }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          animationDuration: 280,
          gestureEnabled: true,
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Splash" component={SplashBottomSection} />
            <Stack.Screen name="Signin">
              {(props) => (
                <LoginPage
                  {...props}
                  triggerAuth={() => setRefresh((prev) => prev + 1)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {(props) => (
                <SignupPage
                  {...props}
                  triggerAuth={() => setRefresh((prev) => prev + 1)}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Navigator" component={BottomNavigator} />
            <Stack.Screen name="Dashboard" component={DashboardPage} />
            
            <Stack.Screen name="CreateRide" component={CreateRidePage} />
            <Stack.Screen name="PassengerRequest" component={PassengerRequest} />
            <Stack.Screen name="ChartBoat" component={ChartBoat} />
            <Stack.Screen name="CourierRequest" component={CourierRequest} />
            <Stack.Screen name="RideDetails" component={RideDetails} />
            <Stack.Screen name="RideCreated" component={RideCreated} />
            <Stack.Screen name="UpcomingDetailsPage" component={UpcomingDetailsPage} />
            <Stack.Screen name="RideChat" component={RideChat} />
            <Stack.Screen name="RideHistory" component={RideHistory} />
            <Stack.Screen name="Legal" component={Legal} />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
            <Stack.Screen name="Request" component={Request} />


          </>
        )}
      </Stack.Navigator>

    </ProfileContext.Provider>

  );
};

export default AuthNavigator;
