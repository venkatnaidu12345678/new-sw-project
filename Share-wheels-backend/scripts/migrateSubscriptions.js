/**
 * Reset driver subscription data and ensure default plans are configured.
 *
 * Usage:
 *   node scripts/migrateSubscriptions.js          # dry-run (report only)
 *   node scripts/migrateSubscriptions.js --yes      # delete subs + payment orders, run plan migration
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");
const SubscriptionPlan = require("../src/models/subscriptionPlanModel");
const UserSubscription = require("../src/models/userSubscriptionModel");
const SubscriptionPaymentOrder = require("../src/models/subscriptionPaymentOrderModel");
const { ensureDefaultSubscriptionPlan } = require("../src/config/ensureDefaultSubscriptionPlan");

const APPLY = process.argv.includes("--yes");

const describePlan = (plan) => {
  const p = plan.toObject ? plan.toObject() : plan;

  let pickRule;
  if (p.unlimitedPicks) {
    pickRule = "Unlimited enroute picks per billing period";
  } else {
    pickRule = `${p.enroutePickLimit ?? 0} enroute pick(s) per billing period`;
  }

  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    isFree: !!p.isFree,
    isDefault: !!p.isDefault,
    isActive: !!p.isActive,
    amount: p.amount,
    currency: p.currency || "INR",
    period: `${p.periodValue} ${p.periodUnit}`,
    pickRule,
    description: p.description || "",
  };
};

const printCalculationGuide = () => {
  console.log("\n=== How subscription usage is calculated ===\n");
  console.log("Billing period:");
  console.log("  startsAt = activation time");
  console.log("  expiresAt = startsAt + periodValue (days or months)");
  console.log("");
  console.log("Modern plans (enroutePickLimit / unlimitedPicks):");
  console.log("  - Each enroute passenger/courier pick calls recordEnroutePick()");
  console.log("  - unlimitedPicks=true  -> picksUsed is NOT incremented");
  console.log("  - unlimitedPicks=false -> picksUsed += 1 until enroutePickLimit");
  console.log("  - assertCanPickEnroute blocks when picksUsed >= enroutePickLimit");
  console.log("");
  console.log("Billing duration:");
  console.log("  - periodValue + periodUnit (days or months) define plan length only");
  console.log("");
  console.log("Free plan policy:");
  console.log("  - Free plan can only be subscribed once per driver (ever)");
  console.log("  - New drivers auto-get the default free plan on first subscription check");
  console.log("");
  console.log("Paid plans:");
  console.log("  - Razorpay create-order -> verify-payment -> createSubscriptionForPlan");
  console.log("  - amountPaid stored from plan.amount at purchase time (snapshot on subscription)");
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to:", mongoUriHint());
  console.log(APPLY ? "Mode: APPLY (destructive)\n" : "Mode: DRY-RUN (pass --yes to apply)\n");

  await connectMongo();

  const [planCount, subCount, orderCount] = await Promise.all([
    SubscriptionPlan.countDocuments(),
    UserSubscription.countDocuments(),
    SubscriptionPaymentOrder.countDocuments(),
  ]);

  console.log("Current counts:");
  console.log(`  subscriptionplans: ${planCount}`);
  console.log(`  usersubscriptions: ${subCount}`);
  console.log(`  subscriptionpaymentorders: ${orderCount}`);

  if (APPLY) {
    const [subDel, orderDel] = await Promise.all([
      UserSubscription.deleteMany({}),
      SubscriptionPaymentOrder.deleteMany({}),
    ]);
    console.log("\nCleaned:");
    console.log(`  usersubscriptions removed: ${subDel.deletedCount}`);
    console.log(`  subscriptionpaymentorders removed: ${orderDel.deletedCount}`);

    await ensureDefaultSubscriptionPlan();

    const planStrip = await SubscriptionPlan.updateMany(
      {},
      { $unset: { rideLimit: "" } }
    );
    const subStrip = await UserSubscription.updateMany(
      {},
      {
        $unset: {
          ridesUsed: "",
          usedRideIds: "",
          "planSnapshot.rideLimit": "",
        },
      }
    );
    console.log(`  rideLimit removed from plans: ${planStrip.modifiedCount}`);
    console.log(`  legacy ride fields removed from subscriptions: ${subStrip.modifiedCount}`);
  }

  const plans = await SubscriptionPlan.find().sort({ isFree: -1, amount: 1, createdAt: 1 }).lean();

  console.log("\n=== Subscription plans in database ===\n");
  if (!plans.length) {
    console.log("  (no plans — run with --yes to seed default free plan)");
  } else {
    plans.forEach((plan, index) => {
      const info = describePlan(plan);
      console.log(`${index + 1}. ${info.name} (${info.slug})`);
      console.log(`   id: ${info.id}`);
      console.log(`   active: ${info.isActive} | default: ${info.isDefault} | free: ${info.isFree}`);
      console.log(`   price: ${info.currency} ${info.amount} / ${info.period}`);
      console.log(`   usage: ${info.pickRule}`);
      if (info.description) {
        console.log(`   description: ${info.description}`);
      }
      console.log("");
    });
  }

  printCalculationGuide();

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with --yes to clean subscriptions and migrate plans.");
  } else {
    console.log("\nMigration complete. Drivers will get a fresh free plan on next subscription check.");
  }

  await disconnectMongo();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Failed:", err.message);
  try {
    await disconnectMongo();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
