# FCM on Render (required for push notifications)

Push notifications need **two** things:

1. **Phone** — valid FCM device token saved on the user in MongoDB (`fcmToken`).
2. **Server** — Firebase Admin SDK configured on Render.

## 1. Get Firebase service account JSON

Firebase Console → Project **sharewheels-5e988** → Project settings → **Service accounts** → **Generate new private key**.

## 2. Add to Render

Render dashboard → your web service → **Environment**:

| Variable | Value |
|----------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Paste the **entire** JSON file as **one line** (no line breaks) |

Alternative: base64-encode the file and set `FIREBASE_SERVICE_ACCOUNT_BASE64`.

**Do not** rely on `FIREBASE_SERVICE_ACCOUNT_PATH` on Render — the file is not deployed.

## 3. Redeploy and verify

Open:

`https://new-sw-project.onrender.com/health`

You must see:

```json
{ "ok": true, "fcmPushEnabled": true }
```

If `fcmPushEnabled` is `false`, pushes will never leave the server.

## 4. Test

1. Log in on the **release APK** (notifications allowed).
2. Call with user JWT: `GET /auth/push-status`  
   Expect: `hasFcmToken: true`, `serverCanSendPush: true`, `tokenLength` > 100.
3. `POST /auth/send-notification` with `userId`, `title`, `body` — response should include `"pushed": true`.
