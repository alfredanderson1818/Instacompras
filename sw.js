// ═══ InstaCompras Live — Service Worker ═══
// Estrategia: App Shell (cache-first) + API (network-first)

const CACHE_NAME = 'instacompras-v1';
const RUNTIME_CACHE = 'instacompras-runtime-v1';

// App shell — archivos que siempre deben estar disponibles offline
const APP_SHELL = [
  '/Instacompras/',
  '/Instacompras/index.html',
  '/Instacompras/manifest.json',
];

// Dominios que siempre van a la red (nunca cachear)
const NETWORK_ONLY = [
  'identitytoolkit.googleapis.com',  // Firebase Auth
  'firestore.googleapis.com',         // Firestore
  'securetoken.googleapis.com',       // Token refresh
  'agora.io',                         // Video streaming
  'accounts.google.com',              // Google Sign-In
];

// ─── INSTALL — cachear app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activate immediately
      .catch(err => console.warn('[SW] Install cache failed:', err))
  );
});

// ─── ACTIVATE — limpiar caches viejos ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim()) // take control immediately
  );
});

// ─── FETCH — estrategia por tipo de request ────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Network-only: APIs, auth, streaming
  const isNetworkOnly = NETWORK_ONLY.some(domain => url.hostname.includes(domain));
  if (isNetworkOnly) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. App shell: cache-first con fallback a red
  if (APP_SHELL.includes(url.pathname) || url.pathname.endsWith('index.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // Return cached, pero actualiza en background (stale-while-revalidate)
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);
        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. Fuentes Google, imágenes Unsplash, assets externos: cache-first
  const isCacheable = (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/)
  );

  if (isCacheable) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 4. Todo lo demás: network-first con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── PUSH NOTIFICATIONS (base para FCM) ────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch(e) { data = { title: 'InstaCompras', body: event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: '/Instacompras/icons/icon-192.png',
    badge: '/Instacompras/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/Instacompras/' },
    actions: data.actions || [],
    tag: data.tag || 'instacompras',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'InstaCompras Live', options)
  );
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/Instacompras/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes('/Instacompras') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── BACKGROUND SYNC (para órdenes offline) ────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // En el futuro: leer IndexedDB, reintentar fsSet de órdenes pendientes
  console.log('[SW] Background sync: orders');
}
