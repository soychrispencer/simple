// SimpleSerenatas Service Worker
const CACHE_NAME = 'simpleserenatas-v2';
const STATIC_ASSETS = [
  '/',
  '/inicio',
  '/agenda',
  '/solicitudes',
  '/grupos',
  '/perfil',
  '/icon',
  '/apple-icon',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache
        const cached = await caches.match(event.request);
        if (cached) return cached;
        
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <title>Sin conexión - SimpleSerenatas</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
                  .container { text-align: center; padding: 2rem; }
                  h1 { color: #333; margin-bottom: 1rem; }
                  p { color: #666; }
                  button { margin-top: 1rem; padding: 0.75rem 1.5rem; background: #E11D48; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📱 Sin conexión</h1>
                  <p>Verifica tu conexión a internet para continuar usando SimpleSerenatas.</p>
                  <button onclick="location.reload()">Reintentar</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        
        throw new Error('Network error');
      })
  );
});

// Push — payload JSON del API (`title`, `body`, `url`) igual que SimpleAgenda
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SimpleSerenatas', body: event.data.text() };
  }
  const title = payload.title || 'SimpleSerenatas';
  const options = {
    body: payload.body || payload.message || '',
    icon: '/icon',
    badge: '/icon',
    tag: payload.tag || 'serenatas-push',
    data: { url: payload.url || '/inicio' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/inicio';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-serenatas') {
    event.waitUntil(syncSerenatas());
  }
});

async function syncSerenatas() {
  // Implement sync logic for offline actions
  console.log('[SW] Syncing serenatas...');
}
