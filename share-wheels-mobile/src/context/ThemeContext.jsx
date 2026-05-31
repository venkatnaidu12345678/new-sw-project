import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { lightTheme, darkTheme, getInputColors } from "../theme/appTheme";

const THEME_STORAGE_KEY = "@sw_dark_theme";

const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: false,
      colors: lightTheme,
      input: getInputColors(lightTheme),
      toggleTheme: () => {},
      setDarkMode: () => {},
      ready: true,
    };
  }
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((v) => {
        if (v === "true") setIsDark(true);
      })
      .finally(() => setReady(true));
  }, []);

  const setDarkMode = useCallback(async (value) => {
    setIsDark(!!value);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? "true" : "false");
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  }, []);

  const colors = isDark ? darkTheme : lightTheme;

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors]);

  const input = useMemo(() => getInputColors(colors), [colors]);

  const value = useMemo(
    () => ({
      isDark,
      colors,
      input,
      toggleTheme,
      setDarkMode,
      ready,
      navigationTheme,
    }),
    [isDark, colors, input, toggleTheme, setDarkMode, ready, navigationTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
