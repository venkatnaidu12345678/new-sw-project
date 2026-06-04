import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "./ThemeContext";
import {
  registerAppAlertBridge,
  unregisterAppAlertBridge,
} from "../Utils/appAlert";
import { DS } from "../theme/designSystem";

const AppAlertContext = createContext(null);

const VARIANT_META = {
  info: { icon: "information-circle", accentKey: "info" },
  success: { icon: "checkmark-circle", accentKey: "success" },
  warning: { icon: "warning", accentKey: "warning" },
  error: { icon: "alert-circle", accentKey: "error" },
};

const TOAST_DURATION_MS = 3200;

export const AppAlertProvider = ({ children }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [toastOpacity]);

  const showToast = useCallback(
    ({ message, variant = "info", durationMs = TOAST_DURATION_MS }) => {
      if (!message) return;
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ message, variant });
      toastOpacity.setValue(0);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      toastTimer.current = setTimeout(dismissToast, durationMs);
    },
    [dismissToast, toastOpacity]
  );

  const showAlert = useCallback(({ title, message, buttons, variant = "info" }) => {
    const normalized =
      Array.isArray(buttons) && buttons.length
        ? buttons
        : [{ text: "OK" }];
    setDialog({
      title: title || "Notice",
      message: message || "",
      buttons: normalized,
      variant,
    });
  }, []);

  useEffect(() => {
    registerAppAlertBridge({ showAlert, showToast });
    return () => unregisterAppAlertBridge();
  }, [showAlert, showToast]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const closeDialog = useCallback(() => setDialog(null), []);

  const value = useMemo(
    () => ({ showAlert, showToast, closeDialog }),
    [showAlert, showToast, closeDialog]
  );

  const dialogVariant = dialog?.variant || "info";
  const meta = VARIANT_META[dialogVariant] || VARIANT_META.info;
  const accent = {
    info: { bg: colors.infoBg, text: colors.infoText, border: colors.primary },
    success: { bg: colors.successBg, text: colors.successText, border: colors.successText },
    warning: { bg: colors.warningBg, text: colors.warningText, border: colors.warningBorder },
    error: { bg: colors.errorBg, text: colors.errorText, border: colors.errorBorder },
  }[meta.accentKey];

  const toastMeta = VARIANT_META[toast?.variant || "info"] || VARIANT_META.info;
  const toastAccent = {
    info: { bg: colors.infoBg, text: colors.infoText },
    success: { bg: colors.successBg, text: colors.successText },
    warning: { bg: colors.warningBg, text: colors.warningText },
    error: { bg: colors.errorBg, text: colors.errorText },
  }[toastMeta.accentKey];

  return (
    <AppAlertContext.Provider value={value}>
      {children}

      <Modal
        visible={!!dialog}
        transparent
        animationType="fade"
        onRequestClose={closeDialog}
      >
        <Pressable style={styles.backdrop} onPress={closeDialog}>
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
              <Icon name={meta.icon} size={28} color={accent.text} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{dialog?.title}</Text>
            {dialog?.message ? (
              <Text style={[styles.message, { color: colors.textMuted }]}>
                {dialog.message}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {dialog?.buttons?.map((btn, idx) => {
                const isCancel = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";
                return (
                  <TouchableOpacity
                    key={`${btn.text}-${idx}`}
                    style={[
                      styles.actionBtn,
                      isCancel && {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                      !isCancel && {
                        backgroundColor: isDestructive ? colors.errorBg : colors.primary,
                        borderColor: isDestructive ? colors.errorBorder : colors.primary,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      closeDialog();
                      btn.onPress?.();
                    }}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: isCancel
                            ? colors.text
                            : isDestructive
                              ? colors.errorText
                              : colors.inverseText,
                        },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            {
              top: insets.top + (Platform.OS === "android" ? 8 : 4),
              opacity: toastOpacity,
              transform: [
                {
                  translateY: toastOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={dismissToast}
            style={[
              styles.toast,
              {
                backgroundColor: toastAccent.bg,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon
              name={(VARIANT_META[toast.variant] || VARIANT_META.info).icon}
              size={20}
              color={toastAccent.text}
            />
            <Text style={[styles.toastText, { color: toastAccent.text }]}>
              {toast.message}
            </Text>
            <Icon name="close" size={18} color={toastAccent.text} />
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = () => {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert must be used within AppAlertProvider");
  }
  return ctx;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: DS.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    padding: DS.spacing.lg,
    alignItems: "center",
    ...DS.shadow.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DS.spacing.md,
  },
  title: {
    fontSize: DS.font.section,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: DS.spacing.sm,
  },
  message: {
    fontSize: DS.font.body,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: DS.spacing.lg,
  },
  actions: {
    width: "100%",
    gap: DS.spacing.sm,
  },
  actionBtn: {
    minHeight: 46,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DS.spacing.md,
  },
  actionText: {
    fontSize: DS.font.label,
    fontWeight: "700",
  },
  toastWrap: {
    position: "absolute",
    left: DS.spacing.md,
    right: DS.spacing.md,
    zIndex: 9999,
    elevation: 12,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...DS.shadow.card,
  },
  toastText: {
    flex: 1,
    fontSize: DS.font.label,
    fontWeight: "600",
    lineHeight: 20,
  },
});
