import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { Picker } from "@react-native-picker/picker";

import { DS } from "../../theme/designSystem";
import { INPUT_COLORS } from "../../theme/inputTheme";

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
  ...props
}) => (
  <View
    style={[
      styles.inputWrap,
      multiline && styles.inputWrapMultiline,
      accent && {
        backgroundColor: accent.bg || INPUT_COLORS.background,
        borderColor: accent.border || INPUT_COLORS.border,
      },
    ]}
  >
    {icon ? (
      <View style={styles.inputIconWrap}>
        <Icon name={icon} size={18} color={accent?.icon || theme.textMuted} />
      </View>
    ) : null}
    <TextInput
      style={[
        styles.input,
        icon && styles.inputWithIcon,
        multiline && styles.inputMultiline,
        style,
      ]}
      placeholderTextColor={INPUT_COLORS.placeholder}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      {...props}
    />
  </View>
);

export const StyledPicker = ({
  label,
  icon,
  selectedValue,
  onValueChange,
  items,
  theme,
  accent,
}) => (
  <StyledField label={label} theme={theme}>
    <View
      style={[
        styles.pickerWrap,
        accent && {
          backgroundColor: accent.bg,
          borderColor: accent.border,
        },
      ]}
    >
      {icon ? (
        <View style={styles.pickerIconWrap}>
          <Icon name={icon} size={18} color={accent?.icon || theme.textMuted} />
        </View>
      ) : null}
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
        dropdownIconColor={theme.textMuted}
      >
        {items.map((item) => (
          <Picker.Item
            key={item.value}
            label={item.label}
            value={item.value}
            color={Platform.OS === "ios" ? theme.text : undefined}
          />
        ))}
      </Picker>
    </View>
  </StyledField>
);

export const RequestPriceInput = ({
  label = "Offered amount (₹)",
  value,
  onChangeText,
  theme,
  placeholder = "Enter amount you will pay",
}) => (
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
        style={styles.priceInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={INPUT_COLORS.placeholder}
        maxLength={7}
      />
    </View>
  </StyledField>
);

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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: INPUT_COLORS.background,
    borderColor: INPUT_COLORS.border,
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: DS.font.body,
    color: INPUT_COLORS.text,
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
    backgroundColor: INPUT_COLORS.background,
    borderColor: INPUT_COLORS.border,
  },
  pickerIconWrap: {
    paddingLeft: DS.spacing.md,
  },
  picker: {
    flex: 1,
    height: Platform.OS === "ios" ? 120 : 50,
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
    color: INPUT_COLORS.text,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
});
