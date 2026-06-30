'use client';

import { useEffect, useState } from 'react';
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
    className?: string;
};

export function MercadoPagoIntegrationCard({
    vertical,
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
    lockedHint,
    className,
}: MercadoPagoIntegrationCardProps) {
    const [status, setStatus] = useState<MercadoPagoIntegrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStatus = async () => {
        setLoading(true);
        const nextStatus = await fetchMercadoPagoIntegrationStatus(vertical);
        setStatus(nextStatus);
        setError(nextStatus ? null : 'No pudimos cargar la integración de MercadoPago.');
        setLoading(false);
    };

    useEffect(() => {
        void loadStatus();
    }, [vertical]);

    useEffect(() => {
        const url = new URL(window.location.href);
        const mpStatus = url.searchParams.get('mp');
        const mpMessage = url.searchParams.get('mpMessage');
        if (!mpStatus && !mpMessage) return;

        if (mpStatus === 'connected') {
            setMessage(mpMessage || 'MercadoPago conectado correctamente.');
            setError(null);
            void loadStatus();
        } else if (mpStatus === 'upgrade') {
            setError(lockedHint || 'Tu plan actual no incluye conectar MercadoPago.');
            setMessage(null);
        } else if (mpStatus === 'error') {
            setError(mpMessage || 'No se pudo completar la conexión con MercadoPago.');
            setMessage(null);
        }

        url.searchParams.delete('mp');
        url.searchParams.delete('mpMessage');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, [lockedHint, vertical]);

    const onConnect = () => {
        setError(null);
        window.location.assign(buildMercadoPagoConnectUrl(vertical, window.location.href));
    };

    const onDisconnect = async () => {
        setDisconnecting(true);
        setError(null);
        setMessage(null);
        const result = await disconnectMercadoPagoIntegration(vertical);
        setDisconnecting(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos desconectar MercadoPago.');
            return;
        }
        setMessage('MercadoPago desconectado.');
        await loadStatus();
    };

    const connected = Boolean(status?.connected);
    const locked = Boolean(status && !status.eligible && !connected);
    const missingTarget = Boolean(status && status.eligible && !status.hasTarget && !connected);

    return (
        <PanelCard size="lg" className={className}>
            {message ? <PanelNotice tone="success" className="mb-4">{message}</PanelNotice> : null}
            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            {loading ? (
                <IntegrationConnectRow
                    icon={<IconCash size={18} style={{ color: '#009EE3' }} />}
                    title="MercadoPago"
                    description="Cobros en línea; los pagos llegan directamente a tu cuenta."
                    connected={false}
                    loading
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                />
            ) : !status ? (
                <PanelNotice tone="warning">No pudimos cargar el estado de MercadoPago. Verifica que simple-api esté corriendo.</PanelNotice>
            ) : !status.configured ? (
                <PanelNotice tone="warning">
                    MercadoPago aún no está configurado en este entorno (`MP_OPERATOR_APP_ID` / `MP_AGENDA_APP_ID`).
                </PanelNotice>
            ) : missingTarget ? (
                <PanelNotice tone="warning">
                    Completa tu perfil de negocio antes de conectar MercadoPago.
                </PanelNotice>
            ) : (
                <>
                    {!connected ? (
                        <PanelNotice tone="neutral" className="mb-4">
                            Activa el interruptor para conectar tu cuenta de MercadoPago. Te llevaremos al login de MercadoPago y los cobros irán directo a tu cuenta.
                        </PanelNotice>
                    ) : null}
                    <IntegrationConnectRow
                    icon={<IconCash size={18} style={{ color: '#009EE3' }} />}
                    title="MercadoPago"
                    description="Cobros en línea; los pagos llegan directamente a tu cuenta."
                    connected={connected}
                    busy={disconnecting}
                    locked={locked}
                    lockedHint={lockedHint || `Tu plan actual es ${status.currentPlanId}.`}
                    subscriptionsHref={subscriptionHref}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    footer={connected && status.userId ? (
                        <p className="border-t border-(--border) pt-3 text-xs text-(--fg-muted)">
                            ID de usuario: <span className="text-(--fg)">{status.userId}</span>
                        </p>
                    ) : undefined}
                    />
                </>
            )}
        </PanelCard>
    );
}
