import React, { createContext, useContext, useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import SplashScreen from "../Screens/Splash/SplashScreen";
import LoginPage from "../Screens/Login/LoginPage";
import SignupPage from "../Screens/Signup/SignupPage";
import OtpVerificationPage from "../Screens/OtpVerification/OtpVerificationPage";
import ForgotPasswordPage from "../Screens/ForgotPassword/ForgotPasswordPage";
import BottomNavigator from "../Components/BottomNavigator";
import CreateRidePage from "../Screens/CreateRidePage";
import PassengerRequest from "../Screens/PassengerRequest";
import CourierRequest from "../Screens/CourierRequest";
import ChartBoat from "../Screens/ChartBoat";
import RideDetails from "../Components/RideDetails";
import RideCreated from "../Components/EnRoute";
import UpcomingDetailsPage from "../Screens/UpcomingDetailsPage";
import RideChat from "../Screens/RideChat";
import RideLiveMap from "../Screens/RideLiveMap";
import RideHistory from "../Components/RideHistory";
import Legal from "../Components/Legal";
import DriverSubscriptionScreen from "../Screens/DriverSubscriptionScreen";
import NotificationScreen from "../Components/NotificationScreen";
import { userProfile } from "../ApiService/ridesApiServices";
import { verifyTokenApi } from "../ApiService/AuthApiService";
import DriverLocationTracker from "../Components/DriverLocationTracker";
import {
  installRideBackgroundKeepAlive,
  uninstallRideBackgroundKeepAlive,
} from "../liveTracking/rideBackgroundKeepAlive";
import { clearAuthSession } from "../Utils/authSession";
import {
  MIN_BOOTSTRAP_SPLASH_MS,
  SPLASH_LAUNCH_BACKGROUND,
} from "../theme/splashTiming";
import { NotificationsProvider } from "../context/NotificationsContext";
import { useAppSocketConnection } from "../hooks/useAppSocket";
import { syncFcmTokenWithBackend } from "../Notifications/registerToken";
import { AUTH_COLORS } from "../theme/authTheme";
import { useTheme } from "../context/ThemeContext";
import {
  syncCrashlyticsUser,
  clearCrashlyticsUser,
} from "../services/crashlytics";

const Stack = createNativeStackNavigator();
const ProfileContext = createContext(null);

export const profileData = () => useContext(ProfileContext);

const AuthNavigator = () => {
  const { colors } = useTheme();
  const [booting, setBooting] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const stackBackground = booting
    ? SPLASH_LAUNCH_BACKGROUND
    : isAuthenticated
      ? colors.background
      : AUTH_COLORS.background;

  const authScreenOptions = {
    headerShown: false,
    animation: "fade",
    contentStyle: {
      backgroundColor: stackBackground,
    },
  };
  const [refresh, setRefresh] = useState(0);
  const [userData, setUserData] = useState(null);
  const [refreshUpcomingRides, setRefreshUpcomingrides] = useState(true);
  const [pendingHighlightRideId, setPendingHighlightRideId] = useState(null);
  const [pendingHighlightLabel, setPendingHighlightLabel] = useState(null);
  const [ProfileDetails, SetProfileDetails] = useState(null);

  useAppSocketConnection(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      installRideBackgroundKeepAlive();
      return () => uninstallRideBackgroundKeepAlive();
    }
    uninstallRideBackgroundKeepAlive();
    return undefined;
  }, [isAuthenticated]);

  const getProfileData = async (token) => {
    try {
      const response = await userProfile(token);
      SetProfileDetails(response);
    } catch (error) {
      console.log("Profile Error:", error);
    }
  };

  const keepSessionWithToken = async (token) => {
    setIsAuthenticated(true);
    await getProfileData(token);
    syncFcmTokenWithBackend({ force: true }).catch(() => {});
  };

  const isTokenAuthFailure = (res) => {
    const code = String(res?.code || "").toUpperCase();
    if (code === "TOKEN_EXPIRED" || code === "TOKEN_INVALID") return true;
    const msg = String(res?.message || "").toLowerCase();
    return (
      msg.includes("invalid token") ||
      msg.includes("token expired") ||
      msg.includes("token missing")
    );
  };

  const checkAuth = async () => {
    const startedAt = Date.now();
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      const res = await Promise.race([
        verifyTokenApi(token),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth check timeout")), 10000)
        ),
      ]);
      if (res?.success) {
        await keepSessionWithToken(token);
      } else if (isTokenAuthFailure(res)) {
        await AsyncStorage.multiRemove(["token", "user", "USER_NAME"]);
        setIsAuthenticated(false);
      } else {
        // Server unreachable or transient error — keep local session
        await keepSessionWithToken(token);
      }
    } catch {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        await keepSessionWithToken(token);
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_BOOTSTRAP_SPLASH_MS - elapsed);
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      setBooting(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [refresh]);

  useEffect(() => {
    if (ProfileDetails) {
      syncCrashlyticsUser(ProfileDetails).catch(() => {});
    } else if (!isAuthenticated) {
      clearCrashlyticsUser().catch(() => {});
    }
  }, [ProfileDetails, isAuthenticated]);

  const logout = async () => {
    await clearAuthSession();
    SetProfileDetails(null);
    setUserData(null);
    setIsAuthenticated(false);
  };

  if (booting) {
    return (
      <Stack.Navigator screenOptions={authScreenOptions}>
        <Stack.Screen name="Bootstrap">
          {() => <SplashScreen mode="bootstrap" />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <ProfileContext.Provider
      value={{
        userData,
        setUserData,
        refresh,
        setRefresh,
        refreshUpcomingRides,
        setRefreshUpcomingrides,
        pendingHighlightRideId,
        setPendingHighlightRideId,
        pendingHighlightLabel,
        setPendingHighlightLabel,
        ProfileDetails,
        SetProfileDetails,
        logout,
      }}
    >
      <NotificationsProvider isAuthenticated={isAuthenticated}>
      {isAuthenticated ? (
        <>
          <DriverLocationTracker />
        </>
      ) : null}
      <Stack.Navigator screenOptions={authScreenOptions}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Signin">
              {(props) => (
                <LoginPage
                  {...props}
                  triggerAuth={() => setRefresh((prev) => prev + 1)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Signup"
              options={{ animation: "slide_from_right" }}
            >
              {(props) => (
                <SignupPage
                  {...props}
                  triggerAuth={() => setRefresh((prev) => prev + 1)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="OtpVerification"
              options={{ animation: "slide_from_right" }}
            >
              {(props) => (
                <OtpVerificationPage
                  {...props}
                  triggerAuth={() => setRefresh((prev) => prev + 1)}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="ForgotPassword"
              options={{ animation: "slide_from_right" }}
              component={ForgotPasswordPage}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Navigator" component={BottomNavigator} />
            <Stack.Screen name="CreateRide" component={CreateRidePage} />
            <Stack.Screen name="PassengerRequest" component={PassengerRequest} />
            <Stack.Screen name="CourierRequest" component={CourierRequest} />
            <Stack.Screen name="ChartBoat" component={ChartBoat} />
            <Stack.Screen name="RideDetails" component={RideDetails} />
            <Stack.Screen name="RideCreated" component={RideCreated} />
            <Stack.Screen name="UpcomingDetailsPage" component={UpcomingDetailsPage} />
            <Stack.Screen name="RideChat" component={RideChat} />
            <Stack.Screen name="RideLiveMap" component={RideLiveMap} />
            <Stack.Screen name="RideHistory" component={RideHistory} />
            <Stack.Screen name="Legal" component={Legal} />
            <Stack.Screen
              name="DriverSubscription"
              component={DriverSubscriptionScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
          </>
        )}
      </Stack.Navigator>
      </NotificationsProvider>
    </ProfileContext.Provider>
  );
};

export default AuthNavigator;
