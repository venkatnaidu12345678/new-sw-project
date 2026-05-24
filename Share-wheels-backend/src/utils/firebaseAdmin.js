const admin = require("firebase-admin");
const path = require("path");

let messaging = null;

function getMessaging() {
  if (messaging) return messaging;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) return null;

  let serviceAccount;
  try {
    serviceAccount = require(path.resolve(serviceAccountPath));
  } catch (err) {
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    return messaging;
  } catch (err) {
    return null;
  }
}

function normalizeData(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
}

async function sendPushNotification(token, title, body, data = {}) {
  const messagingClient = getMessaging();
  if (!messagingClient || !token) return null;

  const message = {
    token,
    notification: { title, body },
    data: normalizeData(data),
  };

  try {
    const response = await messagingClient.send(message);
    return response;
  } catch (error) {
    return null;
  }
}

module.exports = { sendPushNotification };
