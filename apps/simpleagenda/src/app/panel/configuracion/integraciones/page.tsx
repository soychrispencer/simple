'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconBrandGoogle,
    IconCheck,
    IconLoader2,
    IconX,
    IconCalendar,
    IconLock,
    IconCash,
    IconBell,
    IconChevronRight,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelButton,
    PanelNotice,
    PanelPageHeader,
} from '@simple/ui';
import Link from 'next/link';
import {
    fetchAgendaProfile,
    fetchGoogleCalendarStatus,
    getGoogleCalendarAuthUrl,
    disconnectGoogleCalendar,
    fetchMercadoPagoStatus,
    getMercadoPagoAuthUrl,
    disconnectMercadoPago,
    isPlanActive,
} from '@/lib/agenda-api';

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

function IntegracionesPageInner() {
    const searchParams = useSearchParams();
    const gcParam = searchParams.get('gc');
    const mpParam = searchParams.get('mp');

    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);

    // Google Calendar
    const [gcConnected, setGcConnected] = useState(false);
    const [gcCalendarId, setGcCalendarId] = useState<string | null>(null);
    const [gcDisconnecting, setGcDisconnecting] = useState(false);

    // MercadoPago
    const [mpConnected, setMpConnected] = useState(false);
    const [mpUserId, setMpUserId] = useState<string | null>(null);
    const [mpDisconnecting, setMpDisconnecting] = useState(false);

    const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        const message = searchParams.get('message');
        if (gcParam === 'connected') setFlash({ type: 'success', message: 'Google Calendar conectado correctamente.' });
        else if (gcParam === 'error') setFlash({ type: 'error', message: message || 'Error al conectar con Google Calendar.' });
        else if (gcParam === 'upgrade') setFlash({ type: 'error', message: 'Necesitas el plan Pro o Empresa para conectar Google Calendar.' });

        if (mpParam === 'connected') setFlash({ type: 'success', message: 'MercadoPago conectado correctamente.' });
        else if (mpParam === 'error') setFlash({ type: 'error', message: 'Error al conectar con MercadoPago.' });
        else if (mpParam === 'upgrade') setFlash({ type: 'error', message: 'Necesitas el plan Pro o Empresa para conectar MercadoPago.' });

        const load = async () => {
            const [prof, gcStatus, mpStatus] = await Promise.all([
                fetchAgendaProfile(),
                fetchGoogleCalendarStatus(),
                fetchMercadoPagoStatus(),
            ]);
            if (prof) {
                setIsPro(isPlanActive(prof));
            }
            setGcConnected(gcStatus.connected);
            setGcCalendarId(gcStatus.calendarId);
            setMpConnected(mpStatus.connected);
            setMpUserId(mpStatus.userId);
            setLoading(false);
        };
        void load();
    }, [gcParam, mpParam]);

    const handleDisconnectGc = async () => {
        setGcDisconnecting(true);
        await disconnectGoogleCalendar();
        setGcConnected(false);
        setGcCalendarId(null);
        setGcDisconnecting(false);
        setFlash({ type: 'success', message: 'Google Calendar desconectado.' });
    };

    const handleDisconnectMp = async () => {
        setMpDisconnecting(true);
        await disconnectMercadoPago();
        setMpConnected(false);
        setMpUserId(null);
        setMpDisconnecting(false);
        setFlash({ type: 'success', message: 'MercadoPago desconectado.' });
    };

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Integraciones"
                description="Conecta tus herramientas externas para automatizar tu agenda."
            />

            {flash && (
                <div className="mb-6">
                    <PanelNotice tone={flash.type === 'success' ? 'success' : 'error'}>
                        <span className="flex items-center gap-2">
                            {flash.type === 'success' ? <IconCheck size={15} /> : <IconX size={15} />}
                            {flash.message}
                        </span>
                    </PanelNotice>
                </div>
            )}

            <div className="flex flex-col gap-4">

                {/* MercadoPago */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,158,227,0.1)', color: '#009EE3' }}>
                            <IconCash size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>MercadoPago</h2>
                                {!loading && mpConnected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Conectado
                                    </span>
                                )}
                                {!loading && !isPro && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309' }}>
                                        Pro
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Conecta tu cuenta de MercadoPago para cobros en línea. Los pagos llegan directamente a ti.
                            </p>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Verificando...
                                </div>
                            ) : !isPro ? (
                                <ProGate feature="MercadoPago" />
                            ) : mpConnected ? (
                                <div className="flex flex-col gap-2">
                                    {mpUserId && (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>ID de usuario: <span style={{ color: 'var(--fg)' }}>{mpUserId}</span></p>
                                    )}
                                    <PanelButton variant="secondary" size="sm" onClick={() => void handleDisconnectMp()} disabled={mpDisconnecting}>
                                        {mpDisconnecting ? <IconLoader2 size={14} className="animate-spin" /> : <IconX size={14} />}
                                        Desconectar
                                    </PanelButton>
                                </div>
                            ) : (
                                <a
                                    href={getMercadoPagoAuthUrl()}
                                    className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                                    style={{ background: '#009EE3', color: '#fff' }}
                                >
                                    <IconCash size={15} />
                                    Conectar con MercadoPago
                                </a>
                            )}
                        </div>
                    </div>
                </PanelCard>

                {/* Google Calendar */}
                <PanelCard size="md">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(66,133,244,0.1)', color: '#4285F4' }}>
                            <IconCalendar size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Google Calendar</h2>
                                {!loading && gcConnected && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--accent)' }}>
                                        <IconCheck size={10} /> Conectado
                                    </span>
                                )}
                                {!loading && !isPro && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(234,179,8,0.1)', color: '#b45309' }}>
                                        Pro
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>
                                Sincroniza tus citas y <strong style={{ color: 'var(--fg)' }}>genera enlaces de Google Meet automáticamente</strong> para cada sesión online. Cada reserva o cancelación se refleja en tu calendario.
                            </p>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={14} className="animate-spin" /> Verificando conexión...
                                </div>
                            ) : !isPro ? (
                                <ProGate feature="Google Calendar" />
                            ) : gcConnected ? (
                                <div className="flex flex-col gap-3">
                                    {gcCalendarId && (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            Calendario: <span style={{ color: 'var(--fg)' }}>{gcCalendarId}</span>
                                        </p>
                                    )}
                                    <PanelButton variant="secondary" size="sm" onClick={() => void handleDisconnectGc()} disabled={gcDisconnecting}>
                                        {gcDisconnecting ? <IconLoader2 size={14} className="animate-spin" /> : <IconX size={14} />}
                                        Desconectar
                                    </PanelButton>
                                </div>
                            ) : (
                                <a
                                    href={getGoogleCalendarAuthUrl()}
                                    className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                                    style={{ background: '#4285F4', color: '#fff' }}
                                >
                                    <IconBrandGoogle size={15} />
                                    Conectar con Google
                                </a>
                            )}
                        </div>
                    </div>
                </PanelCard>

                {/* Atajo a Notificaciones */}
                <Link
                    href="/panel/configuracion/notificaciones"
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        <IconBell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>¿Buscas WhatsApp y avisos?</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            Las notificaciones a pacientes ahora viven en <strong>Notificaciones</strong>.
                        </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />
                </Link>

            </div>
        </div>
    );
}

export default function IntegracionesPage() {
    return (
        <Suspense fallback={
            <div className="container-app panel-page py-4 lg:py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        }>
            <IntegracionesPageInner />
        </Suspense>
    );
}
