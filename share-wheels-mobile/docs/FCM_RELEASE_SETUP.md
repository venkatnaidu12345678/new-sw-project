# Push notifications — release APK checklist

## End-to-end flow

1. **Release APK** obtains FCM device token (`FCMService.getDeviceTokenWithPermission`).
2. Token is saved via **`POST /auth/register-fcm-token`** on your API (`PRODUCTION_URL` from `.env.production`).
3. Backend stores `user.fcmToken` in MongoDB.
4. On events, `notificationService.notifyUser` sends via **Firebase Admin** (`FIREBASE_SERVICE_ACCOUNT_JSON` on Render).

Debug works when (a) debug SHA is in Firebase, (b) local backend is awake, (c) token sync succeeds.  
Release fails if any of these differ.

## 1. Release SHA fingerprints (required)

Release builds use `my-release-key.keystore`, **not** the debug keystore.

```bash
cd share-wheels-mobile
node scripts/print-android-sha.js
```

In [Firebase Console](https://console.firebase.google.com) → Project **sharewheels-5e988** → Android app **com.sw_mobile_app** → **Add fingerprint** for **both** SHA-1 and SHA-256 from the **Release** section.

Download the updated **`android/app/google-services.json`** and rebuild the release APK.

Your current `google-services.json` has `"oauth_client": []` — that is normal until release SHA is added; without it, **release tokens are often invalid**.

## 2. Render backend

### Firebase Admin (server push)

In Render → Environment:

- `FIREBASE_SERVICE_ACCOUNT_JSON` = full JSON of the Firebase service account (single line), **or**
- `FIREBASE_SERVICE_ACCOUNT_PATH` on local only.

Without this, in-app notifications work but **FCM push does not**.

### Cold start (Free plan)

The service sleeps after ~15 minutes. The app now calls `GET /health` before registering the FCM token and retries with longer backoff.

Optional: use [UptimeRobot](https://uptimerobot.com) to ping `https://your-app.onrender.com/health` every 5 minutes.

## 3. Release build env

Release APK reads **`.env.production`** (not `.env`):

```env
PRODUCTION_URL=https://new-sw-project.onrender.com
GOOGLE_MAPS_API_KEY=...
```

Rebuild after changes: `npm run android:release`

## 4. Verify on device

1. Install release APK, log in, accept notification permission.
2. In MongoDB, confirm the user document has a long `fcmToken`.
3. From admin/Postman: `POST /auth/send-notification` with `userId`, `title`, `body`.
4. Check Render logs for `[FCM] Send failed` or `[notifyUser] no FCM token`.
