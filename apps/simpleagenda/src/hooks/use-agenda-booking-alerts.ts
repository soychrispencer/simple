'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAgendaAppointments, type AgendaAppointment } from '@/lib/agenda-api';
import {
    isAgendaBookingSoundMuted,
    playAgendaBookingAlertSound,
    setAgendaBookingSoundMuted,
} from '@/lib/booking-alert-sound';

type Options = {
    enabled: boolean;
};

function isPendingOnlineBooking(item: AgendaAppointment): boolean {
    return item.status === 'pending';
}

export function useAgendaBookingAlerts({ enabled }: Options) {
    const [soundMuted, setSoundMuted] = useState(() =>
        typeof window === 'undefined' ? true : isAgendaBookingSoundMuted(),
    );
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
        return Notification.permission;
    });

    const initializedRef = useRef(false);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const [pending, setPending] = useState<AgendaAppointment[]>([]);

    const pendingSignature = useMemo(
        () => pending.map((item) => item.id).sort().join(','),
        [pending],
    );

    useEffect(() => {
        if (!enabled) return undefined;

        let cancelled = false;
        const load = async () => {
            const from = new Date();
            from.setDate(from.getDate() - 1);
            const appointments = await fetchAgendaAppointments(from.toISOString());
            if (cancelled) return;
            setPending(appointments.filter(isPendingOnlineBooking));
        };

        void load();
        const timer = window.setInterval(() => void load(), pending.length > 0 ? 25_000 : 60_000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [enabled, pending.length]);

    useEffect(() => {
        if (!enabled) return;

        const ids = pending.map((item) => item.id);
        if (!initializedRef.current) {
            initializedRef.current = true;
            knownIdsRef.current = new Set(ids);
            return;
        }

        const newIds = ids.filter((id) => !knownIdsRef.current.has(id));
        if (newIds.length > 0 && !isAgendaBookingSoundMuted()) {
            playAgendaBookingAlertSound();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const first = pending.find((item) => item.id === newIds[0]);
                try {
                    new Notification(newIds.length === 1 ? 'Nueva reserva pendiente' : `${newIds.length} reservas nuevas`, {
                        body: first
                            ? `${first.clientName ?? 'Paciente'} · ${new Date(first.startsAt).toLocaleString('es-CL')}`
                            : 'Revisa tu agenda para confirmar.',
                        tag: `agenda-booking-${newIds[0]}`,
                    });
                } catch {
                    // Notification no disponible.
                }
            }
        }
        knownIdsRef.current = new Set(ids);
    }, [enabled, pending, pendingSignature]);

    function toggleSoundMuted() {
        const next = !isAgendaBookingSoundMuted();
        setAgendaBookingSoundMuted(next);
        setSoundMuted(next);
        if (!next) playAgendaBookingAlertSound();
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
        pendingCount: pending.length,
        soundMuted,
        toggleSoundMuted,
        notificationPermission,
        requestBrowserNotifications,
        browserNotificationsEnabled: notificationPermission === 'granted',
        browserNotificationsSupported: notificationPermission !== 'unsupported',
    };
}
