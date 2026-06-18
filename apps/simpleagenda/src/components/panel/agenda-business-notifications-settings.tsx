'use client';

import { useEffect, useState } from 'react';
import {
    IconCheck,
    IconHistory,
    IconLoader2,
    IconMail,
} from '@tabler/icons-react';
import { PanelCard } from '@simple/ui/panel';
import {
    fetchNotificationHistory,
    type NotificationEvent,
} from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';

const CHANNEL_LABEL: Record<NotificationEvent['channel'], string> = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    push: 'Push',
    sms: 'SMS',
};

const EVENT_LABEL: Record<NotificationEvent['eventType'], string> = {
    confirmation: 'Confirmación de reserva',
    reminder_24h: 'Recordatorio 24 h',
    reminder_30min: 'Recordatorio 30 min',
    cancellation: 'Cancelación',
    test: 'Mensaje de prueba',
    professional_new_booking: 'Aviso al profesional',
    reschedule: 'Reprogramación',
};

function relativeTime(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'recién';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export function AgendaBusinessNotificationsSettings({ embedded = false }: { embedded?: boolean }) {
    const [history, setHistory] = useState<NotificationEvent[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        void fetchNotificationHistory(20).then((events) => {
            setHistory(events);
            setHistoryLoading(false);
        });
    }, []);

    return (
        <div className={embedded ? 'space-y-4' : 'space-y-4'}>
            {!embedded ? (
                <div>
                    <p className="text-base font-semibold text-fg">Comunicación con {vocab.clients}</p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                        Mensajes automáticos que reciben tus {vocab.clients} y alertas operativas para ti.
                    </p>
                </div>
            ) : null}

            <PanelCard size="lg" className="space-y-4">
                <div className="flex items-start gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                    >
                        <IconMail size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-fg">Email a {vocab.clients}</h3>
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                            >
                                <IconCheck size={10} /> Siempre activo
                            </span>
                        </div>
                        <p className="mb-3 text-xs text-fg-muted">
                            Cada {vocab.client} recibe confirmación al reservar con enlace para cancelar o reprogramar.
                        </p>
                    </div>
                </div>
            </PanelCard>

            <PanelCard size="lg">
                <div className="flex items-start gap-4">
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}
                    >
                        <IconHistory size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-fg">Historial de avisos</h3>
                            {!historyLoading && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                >
                                    {history.length}
                                </span>
                            )}
                        </div>
                        <p className="mb-3 text-xs text-fg-muted">
                            Últimas notificaciones enviadas desde tu consulta.
                        </p>

                        {historyLoading ? (
                            <div className="flex items-center gap-2 text-xs text-fg-muted">
                                <IconLoader2 size={12} className="animate-spin" /> Cargando…
                            </div>
                        ) : history.length === 0 ? (
                            <p className="text-xs text-fg-muted">
                                Aún no hay avisos enviados.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {history.map((ev) => {
                                    const statusColor = ev.status === 'sent' ? 'var(--accent)' : ev.status === 'failed' ? '#dc2626' : 'var(--fg-muted)';
                                    const statusBg = ev.status === 'sent' ? 'rgba(13,148,136,0.1)' : ev.status === 'failed' ? 'rgba(220,38,38,0.1)' : 'var(--bg-muted)';
                                    return (
                                        <li
                                            key={ev.id}
                                            className="flex items-start gap-3 rounded-lg px-3 py-2"
                                            style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                                        >
                                            <span
                                                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                                style={{ background: statusBg, color: statusColor }}
                                            >
                                                {CHANNEL_LABEL[ev.channel]}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-fg">
                                                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                                                    {ev.status === 'failed' && ' · falló'}
                                                </p>
                                                {ev.recipient && (
                                                    <p className="truncate text-[11px] text-fg-muted">{ev.recipient}</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[11px] text-fg-muted">
                                                {relativeTime(ev.createdAt)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </PanelCard>
        </div>
    );
}
