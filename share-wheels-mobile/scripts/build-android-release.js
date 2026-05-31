/**
 * Builds a signed release APK using .env.production (production API URL).
 * On Windows, copies to C:\swb first to avoid 260-char native build path limits.
 *
 * Usage:
 *   node scripts/build-android-release.js
 *   node scripts/build-android-release.js --bundle
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SHORT_ROOT = process.platform === "win32" ? "C:\\swb" : ROOT;
const useShortPath = process.platform === "win32" && ROOT.length > 40;
const buildRoot = useShortPath ? SHORT_ROOT : ROOT;
const isBundle = process.argv.includes("--bundle");
const gradleTask = isBundle ? "bundleRelease" : "assembleRelease";
const gradlew =
  process.platform === "win32"
    ? path.join("android", "gradlew.bat")
    : path.join("android", "gradlew");

const run = (cmd, cwd = buildRoot) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
};

const copyProjectToShortPath = () => {
  if (!useShortPath) return;
  console.log(`Syncing project to ${SHORT_ROOT} (Windows path-length workaround)...`);
  fs.rmSync(SHORT_ROOT, { recursive: true, force: true });
  run(
    `robocopy "${ROOT}" "${SHORT_ROOT}" /E /XD android\\app\\.cxx android\\app\\build android\\build android\\.gradle /NFL /NDL /NJH /NJS /nc /ns /np`,
    ROOT
  );
};

const copyApkBack = () => {
  if (!useShortPath) return;
  const artifact = isBundle
    ? path.join(
        buildRoot,
        "android/app/build/outputs/bundle/release/app-release.aab"
      )
    : path.join(
        buildRoot,
        "android/app/build/outputs/apk/release/app-release.apk"
      );
  if (!fs.existsSync(artifact)) {
    throw new Error(`Build artifact not found: ${artifact}`);
  }
  const outName = isBundle ? "ShareWheels-release.aab" : "ShareWheels-release.apk";
  const dest = path.join(ROOT, outName);
  fs.copyFileSync(artifact, dest);
  console.log(`\nRelease artifact: ${dest}`);
};

try {
  copyProjectToShortPath();
  run(`${gradlew} ${gradleTask} -PreactNativeArchitectures=arm64-v8a --no-daemon`);
  copyApkBack();
  if (!useShortPath) {
    const rel = isBundle
      ? "android/app/build/outputs/bundle/release/app-release.aab"
      : "android/app/build/outputs/apk/release/app-release.apk";
    console.log(`\nRelease artifact: ${path.join(ROOT, rel)}`);
  }
} catch (err) {
  process.exit(err.status || 1);
}
