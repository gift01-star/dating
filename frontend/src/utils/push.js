export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (err) {
      console.error('Service worker register failed', err);
      return null;
    }
  }
  return null;
}

export async function askPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function subscribeUserToPush(registration) {
  if (!registration || !('pushManager' in registration)) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const response = await fetch('/api/notifications/vapid-public');
  if (!response.ok) {
    console.warn('Could not fetch VAPID public key');
    return null;
  }

  const { publicKey } = await response.json();
  const converted = urlBase64ToUint8Array(publicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: converted
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
