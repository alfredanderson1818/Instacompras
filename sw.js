// InstaCompras Service Worker
const CACHE_NAME = 'instacompras-v1';
const STATIC_ASSETS = [
  '/Instacompras/',
  '/Instacompras/index.html',
  '/Instacompras/manifest.json',
  '/Instacompras/icon.svg',
];

// ── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Fail silently — some assets may not exist yet
      });
    })
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network first, cache fallback ─────────────────────────────────────
self.addEventListener('fetch', e => {
  // Only cache GET requests to our origin
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/Instacompras')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache fresh response
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'InstaCompras', body: '¡Hay algo nuevo para ti!', icon: '/Instacompras/icon.svg', badge: '/Instacompras/icon.svg', tag: 'instacompras' };

  try {
    const payload = e.data?.json();
    if (payload) data = { ...data, ...payload };
  } catch (_) {
    if (e.data?.text()) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/Instacompras/icon.svg',
      badge: data.badge || '/Instacompras/icon.svg',
      tag: data.tag || 'instacompras',
      data: data,
      vibrate: [200, 100, 200],
      actions: data.actions || []
    })
  );
});

// ── Notification click: open app ──────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/Instacompras/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing tab if open
      const existing = clients.find(c => c.url.includes('/Instacompras'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ── Message from app ──────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
