/**
 * Verifies local FCM prerequisites before debugging push on device.
 * Usage: npm run fcm:verify
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const gsPath = path.join(ROOT, "android", "app", "google-services.json");

let ok = true;

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  ok = false;
};

const pass = (msg) => {
  console.log(`✓ ${msg}`);
};

console.log("Share Wheels — FCM setup check\n");

if (!fs.existsSync(gsPath)) {
  fail("Missing android/app/google-services.json");
} else {
  const gs = JSON.parse(fs.readFileSync(gsPath, "utf8"));
  const projectId = gs?.project_info?.project_id || "(unknown)";
  const packageName = gs?.client?.[0]?.client_info?.android_client_info?.package_name;
  const oauth = gs?.client?.[0]?.oauth_client || [];

  pass(`google-services.json found (project: ${projectId}, package: ${packageName})`);

  if (!oauth.length) {
    fail(
      'google-services.json has empty "oauth_client" — SHA fingerprints are NOT linked in Firebase.\n' +
        "  This causes FIS_AUTH_ERROR and getToken() fails on Android.\n" +
        "  Fix: npm run android:sha → add SHA-1 + SHA-256 in Firebase Console → download NEW google-services.json → rebuild app."
    );
  } else {
    pass(`oauth_client entries present (${oauth.length}) — SHA likely configured`);
  }
}

try {
  execSync("node scripts/print-android-sha.js", {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch {
  fail("Could not print SHA fingerprints (see scripts/print-android-sha.js)");
}

console.log(
  ok
    ? "\nLocal FCM files look OK. If push still fails, confirm backend FIREBASE_SERVICE_ACCOUNT_JSON on Render and user fcmToken in MongoDB.\n"
    : "\nFix the issues above, then rebuild: npx react-native run-android (debug) or npm run android:release (release).\n"
);

process.exit(ok ? 0 : 1);
