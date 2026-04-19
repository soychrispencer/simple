'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    IconBrandWhatsapp,
    IconMail,
    IconBell,
    IconCheck,
    IconLoader2,
    IconSend,
    IconAlertCircle,
    IconLock,
    IconHistory,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
} from '@simple/ui';
import {
    fetchAgendaProfile,
    saveAgendaProfile,
    sendWhatsAppTest,
    isPlanActive,
    fetchNotificationHistory,
    type AgendaProfile,
    type NotificationEvent,
} from '@/lib/agenda-api';

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

function ProGate({ feature }: { feature: string }) {
    return (
        <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 mt-2"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border, var(--border))' }}
        >
            <IconLock size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                <strong style={{ color: 'var(--fg)' }}>{feature}</strong> está disponible en el plan Pro o Empresa.{' '}
                <Link href="/panel/suscripciones" className="underline" style={{ color: 'var(--accent)' }}>
                    Ver planes →
                </Link>
            </p>
        </div>
    );
}

export default function NotificacionesPage() {
    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);

    const [waEnabled, setWaEnabled] = useState(true);
    const [waNotifyProf, setWaNotifyProf] = useState(true);
    const [waProfPhone, setWaProfPhone] = useState('');
    const [waSaving, setWaSaving] = useState(false);
    const [waSaved, setWaSaved] = useState(false);
    const [waTesting, setWaTesting] = useState(false);
    const [waTestResult, setWaTestResult] = useState<'ok' | 'error' | null>(null);

    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [history, setHistory] = useState<NotificationEvent[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const [prof, events] = await Promise.all([
                fetchAgendaProfile(),
                fetchNotificationHistory(20),
            ]);
            if (prof) {
                setIsPro(isPlanActive(prof));
                setWaEnabled(prof.waNotificationsEnabled ?? true);
                setWaNotifyProf(prof.waNotifyProfessional ?? true);
                setWaProfPhone(prof.waProfessionalPhone ?? '');
            }
            setHistory(events);
            setHistoryLoading(false);
            setLoading(false);
        })();
    }, []);

    const handleSaveWa = async () => {
        setWaSaving(true);
        setWaSaved(false);
        await saveAgendaProfile({
            waNotificationsEnabled: waEnabled,
            waNotifyProfessional: waNotifyProf,
            waProfessionalPhone: waProfPhone || null,
        } as Partial<AgendaProfile>);
        setWaSaving(false);
        setWaSaved(true);
        setFlash({ type: 'success', message: 'Preferencias de WhatsApp guardadas.' });
        setTimeout(() => {
            setWaSaved(false);
            setFlash(null);
        }, 2500);
    };

    const handleTest = async () => {
        setWaTesting(true);
        setWaTestResult(null);
        const result = await sendWhatsAppTest();
        setWaTesting(false);
        setWaTestResult(result.ok ? 'ok' : 'error');
        setTimeout(() => setWaTestResult(null), 4000);
    };

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Notificaciones"
                description="Decide cómo y cuándo se avisa a tus pacientes (y a ti)."
            />

            {flash && (
                <div className="mb-6">
                    <PanelNotice tone={flash.type === 'success' ? 'success' : 'error'}>
                        <span className="flex items-center gap-2">
                            {flash.type === 'success' ? <IconCheck size={15} /> : <IconAlertCircle size={15} />}
                            {flash.message}
                        </span>
                    </PanelNotice>
                </div>
            )}

            <div className="flex flex-col gap-4">

                {/* Email — siempre activo */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                            <IconMail size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Email</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                    <IconCheck size={10} /> Siempre activo
                                </span>
                            </div>
                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                Cada paciente recibe un email automático al reservar, junto a las opciones para cancelar o reprogramar.
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {[
                                    'Confirmación al reservar',
                                    'Detalles de la cita y enlace para cancelar',
                                ].map((label) => (
                                    <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        <IconCheck size={12} style={{ color: 'var(--accent)' }} />
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </PanelCard>

                {/* WhatsApp */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
                            <IconBrandWhatsapp size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>WhatsApp</h2>
                                {!loading && !isPro && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309' }}>
                                        Pro
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Confirmaciones, recordatorios y cancelaciones por WhatsApp. Los mensajes salen desde <strong>SimpleAgenda</strong>.
                            </p>

                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Cargando configuración...
                                </div>
                            ) : !isPro ? (
                                <ProGate feature="WhatsApp" />
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Activar notificaciones por WhatsApp</p>
                                        <PanelSwitch checked={waEnabled} onChange={setWaEnabled} ariaLabel="Activar notificaciones de WhatsApp" />
                                    </div>

                                    <div className={`flex flex-col gap-5 transition-opacity ${!waEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <div>
                                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Avisos a tus pacientes</p>
                                            <div className="flex flex-col gap-1.5">
                                                {[
                                                    'Confirmación al reservar',
                                                    'Recordatorio 24 horas antes',
                                                    'Recordatorio 30 minutos antes',
                                                    'Aviso si la cita se cancela',
                                                ].map((label) => (
                                                    <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                        <IconCheck size={12} style={{ color: 'var(--accent)' }} />
                                                        {label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ height: 1, background: 'var(--border)' }} />

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Alertas para ti</p>
                                                <PanelSwitch checked={waNotifyProf} onChange={setWaNotifyProf} size="sm" ariaLabel="Recibir alertas por WhatsApp" />
                                            </div>
                                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                                Recibe un WhatsApp cada vez que un paciente reserve una cita nueva.
                                            </p>
                                            {waNotifyProf && (
                                                <PanelField label="Tu número de WhatsApp para alertas" hint="Si lo dejas vacío se usará el WhatsApp de tu perfil público.">
                                                    <input
                                                        type="tel"
                                                        value={waProfPhone}
                                                        onChange={(e) => setWaProfPhone(e.target.value)}
                                                        placeholder="+56 9 1234 5678"
                                                        className="form-input"
                                                    />
                                                </PanelField>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 pt-1 flex-wrap">
                                            <PanelButton variant="accent" size="sm" onClick={() => void handleSaveWa()} disabled={waSaving}>
                                                {waSaving ? <IconLoader2 size={13} className="animate-spin" /> : waSaved ? <IconCheck size={13} /> : null}
                                                {waSaving ? 'Guardando...' : waSaved ? 'Guardado' : 'Guardar'}
                                            </PanelButton>
                                            <PanelButton variant="secondary" size="sm" onClick={() => void handleTest()} disabled={waTesting}>
                                                {waTesting ? <IconLoader2 size={13} className="animate-spin" /> : <IconSend size={13} />}
                                                Enviar prueba
                                            </PanelButton>
                                            {waTestResult === 'ok' && (
                                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                                                    <IconCheck size={13} /> Mensaje enviado
                                                </span>
                                            )}
                                            {waTestResult === 'error' && (
                                                <span className="flex items-center gap-1 text-xs" style={{ color: '#dc2626' }}>
                                                    <IconAlertCircle size={13} /> Error al enviar
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </PanelCard>

                {/* Push — próximamente */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                            <IconBell size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Notificaciones push</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                    Próximamente
                                </span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                Avisos en el navegador y la app móvil cuando un paciente reserve, cancele o reprograme.
                            </p>
                        </div>
                    </div>
                </PanelCard>

                {/* Historial */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                            <IconHistory size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Historial de avisos</h2>
                                {!historyLoading && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                        {history.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                                Últimas notificaciones enviadas desde SimpleAgenda.
                            </p>

                            {historyLoading ? (
                                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={12} className="animate-spin" /> Cargando…
                                </div>
                            ) : history.length === 0 ? (
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Aún no hay avisos enviados. Verás aquí cada confirmación y recordatorio en cuanto se envíen.
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {history.map((ev) => {
                                        const statusColor = ev.status === 'sent' ? 'var(--accent)' : ev.status === 'failed' ? '#dc2626' : 'var(--fg-muted)';
                                        const statusBg = ev.status === 'sent' ? 'rgba(13,148,136,0.1)' : ev.status === 'failed' ? 'rgba(220,38,38,0.1)' : 'var(--bg-muted)';
                                        return (
                                            <li
                                                key={ev.id}
                                                className="flex items-start gap-3 px-3 py-2 rounded-lg"
                                                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                                            >
                                                <span
                                                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                                                    style={{ background: statusBg, color: statusColor }}
                                                >
                                                    {CHANNEL_LABEL[ev.channel]}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>
                                                        {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                                                        {ev.status === 'failed' && ' · falló'}
                                                    </p>
                                                    {ev.recipient && (
                                                        <p className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
                                                            {ev.recipient}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[11px] shrink-0" style={{ color: 'var(--fg-muted)' }}>
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
        </div>
    );
}
