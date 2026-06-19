/** Main launch tour — auto-starts once for new users after terms acceptance. */
export const MAIN_APP_TOUR_ID = "main_v1";

export const TAB_ANCHOR_BY_ROUTE = {
  Home: "tab_home",
  Ride: "tab_ride",
  Request: "tab_request",
  Profile: "tab_profile",
};

export const mainAppTourSteps = [
  {
    id: "welcome",
    title: "Welcome to Share Wheels",
    body:
      "A quick tour of the app. You can replay this anytime from Profile → Show app tour.",
    placement: "center",
  },
  {
    id: "search",
    anchorId: "home_search",
    tab: "Home",
    title: "Find a ride",
    body: "Enter From and To, pick a date, then search for rides that match your route.",
    placement: "bottom",
  },
  {
    id: "upcoming",
    anchorId: "home_upcoming",
    tab: "Home",
    title: "Upcoming rides first",
    body: "Your pending and started rides appear here first, sorted by priority.",
    placement: "bottom",
  },
  {
    id: "fab",
    anchorId: "fab_create",
    tab: "Home",
    title: "Create or request",
    body:
      "Tap + to offer a ride as a driver, request a seat as a passenger, or send a courier package.",
    placement: "top",
  },
  {
    id: "requests",
    anchorId: "tab_request",
    tab: "Request",
    title: "My requests",
    body: "Track passenger and courier requests, view details, and find related rides.",
    placement: "top",
  },
  {
    id: "history",
    anchorId: "tab_ride",
    tab: "Ride",
    title: "Ride history",
    body: "See completed and past rides in one place.",
    placement: "top",
  },
  {
    id: "notifications",
    anchorId: "home_notifications",
    tab: "Home",
    title: "Notifications",
    body: "Ride updates, acceptances, and reminders appear here.",
    placement: "bottom",
  },
  {
    id: "profile",
    anchorId: "tab_profile",
    tab: "Profile",
    title: "Your profile",
    body: "Update details, vehicle info, theme, legal policies, and support.",
    placement: "top",
  },
];
