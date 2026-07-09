'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { IconBrandTiktok } from '@tabler/icons-react';
import { IntegrationConnectRow } from './integration-connect-row';
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
    lockedDescription?: string;
    connectedDescription?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<TikTokIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
    renderProfileImage?: (account: TikTokIntegrationAccount) => ReactNode;
    cardClassName?: string;
};

export function TikTokIntegrationCard({
    notConfiguredMessage = 'TikTok aún no está configurado en el backend.',
    lockedDescription = 'Publica videos de tus avisos desde el panel.',
    connectedDescription = 'Publica el video del aviso como TikTok.',
    buildConnectUrl,
    fetchStatus,
    disconnect,
    renderProfileImage,
    cardClassName,
}: TikTokIntegrationCardProps) {
    const [status, setStatus] = useState<TikTokIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
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
        window.location.assign(buildConnectUrl(window.location.href));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnect();
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
        <PanelCard size="lg" className={cardClassName}>
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? null : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de TikTok.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">{notConfiguredMessage}</PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandTiktok size={18} />}
                    title="TikTok"
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
                            ? (renderProfileImage?.(status.account) ?? <IconBrandTiktok size={18} />)
                            : <IconBrandTiktok size={18} />
                    }
                    title="TikTok"
                    description={connectedDescription}
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
