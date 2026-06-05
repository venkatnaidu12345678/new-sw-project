/**
 * Prints SHA-1 and SHA-256 for debug and release keystores.
 * Add these in Firebase Console → Project settings → Your apps → Android → Add fingerprint.
 *
 * Usage: node scripts/print-android-sha.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const gradleProps = path.join(ROOT, "android", "gradle.properties");

const readProp = (key) => {
  if (!fs.existsSync(gradleProps)) return "";
  const line = fs
    .readFileSync(gradleProps, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.split("=").slice(1).join("=").trim() : "";
};

const printSha = (label, keystore, alias, storePass) => {
  const storePath = path.isAbsolute(keystore)
    ? keystore
    : path.join(ROOT, "android", "app", keystore);

  if (!fs.existsSync(storePath)) {
    console.warn(`\n[${label}] Keystore not found: ${storePath}`);
    return;
  }

  console.log(`\n=== ${label} ===`);
  console.log(`Keystore: ${storePath}`);
  try {
    const out = execSync(
      `keytool -list -v -keystore "${storePath}" -alias ${alias} -storepass ${storePass}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const sha1 = out.match(/SHA1:\s*([^\s]+)/i)?.[1];
    const sha256 = out.match(/SHA256:\s*([^\s]+)/i)?.[1];
    if (sha1) console.log("SHA-1:  ", sha1);
    if (sha256) console.log("SHA-256:", sha256);
  } catch (err) {
    console.error(`[${label}] keytool failed:`, err.message);
  }
};

console.log("Add every SHA below to Firebase → Android app (com.sharewheels.app).");
console.log("Then download a fresh google-services.json into android/app/.\n");

const gsPath = path.join(ROOT, "android", "app", "google-services.json");
if (fs.existsSync(gsPath)) {
  const gs = JSON.parse(fs.readFileSync(gsPath, "utf8"));
  const oauth = gs?.client?.[0]?.oauth_client || [];
  if (!oauth.length) {
    console.warn(
      "\n⚠️  google-services.json still has empty oauth_client [].\n" +
        "   After adding SHA in Firebase, you MUST download a NEW google-services.json\n" +
        "   from Firebase Console and replace android/app/google-services.json, then rebuild the APK.\n"
    );
  } else {
    console.log("\n✓ google-services.json includes oauth_client entries (SHA linked).\n");
  }
}

printSha(
  "Debug (local APK / Metro)",
  path.join(ROOT, "android", "app", "debug.keystore"),
  "androiddebugkey",
  "android"
);

const releaseStore = readProp("MYAPP_UPLOAD_STORE_FILE") || "my-release-key.keystore";
const releaseAlias = readProp("MYAPP_UPLOAD_KEY_ALIAS") || "my-key-alias";
const releasePass = readProp("MYAPP_UPLOAD_STORE_PASSWORD") || "";

if (releasePass) {
  printSha("Release (Play Store / release APK)", releaseStore, releaseAlias, releasePass);
} else {
  console.warn(
    "\n[Release] Set MYAPP_UPLOAD_STORE_PASSWORD in android/gradle.properties to print release SHA."
  );
}
