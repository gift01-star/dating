import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const CONTACT = process.env.EMAIL_FROM || 'mailto:noreply@edulove.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
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
