'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { IconBrandTiktok } from '@tabler/icons-react';
import { IntegrationConnectRow } from '@simple/ui/integrations';
import { PanelCard, PanelNotice } from '@simple/ui/panel';
import {
    buildTikTokConnectUrl,
    disconnectTikTok,
    fetchTikTokIntegrationStatus,
    type TikTokIntegrationStatus,
} from '@/lib/tiktok';

export default function TikTokIntegrationCard() {
    const [status, setStatus] = useState<TikTokIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchTikTokIntegrationStatus();
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
            setMessage(tiktokMessage || 'Cuenta de TikTok conectada correctamente.');
            setError(null);
            void loadStatus();
        } else if (tiktokStatus === 'error') {
            setError(tiktokMessage || 'No se pudo completar la conexión con TikTok.');
            setMessage(null);
        }

        url.searchParams.delete('tiktok');
        url.searchParams.delete('tiktokMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildTikTokConnectUrl(window.location.href));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnectTikTok();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar TikTok.');
            return;
        }
        setMessage('TikTok fue desconectado.');
        await loadStatus();
    };

    const connected = Boolean(status?.account && status.account.status === 'connected');

    return (
        <PanelCard size="lg">
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <div className="h-20 animate-pulse rounded-card bg-(--bg-muted)" />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de TikTok.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    TikTok aún no está configurado en el backend.
                </PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandTiktok size={18} />}
                    title="TikTok"
                    description="Publica videos de tus avisos desde el panel."
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
                                alt={status.account.username}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <IconBrandTiktok size={18} />
                        )
                    }
                    title="TikTok"
                    description="Publica el video del aviso como TikTok."
                    connected={connected}
                    busy={disconnecting}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    footer={connected && status.account ? (
                        <div className="space-y-2 border-t border-(--border) pt-3">
                            <p className="text-sm text-(--fg-secondary)">
                                @{status.account.username}
                                {status.account.displayName ? ` · ${status.account.displayName}` : ''}
                            </p>
                            {status.account.lastError ? <PanelNotice tone="warning">{status.account.lastError}</PanelNotice> : null}
                        </div>
                    ) : undefined}
                />
            )}
        </PanelCard>
    );
}
