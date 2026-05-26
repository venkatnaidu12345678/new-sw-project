/**
 * Verifies Cloudinary env and upload. Usage: node scripts/testCloudinary.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const dns = require("dns");
const { isConfigured, uploadImageBuffer, resolveFolder } = require("../src/config/cloudinary");

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
} else if (process.platform === "win32") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const run = async () => {
  console.log("Cloudinary configured:", isConfigured());
  if (!isConfigured()) {
    console.error("Missing CLOUDINARY_* in .env");
    process.exit(1);
  }

  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  for (const folder of ["vehicles", "profiles", "couriers", "general"]) {
    const url = await uploadImageBuffer(tinyPng, resolveFolder(folder));
    console.log(`OK [${folder}]:`, url);
  }

  console.log("\nAll Cloudinary folder uploads succeeded.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Cloudinary test failed:", err.message);
  process.exit(1);
});
