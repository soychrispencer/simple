'use client';

import { useEffect, useState } from 'react';
import { buildIntegrationsReturnUrl } from '@simple/utils';
import { IconBrandYoutube } from '@tabler/icons-react';
import { IntegrationConnectRow, formatConnectedAccountLabel } from './integration-connect-row';
import { PanelCard, PanelNotice } from '../panel';

export type YouTubeIntegrationAccount = {
    channelTitle: string;
    channelHandle: string | null;
    avatarUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    lastError: string | null;
};

export type YouTubeIntegrationStatus = {
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: YouTubeIntegrationAccount | null;
};

export type YouTubeIntegrationCardProps = {
    notConfiguredMessage?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<YouTubeIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
};

export function YouTubeIntegrationCard({
    notConfiguredMessage = 'YouTube aún no está configurado.',
    buildConnectUrl,
    fetchStatus,
    disconnect,
}: YouTubeIntegrationCardProps) {
    const [status, setStatus] = useState<YouTubeIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchStatus();
        setStatus(nextStatus);
        if (!nextStatus) setError('No pudimos cargar la integración de YouTube.');
        setLoading(false);
    };

    useEffect(() => {
        void loadStatus();
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        const youtubeStatus = url.searchParams.get('youtube');
        const youtubeMessage = url.searchParams.get('youtubeMessage');
        if (!youtubeStatus && !youtubeMessage) return;

        if (youtubeStatus === 'connected') {
            setError(null);
            void loadStatus();
        } else if (youtubeStatus === 'error') {
            setError(youtubeMessage || 'No se pudo completar la conexión con YouTube.');
        }

        url.searchParams.delete('youtube');
        url.searchParams.delete('youtubeMessage');
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
            setError(result.error ?? 'No pudimos desconectar YouTube.');
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
                <PanelNotice tone="warning">No pudimos cargar el estado de YouTube.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">{notConfiguredMessage}</PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandYoutube size={18} className="text-[#FF0000]" />}
                    title="YouTube Shorts"
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa.`}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <IntegrationConnectRow
                    icon={<IconBrandYoutube size={18} className="text-[#FF0000]" />}
                    title="YouTube Shorts"
                    connected={connected}
                    connectedAccountLabel={connected && account
                        ? formatConnectedAccountLabel(
                            account.channelTitle,
                            account.channelHandle ? `@${account.channelHandle}` : null,
                        )
                        : undefined}
                    busy={disconnecting}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            )}
        </PanelCard>
    );
}
