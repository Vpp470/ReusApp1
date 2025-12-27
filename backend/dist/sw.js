/**
 * Service Worker per Web Push Notifications
 * El Tomb de Reus - PWA
 */

// Versió del Service Worker
const SW_VERSION = '1.0.0';
const CACHE_NAME = 'el-tomb-reus-v1';

// Fitxers a cachear per offline
const OFFLINE_URLS = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instal·lació del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instal·lant Service Worker v' + SW_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache obert, afegint fitxers offline');
      return cache.addAll(OFFLINE_URLS);
    })
  );
  
  // Activar immediatament sense esperar
  self.skipWaiting();
});

// Activació del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activat v' + SW_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminant cache antic:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre control de totes les pàgines immediatament
  self.clients.claim();
});

// Gestió de notificacions push
self.addEventListener('push', (event) => {
  console.log('[SW] Notificació push rebuda');
  
  let data = {
    title: 'El Tomb de Reus',
    body: 'Nova notificació',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {}
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
        requireInteraction: payload.requireInteraction || false,
        tag: payload.tag || 'el-tomb-de-reus'
      };
    }
  } catch (e) {
    console.error('[SW] Error processant dades push:', e);
    // Si no és JSON, usar el text directament
    if (event.data) {
      data.body = event.data.text();
    }
  }
  
  console.log('[SW] Mostrant notificació:', data.title);
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    requireInteraction: data.requireInteraction,
    tag: data.tag,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Obrir',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Tancar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic a la notificació
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic a notificació:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Determinar URL a obrir - per defecte anar a la pantalla de notificacions
  let url = '/notifications';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ja hi ha una finestra oberta, enfocar-la i navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Si no, obrir una nova finestra
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Tancar notificació
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificació tancada');
});

// Fetch per mode offline (opcional, per PWA)
self.addEventListener('fetch', (event) => {
  // Només cachear GET requests
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests a APIs
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        // Si és una navegació, retornar pàgina principal
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

console.log('[SW] Service Worker carregat - El Tomb de Reus v' + SW_VERSION);
