import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * @param {(colors: import('./appTheme').lightTheme) => object} factory
 */
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
