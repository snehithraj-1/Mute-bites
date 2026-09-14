/**
 * Web Push & Notification Helper for Vit: Mute Bites
 * Requests permission at contextual moments (e.g. after order confirmation)
 * and dispatches system notifications via the Service Worker or Notification API.
 */

export async function requestPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('[Push Permission Request Error]:', e);
      return false;
    }
  }

  return false;
}

export function showPushNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          vibrate: [200, 100, 200]
        });
      }).catch(() => {
        try {
          new Notification(title, { body, icon: '/icon-192.svg' });
        } catch {}
      });
    } else {
      try {
        new Notification(title, { body, icon: '/icon-192.svg' });
      } catch {}
    }
  }
}
