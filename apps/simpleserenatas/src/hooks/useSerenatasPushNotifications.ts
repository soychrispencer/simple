'use client';

import { useEffect, useRef } from 'react';
import { API_BASE } from '@simple/config';

async function getVapidKey(): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/api/serenatas/push/vapid-public-key`, {
            credentials: 'include',
        });
        const data = (await res.json()) as { ok?: boolean; key: string | null };
        return data.ok && data.key ? data.key : null;
    } catch {
        return null;
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeAndSync(
    registration: ServiceWorkerRegistration,
    vapidKey: string
): Promise<void> {
    const existing = await registration.pushManager.getSubscription();
    const sub =
        existing ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }));
    const json = sub.toJSON();
    const keys = json.keys as { p256dh: string; auth: string } | undefined;
    if (!keys) return;
    await fetch(`${API_BASE}/api/serenatas/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys }),
    });
}

/**
 * Tras iniciar sesión, solicita permiso de notificaciones (si aplica) y registra la suscripción push
 * en la misma tabla que SimpleAgenda (`VAPID_*` en el API).
 */
export function useSerenatasPushNotifications(enabled: boolean) {
    const attempted = useRef(false);

    useEffect(() => {
        if (!enabled || attempted.current) return;
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        attempted.current = true;

        void (async () => {
            try {
                const vapidKey = await getVapidKey();
                if (!vapidKey) return;

                const permission =
                    Notification.permission === 'granted'
                        ? 'granted'
                        : await Notification.requestPermission();
                if (permission !== 'granted') return;

                const registration = await navigator.serviceWorker.ready;
                await subscribeAndSync(registration, vapidKey);
            } catch (e) {
                console.warn('[serenatas push] setup error:', e);
            }
        })();
    }, [enabled]);
}
