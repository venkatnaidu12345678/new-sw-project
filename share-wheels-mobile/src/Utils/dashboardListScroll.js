/** Shared refs for dashboard SectionList + native scroll target. */
export const dashboardListScrollRefs = {
  list: null,
  native: null,
};

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
