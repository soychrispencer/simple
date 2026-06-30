'use client';

import { useEffect, useState } from 'react';
import { IconCalendar } from '@tabler/icons-react';
import { PanelCard } from '../panel/panel-card.js';
import { PanelNotice } from '../panel/panel-primitives.js';
import { IntegrationConnectRow } from './integration-connect-row.js';

export type GoogleCalendarIntegrationStatus = {
    connected: boolean;
    calendarId: string | null;
};

export type GoogleCalendarIntegrationCardProps = {
    description: string;
    locked?: boolean;
    lockedHint?: string;
    subscriptionsHref?: string;
    fetchStatus: () => Promise<GoogleCalendarIntegrationStatus | null>;
    getAuthUrl: () => string;
    disconnect: () => Promise<{ ok: boolean }>;
};

export function GoogleCalendarIntegrationCard({
    description,
    locked = false,
    lockedHint = 'Requiere plan Pro o periodo de prueba activo.',
    subscriptionsHref = '/panel/mi-cuenta/suscripcion',
    fetchStatus,
    getAuthUrl,
    disconnect,
}: GoogleCalendarIntegrationCardProps) {
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [calendarId, setCalendarId] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const status = await fetchStatus();
        setConnected(status?.connected ?? false);
        setCalendarId(status?.calendarId ?? null);
        setLoading(false);
    };

    useEffect(() => {
        const url = new URL(window.location.href);
        const gcParam = url.searchParams.get('gc');
        const gcMessage = url.searchParams.get('message');
        if (gcParam === 'connected') {
            setMessage('Google Calendar conectado correctamente.');
            setError(null);
        } else if (gcParam === 'upgrade') {
            setError(lockedHint);
            setMessage(null);
        } else if (gcParam === 'error') {
            setError(gcMessage ? decodeURIComponent(gcMessage) : 'Error al conectar con Google Calendar.');
            setMessage(null);
        }
        if (gcParam) {
            url.searchParams.delete('gc');
            url.searchParams.delete('message');
            window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
        }
        void loadStatus();
    }, [lockedHint]);

    const handleDisconnect = async () => {
        setDisconnecting(true);
        setMessage(null);
        setError(null);
        const result = await disconnect();
        setDisconnecting(false);
        if (!result.ok) {
            setError('No pudimos desconectar Google Calendar.');
            return;
        }
        setConnected(false);
        setCalendarId(null);
        setMessage('Google Calendar desconectado.');
    };

    return (
        <PanelCard size="lg">
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}
            <IntegrationConnectRow
                icon={<IconCalendar size={18} style={{ color: '#4285F4' }} />}
                title="Google Calendar"
                description={description}
                connected={connected}
                loading={loading}
                busy={disconnecting}
                locked={locked && !connected}
                lockedHint={lockedHint}
                subscriptionsHref={subscriptionsHref}
                onConnect={() => {
                    window.location.href = getAuthUrl();
                }}
                onDisconnect={handleDisconnect}
                footer={connected && calendarId ? (
                    <p className="border-t border-(--border) pt-3 text-xs text-(--fg-muted)">
                        Calendario: <span className="text-(--fg)">{calendarId}</span>
                    </p>
                ) : undefined}
            />
        </PanelCard>
    );
}
