/** Bottom tab route names inside `Navigator`. */
export const MAIN_TAB_NAMES = ["Home", "Ride", "Request", "Profile"];

/** Tabs where the global create (+) FAB should stay visible. */
export const CREATE_FAB_TAB_NAMES = ["Home", "Ride", "Request"];

/**
 * Resolve the active bottom-tab name from any navigation state tree
 * (stack → Navigator → tab → nested stack).
 */
export const getActiveMainTabName = (navState) => {
  if (!navState?.routes?.length) return null;

  const index = navState.index ?? 0;
  const route = navState.routes[index];
  if (!route) return null;

  if (MAIN_TAB_NAMES.includes(route.name)) {
    return route.name;
  }

  if (route.state) {
    return getActiveMainTabName(route.state);
  }

  return null;
};

export const shouldShowCreateFab = (navState) => {
  const tab = getActiveMainTabName(navState);
  return CREATE_FAB_TAB_NAMES.includes(tab);
};

/** Walk up to the root navigator and open a stack screen (CreateRide, etc.). */
export const navigateToRootScreen = (navigation, screen, params) => {
  let nav = navigation;
  let parent = nav?.getParent?.();
  while (parent) {
    nav = parent;
    parent = nav.getParent?.();
  }
  nav.navigate(screen, params);
};
