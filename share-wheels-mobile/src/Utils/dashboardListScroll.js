/** Shared refs for dashboard SectionList + native scroll target. */
export const dashboardListScrollRefs = {
  list: null,
  native: null,
};

const UPCOMING_RIDE_CARD_ESTIMATE = 220;
const UPCOMING_STICKY_HEADER_ALLOWANCE = 56;

export const attachDashboardListRef = (instance) => {
  dashboardListScrollRefs.list = instance;
  if (!instance) {
    dashboardListScrollRefs.native = null;
    return;
  }

  const resolveNative = () => {
    const list = dashboardListScrollRefs.list;
    if (!list) return;

    if (typeof list.getNativeScrollRef === "function") {
      dashboardListScrollRefs.native = list.getNativeScrollRef();
    }
    if (
      !dashboardListScrollRefs.native &&
      typeof list.getScrollResponder === "function"
    ) {
      dashboardListScrollRefs.native = list.getScrollResponder();
    }
    if (!dashboardListScrollRefs.native) {
      dashboardListScrollRefs.native = list;
    }
  };

  resolveNative();
  requestAnimationFrame(resolveNative);
};

export const scrollDashboardListToOffset = ({ offset, animated = true } = {}) => {
  const list = dashboardListScrollRefs.list;
  const native = dashboardListScrollRefs.native;

  try {
    if (typeof list?.scrollToOffset === "function") {
      list.scrollToOffset({ offset, animated });
      return;
    }

    if (native?.scrollTo) {
      native.scrollTo({ y: offset, animated });
      return;
    }

    if (typeof native?.scrollResponderScrollTo === "function") {
      native.scrollResponderScrollTo({ x: 0, y: offset, animated });
      return;
    }

    native?.scrollTo?.({ y: offset, animated });
  } catch (error) {
    console.warn("scrollDashboardListToOffset failed:", error?.message);
  }
};

export const scrollDashboardListToLocation = (params) => {
  const list = dashboardListScrollRefs.list;
  if (!list || typeof list.scrollToLocation !== "function") return false;
  list.scrollToLocation(params);
  return true;
};

/** Scroll the dashboard list so a ride in Upcoming Rides is visible. */
export const scrollDashboardToUpcomingRide = ({
  itemIndex = 0,
  headerOffset = 0,
  animated = true,
  viewPosition = 0.12,
} = {}) => {
  const list = dashboardListScrollRefs.list;
  const safeHeader = Math.max(0, headerOffset);

  if (list && typeof list.scrollToLocation === "function") {
    try {
      list.scrollToLocation({
        sectionIndex: 0,
        itemIndex,
        animated,
        viewPosition,
      });
      return true;
    } catch {
      // fall through to offset scroll
    }
  }

  scrollDashboardListToOffset({
    offset: Math.max(
      0,
      safeHeader +
        itemIndex * UPCOMING_RIDE_CARD_ESTIMATE -
        UPCOMING_STICKY_HEADER_ALLOWANCE
    ),
    animated,
  });
  return true;
};

/**
 * Retry scroll until SectionList ref and list header layout are ready
 * (needed after navigation reset when dashboard mounts fresh).
 */
export const scrollDashboardToUpcomingRideWhenReady = (
  { getHeaderOffset, itemIndex = 0, viewPosition = 0.12 } = {},
  { maxAttempts = 10, intervalMs = 120 } = {}
) => {
  let attempt = 0;

  const resolveHeaderOffset = () => {
    const measured =
      typeof getHeaderOffset === "function" ? getHeaderOffset() : 0;
    return Math.max(0, measured || 0);
  };

  const tick = () => {
    attempt += 1;
    const list = dashboardListScrollRefs.list;
    const headerOffset = resolveHeaderOffset();
    const headerReady = headerOffset > 0 || attempt >= 4;

    if (list && headerReady) {
      const scrollParams = {
        itemIndex,
        headerOffset: headerOffset || 320,
        viewPosition,
      };
      scrollDashboardToUpcomingRide(scrollParams);
      setTimeout(() => {
        scrollDashboardToUpcomingRide({
          ...scrollParams,
          headerOffset: resolveHeaderOffset() || scrollParams.headerOffset,
          animated: true,
        });
      }, 300);
      return;
    }

    if (attempt < maxAttempts) {
      setTimeout(tick, intervalMs);
    } else {
      scrollDashboardToUpcomingRide({
        itemIndex,
        headerOffset: resolveHeaderOffset() || 320,
        viewPosition,
      });
    }
  };

  requestAnimationFrame(() => setTimeout(tick, 100));
};
