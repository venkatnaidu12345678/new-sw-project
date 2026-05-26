/**
 * Connects to MongoDB for CLI scripts.
 * Uses public DNS when local resolver fails SRV lookups (common on Windows).
 */
const dns = require("dns");
const mongoose = require("mongoose");

const defaultDns = ["8.8.8.8", "1.1.1.1"];
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
} else {
  dns.setServers(defaultDns);
}

const mongoUriHint = () => {
  const uri = process.env.MONGO_URI;
  if (!uri) return null;
  return uri.includes("@") ? uri.split("@")[1] : uri;
};

const connectMongo = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in .env");
  }
  await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection;
};

const disconnectMongo = async () => mongoose.disconnect();

module.exports = { connectMongo, disconnectMongo, mongoUriHint };
