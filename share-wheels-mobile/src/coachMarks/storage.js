import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@sw_coach_marks_done_";
const PENDING_KEY = "@sw_pending_main_app_tour";

const completionKey = (tourId, userId) =>
  userId ? `${PREFIX}${tourId}_${userId}` : `${PREFIX}${tourId}`;

export const isTourCompleted = async (tourId, userId = null) => {
  try {
    return (await AsyncStorage.getItem(completionKey(tourId, userId))) === "true";
  } catch {
    return false;
  }
};

export const markTourCompleted = async (tourId, userId = null) => {
  try {
    await AsyncStorage.setItem(completionKey(tourId, userId), "true");
  } catch {
    /* ignore */
  }
};

export const clearTourCompleted = async (tourId, userId = null) => {
  try {
    await AsyncStorage.removeItem(completionKey(tourId, userId));
  } catch {
    /* ignore */
  }
};

/** Set when a new user accepts terms — triggers one auto tour. */
export const setPendingAppTour = async () => {
  try {
    await AsyncStorage.setItem(PENDING_KEY, "true");
  } catch {
    /* ignore */
  }
};

/** Returns true once if a pending auto tour was queued (then clears the flag). */
export const consumePendingAppTour = async () => {
  try {
    const pending = (await AsyncStorage.getItem(PENDING_KEY)) === "true";
    if (pending) {
      await AsyncStorage.removeItem(PENDING_KEY);
    }
    return pending;
  } catch {
    return false;
  }
};
