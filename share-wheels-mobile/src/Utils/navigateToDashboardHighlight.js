/** Navigate to Home dashboard and highlight an upcoming ride card. */
export const goToDashboardWithRideHighlight = ({
  navigation,
  rideId,
  label,
  setRefreshUpcomingrides,
  setPendingHighlightRideId,
  setPendingHighlightLabel,
}) => {
  setRefreshUpcomingrides?.((prev) => !prev);
  if (rideId && setPendingHighlightRideId) {
    setPendingHighlightRideId(String(rideId));
  }
  if (label && setPendingHighlightLabel) {
    setPendingHighlightLabel(label);
  }
  navigation.navigate("Navigator", {
    screen: "Home",
    params: { screen: "DashboardMain" },
  });
};

export const bookingHighlightLabel = (bookingStatus) =>
  bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
