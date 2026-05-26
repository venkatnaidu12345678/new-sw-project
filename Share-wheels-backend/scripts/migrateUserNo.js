/**
 * Assign unique userNo to all users missing one.
 * Usage: npm run db:migrate-user-no
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");
const { ensureUserNos } = require("../src/config/ensureUserNos");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }
  console.log("Connecting to:", mongoUriHint());
  await connectMongo();
  await ensureUserNos();
  await disconnectMongo();
  console.log("Done.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
