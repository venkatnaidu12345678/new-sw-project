import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
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
} from "../ApiService/subscriptionApiService";
import { getApiErrorMessage } from "../Utils/apiErrors";

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

const PlanCard = ({
  plan,
  active,
  subscribing,
  onSubscribe,
  styles,
  colors,
}) => {
  const isFree = plan.isFree || plan.amount === 0;

  return (
    <View style={[styles.planCard, active && styles.planCardActive]}>
      <View style={styles.planHeader}>
        <View style={styles.planTitleRow}>
          <Text style={styles.planName}>{plan.name}</Text>
          {active ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Current</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planPrice}>
          {isFree ? "Free" : `₹${plan.amount}`}
          {!isFree ? (
            <Text style={styles.planPeriod}> / {formatPeriod(plan)}</Text>
          ) : null}
        </Text>
      </View>

      {plan.description ? (
        <Text style={styles.planDescription}>{plan.description}</Text>
      ) : null}

      <View style={styles.planMetaRow}>
        {isFree ? (
          <>
            <View style={styles.metaPill}>
              <Icon name="car-outline" size={14} color={colors.primary} />
              <Text style={styles.metaPillText}>
                {plan.rideLimit} ride{plan.rideLimit === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Icon name="repeat" size={14} color={colors.successText} />
              <Text style={styles.metaPillText}>Unlimited picks per ride</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metaPill}>
              <Icon name="navigate" size={14} color={colors.primary} />
              <Text style={styles.metaPillText}>
                {plan.enroutePickLimit} en route picks
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Icon name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaPillText}>{formatPeriod(plan)}</Text>
            </View>
          </>
        )}
      </View>

      {!active ? (
        <TouchableOpacity
          style={[styles.subscribeBtn, subscribing && styles.subscribeBtnDisabled]}
          onPress={() => onSubscribe(plan)}
          disabled={subscribing}
          activeOpacity={0.85}
        >
          {subscribing ? (
            <ActivityIndicator size="small" color={colors.inverseText} />
          ) : (
            <Text style={styles.subscribeBtnText}>
              {isFree ? "Activate free plan" : "Subscribe"}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
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

  const load = useCallback(async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await getMySubscription(token);
      setSubscription(res?.subscription || null);
      setPlans(res?.plans || []);
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

  const handleSubscribe = async (plan) => {
    try {
      setSubscribingId(plan._id);
      const token = await AsyncStorage.getItem("token");
      const res = await subscribeToPlan(token, plan._id);
      Alert.alert("Success", res?.message || "Subscription updated");
      await load({ showSpinner: false });
    } catch (err) {
      Alert.alert("Subscribe failed", getApiErrorMessage(err, "Try again."));
    } finally {
      setSubscribingId(null);
    }
  };

  const activePlanId = subscription?.planId?.toString?.() || subscription?.planId;

  return (
    <ScreenContainer style={{ paddingHorizontal: LAYOUT.spacing.screen }}>
      <ScreenHeader title="Driver subscription" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            />
          }
          contentContainerStyle={{
            paddingBottom: getScrollBottomPadding(insets.bottom, 24),
          }}
        >
          <View style={styles.usageCard}>
            <View style={styles.usageIcon}>
              <Icon name="shield-checkmark" size={24} color={colors.inverseText} />
            </View>
            <Text style={styles.usageTitle}>En route picking</Text>
            <Text style={styles.usageSubtitle}>
              Subscription required to pick nearby passengers and couriers on your route.
            </Text>

            {subscription ? (
              <>
                <View style={styles.usageStats}>
                  {subscription.isFree ? (
                    <>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatNum}>
                          {subscription.ridesRemaining ?? 0}
                        </Text>
                        <Text style={styles.usageStatLabel}>Rides left</Text>
                      </View>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatNum}>
                          {subscription.rideLimit ?? 0}
                        </Text>
                        <Text style={styles.usageStatLabel}>Ride limit</Text>
                      </View>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatNum}>
                          {subscription.ridesUsed ?? 0}
                        </Text>
                        <Text style={styles.usageStatLabel}>Rides used</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatNum}>
                          {subscription.picksRemaining ?? 0}
                        </Text>
                        <Text style={styles.usageStatLabel}>Picks left</Text>
                      </View>
                      <View style={styles.usageStat}>
                        <Text style={styles.usageStatNum}>
                          {subscription.enroutePickLimit ?? 0}
                        </Text>
                        <Text style={styles.usageStatLabel}>Plan limit</Text>
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
                <Text style={styles.usageMeta}>
                  Plan: {subscription.plan?.name || "—"}
                  {subscription.isFree
                    ? " · Unlimited en route picks on each ride"
                    : ` · Renews / ends ${formatExpiry(subscription.expiresAt)}`}
                </Text>
              </>
            ) : (
              <Text style={styles.usageMeta}>
                No active plan yet. Choose a plan below to start picking en route requests.
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Available plans</Text>

          {plans.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No plans configured</Text>
              <Text style={styles.emptySub}>
                Ask admin to add driver subscription plans in the admin panel.
              </Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                active={activePlanId && String(activePlanId) === String(plan._id)}
                subscribing={subscribingId === plan._id}
                onSubscribe={handleSubscribe}
                styles={styles}
                colors={colors}
              />
            ))
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
    },
    usageCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 18,
    },
    usageIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    usageTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: c.text,
    },
    usageSubtitle: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      lineHeight: 18,
    },
    usageStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
    },
    usageStat: {
      flex: 1,
      backgroundColor: c.primaryMuted,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    usageStatNum: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
    },
    usageStatLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: 4,
      textTransform: "uppercase",
    },
    usageMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 12,
      lineHeight: 17,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      marginBottom: 12,
    },
    planCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
    },
    planCardActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryMuted,
    },
    planHeader: {
      marginBottom: 8,
    },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    planName: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      flex: 1,
    },
    activePill: {
      backgroundColor: c.successBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    activePillText: {
      fontSize: 10,
      fontWeight: "800",
      color: c.successText,
      textTransform: "uppercase",
    },
    planPrice: {
      fontSize: 24,
      fontWeight: "800",
      color: c.primary,
      marginTop: 4,
    },
    planPeriod: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textMuted,
    },
    planDescription: {
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: 10,
    },
    planMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
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
    subscribeBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    subscribeBtnDisabled: {
      opacity: 0.7,
    },
    subscribeBtnText: {
      color: c.inverseText,
      fontWeight: "700",
      fontSize: 14,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
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
