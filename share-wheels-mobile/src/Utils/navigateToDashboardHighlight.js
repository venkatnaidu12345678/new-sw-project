import { CommonActions } from "@react-navigation/native";

const getRootNavigation = (navigation) => {
  let root = navigation;
  while (root?.getParent?.()) {
    root = root.getParent();
  }
  return root;
};

/** Navigate to Home dashboard (no ride highlight). */
export const goToDashboard = ({ navigation, setRefreshUpcomingrides }) => {
  setRefreshUpcomingrides?.((prev) => !prev);

  getRootNavigation(navigation).dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "Navigator",
          state: {
            index: 0,
            routes: [
              {
                name: "Home",
                state: {
                  index: 0,
                  routes: [{ name: "DashboardMain" }],
                },
              },
            ],
          },
        },
      ],
    })
  );
};

/** Navigate to Home dashboard and highlight an upcoming ride card. */
export const goToDashboardWithRideHighlight = ({
  navigation,
  rideId,
  label,
  setRefreshUpcomingrides,
  setPendingHighlightRideId,
  setPendingHighlightLabel,
}) => {
  const rideIdStr = rideId ? String(rideId) : null;
  const highlightLabel = label || "Your new ride";

  setRefreshUpcomingrides?.((prev) => !prev);
  if (rideIdStr && setPendingHighlightRideId) {
    setPendingHighlightRideId(rideIdStr);
  }
  if (setPendingHighlightLabel) {
    setPendingHighlightLabel(highlightLabel);
  }

  getRootNavigation(navigation).dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: "Navigator",
          state: {
            index: 0,
            routes: [
              {
                name: "Home",
                state: {
                  index: 0,
                  routes: [
                    {
                      name: "DashboardMain",
                      params: {
                        highlightRideId: rideIdStr,
                        highlightLabel,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    })
  );
};

export const bookingHighlightLabel = (bookingStatus) =>
  bookingStatus === "confirmed" ? "Booking confirmed" : "Request sent";
