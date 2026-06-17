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
  });
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

module.exports = {
  getKeyId,
  isRazorpayConfigured,
  createOrder,
  verifyPaymentSignature,
};
