import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { Picker } from "@react-native-picker/picker";

import { DS } from "../../theme/designSystem";
import { useTheme } from "../../context/ThemeContext";
import { useScrollFieldIntoView } from "./keyboardScrollContext";

export const RequestHero = ({
  theme,
  icon = "people",
  title,
  subtitle,
  pills = [],
}) => (
  <LinearGradient
    colors={theme.gradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.hero}
  >
    <View style={styles.heroDecor} />
    <View style={styles.heroRow}>
      <View style={styles.heroIconWrap}>
        <Icon name={icon} size={28} color={theme.heroIcon} />
      </View>
      <View style={styles.heroText}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
    </View>
    {pills.length > 0 ? (
      <View style={styles.heroPills}>
        {pills.map((pill) => (
          <View key={pill} style={styles.pill}>
            <Text style={styles.pillText}>{pill}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </LinearGradient>
);

export const RequestSection = ({
  accent,
  title,
  subtitle,
  children,
  style,
  theme,
}) => (
  <View style={[styles.section, style]}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: accent.bg }]}>
        <Icon name={accent.icon} size={20} color={accent.color} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
    <View
      style={[
        styles.sectionCard,
        {
          borderLeftColor: accent.color,
          borderColor: theme.cardBorder,
          backgroundColor: theme.surface,
        },
      ]}
    >
      {children}
    </View>
  </View>
);

export const StyledField = ({
  label,
  required,
  children,
  theme,
}) => (
  <View style={styles.field}>
    {label ? (
      <Text style={[styles.fieldLabel, { color: theme.text }]}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
    ) : null}
    {children}
  </View>
);

export const StyledTextInput = ({
  theme,
  accent,
  icon,
  style,
  multiline,
  onFocus,
  scrollOnFocus = false,
  ...props
}) => {
  const { input } = useTheme();
  const wrapRef = useRef(null);
  const scrollFieldIntoView = useScrollFieldIntoView();

  return (
  <View
    ref={wrapRef}
    collapsable={false}
    style={[
      styles.inputWrap,
      multiline && styles.inputWrapMultiline,
      {
        backgroundColor: accent?.bg || input.background,
        borderColor: accent?.border || input.border,
      },
    ]}
  >
      {icon ? (
        <View
          style={[
            styles.inputIconWrap,
            { backgroundColor: theme.surface },
          ]}
        >
          <Icon name={icon} size={18} color={accent?.icon || theme.textMuted} />
        </View>
      ) : null}
      <TextInput
        style={[
          styles.input,
          { color: input.text },
          icon && styles.inputWithIcon,
          multiline && styles.inputMultiline,
          style,
        ]}
        placeholderTextColor={input.placeholder}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        onFocus={(event) => {
          onFocus?.(event);
          if (scrollOnFocus) {
            requestAnimationFrame(() => {
              scrollFieldIntoView(wrapRef, { dropdownSpace: multiline ? 48 : 0 });
            });
          }
        }}
        {...props}
      />
    </View>
  );
};

/** Picker.Item colors for Android's dialog surface (stays light even in app dark mode). */
const ANDROID_DIALOG_TEXT = "#0F172A";
const ANDROID_DIALOG_PLACEHOLDER = "#64748B";

export const StyledPicker = ({
  label,
  icon,
  selectedValue,
  onValueChange,
  items,
  theme,
  accent,
  enabled = true,
}) => {
  const { colors, input, isDark } = useTheme();
  const textColor = theme?.text || colors.text;
  const mutedColor = theme?.textMuted || colors.textMuted;
  const placeholderColor = input.placeholder;
  const pickerDisplayColor = input.text;
  const dropdownIcon = isDark ? colors.textSecondary : mutedColor;

  const getItemColor = (item) => {
    if (!item.value) {
      return Platform.OS === "android" && isDark
        ? ANDROID_DIALOG_PLACEHOLDER
        : placeholderColor;
    }
    if (Platform.OS === "android" && isDark) {
      return ANDROID_DIALOG_TEXT;
    }
    return textColor;
  };

  return (
    <StyledField label={label} theme={theme}>
      <View
        style={[
          styles.pickerWrap,
          {
            backgroundColor: accent?.bg || input.background,
            borderColor: accent?.border || input.border || theme.cardBorder,
          },
          !enabled && styles.pickerDisabled,
        ]}
      >
        {icon ? (
          <View
            style={[
              styles.pickerIconWrap,
              { backgroundColor: theme.surface || colors.surface },
            ]}
          >
            <Icon name={icon} size={18} color={accent?.icon || mutedColor} />
          </View>
        ) : null}
        <Picker
          enabled={enabled}
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          mode={Platform.OS === "android" ? "dialog" : undefined}
          prompt={Platform.OS === "android" ? label || "Select an option" : undefined}
          style={[
            styles.picker,
            {
              color: pickerDisplayColor,
              backgroundColor: "transparent",
            },
          ]}
          dropdownIconColor={dropdownIcon}
          itemStyle={
            Platform.OS === "ios"
              ? { color: textColor, fontSize: DS.font.body }
              : undefined
          }
        >
          {items.map((item) => (
            <Picker.Item
              key={`${item.value}-${item.label}`}
              label={item.label}
              value={item.value}
              color={getItemColor(item)}
            />
          ))}
        </Picker>
      </View>
    </StyledField>
  );
};

/** Seats stepper — matches CalenderRange card layout (theme.date accent). */
export const RequestSeatsStepper = ({
  theme,
  label = "Seats needed",
  value = 1,
  onChange,
  min = 1,
  max = 8,
}) => {
  const accent = theme.date;
  const cardStyle = {
    backgroundColor: accent.bg,
    borderColor: accent.border,
  };
  const controlStyle = {
    backgroundColor: theme.surface || "#FFFFFF",
    borderColor: accent.border,
  };
  const iconColor = accent.icon;
  const labelColor = theme.text;

  const seats = Math.max(min, Math.min(max, Number(value) || min));

  const decrease = () => {
    if (seats > min) onChange(seats - 1);
  };

  const increase = () => {
    if (seats < max) onChange(seats + 1);
  };

  return (
    <View style={seatsStyles.container}>
      <View style={[seatsStyles.inputCard, cardStyle]}>
        <View style={seatsStyles.labelRow}>
          <Icon name="people-outline" size={16} color={iconColor} />
          <Text style={[seatsStyles.label, { color: labelColor }]}>{label}</Text>
        </View>

        <View style={[seatsStyles.control, controlStyle]}>
          <TouchableOpacity
            onPress={decrease}
            disabled={seats <= min}
            style={seatsStyles.stepBtn}
            activeOpacity={0.7}
          >
            <Text
              style={[
                seatsStyles.stepBtnText,
                { color: theme.text },
                seats <= min && { color: theme.textMuted },
              ]}
            >
              −
            </Text>
          </TouchableOpacity>

          <Text style={[seatsStyles.count, { color: theme.text }]}>{seats}</Text>

          <TouchableOpacity
            onPress={increase}
            disabled={seats >= max}
            style={seatsStyles.stepBtn}
            activeOpacity={0.7}
          >
            <Text
              style={[
                seatsStyles.stepBtnText,
                { color: theme.text },
                seats >= max && { color: theme.textMuted },
              ]}
            >
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const RequestPriceInput = ({
  label = "Offered amount (₹)",
  value,
  onChangeText,
  theme,
  placeholder = "Enter amount you will pay",
}) => {
  const { input } = useTheme();

  return (
    <StyledField label={label} required theme={theme}>
      <View
        style={[
          styles.priceWrap,
          {
            backgroundColor: theme.price.bg,
            borderColor: theme.price.border,
          },
        ]}
      >
        <Text style={[styles.rupee, { color: theme.price.icon }]}>₹</Text>
        <TextInput
          style={[styles.priceInput, { color: input.text }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={input.placeholder}
          maxLength={7}
        />
      </View>
    </StyledField>
  );
};

/** Read-only total from per-seat × seats (not sent to API). */
export const RequestOfferTotal = ({ theme, perSeat, seats }) => {
  const per = Math.round(Number(perSeat) || 0);
  const seatCount = Math.max(1, Number(seats) || 1);
  if (per <= 0) return null;

  const total = per * seatCount;
  return (
    <View
      style={[
        styles.offerTotalWrap,
        {
          backgroundColor: theme.price.bg,
          borderColor: theme.price.border,
        },
      ]}
    >
      <View style={styles.offerTotalRow}>
        <Text style={[styles.offerTotalLabel, { color: theme.textMuted }]}>
          Total offer
        </Text>
        <Text style={[styles.offerTotalValue, { color: theme.text }]}>
          ₹{total}
        </Text>
      </View>
      <Text style={[styles.offerTotalHint, { color: theme.textMuted }]}>
        {seatCount} seat{seatCount !== 1 ? "s" : ""} × ₹{per} per seat
      </Text>
    </View>
  );
};

const VEHICLE_TYPE_ICONS = {
  bike: "bicycle-outline",
  auto: "car-outline",
  car: "car-sport-outline",
};

/** Vehicle type chips for passenger requests. */
export const RequestVehicleTypeChips = ({
  theme,
  label = "Vehicle type needed",
  value,
  onChange,
  options = [],
}) => {
  const accent = theme.sections?.vehicle || theme.sections?.preferences || theme.date;
  const cardStyle = {
    backgroundColor: accent.bg,
    borderColor: accent.border,
  };

  return (
    <View style={vehicleTypeStyles.container}>
      <View style={[vehicleTypeStyles.inputCard, cardStyle]}>
        <View style={vehicleTypeStyles.labelRow}>
          <Icon name="car-sport-outline" size={16} color={accent.icon || theme.text} />
          <Text style={[vehicleTypeStyles.label, { color: theme.text }]}>
            {label}
            <Text style={vehicleTypeStyles.req}> *</Text>
          </Text>
        </View>
        <View style={vehicleTypeStyles.wrap}>
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onChange(opt.value)}
                activeOpacity={0.82}
                style={[
                  vehicleTypeStyles.chip,
                  {
                    backgroundColor: selected ? accent.bg : theme.surface || "#FFFFFF",
                    borderColor: selected ? accent.icon || accent.border : accent.border,
                  },
                ]}
              >
                <Icon
                  name={VEHICLE_TYPE_ICONS[opt.value] || "car-outline"}
                  size={16}
                  color={selected ? accent.icon || theme.text : theme.textMuted}
                />
                <Text
                  style={[
                    vehicleTypeStyles.chipText,
                    { color: selected ? accent.icon || theme.text : theme.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const vehicleTypeStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 12,
  },
  inputCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: "700", flex: 1 },
  req: { color: "#EF4444" },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

const seatsStyles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 12,
  },
  inputCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  label: { fontSize: 13, fontWeight: "700", flex: 1 },
  control: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  stepBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#334155",
  },
  stepBtnDisabled: {
    color: "#CBD5E1",
  },
  count: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    minWidth: 32,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  hero: {
    borderRadius: DS.radius.xl,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    right: -24,
    top: -24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.md,
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: DS.font.hero,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: DS.font.label,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 20,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: DS.spacing.md,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: DS.font.small,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  section: {
    marginBottom: DS.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DS.spacing.sm,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.md,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: DS.font.section,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: DS.font.small,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: DS.radius.lg,
    padding: DS.spacing.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    ...DS.shadow.card,
  },
  field: {
    marginBottom: DS.spacing.md,
  },
  fieldLabel: {
    fontSize: DS.font.label,
    fontWeight: "600",
    marginBottom: DS.spacing.sm,
  },
  required: {
    color: "#EF4444",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: DS.sizes.inputHeight,
    borderWidth: 1,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.sm,
  },
  inputWrapMultiline: {
    alignItems: "flex-start",
    minHeight: 96,
    paddingVertical: DS.spacing.sm,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: DS.font.body,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 4,
  },
  pickerWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: DS.radius.md,
    minHeight: DS.sizes.inputHeight,
    overflow: "hidden",
  },
  pickerIconWrap: {
    paddingLeft: DS.spacing.md,
  },
  picker: {
    flex: 1,
    height: Platform.OS === "ios" ? 120 : 50,
  },
  pickerDisabled: {
    opacity: 0.55,
  },
  priceWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.md,
    minHeight: DS.sizes.inputHeight,
  },
  rupee: {
    fontSize: 22,
    fontWeight: "800",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: DS.font.section,
    fontWeight: "700",
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  offerTotalWrap: {
    marginTop: DS.spacing.sm,
    borderWidth: 1,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.sm,
  },
  offerTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerTotalLabel: {
    fontSize: DS.font.small,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  offerTotalValue: {
    fontSize: DS.font.title,
    fontWeight: "800",
  },
  offerTotalHint: {
    marginTop: 4,
    fontSize: DS.font.small,
    fontWeight: "600",
  },
});
