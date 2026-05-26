/**
 * Optional sample ads for local testing.
 * Usage: node scripts/seedSampleAds.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectMongo, disconnectMongo } = require("./mongoConnect");
const Ad = require("../src/models/adModel");

const samples = [
  {
    type: "banner",
    title: "Share Wheels Promo",
    mediaUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
    placement: "home_banner",
    priority: 10,
    isActive: true,
    ctaLabel: "Book now",
    ctaUrl: "https://sharewheels.com",
  },
  {
    type: "native",
    title: "Save on daily commute",
    description: "Carpool with verified drivers on your route.",
    mediaUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400",
    placement: "home_native",
    priority: 5,
    isActive: true,
    ctaLabel: "Explore",
    ctaUrl: "https://sharewheels.com",
  },
  {
    type: "video",
    title: "How Share Wheels works",
    mediaUrl: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    posterUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800",
    placement: "home_video",
    priority: 5,
    isActive: true,
    ctaLabel: "Watch",
    ctaUrl: "https://sharewheels.com",
  },
];

const run = async () => {
  await connectMongo();
  for (const ad of samples) {
    const exists = await Ad.findOne({ placement: ad.placement, title: ad.title });
    if (!exists) await Ad.create(ad);
  }
  const count = await Ad.countDocuments({ isActive: true });
  console.log(`Sample ads ready. Active ads in DB: ${count}`);
  await disconnectMongo();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
