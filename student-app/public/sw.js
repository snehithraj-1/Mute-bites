// Vit: Mute Bites Service Worker for PWA & Push Notifications
const CACHE_NAME = 'vit-mute-bites-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification receiver
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Vit: Mute Bites',
      body: event.data ? event.data.text() : 'Your food order status has been updated.'
    };
  }

  const title = data.title || 'Vit: Mute Bites';
  const options = {
    body: data.body || 'Your order has been confirmed.',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click behavior
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
