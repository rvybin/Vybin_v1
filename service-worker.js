/* Vybin SW: static asset caching only */
const CACHE_NAME = 'vybin-v3';
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/;

self.addEventListener('install', (event) => {
  // Don't skipWaiting — let the existing tab finish before taking over
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(['/'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Don't clients.claim() — avoids forcing live tabs to reload
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Never intercept Supabase API or edge function calls
  if (url.hostname.includes('supabase.co')) return;

  // Cache static assets (JS, CSS, fonts, images) — cache first
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
      )
    );
    return;
  }

  // Everything else (navigation, etc.) — straight network, no caching
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title || 'Vybin';
  const body = data.body || 'Something new is happening on campus.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
