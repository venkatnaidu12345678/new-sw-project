/**
 * Lists collections and document counts for MONGO_URI in .env
 * Usage: node scripts/inspectDatabase.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectMongo, disconnectMongo, mongoUriHint } = require("./mongoConnect");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to:", mongoUriHint());

  const connection = await connectMongo();
  const db = connection.db;
  const dbName = db.databaseName;
  const collections = await db.listCollections().toArray();

  console.log(`\nDatabase: ${dbName}`);
  if (collections.length === 0) {
    console.log("  (no collections — empty database)");
  } else {
    for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(name).countDocuments();
      console.log(`  ${name}: ${count} document(s)`);
    }
  }

  await disconnectMongo();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
