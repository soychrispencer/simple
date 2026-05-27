'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Serenata } from '@/lib/serenatas-api';
import { isPendingSerenataAction } from '@/lib/serenata-pending';
import {
    isSolicitudesSoundMuted,
    playSolicitudAlertSound,
    setSolicitudesSoundMuted,
} from '@/lib/solicitudes-alert-sound';

type Options = {
    serenatas: Serenata[];
    enabled: boolean;
    onRefresh?: () => Promise<void>;
};

type BrowserNotificationPermission = NotificationPermission | 'unsupported';

function readNotificationPermission(): BrowserNotificationPermission {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
}

export function useOwnerSolicitudesAlerts({ serenatas, enabled, onRefresh }: Options) {
    const [soundMuted, setSoundMuted] = useState(() =>
        typeof window === 'undefined' ? true : isSolicitudesSoundMuted(),
    );
    const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationPermission>(() =>
        typeof window === 'undefined' ? 'default' : readNotificationPermission(),
    );
    const initializedRef = useRef(false);
    const knownIdsRef = useRef<Set<string>>(new Set());

    const pending = useMemo(
        () => serenatas.filter(isPendingSerenataAction),
        [serenatas],
    );
    const pendingSignature = useMemo(
        () => pending.map((item) => item.id).sort().join(','),
        [pending],
    );

    useEffect(() => {
        setSoundMuted(isSolicitudesSoundMuted());
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const ids = pending.map((item) => item.id);
        if (!initializedRef.current) {
            initializedRef.current = true;
            knownIdsRef.current = new Set(ids);
            return;
        }

        const newIds = ids.filter((id) => !knownIdsRef.current.has(id));
        if (newIds.length > 0 && !isSolicitudesSoundMuted()) {
            playSolicitudAlertSound();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const first = pending.find((item) => item.id === newIds[0]);
                const title = newIds.length === 1 ? 'Nueva solicitud' : `${newIds.length} solicitudes nuevas`;
                const body = first
                    ? `${first.recipientName} · ${first.comuna ?? 'Sin comuna'}`
                    : 'Revisa tu bandeja de Solicitudes.';
                try {
                    new Notification(title, {
                        body,
                        tag: `serenata-solicitud-${newIds[0]}`,
                    });
                } catch {
                    // Notification no disponible.
                }
            }
        }
        knownIdsRef.current = new Set(ids);
    }, [enabled, pending, pendingSignature]);

    useEffect(() => {
        if (!enabled || !onRefresh) return;
        const intervalMs = pending.length > 0 ? 25_000 : 60_000;
        const timer = window.setInterval(() => {
            void onRefresh();
        }, intervalMs);
        return () => window.clearInterval(timer);
    }, [enabled, onRefresh, pending.length]);

    function toggleSoundMuted() {
        const next = !isSolicitudesSoundMuted();
        setSolicitudesSoundMuted(next);
        setSoundMuted(next);
        if (!next) {
            playSolicitudAlertSound();
        }
    }

    async function requestBrowserNotifications() {
        if (typeof Notification === 'undefined') {
            setNotificationPermission('unsupported');
            return 'unsupported' as const;
        }
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        return result;
    }

    return {
        pending,
        pendingCount: pending.length,
        soundMuted,
        toggleSoundMuted,
        notificationPermission,
        requestBrowserNotifications,
        browserNotificationsEnabled: notificationPermission === 'granted',
        browserNotificationsSupported: notificationPermission !== 'unsupported',
    };
}
