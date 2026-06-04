import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { tripStatusLabel } from "../Utils/participantTripStatus";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";

const ROLE_ACCENT = {
  passenger: "#16A34A",
  courier: "#EA580C",
};

const CHIP_COLORS = {
  default: (c) => ({ icon: c.primary, text: c.primary }),
  verify: (c) => ({ icon: c.successText, text: c.successText }),
  drop: (c) => ({ icon: c.infoText, text: c.infoText }),
  deliver: (c) => ({ icon: c.warningText, text: c.warningText }),
  remove: (c) => ({ icon: c.errorText, text: c.errorText }),
};

const ActionChip = ({
  icon,
  label,
  onPress,
  variant = "default",
  highlighted = false,
  styles,
  colors,
}) => {
  const variantStyle =
    variant === "verify"
      ? styles.verifyBtn
      : variant === "drop"
        ? highlighted
          ? styles.dropBtnHighlight
          : styles.dropBtn
        : variant === "deliver"
          ? highlighted
            ? styles.deliverBtnHighlight
            : styles.deliverBtn
          : variant === "remove"
            ? styles.removeBtn
            : styles.actionBtn;

  const { icon: iconColor, text: textColor } = highlighted
    ? { icon: colors.inverseText, text: colors.inverseText }
    : CHIP_COLORS[variant]?.(colors) || CHIP_COLORS.default(colors);

  return (
    <TouchableOpacity
      style={[styles.actionChip, variantStyle]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Icon name={icon} size={15} color={iconColor} />
      <Text style={[styles.actionChipLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const ParticipantCard = ({
  user,
  role = "passenger",
  subtitleLines = [],
  fare,
  fareLabel = "Fare",
  verified = false,
  tripStatus,
  showVerify = false,
  onVerify,
  onCall,
  onMessage,
  onRemove,
  onDrop,
  onDeliver,
  highlightDrop = false,
  highlightDeliver = false,
  onPress,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.passenger;
  const statusLabel = tripStatus ? tripStatusLabel(tripStatus) : null;
  const roleLabel = role === "courier" ? "Courier" : "Passenger";

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.topPressable, pressed && styles.cardPressed]}
      >
      <View style={styles.topRow}>
        <UserAvatar user={user} size={LAYOUT.sizes.avatarMd} />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || roleLabel}
            </Text>
            <View style={[styles.rolePill, { backgroundColor: `${accent}18` }]}>
              <Text style={[styles.rolePillText, { color: accent }]}>
                {roleLabel}
              </Text>
            </View>
          </View>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={styles.tripStatus}>{statusLabel}</Text>
            </View>
          ) : null}
          {verified ? (
            <View style={styles.verifiedRow}>
              <Icon name="shield-checkmark" size={14} color={colors.successText} />
              <Text style={styles.verified}>Boarding verified</Text>
            </View>
          ) : null}
          {subtitleLines.map((line, idx) => (
            <Text key={`${line}-${idx}`} style={styles.subtitle} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.fareCol}>
          <Text style={styles.fareLabel}>{fareLabel}</Text>
          <Text style={styles.fare}>₹{fare ?? 0}</Text>
        </View>
      </View>
      </Pressable>

      <View style={styles.actionsRow}>
        {showVerify ? (
          <ActionChip
            icon="checkmark-circle-outline"
            label="Verify"
            onPress={onVerify}
            variant="verify"
            styles={styles}
            colors={colors}
          />
        ) : null}
        {onDrop ? (
          <ActionChip
            icon="flag"
            label="Drop"
            onPress={onDrop}
            variant="drop"
            highlighted={highlightDrop}
            styles={styles}
            colors={colors}
          />
        ) : null}
        {onDeliver ? (
          <ActionChip
            icon="cube"
            label="Delivered"
            onPress={onDeliver}
            variant="deliver"
            highlighted={highlightDeliver}
            styles={styles}
            colors={colors}
          />
        ) : null}
        <ActionChip
          icon="call-outline"
          label="Call"
          onPress={onCall}
          styles={styles}
          colors={colors}
        />
        <ActionChip
          icon="chatbubble-outline"
          label="Chat"
          onPress={onMessage}
          styles={styles}
          colors={colors}
        />
        <ActionChip
          icon="person-remove-outline"
          label="Remove"
          onPress={onRemove}
          variant="remove"
          styles={styles}
          colors={colors}
        />
      </View>
    </View>
  );
};

export default ParticipantCard;

const createStyles = (c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    topPressable: {
      borderRadius: 12,
    },
    cardPressed: {
      opacity: 0.92,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    infoCol: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    name: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      flexShrink: 1,
    },
    rolePill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    rolePillText: {
      fontSize: 10,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    tripStatus: {
      fontSize: 12,
      fontWeight: "700",
      color: c.primary,
    },
    verifiedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    verifiedIcon: { color: c.successText },
    verified: {
      fontSize: 11,
      color: c.successText,
      fontWeight: "700",
    },
    subtitle: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 3,
      lineHeight: 16,
    },
    fareCol: {
      alignItems: "flex-end",
      minWidth: 56,
    },
    fareLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    fare: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      marginTop: 2,
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    actionChipLabel: {
      fontSize: 12,
      fontWeight: "700",
    },
    actionBtn: {
      backgroundColor: c.primaryMuted,
      borderColor: c.border,
    },
    verifyBtn: {
      backgroundColor: c.successBg,
      borderColor: c.border,
    },
    dropBtn: {
      backgroundColor: c.infoBg,
      borderColor: c.border,
    },
    dropBtnHighlight: {
      backgroundColor: c.primary,
      borderColor: c.primary,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 4,
    },
    deliverBtn: {
      backgroundColor: c.warningBg,
      borderColor: c.warningBorder,
    },
    deliverBtnHighlight: {
      backgroundColor: "#EA580C",
      borderColor: "#C2410C",
      shadowColor: "#EA580C",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 4,
    },
    removeBtn: {
      backgroundColor: c.errorBg,
      borderColor: c.errorBorder,
    },
  });
