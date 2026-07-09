'use client';

import { useEffect, useState } from 'react';
import { IconBrandInstagram } from '@tabler/icons-react';
import { PanelCard } from '../panel/panel-card';
import { PanelNotice } from '../panel/panel-primitives';
import { IntegrationConnectRow } from './integration-connect-row';

export type InstagramIntegrationAccount = {
    username: string;
    displayName: string | null;
    accountType: string | null;
    profilePictureUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
    lastError: string | null;
    lastSyncedAt?: number | null;
    lastPublishedAt?: number | null;
    scopes?: string[];
};

export type InstagramIntegrationPublication = {
    id: string;
    listingTitle: string;
    status: 'published' | 'failed';
    instagramPermalink: string | null;
    errorMessage: string | null;
    publishedAt: number | null;
    createdAt: number;
};

export type InstagramIntegrationStatus = {
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: InstagramIntegrationAccount | null;
    recentPublications: InstagramIntegrationPublication[];
};

export type InstagramIntegrationCardProps = {
    panelDescription: string;
    connectedDescription?: string;
    subscriptionsHref?: string;
    listingNoun?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<InstagramIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
};

export function InstagramIntegrationCard({
    panelDescription,
    connectedDescription = 'Publica tus avisos desde Compartir.',
    subscriptionsHref = '/panel/mi-cuenta/suscripcion',
    listingNoun = 'avisos',
    buildConnectUrl,
    fetchStatus,
    disconnect,
}: InstagramIntegrationCardProps) {
    const [status, setStatus] = useState<InstagramIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchStatus();
        setStatus(nextStatus);
        if (!nextStatus) {
            setError('No pudimos cargar la integración de Instagram.');
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadStatus();
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        const instagramStatus = url.searchParams.get('instagram');
        const instagramMessage = url.searchParams.get('instagramMessage');
        if (!instagramStatus && !instagramMessage) return;

        if (instagramStatus === 'connected') {
            setMessage(instagramMessage || 'Instagram conectado.');
            setError(null);
            void loadStatus();
        } else if (instagramStatus === 'error') {
            setError(instagramMessage || 'No se pudo conectar Instagram.');
            setMessage(null);
        }

        url.searchParams.delete('instagram');
        url.searchParams.delete('instagramMessage');
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
            setError(result.error ?? 'No pudimos desconectar Instagram.');
            return;
        }
        setMessage('Instagram fue desconectado.');
        await loadStatus();
    };

    const account = status?.account ?? null;
    const connected = Boolean(account && account.status !== 'disconnected');

    return (
        <PanelCard size="lg">
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? null : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de Instagram.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    Instagram aún no está disponible. Vuelve a intentar más tarde.
                </PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandInstagram size={18} />}
                    title="Instagram"
                    description={panelDescription}
                    connected={false}
                    locked
                    lockedHint={`Tu plan actual es ${status.currentPlanId}. Disponible en Pro y Empresa.`}
                    subscriptionsHref={subscriptionsHref}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : (
                <IntegrationConnectRow
                    icon={<IconBrandInstagram size={18} />}
                    title="Instagram"
                    description={
                        connected && account
                            ? connectedDescription
                            : `Conecta tu cuenta profesional para publicar ${listingNoun}.`
                    }
                    connected={connected}
                    busy={disconnecting}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            )}
        </PanelCard>
    );
}
