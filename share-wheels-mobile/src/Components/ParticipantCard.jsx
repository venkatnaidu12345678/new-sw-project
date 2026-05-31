import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";

const ParticipantCard = ({
  user,
  role = "passenger",
  subtitleLines = [],
  fare,
  fareLabel = "Fare",
  verified = false,
  showVerify = false,
  onVerify,
  onCall,
  onMessage,
  onRemove,
  onRequestLocation,
  onPress,
}) => {
  const accent = role === "courier" ? "#F97316" : "#16A34A";

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
        <TouchableOpacity style={styles.actionBtn} onPress={onCall}>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onMessage}>
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        {onRequestLocation ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.locationBtn]}
            onPress={onRequestLocation}
          >
            <Text style={styles.locationText}>Location</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.actionBtn, styles.removeBtn]} onPress={onRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default ParticipantCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  fareCol: {
    alignItems: "flex-end",
  },
  verified: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "700",
    marginBottom: 4,
  },
  fareLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  fare: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  verifyBtn: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  verifyText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
  },
  locationBtn: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  locationText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },
  removeBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  removeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
});
