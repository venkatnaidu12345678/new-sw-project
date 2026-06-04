/**
 * Themed in-app alerts and toasts. Register via AppAlertProvider in App.jsx.
 * Drop-in helpers for forms — same call shape as Alert.alert where possible.
 */

let bridge = null;

export const registerAppAlertBridge = (handlers) => {
  bridge = handlers;
};

export const unregisterAppAlertBridge = () => {
  bridge = null;
};

/**
 * @param {string} title
 * @param {string} [message]
 * @param {Array<{text: string, onPress?: () => void, style?: string}>} [buttons]
 * @param {'info'|'success'|'warning'|'error'} [variant]
 */
export const showAppAlert = (title, message = "", buttons, variant = "info") => {
  if (bridge?.showAlert) {
    bridge.showAlert({ title, message, buttons, variant });
    return;
  }
  const { Alert } = require("react-native");
  Alert.alert(title, message, buttons);
};

export const showAppToast = (message, variant = "info", durationMs) => {
  if (bridge?.showToast) {
    bridge.showToast({ message, variant, durationMs });
    return;
  }
};

export const alertValidation = (message) =>
  showAppAlert("Check your details", message, [{ text: "OK" }], "warning");

export const alertError = (message, title = "Something went wrong") =>
  showAppAlert(title, message, [{ text: "OK" }], "error");

export const alertSuccess = (message, title = "Done") =>
  showAppAlert(title, message, [{ text: "OK" }], "success");
