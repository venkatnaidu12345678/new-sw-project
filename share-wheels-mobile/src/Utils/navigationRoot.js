import { navigateToRootScreen } from "./mainTabNavigation";

/**
 * Navigate a screen on the root stack (above tab navigator).
 */
export const navigateRoot = (navigation, screen, params) => {
  if (!navigation || !screen) return false;
  try {
    navigateToRootScreen(navigation, screen, params);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[navigateRoot]", screen, e?.message);
    return false;
  }
};
