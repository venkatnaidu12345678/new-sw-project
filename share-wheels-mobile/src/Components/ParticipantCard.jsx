import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { tripStatusLabel } from "../Utils/participantTripStatus";
import { useThemedStyles } from "../theme/useThemedStyles";

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
  onPress,
}) => {
  const styles = useThemedStyles(createStyles);
  const accent = role === "courier" ? "#F97316" : "#16A34A";
  const statusLabel = tripStatus ? tripStatusLabel(tripStatus) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { borderLeftColor: accent }]}
    >
      <View style={styles.topRow}>
        <UserAvatar user={user} size={LAYOUT.sizes.avatarMd} />
        <View style={styles.infoCol}>
          <Text style={styles.name}>{user?.name || (role === "courier" ? "Courier" : "Passenger")}</Text>
          {statusLabel ? (
            <Text style={styles.tripStatus}>{statusLabel}</Text>
          ) : null}
          {subtitleLines.map((line, idx) => (
            <Text key={`${line}-${idx}`} style={styles.subtitle} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.fareCol}>
          {verified ? <Text style={styles.verified}>✓ Verified</Text> : null}
          <Text style={styles.fareLabel}>{fareLabel}</Text>
          <Text style={styles.fare}>₹{fare ?? 0}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {showVerify ? (
          <TouchableOpacity style={[styles.actionBtn, styles.verifyBtn]} onPress={onVerify}>
            <Text style={styles.verifyText}>Verify</Text>
          </TouchableOpacity>
        ) : null}
        {onDrop ? (
          <TouchableOpacity style={[styles.actionBtn, styles.dropBtn]} onPress={onDrop}>
            <Text style={styles.dropText}>Drop</Text>
          </TouchableOpacity>
        ) : null}
        {onDeliver ? (
          <TouchableOpacity style={[styles.actionBtn, styles.deliverBtn]} onPress={onDeliver}>
            <Text style={styles.deliverText}>Delivered</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.actionBtn} onPress={onCall}>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onMessage}>
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={onRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default ParticipantCard;

const createStyles = (c) =>
  StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderLeftWidth: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: c.text,
  },
  tripStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: c.primary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  fareCol: {
    alignItems: "flex-end",
  },
  verified: {
    fontSize: 11,
    color: c.successText,
    fontWeight: "700",
    marginBottom: 4,
  },
  fareLabel: {
    fontSize: 11,
    color: c.textMuted,
  },
  fare: {
    fontSize: 15,
    fontWeight: "800",
    color: c.text,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: c.primaryMuted,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionText: {
    color: c.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  verifyBtn: {
    backgroundColor: c.successBg,
    borderColor: c.border,
  },
  verifyText: {
    color: c.successText,
    fontSize: 12,
    fontWeight: "600",
  },
  dropBtn: {
    backgroundColor: c.primaryMuted,
    borderColor: c.border,
  },
  dropText: {
    color: c.primaryText,
    fontSize: 12,
    fontWeight: "700",
  },
  deliverBtn: {
    backgroundColor: c.warningBg,
    borderColor: c.warningBorder,
  },
  deliverText: {
    color: c.warningText,
    fontSize: 12,
    fontWeight: "700",
  },
  removeBtn: {
    backgroundColor: c.errorBg,
    borderColor: c.errorBorder,
  },
  removeText: {
    color: c.errorText,
    fontSize: 12,
    fontWeight: "600",
  },
});
