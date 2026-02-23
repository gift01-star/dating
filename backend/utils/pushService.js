import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const RAW_VAPID_SUBJECT = process.env.VAPID_SUBJECT || process.env.EMAIL_FROM || 'mailto:noreply@edulove.com';

// Normalize VAPID subject: allow plain email addresses and prefix with mailto: if needed.
let CONTACT = RAW_VAPID_SUBJECT;
if (CONTACT && !/^mailto:|^https?:\/\//i.test(CONTACT)) {
  if (CONTACT.includes('@')) {
    CONTACT = `mailto:${CONTACT}`;
  } else {
    CONTACT = `mailto:${CONTACT}`;
  }
}

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (err) {
    console.error('[Push] Failed to set VAPID details; check VAPID_SUBJECT or EMAIL_FROM format.', err && err.message ? err.message : err);
  }
} else {
  console.warn('[Push] VAPID keys not configured. Push notifications will be disabled.');
}

export const sendPushToSubscription = async (subscription, payload) => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('[Push] Error sending to subscription', err?.statusCode || err);
    return false;
  }
};

export const sendPushToMany = async (subscriptions = [], payload = {}) => {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) return [];

  const results = await Promise.all(subscriptions.map(s => sendPushToSubscription(s, payload)));
  return results;
};

export default { sendPushToSubscription, sendPushToMany };
