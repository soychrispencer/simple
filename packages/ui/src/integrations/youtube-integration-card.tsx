'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { IconBrandYoutube } from '@tabler/icons-react';
import { IntegrationConnectRow } from './integration-connect-row';
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
    lockedDescription?: string;
    connectedDescription?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<YouTubeIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
    renderProfileImage?: (account: YouTubeIntegrationAccount) => ReactNode;
    cardClassName?: string;
};

export function YouTubeIntegrationCard({
    notConfiguredMessage = 'YouTube aún no está configurado. Usa las mismas credenciales de Google (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).',
    lockedDescription = 'Publica el video del aviso como Short desde el panel.',
    connectedDescription = 'El video vertical del aviso se publica como Short con #Shorts.',
    buildConnectUrl,
    fetchStatus,
    disconnect,
    renderProfileImage,
    cardClassName,
}: YouTubeIntegrationCardProps) {
    const [status, setStatus] = useState<YouTubeIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
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
            setMessage(youtubeMessage || 'Canal de YouTube conectado correctamente.');
            setError(null);
            void loadStatus();
        } else if (youtubeStatus === 'error') {
            setError(youtubeMessage || 'No se pudo completar la conexión con YouTube.');
            setMessage(null);
        }

        url.searchParams.delete('youtube');
        url.searchParams.delete('youtubeMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildConnectUrl(window.location.href));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnect();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar YouTube.');
            return;
        }
        setMessage('YouTube fue desconectado.');
        await loadStatus();
    };

    const connected = Boolean(status?.account && status.account.status === 'connected');

    return (
        <PanelCard size="lg" className={cardClassName}>
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? null : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de YouTube.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">{notConfiguredMessage}</PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandYoutube size={18} className="text-[#FF0000]" />}
                    title="YouTube Shorts"
                    description={lockedDescription}
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa.`}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <IntegrationConnectRow
                    icon={
                        connected && status.account
                            ? (renderProfileImage?.(status.account) ?? (
                                <IconBrandYoutube size={18} className="text-[#FF0000]" />
                            ))
                            : <IconBrandYoutube size={18} className="text-[#FF0000]" />
                    }
                    title="YouTube Shorts"
                    description={connectedDescription}
                    connected={connected}
                    busy={disconnecting}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    footer={connected && status.account ? (
                        <div className="space-y-2 border-t border-(--border) pt-3">
                            <p className="text-sm text-(--fg-secondary)">
                                {status.account.channelTitle}
                                {status.account.channelHandle ? ` · @${status.account.channelHandle}` : ''}
                            </p>
                            {status.account.lastError ? (
                                <PanelNotice tone="warning">{status.account.lastError}</PanelNotice>
                            ) : null}
                        </div>
                    ) : undefined}
                />
            )}
        </PanelCard>
    );
}
