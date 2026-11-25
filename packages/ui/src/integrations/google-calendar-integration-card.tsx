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
    locked?: boolean;
    lockedHint?: string;
    subscriptionsHref?: string;
    fetchStatus: () => Promise<GoogleCalendarIntegrationStatus | null>;
    getAuthUrl: () => string;
    disconnect: () => Promise<{ ok: boolean }>;
};

export function GoogleCalendarIntegrationCard({
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
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const status = await fetchStatus();
            setConnected(status?.connected ?? false);
            setCalendarId(status?.calendarId ?? null);
        } catch {
            setError('No pudimos consultar el estado de Google Calendar.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const url = new URL(window.location.href);
        const gcParam = url.searchParams.get('gc');
        const gcMessage = url.searchParams.get('message');
        if (gcParam === 'connected') {
            setError(null);
        } else if (gcParam === 'upgrade') {
            setError(lockedHint);
        } else if (gcParam === 'error') {
            setError(gcMessage ? decodeURIComponent(gcMessage) : 'Error al conectar con Google Calendar.');
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
        setError(null);
        try {
            const result = await disconnect();
            if (!result.ok) {
                setError('No pudimos desconectar Google Calendar.');
                return;
            }
            setConnected(false);
            setCalendarId(null);
        } catch {
            setError('No pudimos desconectar Google Calendar.');
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <PanelCard size="lg">
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}
            <IntegrationConnectRow
                icon={<IconCalendar size={18} style={{ color: '#4285F4' }} />}
                title="Google Calendar"
                connected={connected}
                connectedAccountLabel={connected ? calendarId : undefined}
                loading={loading}
                busy={disconnecting}
                locked={locked && !connected}
                lockedHint={lockedHint}
                subscriptionsHref={subscriptionsHref}
                onConnect={() => {
                    window.location.href = getAuthUrl();
                }}
                onDisconnect={handleDisconnect}
            />
        </PanelCard>
    );
}
