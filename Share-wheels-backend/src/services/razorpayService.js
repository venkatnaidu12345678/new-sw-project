const crypto = require("crypto");
const Razorpay = require("razorpay");

let razorpayInstance = null;

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return razorpayInstance;
};

const getKeyId = () => process.env.RAZORPAY_KEY_ID?.trim() || "";

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());

/** Checkout display config — Scan & Pay (UPI QR), UPI apps, then cards. */
const getCheckoutConfig = () => {
  const UPI_APPS = ["google_pay", "phonepe", "paytm", "bhim"];

  return {
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
        preferences: { show_default_blocks: false },
        hide: [{ method: "paylater" }, { method: "emi" }],
      },
    },
  };
};

const createOrder = async ({ amount, currency = "INR", receipt, notes = {} }) => {
  const razorpay = getRazorpay();
  const amountPaise = Math.round(Number(amount) * 100);

  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    throw new Error("Payment amount must be at least ₹1");
  }

  return razorpay.orders.create({
    amount: amountPaise,
    currency: currency.toUpperCase(),
    receipt,
    notes,
    payment_capture: true,
  });
};

const fetchPayment = async (paymentId) => {
  const razorpay = getRazorpay();
  return razorpay.payments.fetch(String(paymentId).trim());
};

const fetchOrder = async (orderId) => {
  const razorpay = getRazorpay();
  return razorpay.orders.fetch(String(orderId).trim());
};

const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keySecret) return false;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  return expected === razorpaySignature;
};

/** Confirm payment is captured and belongs to the expected order + amount (paise). */
const validateCapturedPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  expectedAmountPaise,
}) => {
  const payment = await fetchPayment(razorpayPaymentId);
  const orderId = String(payment?.order_id || "");
  const status = String(payment?.status || "").toLowerCase();
  const amount = Number(payment?.amount);

  if (orderId !== String(razorpayOrderId)) {
    return { ok: false, reason: "payment_order_mismatch" };
  }

  if (!["captured", "authorized"].includes(status)) {
    return { ok: false, reason: `payment_not_captured:${status || "unknown"}` };
  }

  if (
    Number.isFinite(expectedAmountPaise) &&
    expectedAmountPaise > 0 &&
    amount !== expectedAmountPaise
  ) {
    return { ok: false, reason: "payment_amount_mismatch" };
  }

  return { ok: true, payment };
};

module.exports = {
  getKeyId,
  isRazorpayConfigured,
  getCheckoutConfig,
  createOrder,
  fetchPayment,
  fetchOrder,
  verifyPaymentSignature,
  validateCapturedPayment,
};
