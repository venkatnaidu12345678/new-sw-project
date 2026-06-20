import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";

import { getRideDisplayFare } from "../Utils/fareUtils";
import { formatDisplayDate, formatDisplayTime } from "../Utils/dateUtils";
import {
  getUpcomingRideRoutes,
  stopoverCount,
} from "../Utils/upcomingRideRouteUtils";
import UpcomingRouteLines from "./ui/UpcomingRouteLines";
import UserAvatar from "./ui/UserAvatar";
import { LAYOUT } from "../theme/layout";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { getRoleCardThemes } from "../theme/appTheme";
import { profileData } from "../Navigation/AuthNavigator";

const getRoleTheme = (c) => {
  const cards = getRoleCardThemes(c);
  return {
    driver: {
      accent: [c.primary, c.primaryText],
      bg: cards.Driver.card,
      border: c.primary,
      chipBg: c.surface,
      chipText: c.primaryText,
      label: "Driver",
      icon: "car-sport",
      avatarRing: c.primary,
    },
    passenger: {
      accent: [c.successText, c.successText],
      bg: cards.Passenger.card,
      border: c.successText,
      chipBg: c.surface,
      chipText: c.successText,
      label: "Passenger",
      icon: "person",
      avatarRing: c.successText,
    },
    courier: {
      accent: [c.warningText, c.warningText],
      bg: cards.Courier.card,
      border: c.warningText,
      chipBg: c.surface,
      chipText: c.warningText,
      label: "Courier",
      icon: "cube",
      avatarRing: c.warningText,
    },
  };
};

const MetaChip = ({ icon, label }) => {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
  <View style={styles.metaChip}>
    <Icon name={icon} size={11} color={colors.textMuted} />
    <Text style={styles.metaChipText} numberOfLines={1}>
      {label}
    </Text>
  </View>
  );
};

const UpcomingRide = ({ data, onPress, highlighted = false, highlightLabel = "Your new ride" }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { ProfileDetails } = profileData() || {};
  const ROLE_THEME = getRoleTheme(colors);
  const role = data?.myRole || "passenger";
  const theme = ROLE_THEME[role] || ROLE_THEME.passenger;
  const myUserId =
    ProfileDetails?._id ||
    ProfileDetails?.id ||
    ProfileDetails?.data?.personalInfo?._id;
  const { rideRoute, bookedRoute } = getUpcomingRideRoutes(data, { myUserId });
  const stops = stopoverCount(data?.stopovers);
  const seats =
    data?.requires_seats ||
    data?.activeData?.requires_seats ||
    data?.availableSeats ||
    0;
  const price = getRideDisplayFare(data);
  const isPending = data?.bookingStatus === "pending_approval";
  const isAwaitingDriver = isPending && role !== "driver";

  const profileUser = useMemo(() => {
    if (role === "driver") {
      return data?.creator;
    }
    return data?.creator;
  }, [role, data?.creator]);

  const profileName = useMemo(() => {
    if (role === "driver") {
      return profileUser?.name || "You";
    }
    return profileUser?.name || "Driver";
  }, [role, profileUser?.name]);

  const profileSubtitle = useMemo(() => {
    if (role === "driver") return "Your ride";
    if (isPending) return "Awaiting driver";
    return "Driver";
  }, [role, isPending]);

  const statusLabel =
    data?.status === "started"
      ? "In progress"
      : data?.isScheduleFuture &&
          data?.status === "pending" &&
          role === "driver"
        ? "Start early"
        : data?.isSchedulePassed && data?.status === "pending" && role === "driver"
          ? "Ready"
          : isAwaitingDriver
            ? "Awaiting driver"
            : null;

  const statusColors =
    data?.status === "started"
      ? { bg: colors.successBg, text: colors.successText }
      : isAwaitingDriver
        ? { bg: colors.errorBg, text: colors.errorText }
        : data?.isSchedulePassed && role === "driver"
          ? { bg: colors.primaryMuted, text: colors.primaryText }
          : { bg: colors.surface, text: colors.textMuted };

  const cardBorderColor = highlighted
    ? colors.primary
    : isAwaitingDriver
      ? colors.errorText
      : theme.border;
  const accentColors = highlighted
    ? [colors.primary, colors.primaryText]
    : isAwaitingDriver
      ? [colors.errorText, colors.errorBorder]
      : theme.accent;
  const cardBgColors = isAwaitingDriver
    ? [colors.errorBg, colors.surface, theme.bg[theme.bg.length - 1]]
    : theme.bg;

  const dateLabel = formatDisplayDate(data?.date, { showYear: false, weekday: false });
  const timeLabel = formatDisplayTime(data?.startTime);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.cardOuter,
        { borderColor: cardBorderColor },
        isAwaitingDriver && styles.cardOuterAwaiting,
        highlighted && styles.cardOuterHighlighted,
      ]}
    >
      <LinearGradient
        colors={cardBgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <LinearGradient
          colors={accentColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.topAccent, isAwaitingDriver && styles.topAccentAwaiting]}
        />

        {highlighted ? (
          <View style={[styles.newRideBanner, { backgroundColor: colors.primaryMuted }]}>
            <Icon name="sparkles" size={14} color={colors.primaryText} />
            <Text style={[styles.newRideBannerText, { color: colors.primaryText }]}>
              {highlightLabel}
            </Text>
          </View>
        ) : null}

        {isAwaitingDriver ? (
          <View style={[styles.awaitingBanner, { backgroundColor: colors.errorBg }]}>
            <Icon name="hourglass-outline" size={14} color={colors.errorText} />
            <Text style={[styles.awaitingBannerText, { color: colors.errorText }]}>
              Awaiting driver approval
            </Text>
          </View>
        ) : null}

        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <UserAvatar
              user={profileUser}
              size={36}
              borderColor={theme.avatarRing}
            />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profileName}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: theme.chipBg }]}>
                  <Icon name={theme.icon} size={11} color={theme.chipText} />
                  <Text style={[styles.rolePillText, { color: theme.chipText }]}>
                    {theme.label}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.profileSub,
                  isAwaitingDriver && [
                    styles.profileSubAwaiting,
                    { color: colors.errorText },
                  ],
                ]}
                numberOfLines={1}
              >
                {profileSubtitle}
              </Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={[styles.priceValue, { color: theme.chipText }]}>₹{price}</Text>
              {statusLabel ? (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusColors.bg },
                    isAwaitingDriver && [
                      styles.statusPillAwaiting,
                      { borderColor: colors.errorBorder },
                    ],
                  ]}
                >
                  {isAwaitingDriver ? (
                    <Icon name="time-outline" size={10} color={statusColors.text} />
                  ) : null}
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {statusLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <UpcomingRouteLines
            rideRoute={rideRoute}
            bookedRoute={bookedRoute}
            role={role}
          />

          <View style={styles.metaRow}>
            {dateLabel ? <MetaChip icon="calendar-outline" label={dateLabel} /> : null}
            {timeLabel ? <MetaChip icon="time-outline" label={timeLabel} /> : null}
            {stops > 0 && role === "driver" ? (
              <MetaChip
                icon="git-commit-outline"
                label={`${stops} stop${stops !== 1 ? "s" : ""}`}
              />
            ) : null}
            {seats > 0 ? (
              <MetaChip
                icon="people-outline"
                label={`${seats} seat${seats !== 1 ? "s" : ""}`}
              />
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default UpcomingRide;

const createStyles = (c) =>
  StyleSheet.create({
  cardOuter: {
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.spacing.sm,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOuterAwaiting: {
    borderWidth: 2,
    shadowColor: c.errorText,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  cardOuterHighlighted: {
    borderWidth: 2.5,
    shadowColor: c.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  cardGradient: {
    borderRadius: LAYOUT.radius.md - 1,
    overflow: "hidden",
  },
  topAccent: {
    height: 3,
    width: "100%",
  },
  topAccentAwaiting: {
    height: 4,
  },
  awaitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.errorBorder,
  },
  awaitingBannerText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  newRideBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.primary,
  },
  newRideBannerText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cardInner: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
    color: c.text,
    flexShrink: 1,
  },
  profileSub: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },
  profileSubAwaiting: {
    fontWeight: "700",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priceCol: {
    alignItems: "flex-end",
    maxWidth: 88,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusPill: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statusPillAwaiting: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  routeTimeline: {
    width: 10,
    alignItems: "center",
    paddingVertical: 2,
  },
  routeDotFrom: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: c.border,
    marginVertical: 2,
  },
  routeDotTo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
  },
  routeText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 4,
  },
  routeCity: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: c.text,
  },
  routeArrow: {
    marginHorizontal: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.surface,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.border,
    maxWidth: "100%",
  },
  metaChipText: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: "500",
    flexShrink: 1,
  },
});
