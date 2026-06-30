'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { IconBrandYoutube } from '@tabler/icons-react';
import { IntegrationConnectRow } from '@simple/ui/integrations';
import { PanelCard, PanelNotice } from '@simple/ui/panel';
import {
    buildYouTubeConnectUrl,
    disconnectYouTube,
    fetchYouTubeIntegrationStatus,
    type YouTubeIntegrationStatus,
} from '@/lib/youtube';

export default function YouTubeIntegrationCard() {
    const [status, setStatus] = useState<YouTubeIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchYouTubeIntegrationStatus();
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
        window.location.assign(buildYouTubeConnectUrl(window.location.href));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnectYouTube();
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
        <PanelCard size="lg" className="mt-6">
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? null : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de YouTube.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    YouTube aún no está configurado. Usa las mismas credenciales de Google (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
                </PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandYoutube size={18} className="text-[#FF0000]" />}
                    title="YouTube Shorts"
                    description="Publica el video de la propiedad como Short desde el panel."
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa.`}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <IntegrationConnectRow
                    icon={
                        connected && status.account?.avatarUrl ? (
                            <Image
                                src={status.account.avatarUrl}
                                alt={status.account.channelTitle}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <IconBrandYoutube size={18} className="text-[#FF0000]" />
                        )
                    }
                    title="YouTube Shorts"
                    description="El video vertical de la propiedad se publica como Short con #Shorts."
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
                            {status.account.lastError ? <PanelNotice tone="warning">{status.account.lastError}</PanelNotice> : null}
                        </div>
                    ) : undefined}
                />
            )}
        </PanelCard>
    );
}
