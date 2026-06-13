import { baseUrl, endPoints } from "../Config";
import { apiRequest } from "../Utils/apiRequest";

export const getSubscriptionPlans = async () =>
  apiRequest(`${baseUrl}${endPoints.subscriptionPlansurl}`);

export const getMySubscription = async (token) =>
  apiRequest(`${baseUrl}${endPoints.mySubscriptionurl}`, { token });

export const subscribeToPlan = async (token, planId) =>
  apiRequest(`${baseUrl}${endPoints.subscribePlanurl}`, {
    token,
    method: "POST",
    body: { planId },
  });
