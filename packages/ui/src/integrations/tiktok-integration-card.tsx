'use client';

import { useEffect, useState } from 'react';
import { buildIntegrationsReturnUrl } from '@simple/utils';
import { IconBrandTiktok } from '@tabler/icons-react';
import { IntegrationConnectRow, formatConnectedAccountLabel } from './integration-connect-row';
import { PanelCard, PanelNotice } from '../panel';

export type TikTokIntegrationAccount = {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    lastError: string | null;
};

export type TikTokIntegrationStatus = {
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: TikTokIntegrationAccount | null;
};

export type TikTokIntegrationCardProps = {
    notConfiguredMessage?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<TikTokIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
};

export function TikTokIntegrationCard({
    notConfiguredMessage = 'TikTok aún no está configurado en el backend.',
    buildConnectUrl,
    fetchStatus,
    disconnect,
}: TikTokIntegrationCardProps) {
    const [status, setStatus] = useState<TikTokIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchStatus();
        setStatus(nextStatus);
        if (!nextStatus) setError('No pudimos cargar la integración de TikTok.');
        setLoading(false);
    };

    useEffect(() => {
        void loadStatus();
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        const tiktokStatus = url.searchParams.get('tiktok');
        const tiktokMessage = url.searchParams.get('tiktokMessage');
        if (!tiktokStatus && !tiktokMessage) return;

        if (tiktokStatus === 'connected') {
            setError(null);
            void loadStatus();
        } else if (tiktokStatus === 'error') {
            setError(tiktokMessage || 'No se pudo completar la conexión con TikTok.');
        }

        url.searchParams.delete('tiktok');
        url.searchParams.delete('tiktokMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildConnectUrl(buildIntegrationsReturnUrl()));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        const result = await disconnect();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar TikTok.');
            return;
        }
        await loadStatus();
    };

    const account = status?.account ?? null;
    const connected = Boolean(account && account.status !== 'disconnected');

    return (
        <PanelCard size="lg">
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? null : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de TikTok.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">{notConfiguredMessage}</PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandTiktok size={18} />}
                    title="TikTok"
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa.`}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <IntegrationConnectRow
                    icon={<IconBrandTiktok size={18} />}
                    title="TikTok"
                    connected={connected}
                    connectedAccountLabel={connected && account
                        ? formatConnectedAccountLabel(`@${account.username}`, account.displayName)
                        : undefined}
                    busy={disconnecting}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            )}
        </PanelCard>
    );
}
