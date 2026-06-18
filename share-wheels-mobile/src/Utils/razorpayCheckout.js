/**
 * Razorpay Standard Checkout — Scan & Pay (UPI QR), UPI apps, then cards.
 * @see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/
 */

const UPI_APPS = ["google_pay", "phonepe", "paytm", "bhim"];

export const buildRazorpayCheckoutConfig = () => ({
  method: {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
    emi: false,
    paylater: false,
  },
  config: {
    display: {
      blocks: {
        scan_pay: {
          name: "Scan & Pay",
          instruments: [{ method: "upi", flows: ["qr"] }],
        },
        upi_apps: {
          name: "UPI apps",
          instruments: [
            {
              method: "upi",
              flows: ["intent"],
              apps: UPI_APPS,
            },
          ],
        },
        cards: {
          name: "Cards & banking",
          instruments: [
            { method: "card" },
            { method: "netbanking" },
            { method: "wallet" },
          ],
        },
      },
      sequence: ["block.scan_pay", "block.upi_apps", "block.cards"],
      preferences: {
        show_default_blocks: false,
      },
      hide: [{ method: "paylater" }, { method: "emi" }],
    },
  },
});

export const buildRazorpayCheckoutOptions = ({
  key,
  amount,
  amountPaise,
  currency = "INR",
  name,
  description,
  order_id,
  prefill = {},
  theme,
}) =>
  buildNativeRazorpayCheckoutOptions({
    key,
    amountPaise: amountPaise ?? amount,
    currency,
    name,
    description,
    order_id,
    prefill,
    theme,
  });

/**
 * React Native Razorpay — use order_id + amount in paise only.
 * Web checkout `config` blocks are not supported in the native SDK.
 */
export const buildNativeRazorpayCheckoutOptions = ({
  key,
  amountPaise,
  currency = "INR",
  name,
  description,
  order_id,
  prefill = {},
  theme,
}) => {
  const paise = Math.round(Number(amountPaise));
  if (!key || !order_id || !Number.isFinite(paise) || paise < 100) {
    throw new Error("Invalid Razorpay checkout parameters");
  }

  const contact = String(prefill?.contact || "").replace(/\D/g, "");
  const normalizedPrefill = {
    name: String(prefill?.name || "").trim(),
    email: String(prefill?.email || "").trim(),
    ...(contact.length >= 10 ? { contact: contact.slice(-10) } : {}),
  };

  return {
    key: String(key).trim(),
    amount: paise,
    currency: String(currency || "INR").toUpperCase(),
    name: name || "Share Wheels",
    description: description || "Driver subscription",
    order_id: String(order_id).trim(),
    prefill: normalizedPrefill,
    theme: theme || { color: "#2563EB" },
  };
};
