'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconBell, IconCalendar, IconCash, IconCheck, IconChevronRight, IconLoader2, IconX } from '@tabler/icons-react';
import {
    ACCOUNT_INTEGRATIONS_PAGE,
    PanelAccountShell,
    PanelCard,
    PanelNotice,
    accountIntegrationsDescription,
} from '@simple/ui/panel';
import { IntegrationConnectRow } from '@simple/ui/integrations';
import Link from 'next/link';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';
import {
    fetchAgendaProfile,
    fetchGoogleCalendarStatus,
    getGoogleCalendarAuthUrl,
    disconnectGoogleCalendar,
    fetchMercadoPagoStatus,
    getMercadoPagoAuthUrl,
    disconnectMercadoPago,
    hasAgendaFullAccess,
} from '@/lib/agenda-api';

type FlashState = { type: 'success' | 'error' | 'warning'; message: string } | null;

function IntegracionesPageInner() {
    const searchParams = useSearchParams();
    const gcParam = searchParams.get('gc');
    const mpParam = searchParams.get('mp');

    const [loading, setLoading] = useState(true);
    const [planLocked, setPlanLocked] = useState(false);

    const [gcConnected, setGcConnected] = useState(false);
    const [gcCalendarId, setGcCalendarId] = useState<string | null>(null);
    const [gcDisconnecting, setGcDisconnecting] = useState(false);

    const [mpConnected, setMpConnected] = useState(false);
    const [mpUserId, setMpUserId] = useState<string | null>(null);
    const [mpDisconnecting, setMpDisconnecting] = useState(false);

    const [flash, setFlash] = useState<FlashState>(null);

    useEffect(() => {
        const message = searchParams.get('message');
        if (gcParam === 'connected') setFlash({ type: 'success', message: 'Google Calendar conectado correctamente.' });
        else if (gcParam === 'upgrade') {
            setFlash({ type: 'warning', message: 'Google Calendar requiere plan Pro o un periodo de prueba activo.' });
        } else if (gcParam === 'error') setFlash({ type: 'error', message: message || 'Error al conectar con Google Calendar.' });

        if (mpParam === 'connected') setFlash({ type: 'success', message: 'MercadoPago conectado correctamente.' });
        else if (mpParam === 'upgrade') {
            setFlash({ type: 'warning', message: 'MercadoPago requiere plan Pro o un periodo de prueba activo.' });
        } else if (mpParam === 'error') setFlash({ type: 'error', message: 'Error al conectar con MercadoPago.' });

        const load = async () => {
            const [profile, gcStatus, mpStatus] = await Promise.all([
                fetchAgendaProfile(),
                fetchGoogleCalendarStatus(),
                fetchMercadoPagoStatus(),
            ]);
            setPlanLocked(profile ? !hasAgendaFullAccess(profile) : false);
            setGcConnected(gcStatus.connected);
            setGcCalendarId(gcStatus.calendarId);
            setMpConnected(mpStatus.connected);
            setMpUserId(mpStatus.userId);
            setLoading(false);
        };
        void load();
    }, [gcParam, mpParam, searchParams]);

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

    const planHint = 'Requiere plan Pro o periodo de prueba activo.';

    return (
        <PanelAccountShell
            activeKey="integraciones"
            tabs={accountSectionTabs}
            title={ACCOUNT_INTEGRATIONS_PAGE.title}
            description={accountIntegrationsDescription('Simple Agenda')}
        >
            {flash ? (
                <div className="mb-6">
                    <PanelNotice tone={flash.type}>
                        <span className="flex items-center gap-2">
                            {flash.type === 'success' ? <IconCheck size={15} /> : <IconX size={15} />}
                            {flash.message}
                        </span>
                    </PanelNotice>
                </div>
            ) : null}

            <div className="flex flex-col gap-4">
                <PanelCard size="md">
                    <IntegrationConnectRow
                        icon={<IconCash size={18} style={{ color: '#009EE3' }} />}
                        title="MercadoPago"
                        description="Cobros en línea; los pagos llegan directamente a tu cuenta."
                        connected={mpConnected}
                        loading={loading}
                        busy={mpDisconnecting}
                        locked={planLocked && !mpConnected}
                        lockedHint={planHint}
                        onConnect={() => {
                            window.location.href = getMercadoPagoAuthUrl();
                        }}
                        onDisconnect={handleDisconnectMp}
                        footer={mpConnected && mpUserId ? (
                            <p className="border-t border-(--border) pt-3 text-xs text-(--fg-muted)">
                                ID de usuario: <span className="text-(--fg)">{mpUserId}</span>
                            </p>
                        ) : undefined}
                    />
                </PanelCard>

                <PanelCard size="md">
                    <IntegrationConnectRow
                        icon={<IconCalendar size={18} style={{ color: '#4285F4' }} />}
                        title="Google Calendar"
                        description="Sincroniza citas y genera enlaces de Google Meet para sesiones online."
                        connected={gcConnected}
                        loading={loading}
                        busy={gcDisconnecting}
                        locked={planLocked && !gcConnected}
                        lockedHint={planHint}
                        onConnect={() => {
                            window.location.href = getGoogleCalendarAuthUrl();
                        }}
                        onDisconnect={handleDisconnectGc}
                        footer={gcConnected && gcCalendarId ? (
                            <p className="border-t border-(--border) pt-3 text-xs text-(--fg-muted)">
                                Calendario: <span className="text-(--fg)">{gcCalendarId}</span>
                            </p>
                        ) : undefined}
                    />
                </PanelCard>

                <Link
                    href="/panel/mi-negocio/configuraciones"
                    className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        <IconBell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>¿WhatsApp a pacientes?</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            La comunicación con pacientes está en Mi negocio → Configuraciones.
                        </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />
                </Link>
            </div>
        </PanelAccountShell>
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
