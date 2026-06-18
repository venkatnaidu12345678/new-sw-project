import { baseUrl, endPoints } from "../Config";
import { apiRequest } from "../Utils/apiRequest";

const PAYMENT_TIMEOUT_MS = 90000;

const assertSuccess = (data, fallbackMessage) => {
  if (data?.success === false) {
    const err = new Error(data?.message || fallbackMessage);
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data;
};

export const getSubscriptionPlans = async () =>
  apiRequest(`${baseUrl}${endPoints.subscriptionPlansurl}`);

export const getMySubscription = async (token) =>
  apiRequest(`${baseUrl}${endPoints.mySubscriptionurl}`, { token });

export const subscribeToPlan = async (token, planId) =>
  assertSuccess(
    await apiRequest(`${baseUrl}${endPoints.subscribePlanurl}`, {
      token,
      method: "POST",
      body: { planId: String(planId) },
    }),
    "Could not activate plan"
  );

export const createSubscriptionOrder = async (token, planId) =>
  assertSuccess(
    await apiRequest(`${baseUrl}${endPoints.subscriptionCreateOrderurl}`, {
      token,
      method: "POST",
      body: { planId: String(planId) },
      timeoutMs: PAYMENT_TIMEOUT_MS,
    }),
    "Could not create payment order"
  );

export const verifySubscriptionPayment = async (token, payload) =>
  assertSuccess(
    await apiRequest(`${baseUrl}${endPoints.subscriptionVerifyPaymenturl}`, {
      token,
      method: "POST",
      body: {
        planId: String(payload?.planId || ""),
        razorpay_order_id: String(payload?.razorpay_order_id || ""),
        razorpay_payment_id: String(payload?.razorpay_payment_id || ""),
        razorpay_signature: String(payload?.razorpay_signature || ""),
      },
      timeoutMs: PAYMENT_TIMEOUT_MS,
    }),
    "Payment verification failed"
  );
