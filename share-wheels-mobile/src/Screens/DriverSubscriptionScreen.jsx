import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ScreenContainer from "../Components/ui/ScreenContainer";
import ScreenHeader from "../Components/ui/ScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import { LAYOUT, getScrollBottomPadding } from "../theme/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMySubscription,
  subscribeToPlan,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} from "../ApiService/subscriptionApiService";
import { getApiErrorMessage } from "../Utils/apiErrors";
import { buildNativeRazorpayCheckoutOptions } from "../Utils/razorpayCheckout";

let RazorpayCheckout = null;
try {
  RazorpayCheckout = require("react-native-razorpay").default;
} catch {
  RazorpayCheckout = null;
}

const formatPeriod = (plan) => {
  if (!plan?.periodValue) return "";
  const unit = plan.periodUnit === "months" ? "month(s)" : "day(s)";
  return `${plan.periodValue} ${unit}`;
};

const formatExpiry = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
};

const getPlanTheme = (plan, colors, { isCurrent = false, isDeactivated = false } = {}) => {
  const isFree = plan?.isFree || plan?.amount === 0;
  if (isDeactivated) {
    return {
      accent: [colors.warningText || "#D97706", "#F59E0B"],
      bg: [colors.warningBg || "#FFFBEB", colors.surface],
      border: colors.warningText || "#D97706",
      chipBg: colors.warningBg || "#FEF3C7",
      chipText: colors.warningText || "#B45309",
      icon: "close-circle-outline",
    };
  }
  if (isCurrent) {
    return {
      accent: [colors.primary, colors.infoText || "#3B82F6"],
      bg: [colors.primaryMuted, colors.surface],
      border: colors.primary,
      chipBg: colors.primaryMuted,
      chipText: colors.primary,
      icon: "checkmark-circle",
    };
  }
  if (isFree) {
    return {
      accent: ["#10B981", "#059669"],
      bg: [colors.tintGreen || "#ECFDF5", colors.surface],
      border: colors.successText || "#059669",
      chipBg: colors.successBg || "#D1FAE5",
      chipText: colors.successText || "#047857",
      icon: "gift-outline",
    };
  }
  return {
    accent: ["#8B5CF6", "#6366F1"],
    bg: [colors.tintOrange || "#F5F3FF", colors.surface],
    border: colors.border,
    chipBg: colors.chipBg,
    chipText: colors.warningText || "#7C3AED",
    icon: "card-outline",
  };
};

const UsageProgressBar = ({ used, limit, unlimited, colors, styles }) => {
  if (unlimited) return null;
  const safeLimit = Math.max(1, Number(limit) || 1);
  const safeUsed = Math.min(safeLimit, Math.max(0, Number(used) || 0));
  const pct = Math.round((safeUsed / safeLimit) * 100);

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct}%`,
              backgroundColor: pct >= 100 ? colors.warningText : colors.primary,
            },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {safeUsed} of {safeLimit} enroute pickups used ({pct}%)
      </Text>
    </View>
  );
};

const MetaChip = ({ icon, label, tint, textColor, styles }) => (
  <View style={[styles.metaPill, tint ? { backgroundColor: tint } : null]}>
    <Icon name={icon} size={13} color={textColor} />
    <Text style={styles.metaPillText}>{label}</Text>
  </View>
);

const PlanCard = ({
  plan,
  isCurrent,
  isDeactivated,
  deactivationReason,
  subscribing,
  canSubscribeToFree,
  paymentsEnabled = true,
  onSubscribe,
  styles,
  colors,
}) => {
  const isFree = plan.isFree || plan.amount === 0;
  const freeBlocked = isFree && !canSubscribeToFree && !isCurrent;
  const paidPaymentsBlocked = !isFree && !paymentsEnabled;
  const theme = getPlanTheme(plan, colors, { isCurrent, isDeactivated });
  const canSubscribe =
    ((!isCurrent && !freeBlocked && !paidPaymentsBlocked) ||
      (isDeactivated && !isFree && paymentsEnabled)) &&
    !subscribing;

  const deactivatedLabel =
    deactivationReason === "picks_exhausted"
      ? "Deactivated · pickups used"
      : deactivationReason === "expired"
        ? "Deactivated · expired"
        : "Deactivated";

  return (
    <View
      style={[
        styles.planCardOuter,
        { borderColor: theme.border },
        isCurrent && styles.planCardOuterActive,
        isDeactivated && styles.planCardOuterDeactivated,
      ]}
    >
      <LinearGradient
        colors={theme.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.planCardGradient}
      >
        <LinearGradient
          colors={theme.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.planTopAccent, isCurrent && styles.planTopAccentActive]}
        />

        {isCurrent ? (
          <View style={styles.activePlanRibbon}>
            <Icon name="star" size={12} color={colors.inverseText} />
            <Text style={styles.activePlanRibbonText}>Your active plan</Text>
          </View>
        ) : null}

        <View style={styles.planInner}>
          <View style={styles.planHeaderRow}>
            <View style={[styles.planIconWrap, { backgroundColor: theme.chipBg }]}>
              <Icon name={theme.icon} size={20} color={theme.chipText} />
            </View>
            <View style={styles.planHeaderText}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planName} numberOfLines={1}>
                  {plan.name}
                </Text>
                {isCurrent ? (
                  <View style={styles.activePill}>
                    <Icon name="checkmark-circle" size={11} color={colors.successText} />
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                ) : null}
                {isDeactivated ? (
                  <View style={styles.deactivatedPill}>
                    <Text style={styles.deactivatedPillText}>{deactivatedLabel}</Text>
                  </View>
                ) : null}
                {isFree && !isCurrent && !isDeactivated ? (
                  <View style={styles.trialPill}>
                    <Text style={styles.trialPillText}>One-time</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planPrice}>
                {isFree ? "Free" : `₹${plan.amount}`}
                <Text style={styles.planPeriod}> / {formatPeriod(plan)}</Text>
              </Text>
            </View>
          </View>

          {plan.description ? (
            <Text style={styles.planDescription}>{plan.description}</Text>
          ) : null}

          <View style={styles.planMetaRow}>
            <MetaChip
              icon="time-outline"
              label={formatPeriod(plan)}
              textColor={colors.textMuted}
              styles={styles}
            />
            {plan.unlimitedPicks ? (
              <MetaChip
                icon="infinite"
                label="Unlimited pickups"
                tint={colors.successBg}
                textColor={colors.successText}
                styles={styles}
              />
            ) : (
              <MetaChip
                icon="navigate-outline"
                label={`${plan.enroutePickLimit ?? "—"} pickups`}
                tint={colors.primaryMuted}
                textColor={colors.primary}
                styles={styles}
              />
            )}
          </View>

          {freeBlocked ? (
            <View style={styles.blockedBanner}>
              <Icon name="information-circle-outline" size={16} color={colors.warningText} />
              <Text style={styles.blockedNote}>
                Free plan already used. Choose a paid plan to continue.
              </Text>
            </View>
          ) : null}

          {paidPaymentsBlocked ? (
            <View style={styles.blockedBanner}>
              <Icon name="card-outline" size={16} color={colors.warningText} />
              <Text style={styles.blockedNote}>
                Online payments are not available yet. Ask admin to configure Razorpay.
              </Text>
            </View>
          ) : null}

          {canSubscribe ? (
            <TouchableOpacity
              style={[styles.subscribeBtn, subscribing && styles.subscribeBtnDisabled]}
              onPress={() => onSubscribe(plan)}
              disabled={subscribing}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={
                  isDeactivated
                    ? [colors.warningText || "#D97706", "#F59E0B"]
                    : [colors.primary, colors.infoText || "#3B82F6"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscribeBtnGradient}
              >
                {subscribing ? (
                  <ActivityIndicator size="small" color={colors.inverseText} />
                ) : (
                  <>
                    <Icon
                      name={
                        isDeactivated
                          ? "refresh-outline"
                          : isFree
                            ? "flash-outline"
                            : "wallet-outline"
                      }
                      size={18}
                      color={colors.inverseText}
                    />
                    <Text style={styles.subscribeBtnText}>
                      {isDeactivated
                        ? `Renew · ₹${plan.amount}`
                        : isFree
                          ? "Activate free plan"
                          : `Pay ₹${plan.amount} · Scan UPI / card`}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};

const DriverSubscriptionScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingId, setSubscribingId] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [canSubscribeToFree, setCanSubscribeToFree] = useState(true);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [paymentPhase, setPaymentPhase] = useState(null);

  const load = useCallback(async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await getMySubscription(token);
      setSubscription(res?.subscription || null);
      setPlans(res?.plans || []);
      setCanSubscribeToFree(res?.canSubscribeToFree !== false);
      setRazorpayConfigured(res?.razorpayConfigured === true);
      setRazorpayKeyId(res?.razorpayKeyId || "");
    } catch (err) {
      Alert.alert("Could not load plans", getApiErrorMessage(err, "Try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handlePaidSubscribe = async (token, plan) => {
    if (!razorpayConfigured) {
      Alert.alert(
        "Payments unavailable",
        "Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend .env and restart."
      );
      return;
    }

    if (!RazorpayCheckout) {
      Alert.alert(
        "Payment unavailable",
        "Rebuild the app after installing react-native-razorpay to enable payments."
      );
      return;
    }

    setPaymentPhase("preparing");

    try {
      const orderRes = await createSubscriptionOrder(token, String(plan._id));
      const keyId = orderRes?.keyId || razorpayKeyId;
      const orderId = orderRes?.order?.id;
      const amountPaise = Number(
        orderRes?.order?.amountPaise ?? orderRes?.order?.amount
      );

      if (!keyId || !orderId || !Number.isFinite(amountPaise) || amountPaise < 100) {
        throw new Error("Could not start payment. Try again.");
      }

      const options = buildNativeRazorpayCheckoutOptions({
        key: keyId,
        amountPaise,
        currency: orderRes.order.currency || "INR",
        name: "Share Wheels",
        description: plan.name,
        order_id: orderId,
        prefill: orderRes.prefill || {},
        theme: { color: colors.primary || "#2563EB" },
      });

      setPaymentPhase("checkout");

      let paymentData;
      try {
        paymentData = await RazorpayCheckout.open(options);
      } catch (checkoutErr) {
        const checkoutCode = checkoutErr?.code ?? checkoutErr?.error?.code;
        if (checkoutCode === 0 || checkoutCode === 2) {
          return;
        }
        throw checkoutErr;
      }

      if (
        !paymentData?.razorpay_order_id ||
        !paymentData?.razorpay_payment_id ||
        !paymentData?.razorpay_signature
      ) {
        throw new Error("Payment was not completed.");
      }

      setPaymentPhase("verifying");

      const verifyRes = await verifySubscriptionPayment(token, {
        planId: String(plan._id),
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      Alert.alert("Success", verifyRes?.message || "Subscription activated");
      await load({ showSpinner: false });
    } finally {
      setPaymentPhase(null);
    }
  };

  const handleSubscribe = async (plan) => {
    const isFree = plan.isFree || plan.amount === 0;

    if (isFree && !canSubscribeToFree) {
      Alert.alert(
        "Free plan unavailable",
        "The free plan can only be used once. Please choose a paid plan."
      );
      return;
    }

    try {
      setSubscribingId(plan._id);
      const token = await AsyncStorage.getItem("token");

      if (isFree) {
        const res = await subscribeToPlan(token, plan._id);
        Alert.alert("Success", res?.message || "Free plan activated");
        await load({ showSpinner: false });
        return;
      }

      await handlePaidSubscribe(token, plan);
    } catch (err) {
      const code = err?.code ?? err?.error?.code;
      const description = String(err?.description || err?.message || "");
      if (code === 0 || code === 2 || /cancel/i.test(description)) {
        return;
      }
      if (err?.code === "RAZORPAY_NOT_CONFIGURED") {
        Alert.alert(
          "Payments unavailable",
          "Razorpay is not configured on the server yet."
        );
        return;
      }
      Alert.alert("Subscribe failed", getApiErrorMessage(err, "Try again."));
    } finally {
      setSubscribingId(null);
    }
  };

  const subscriptionPlanId = useMemo(() => {
    const raw = subscription?.planId;
    if (!raw) return null;
    if (typeof raw === "object" && raw._id) return String(raw._id);
    return String(raw);
  }, [subscription?.planId]);

  const sortedPlans = useMemo(() => {
    if (!subscriptionPlanId || !subscription?.isActive) return plans;
    return [...plans].sort((a, b) => {
      const aMatch = String(a._id) === subscriptionPlanId;
      const bMatch = String(b._id) === subscriptionPlanId;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [plans, subscriptionPlanId, subscription?.isActive]);

  const hasPaidPlans = useMemo(
    () => plans.some((plan) => !plan.isFree && Number(plan.amount) > 0),
    [plans]
  );

  const statusBanner = useMemo(() => {
    if (!subscription) return null;
    if (subscription.isDeactivated) {
      if (subscription.deactivationReason === "picks_exhausted") {
        return {
          tone: "warning",
          icon: "ban-outline",
          text: subscription.isFree
            ? "Free plan deactivated — pickups used. Upgrade to a paid plan."
            : "Plan deactivated — pickups used. Renew this plan or choose another.",
        };
      }
      return {
        tone: "warning",
        icon: "alert-circle-outline",
        text: subscription.isFree
          ? "Free plan deactivated — upgrade to continue picking enroute requests."
          : "Plan deactivated — renew or choose another plan to continue.",
      };
    }
    return {
      tone: "success",
      icon: "checkmark-circle-outline",
      text: `Active until ${formatExpiry(subscription.expiresAt)}`,
    };
  }, [subscription]);

  return (
    <ScreenContainer style={{ paddingHorizontal: LAYOUT.spacing.screen }}>
      <ScreenHeader title="Driver subscription" onBack={() => navigation.goBack()} />

      <Modal visible={!!paymentPhase} transparent animationType="fade">
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentOverlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.paymentOverlayTitle}>
              {paymentPhase === "preparing"
                ? "Preparing payment…"
                : paymentPhase === "checkout"
                  ? "Opening Razorpay…"
                  : "Confirming payment…"}
            </Text>
            <Text style={styles.paymentOverlaySub}>
              {paymentPhase === "preparing"
                ? "Creating your secure order"
                : paymentPhase === "checkout"
                  ? "UPI, cards, and wallets will appear shortly"
                  : "Almost done"}
            </Text>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your plan…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load({ showSpinner: false });
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingBottom: getScrollBottomPadding(insets.bottom, 24),
          }}
        >
          <View style={styles.usageCardOuter}>
            <LinearGradient
              colors={
                subscription?.isDeactivated
                  ? [colors.warningBg || "#FFFBEB", colors.surface]
                  : [colors.primaryMuted, colors.surface]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.usageCard}
            >
              <LinearGradient
                colors={
                  subscription?.isDeactivated
                    ? [colors.warningText || "#D97706", "#F59E0B"]
                    : [colors.primary, colors.infoText || "#3B82F6"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.usageTopAccent}
              />

              <View style={styles.usageHeader}>
                <View style={styles.usageIcon}>
                  <Icon name="navigate" size={22} color={colors.inverseText} />
                </View>
                <View style={styles.usageHeaderText}>
                  <Text style={styles.usageTitle}>Enroute pickups</Text>
                  <Text style={styles.usageSubtitle}>
                    {subscription?.isDeactivated
                      ? "Your plan is deactivated. Renew or upgrade to pick enroute again."
                      : "Pick passengers and couriers along your route while your plan is active."}
                  </Text>
                </View>
              </View>

              {subscription ? (
                <>
                  {statusBanner ? (
                    <View
                      style={[
                        styles.statusBanner,
                        statusBanner.tone === "warning"
                          ? styles.statusBannerWarning
                          : styles.statusBannerSuccess,
                      ]}
                    >
                      <Icon
                        name={statusBanner.icon}
                        size={16}
                        color={
                          statusBanner.tone === "warning"
                            ? colors.warningText
                            : colors.successText
                        }
                      />
                      <Text
                        style={[
                          styles.statusBannerText,
                          statusBanner.tone === "warning"
                            ? styles.statusBannerTextWarning
                            : styles.statusBannerTextSuccess,
                        ]}
                      >
                        {statusBanner.text}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.usageStats}>
                    {subscription.unlimitedPicks ? (
                      <>
                        <View style={[styles.usageStat, styles.usageStatHighlight]}>
                          <Text style={styles.usageStatNum}>∞</Text>
                          <Text style={styles.usageStatLabel}>Unlimited</Text>
                        </View>
                        <View style={styles.usageStat}>
                          <Text style={styles.usageStatNum}>
                            {subscription.picksUsed ?? 0}
                          </Text>
                          <Text style={styles.usageStatLabel}>Used</Text>
                        </View>
                        <View style={styles.usageStat}>
                          <Text style={[styles.usageStatNum, styles.usageStatDate]}>
                            {formatExpiry(subscription.expiresAt)}
                          </Text>
                          <Text style={styles.usageStatLabel}>Expires</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={[styles.usageStat, styles.usageStatHighlight]}>
                          <Text style={styles.usageStatNum}>
                            {subscription.picksRemaining ?? 0}
                          </Text>
                          <Text style={styles.usageStatLabel}>Left</Text>
                        </View>
                        <View style={styles.usageStat}>
                          <Text style={styles.usageStatNum}>
                            {subscription.enroutePickLimit ?? 0}
                          </Text>
                          <Text style={styles.usageStatLabel}>Limit</Text>
                        </View>
                        <View style={styles.usageStat}>
                          <Text style={styles.usageStatNum}>
                            {subscription.picksUsed ?? 0}
                          </Text>
                          <Text style={styles.usageStatLabel}>Used</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <UsageProgressBar
                    used={subscription.picksUsed}
                    limit={subscription.enroutePickLimit}
                    unlimited={subscription.unlimitedPicks}
                    colors={colors}
                    styles={styles}
                  />

                  <Text style={styles.usageMeta}>
                    {subscription.isActive ? "Current plan: " : "Last plan: "}
                    <Text style={styles.usageMetaStrong}>
                      {subscription.plan?.name || "—"}
                    </Text>
                    {subscription.isDeactivated ? (
                      <Text style={styles.usageMetaDeactivated}> · Deactivated</Text>
                    ) : null}
                  </Text>
                </>
              ) : (
                <View style={styles.noPlanBox}>
                  <Icon name="ticket-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.noPlanTitle}>No active plan</Text>
                  <Text style={styles.noPlanSub}>
                    Choose a plan below to start picking enroute requests.
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available plans</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{plans.length}</Text>
            </View>
          </View>

          {hasPaidPlans && !razorpayConfigured ? (
            <View style={styles.paymentsBanner}>
              <Icon name="wallet-outline" size={18} color={colors.warningText} />
              <Text style={styles.paymentsBannerText}>
                Paid plans need Razorpay on the server. Set API keys in backend .env, restart,
                then rebuild the app for checkout.
              </Text>
            </View>
          ) : null}

          {plans.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Icon name="layers-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No plans configured</Text>
              <Text style={styles.emptySub}>
                Ask admin to add driver subscription plans in the admin panel.
              </Text>
            </View>
          ) : (
            sortedPlans.map((plan) => {
              const planId = String(plan._id);
              const isPlanMatch =
                subscriptionPlanId && String(subscriptionPlanId) === planId;
              return (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  isCurrent={isPlanMatch && !!subscription?.isActive}
                  isDeactivated={isPlanMatch && !!subscription?.isDeactivated}
                  deactivationReason={subscription?.deactivationReason}
                  subscribing={subscribingId === plan._id}
                  canSubscribeToFree={canSubscribeToFree}
                  paymentsEnabled={razorpayConfigured}
                  onSubscribe={handleSubscribe}
                  styles={styles}
                  colors={colors}
                />
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

export default DriverSubscriptionScreen;

const createStyles = (c) =>
  StyleSheet.create({
    centerBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: c.textMuted,
      fontWeight: "600",
    },
    paymentOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    paymentOverlayCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    paymentOverlayTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginTop: 4,
      textAlign: "center",
    },
    paymentOverlaySub: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    usageCardOuter: {
      borderRadius: 22,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    usageCard: {
      padding: 18,
      paddingTop: 0,
    },
    usageTopAccent: {
      height: 4,
      marginHorizontal: -18,
      marginBottom: 16,
    },
    usageHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
    },
    usageIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    usageHeaderText: {
      flex: 1,
    },
    usageTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    usageSubtitle: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      borderWidth: 1,
    },
    statusBannerSuccess: {
      backgroundColor: c.successBg,
      borderColor: c.successText + "33",
    },
    statusBannerWarning: {
      backgroundColor: c.warningBg,
      borderColor: (c.warningText || "#D97706") + "33",
    },
    statusBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 17,
    },
    statusBannerTextSuccess: {
      color: c.successText,
    },
    statusBannerTextWarning: {
      color: c.warningText,
    },
    usageStats: {
      flexDirection: "row",
      gap: 8,
    },
    usageStat: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    usageStatHighlight: {
      backgroundColor: c.primaryMuted,
      borderColor: c.primary + "44",
    },
    usageStatNum: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
    },
    usageStatDate: {
      fontSize: 11,
      fontWeight: "700",
    },
    usageStatLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    progressWrap: {
      marginTop: 14,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: c.chipBg,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
    },
    progressLabel: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "600",
      color: c.textMuted,
    },
    usageMeta: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 14,
    },
    usageMetaStrong: {
      fontWeight: "800",
      color: c.text,
    },
    usageMetaDeactivated: {
      fontWeight: "700",
      color: c.warningText,
    },
    noPlanBox: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 6,
    },
    noPlanTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginTop: 4,
    },
    noPlanSub: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
    },
    sectionCount: {
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    sectionCountText: {
      fontSize: 12,
      fontWeight: "800",
      color: c.primary,
    },
    paymentsBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: c.warningBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: (c.warningText || "#D97706") + "33",
    },
    paymentsBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.text,
      fontWeight: "600",
    },
    planCardOuter: {
      borderRadius: 20,
      marginBottom: 14,
      borderWidth: 1.5,
      overflow: "hidden",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
    planCardOuterActive: {
      borderWidth: 2.5,
      borderColor: c.primary,
      shadowColor: c.primary,
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 5,
    },
    planCardOuterDeactivated: {
      borderWidth: 2,
      borderColor: c.warningText || "#D97706",
      shadowColor: c.warningText || "#D97706",
      shadowOpacity: 0.12,
      elevation: 3,
    },
    planCardGradient: {
      borderRadius: 18,
    },
    planTopAccent: {
      height: 4,
      width: "100%",
    },
    planTopAccentActive: {
      height: 5,
    },
    activePlanRibbon: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.primary,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    activePlanRibbonText: {
      fontSize: 11,
      fontWeight: "800",
      color: c.inverseText,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    planInner: {
      padding: 16,
    },
    planHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 10,
    },
    planIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    planHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    planName: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      flexShrink: 1,
    },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.successBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.successText + "55",
    },
    activePillText: {
      fontSize: 10,
      fontWeight: "800",
      color: c.successText,
      textTransform: "uppercase",
    },
    deactivatedPill: {
      backgroundColor: c.warningBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: (c.warningText || "#D97706") + "44",
    },
    deactivatedPillText: {
      fontSize: 9,
      fontWeight: "800",
      color: c.warningText,
      textTransform: "uppercase",
    },
    trialPill: {
      backgroundColor: c.chipBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    trialPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
    },
    planPrice: {
      fontSize: 22,
      fontWeight: "800",
      color: c.primary,
      marginTop: 4,
    },
    planPeriod: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
    },
    planDescription: {
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 19,
      marginBottom: 12,
    },
    planMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    metaPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.chipBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    metaPillText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
    },
    blockedBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: c.warningBg,
      borderRadius: 12,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: (c.warningText || "#D97706") + "33",
    },
    blockedNote: {
      flex: 1,
      fontSize: 12,
      color: c.warningText,
      lineHeight: 17,
      fontWeight: "600",
    },
    subscribeBtn: {
      borderRadius: 14,
      overflow: "hidden",
    },
    subscribeBtnDisabled: {
      opacity: 0.75,
    },
    subscribeBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    subscribeBtnText: {
      color: c.inverseText,
      fontWeight: "800",
      fontSize: 14,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 36,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: c.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
    },
    emptySub: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 18,
    },
  });
