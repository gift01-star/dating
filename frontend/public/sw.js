self.addEventListener('push', function(event) {
  try {
    const data = event.data ? event.data.json() : { title: 'EduLove', body: 'You have a new notification' };
    const title = data.title || 'EduLove';
    const options = {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Service worker push error', err);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let client of windowClients) {
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
