'use client';

import { useEffect, useState } from 'react';
import { IconBrandInstagram } from '@tabler/icons-react';
import { PanelCard } from '../panel/panel-card';
import { PanelNotice } from '../panel/panel-primitives';
import { formatConnectedAccountLabel, IntegrationConnectRow } from './integration-connect-row';

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
    subscriptionsHref?: string;
    buildConnectUrl: (returnTo: string) => string;
    fetchStatus: () => Promise<InstagramIntegrationStatus | null>;
    disconnect: () => Promise<{ ok: boolean; error?: string }>;
};

export function InstagramIntegrationCard({
    subscriptionsHref = '/panel/mi-cuenta/suscripcion',
    buildConnectUrl,
    fetchStatus,
    disconnect,
}: InstagramIntegrationCardProps) {
    const [status, setStatus] = useState<InstagramIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
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
            setError(null);
            void loadStatus();
        } else if (instagramStatus === 'error') {
            setError(instagramMessage || 'No se pudo conectar Instagram.');
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
        const result = await disconnect();
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar Instagram.');
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
                <PanelNotice tone="warning">No pudimos cargar el estado de Instagram.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">Instagram aún no está disponible.</PanelNotice>
            ) : !status.eligible ? (
                <IntegrationConnectRow
                    icon={<IconBrandInstagram size={18} />}
                    title="Instagram"
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
