'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconBell, IconCalendar, IconCalendarCancel } from '@tabler/icons-react';
import { fetchNotifications, markNotificationsSeen, type AgendaNotification } from '@/lib/agenda-api';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

function NotifIcon({ type }: { type: string }) {
    if (type === 'cancellation') return <IconCalendarCancel size={15} stroke={1.8} />;
    return <IconCalendar size={15} stroke={1.8} />;
}

function notifColor(type: string): string {
    if (type === 'cancellation') return '#ef4444';
    if (type === 'today') return 'var(--accent)';
    return 'var(--fg-secondary)';
}

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}

export function NotificationBell() {
    const [items, setItems] = useState<AgendaNotification[]>([]);
    const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const unread = items.filter((n) => lastSeenAt === null || n.createdAt > lastSeenAt).length;

    const load = useCallback(async () => {
        try {
            const result = await fetchNotifications();
            setItems(result.items);
            setLastSeenAt(result.lastSeenAt);
        } catch {
            // silently ignore
        }
    }, []);

    useEffect(() => {
        void load();
        const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleOpen = async () => {
        const wasOpen = open;
        setOpen((prev) => !prev);
        if (!wasOpen && unread > 0) {
            const now = Date.now();
            setLastSeenAt(now); // optimistic update
            try {
                await markNotificationsSeen();
            } catch {
                // ignore, will sync on next poll
            }
        }
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => void handleOpen()}
                className="header-icon-chip relative"
                aria-label="Notificaciones"
            >
                <IconBell size={16} />
                {unread > 0 ? (
                    <span
                        className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-0.5"
                        style={{ background: '#ef4444', color: '#fff' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                ) : null}
            </button>

            {open ? (
                <div
                    ref={panelRef}
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-xl border animate-slide-down overflow-hidden"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                    <div className="flex items-center justify-between px-3.5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Notificaciones</span>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <IconBell size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--fg-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin notificaciones recientes</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-(--bg-subtle)"
                                >
                                    <span
                                        className="mt-0.5 w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--bg-subtle)', color: notifColor(item.type) }}
                                    >
                                        <NotifIcon type={item.type} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--fg)' }}>
                                            {item.title}
                                        </p>
                                        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--fg-secondary)' }}>
                                            {item.body}
                                        </p>
                                        <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>
                                            {timeAgo(item.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="px-3.5 py-2.5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                        <a
                            href="/panel/agenda"
                            onClick={() => setOpen(false)}
                            className="text-xs font-medium transition-colors hover:underline"
                            style={{ color: 'var(--accent)' }}
                        >
                            Ver agenda completa →
                        </a>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
