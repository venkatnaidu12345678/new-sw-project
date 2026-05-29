const os = require("os");

const nets = os.networkInterfaces();
const ips = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    if (net.family === "IPv4" && !net.internal) {
      ips.push({ name, address: net.address });
    }
  }
}

console.log("\nShare Wheels — local backend URL for physical devices\n");
console.log("Backend should be running: cd Share-wheels-backend && npm run dev\n");

if (!ips.length) {
  console.log("No LAN IPv4 found. Connect to Wi‑Fi and run again.\n");
  process.exit(0);
}

for (const { name, address } of ips) {
  console.log(`  ${name}: LOCAL_API_URL=http://${address}:3001`);
}

console.log("\n1. Put that line in share-wheels-mobile/.env");
console.log("2. Rebuild the app: npm run android (react-native-config reads .env at build time)");
console.log("3. Phone and PC must be on the same Wi‑Fi\n");

console.log("USB + adb reverse instead:");
console.log("  npm run adb:reverse");
console.log("  LOCAL_API_URL=http://localhost:3001\n");
