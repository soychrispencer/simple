'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { IconCash } from '@tabler/icons-react';
import type { MercadoPagoIntegrationVertical } from '@simple/utils';
import {
    buildMercadoPagoConnectUrl,
    disconnectMercadoPagoIntegration,
    fetchMercadoPagoIntegrationStatus,
    type MercadoPagoIntegrationStatus,
} from '@simple/utils';
import { PanelCard } from '../panel/panel-card.js';
import { PanelNotice } from '../panel/panel-primitives.js';
import { IntegrationConnectRow } from './integration-connect-row.js';

export type MercadoPagoIntegrationCardProps = {
    vertical: MercadoPagoIntegrationVertical;
    subscriptionHref?: string;
    lockedHint?: string;
    description?: string;
    extraControl?: ReactNode;
    className?: string;
    embedded?: boolean;
    onConnectionChange?: (connected: boolean) => void;
};

export function MercadoPagoIntegrationCard({
    vertical,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
    lockedHint,
    description,
    extraControl,
    className,
    embedded = false,
    onConnectionChange,
}: MercadoPagoIntegrationCardProps) {
    const [status, setStatus] = useState<MercadoPagoIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        const nextStatus = await fetchMercadoPagoIntegrationStatus(vertical);
        setStatus(nextStatus);
        if (nextStatus) onConnectionChange?.(nextStatus.connected);
        setLoading(false);
    }, [onConnectionChange, vertical]);

    useEffect(() => {
        void loadStatus();
    }, [loadStatus]);

    useEffect(() => {
        const url = new URL(window.location.href);
        const mpStatus = url.searchParams.get('mp');
        const mpMessage = url.searchParams.get('mpMessage');
        if (!mpStatus && !mpMessage) return;

        if (mpStatus === 'connected') {
            setError(null);
            void loadStatus();
        } else if (mpStatus === 'upgrade') {
            setError(lockedHint || 'Tu plan actual no incluye conectar MercadoPago.');
        } else if (mpStatus === 'error') {
            setError(mpMessage || 'No se pudo completar la conexión con MercadoPago.');
        }

        url.searchParams.delete('mp');
        url.searchParams.delete('mpMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, [loadStatus, lockedHint]);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildMercadoPagoConnectUrl(vertical, window.location.href));
    };

    const onDisconnect = async () => {
        setError(null);
        setDisconnecting(true);
        setError(null);
        const result = await disconnectMercadoPagoIntegration(vertical);
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar MercadoPago.');
            return;
        }
        await loadStatus();
    };

    const connected = Boolean(status?.connected);
    const locked = Boolean(status && !status.eligible && !connected);
    const missingTarget = Boolean(status && status.eligible && !status.hasTarget && !connected);

    const content = (
        <>
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <IntegrationConnectRow
                    icon={<IconCash size={18} style={{ color: '#009EE3' }} />}
                    title="MercadoPago"
                    description={description}
                    connected={false}
                    loading
                    controlVariant="actions"
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    extraControl={extraControl}
                />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de MercadoPago.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    No se pudo iniciar la conexión con Mercado Pago. Contacta a soporte para habilitarla.
                </PanelNotice>
            ) : !status.canManageIntegration ? (
                <PanelNotice tone="neutral">
                    {connected
                        ? 'MercadoPago está conectado para este espacio. Solo dueños y administradores pueden cambiar esta conexión.'
                        : 'Solo dueños y administradores pueden conectar MercadoPago para este espacio.'}
                </PanelNotice>
            ) : missingTarget ? (
                <PanelNotice tone="warning">
                    Completa tu perfil de negocio antes de conectar MercadoPago.
                </PanelNotice>
            ) : (
                <IntegrationConnectRow
                    icon={<IconCash size={18} style={{ color: '#009EE3' }} />}
                    title="MercadoPago"
                    description={description}
                    connected={connected}
                    connectedAccountLabel={connected && status.userId ? `Cuenta #${status.userId}` : undefined}
                    busy={disconnecting}
                    locked={locked}
                    lockedHint={lockedHint || `Tu plan actual es ${status.currentPlanId}.`}
                    subscriptionsHref={subscriptionHref}
                    controlVariant="actions"
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    extraControl={extraControl}
                />
            )}
        </>
    );

    if (embedded) {
        return <div className={className}>{content}</div>;
    }

    return (
        <PanelCard size="lg" className={className}>
            {content}
        </PanelCard>
    );
}
