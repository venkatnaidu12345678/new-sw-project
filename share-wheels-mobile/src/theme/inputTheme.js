import { LAYOUT } from "./layout";

/** Shared input colors — fixes invisible placeholders on Android */
export const INPUT_COLORS = {
  placeholder: "#9CA3AF",
  text: "#0F172A",
  border: "#E2E8F0",
  background: "#FFFFFF",
  error: "#EF4444",
};

export const inputFieldStyle = {
  color: INPUT_COLORS.text,
  borderWidth: 1,
  borderColor: INPUT_COLORS.border,
  borderRadius: LAYOUT.radius.md,
  paddingHorizontal: LAYOUT.spacing.md,
  backgroundColor: INPUT_COLORS.background,
  fontSize: LAYOUT.font.body,
};

/** Spread on any TextInput */
export const inputDefaults = {
  placeholderTextColor: INPUT_COLORS.placeholder,
};
