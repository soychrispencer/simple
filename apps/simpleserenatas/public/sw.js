// SimpleSerenatas Service Worker
const CACHE_NAME = 'simpleserenatas-v1';
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

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icon',
    badge: '/icon',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SimpleSerenatas', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
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
