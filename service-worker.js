/* v2 Vybin SW: precache + runtime images + background sync + push */
const CACHE_NAME = 'vybin-v2';
const PRECACHE = [
  '/', '/index.html', '/manifest.json',
  // Add your built asset paths (Vite will fingerprint; consider Workbox for auto)
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Runtime: cache-first for images, network-first everything else
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Images: cache-first with fallback to network
  if (req.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
      )
    );
    return;
  }

  // Pages/API: network-first with fallback
  event.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req))
  );
});

// Background Sync: retry queued "apply"/"save" actions when back online
self.addEventListener('sync', async (event) => {
  if (event.tag === 'vybin-sync') {
    event.waitUntil(handleSyncQueue());
  }
});

async function handleSyncQueue() {
  // Implement a small IndexedDB queue (idb-keyval) from the client;
  // read queued requests here and POST to Supabase Edge Function, then clear.
}

// Push notifications (Web Push)
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title || 'New event';
  const body = data.body || 'Check it out!';
  const icon = '/icons/icon-192.png';
  const badge = '/icons/badge-72.png';
  const actions = [
    data.actions?.apply && {action: 'apply', title: 'Apply'},
    data.actions?.save && {action: 'save', title: 'Save'},
    {action: 'open', title: 'Open'}
  ].filter(Boolean);

  event.waitUntil(
    self.registration.showNotification(title, { body, icon, badge, data, actions })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';
  if (event.action === 'apply') {
    // Focus app and postMessage to trigger apply flow
    event.waitUntil(openAndMessage(url, {type: 'APPLY_EVENT', payload: data}));
  } else if (event.action === 'save') {
    event.waitUntil(openAndMessage(url, {type: 'SAVE_EVENT', payload: data}));
  } else {
    event.waitUntil(clients.openWindow(url));
  }
});

async function openAndMessage(url, message) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const client = clientList.find((c) => c.url.includes(self.origin)) || await clients.openWindow(url);
  client && client.postMessage(message);
}
