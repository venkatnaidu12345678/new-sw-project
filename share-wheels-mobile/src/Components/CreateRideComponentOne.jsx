import React, { useState, useMemo, forwardRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

import FromToInput from "./FromToInput.jsx";
import RouteStopoversPicker from "./maps/RouteStopoversPicker";
import VehicleInfo from "./VehicleInfo.jsx";
import DriverDateAndSeats from "./DriverDateAndSeats.jsx";
import ToggleComponent from "./ToggleComponent";
import PriceCard from "./PriceCard.jsx";
import { validators } from "../Utils.js";
import { DS } from "../theme/designSystem";
import { getCreateRideTheme } from "../theme/createRideTheme";
import { useTheme } from "../context/ThemeContext";
import { formatDisplayTime } from "../Utils/dateUtils";
import { assertScheduledStartInFuture } from "../Utils/rideSchedule";

const SectionHeader = ({ icon, iconBg, iconColor, title, subtitle, styles }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const FormSection = ({ accent, title, subtitle, children, style, styles }) => (
  <View style={[styles.section, style]}>
    <SectionHeader
      icon={accent.icon}
      iconBg={accent.bg}
      iconColor={accent.color}
      title={title}
      subtitle={subtitle}
      styles={styles}
    />
    <View style={[styles.sectionCard, { borderLeftColor: accent.color }]}>
      {children}
    </View>
  </View>
);

const CreateRideComponentOne = forwardRef(
    (
    {
      theme: themeProp,
      rideData,
      updateRideData,
      submitted,
      vehicleInfo,
      userName,
      onPressAddVehicle,
      onPlaceSelect,
      fromCoords,
      toCoords,
      onRoutePlanChange,
      routeMapFullscreen = false,
      onRouteMapFullscreenChange,
      fareHint = "",
      fareLoading = false,
      routeKm = null,
      suggestedPrice = null,
      onAutoFare,
      fareResetKey = "",
    },
    ref
  ) => {
    const { colors, input, isDark } = useTheme();
    const CR = themeProp ?? getCreateRideTheme(colors);
    const styles = useMemo(() => makeStyles(CR, input), [CR, input]);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [touchedTime, setTouchedTime] = useState(false);

    const fields = useMemo(
      () => [
        {
          key: "from",
          label: "From",
          placeholder: "Select starting location from list",
          value: rideData.from,
          onChangeText: (text) => updateRideData("from", text),
          rules: [(v) => validators.required(v, "From")],
        },
        {
          key: "to",
          label: "To",
          placeholder: "Select destination from list",
          value: rideData.to,
          onChangeText: (text) => updateRideData("to", text),
          rules: [(v) => validators.required(v, "To")],
        },
      ],
      [rideData.from, rideData.to, updateRideData]
    );

    const onTimeChange = (event, selectedTime) => {
      if (Platform.OS !== "ios") setShowTimePicker(false);
      if (event?.type === "set" && selectedTime) {
        setTouchedTime(true);
        const h = selectedTime.getHours();
        const m = selectedTime.getMinutes();
        updateRideData(
          "startTime",
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
      }
    };

    const futureScheduleError =
      rideData.date && rideData.startTime
        ? (() => {
            const check = assertScheduledStartInFuture(
              rideData.date,
              rideData.startTime
            );
            return check.ok ? "" : check.message;
          })()
        : "";

    const timeError =
      submitted || touchedTime
        ? validators.required(rideData.startTime, "Start time") ||
          futureScheduleError
        : "";
    const isTimeValid = !timeError;

    const timeLabel = rideData.startTime
      ? formatDisplayTime(rideData.startTime) || String(rideData.startTime).trim()
      : "Select start time";

    const routeMapTitle =
      rideData.from && rideData.to
        ? `${rideData.from} → ${rideData.to}`
        : "Choose your route";

    if (routeMapFullscreen) {
      return (
        <View style={styles.routeMapFullscreenHost}>
          <RouteStopoversPicker
            fromCoords={fromCoords}
            toCoords={toCoords}
            fromLabel={rideData.from}
            toLabel={rideData.to}
            rideDate={rideData.date}
            theme={CR}
            onChange={onRoutePlanChange}
            isFullscreen={routeMapFullscreen}
            onFullscreenChange={onRouteMapFullscreenChange}
            fullscreenTitle={routeMapTitle}
          />
        </View>
      );
    }

    return (
      <View style={styles.root}>
        <LinearGradient
          colors={CR.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecor} />
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Icon name="car-sport" size={28} color={CR.heroIcon} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Offer a ride</Text>
              <Text style={styles.heroSubtitle}>
                Share your route, set a fair price, and let passengers join you.
              </Text>
            </View>
          </View>
          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Icon name="people-outline" size={14} color="#E0E7FF" />
              <Text style={styles.pillText}>Fill empty seats</Text>
            </View>
            <View style={styles.pill}>
              <Icon name="leaf-outline" size={14} color="#D1FAE5" />
              <Text style={styles.pillText}>Save & earn</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <SectionHeader
            icon={CR.sections.vehicle.icon}
            iconBg={CR.sections.vehicle.bg}
            iconColor={CR.sections.vehicle.color}
            title="Your vehicle"
            subtitle="Required before publishing"
            styles={styles}
          />
          <VehicleInfo
            vehicleInfo={vehicleInfo}
            userName={userName}
            onPressAdd={onPressAddVehicle}
          />
        </View>

        <FormSection
          accent={CR.sections.route}
          title="Route"
          subtitle="Where you're travelling"
          styles={styles}
        >
          <FromToInput
            ref={ref}
            fields={fields}
            variant="route"
            onPlaceSelect={onPlaceSelect}
          />
          <RouteStopoversPicker
            fromCoords={fromCoords}
            toCoords={toCoords}
            fromLabel={rideData.from}
            toLabel={rideData.to}
            rideDate={rideData.date}
            theme={CR}
            onChange={onRoutePlanChange}
            isFullscreen={routeMapFullscreen}
            onFullscreenChange={onRouteMapFullscreenChange}
            fullscreenTitle={routeMapTitle}
          />
        </FormSection>

        <FormSection
          accent={CR.sections.pricing}
          title="Pricing"
          subtitle="Auto-filled from admin fare rules — seats are set in Schedule below"
          styles={styles}
        >
          <PriceCard
            rideData={rideData}
            updateRideData={updateRideData}
            submitted={submitted}
            compact
            accent
            hint={fareHint}
            loading={fareLoading}
            routeKm={routeKm}
            suggestedPrice={suggestedPrice}
            onAutoFare={onAutoFare}
            fareResetKey={fareResetKey}
            readOnly
          />
        </FormSection>

        <FormSection
          accent={CR.sections.schedule}
          title="Schedule"
          subtitle="Date, time, and available seats"
          styles={styles}
        >
          <Text style={styles.fieldLabel}>
            Start time
            {(submitted || touchedTime) && !isTimeValid ? (
              <Text style={styles.required}> *</Text>
            ) : null}
          </Text>

          <TouchableOpacity
            style={[
              styles.timeBox,
              (submitted || touchedTime) && !isTimeValid && styles.errorBorder,
            ]}
            onPress={() => {
              setTouchedTime(true);
              setShowTimePicker(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.timeIconWrap}>
              <Icon name="time-outline" size={22} color={CR.time.icon} />
            </View>
            <Text
              style={[
                styles.timeText,
                !rideData.startTime && styles.timePlaceholder,
              ]}
            >
              {timeLabel}
            </Text>
            <Icon name="chevron-down" size={20} color={CR.textMuted} />
          </TouchableOpacity>

          <Text style={styles.errorText}>
            {submitted || touchedTime ? timeError || " " : " "}
          </Text>

          <View style={styles.scheduleDivider} />

          <DriverDateAndSeats
            rideData={rideData}
            updateRideData={updateRideData}
            submitted={submitted}
          />
        </FormSection>

        <FormSection
          accent={CR.sections.optional}
          title="Extras"
          subtitle="Optional contact & booking settings"
          style={styles.lastSection}
          styles={styles}
        >
          <Text style={styles.fieldLabel}>Alternate phone (optional)</Text>
          <View style={styles.phoneBox}>
            <View style={styles.phoneIconWrap}>
              <Icon name="call-outline" size={18} color={CR.sections.optional.color} />
            </View>
            <TextInput
              style={styles.phoneInput}
              value={rideData.AlternatePhoneNumber}
              onChangeText={(text) =>
                updateRideData(
                  "AlternatePhoneNumber",
                  text.replace(/[^0-9+\s-]/g, "")
                )
              }
              placeholder="Optional 10-digit number"
              placeholderTextColor={input.placeholder}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <View style={styles.toggles}>
            <ToggleComponent
              title="Courier friendly"
              subtitle="Allow small packages on this ride"
              icon={require("../assets/courier.png")}
              iconBg={colors.tintOrange}
              value={rideData.CanCarryCourier}
              onChange={(value) => updateRideData("CanCarryCourier", value)}
              compact
            />
          </View>
        </FormSection>

        {showTimePicker ? (
          <DateTimePicker
            value={(() => {
              const t = String(rideData.startTime || "").trim();
              const hhmm = t.match(/^(\d{1,2}):(\d{2})/);
              if (hhmm) {
                const d = new Date();
                d.setHours(parseInt(hhmm[1], 10), parseInt(hhmm[2], 10), 0, 0);
                return d;
              }
              const parsed = new Date(t);
              return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
            })()}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant={isDark ? "dark" : "light"}
            onChange={onTimeChange}
          />
        ) : null}
      </View>
    );
  }
);

CreateRideComponentOne.displayName = "CreateRideComponentOne";

export default CreateRideComponentOne;

const makeStyles = (CR, input) =>
  StyleSheet.create({
  routeMapFullscreenHost: {
    flex: 1,
    minHeight: 400,
  },
  root: {
    flex: 1,
  },
  hero: {
    borderRadius: DS.radius.xl,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: CR.surface,
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
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: DS.spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
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
  lastSection: {
    marginBottom: DS.spacing.sm,
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
    color: CR.text,
  },
  sectionSubtitle: {
    fontSize: DS.font.small,
    color: CR.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: CR.surface,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.lg,
    borderWidth: 1,
    borderColor: CR.cardBorder,
    borderLeftWidth: 4,
    ...DS.shadow.card,
  },
  fieldLabel: {
    fontSize: DS.font.label,
    fontWeight: "600",
    color: CR.text,
    marginBottom: DS.spacing.sm,
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: DS.sizes.inputHeight,
    borderWidth: 1,
    borderColor: CR.time.border,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.md,
    backgroundColor: CR.time.bg,
  },
  timeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CR.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.sm,
  },
  timeText: {
    flex: 1,
    fontSize: DS.font.body,
    color: CR.text,
    fontWeight: "600",
  },
  timePlaceholder: {
    color: CR.textMuted,
    fontWeight: "400",
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: CR.cardBorder,
    marginVertical: DS.spacing.lg,
  },
  phoneBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: DS.sizes.inputHeight,
    borderWidth: 1,
    borderColor: CR.cardBorder,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing.sm,
    backgroundColor: CR.surfaceAlt,
    marginBottom: DS.spacing.md,
  },
  phoneIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CR.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DS.spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: DS.font.body,
    color: input.text,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  toggles: {
    gap: DS.spacing.sm,
    width: "100%",
    alignSelf: "stretch",
  },
  required: {
    color: "#EF4444",
  },
  errorBorder: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#EF4444",
    fontSize: DS.font.small,
    marginTop: 6,
    minHeight: 16,
  },
  });
