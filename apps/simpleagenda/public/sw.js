// SimpleAgenda Service Worker — Web Push
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'SimpleAgenda', body: event.data.text() };
    }
    const title = payload.title ?? 'SimpleAgenda';
    const options = {
        body: payload.body ?? '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: payload.url ?? '/panel/agenda' },
        vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/panel/agenda';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        }),
    );
});
