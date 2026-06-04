import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@sw_coach_marks_done_";

export const isTourCompleted = async (tourId) => {
  try {
    return (await AsyncStorage.getItem(`${PREFIX}${tourId}`)) === "true";
  } catch {
    return false;
  }
};

export const markTourCompleted = async (tourId) => {
  try {
    await AsyncStorage.setItem(`${PREFIX}${tourId}`, "true");
  } catch {
    /* ignore */
  }
};

export const clearTourCompleted = async (tourId) => {
  try {
    await AsyncStorage.removeItem(`${PREFIX}${tourId}`);
  } catch {
    /* ignore */
  }
};
