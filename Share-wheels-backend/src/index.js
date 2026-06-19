require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connectDatabase } = require("./config/database");
const { createServerWithSocket } = require("./config/socket");
const { setupSwagger } = require("./config/swagger");

const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const passengerRideRoutes = require("./routes/passengerRideRoutes");
const courierRoutes = require("./routes/courierRoutes");
const rideDetailsRoutes = require("./routes/RideDeatailsRoutes");
const driverRidesRoutes = require("./routes/DriverRideRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adRoutes = require("./routes/adRoutes");
const locationRoutes = require("./routes/locationRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const legalRoutes = require("./routes/legalRoutes");
const lookupRoutes = require("./routes/lookupRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const fareRoutes = require("./routes/fareRoutes");

const app = express();

app.use(cors());
app.use(express.json());

/** Fast liveness check — used to wake Render without heavy Firebase probes. */
app.get("/ping", (_req, res) => {
  res.status(200).json({ ok: true });
});

/** Full diagnostics (Firebase auth probe, FCM status, Razorpay config). */
app.get("/health", async (_req, res) => {
  const { isFirebaseReady, getFirebaseStatus } = require("./utils/firebaseAdmin");
  const {
    getPasswordResetStatus,
    probeFirebaseAuthConfiguration,
  } = require("./utils/firebaseAuthAdmin");
  const fcm = getFirebaseStatus();
  const passwordReset = getPasswordResetStatus();
  let authProbe = { ok: false, reason: "not_checked" };
  try {
    authProbe = await probeFirebaseAuthConfiguration();
  } catch (error) {
    authProbe = { ok: false, reason: error?.message || "probe_failed" };
  }
  const { isRazorpayConfigured } = require("./services/razorpayService");
  const { isOcrConfigured } = require("./services/vehicleDocumentOcrService");
  res.status(200).json({
    ok: true,
    service: "share-wheels-backend",
    razorpayConfigured: isRazorpayConfigured(),
    ocrConfigured: isOcrConfigured(),
    fcmPushEnabled: isFirebaseReady(),
    fcm,
    passwordReset: {
      ...passwordReset,
      emailPasswordEnabled: authProbe.ok,
      probe: authProbe,
    },
    passwordResetEmailEnabled: authProbe.ok,
  });
});

setupSwagger(app);

app.use("/auth", authRoutes);
app.use("/rides", rideRoutes);
app.use("/passenger-rides", passengerRideRoutes);
app.use("/courier", courierRoutes);
app.use("/rideDetails", rideDetailsRoutes);
app.use("/driver-rides", driverRidesRoutes);
app.use("/support", supportRoutes);
app.use("/admin", adminRoutes);
app.use("/ads", adRoutes);
app.use("/locations", locationRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/notifications", notificationRoutes);
app.use("/legal", legalRoutes);
app.use("/lookups", lookupRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/fare", fareRoutes);

connectDatabase();

const { server } = createServerWithSocket(app);
const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  const { isFirebaseReady } = require("./utils/firebaseAdmin");
  const { isRazorpayConfigured } = require("./services/razorpayService");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LAN access: use your PC IP on port ${PORT} (e.g. http://192.168.x.x:${PORT})`);
  console.log(`FCM push: ${isFirebaseReady() ? "configured" : "NOT configured (set FIREBASE_SERVICE_ACCOUNT_JSON on Render)"}`);
  console.log(
    `Razorpay: ${isRazorpayConfigured() ? "configured" : "NOT configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)"}`
  );
});
