'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconLoader2 } from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import { PanelStatusBadge, PanelSwitch } from '../panel/panel-primitives';

export function formatConnectedAccountLabel(
    ...parts: Array<string | null | undefined | false>
): string | undefined {
    const label = parts
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(' · ');
    return label || undefined;
}

export type IntegrationConnectRowProps = {
    icon: ReactNode;
    title: string;
    description?: string;
    connectedAccountLabel?: string | null;
    connected: boolean;
    loading?: boolean;
    busy?: boolean;
    locked?: boolean;
    lockedHint?: string;
    readOnly?: boolean;
    readOnlyHint?: string;
    canManagePlan?: boolean;
    controlVariant?: 'switch' | 'actions';
    subscriptionsHref?: string;
    ariaLabel?: string;
    onConnect: () => void;
    onDisconnect: () => void | Promise<void>;
    extraControl?: ReactNode;
    footer?: ReactNode;
};

export function IntegrationConnectRow({
    icon,
    title,
    description,
    connectedAccountLabel,
    connected,
    loading = false,
    busy = false,
    locked = false,
    lockedHint,
    readOnly = false,
    readOnlyHint,
    canManagePlan = true,
    controlVariant = 'switch',
    subscriptionsHref = '/panel/mi-cuenta/suscripcion',
    ariaLabel,
    onConnect,
    onDisconnect,
    extraControl,
    footer,
}: IntegrationConnectRowProps) {
    const switchLabel = ariaLabel ?? `${connected ? 'Desconectar' : 'Conectar'} ${title}`;
    const subtitle = connected && connectedAccountLabel
        ? connectedAccountLabel
        : (!connected ? description : undefined);

    const handleToggle = (next: boolean) => {
        if (loading || busy || locked || readOnly) return;
        if (next) {
            onConnect();
            return;
        }
        void onDisconnect();
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--bg-subtle)">
                        {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-(--fg)">{title}</p>
                            {!loading && connected ? (
                                <PanelStatusBadge label="Conectado" tone="success" size="sm" />
                            ) : null}
                            {!loading && locked ? (
                                <PanelStatusBadge label="Requiere plan" tone="warning" size="sm" />
                            ) : null}
                            {!loading && readOnly && !locked ? (
                                <PanelStatusBadge label="Solo administración" tone="neutral" size="sm" />
                            ) : null}
                        </div>
                        {subtitle ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-(--fg-muted)">{subtitle}</p>
                        ) : null}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {loading || busy ? (
                        <IconLoader2 size={18} className="animate-spin text-(--fg-muted)" aria-hidden />
                    ) : null}
                    {controlVariant === 'actions' ? (
                        !locked ? (
                            <PanelButton
                                variant={connected ? 'secondary' : 'accent'}
                                size="sm"
                                loading={loading || busy}
                                disabled={readOnly}
                                onClick={() => {
                                    if (connected) void onDisconnect();
                                    else onConnect();
                                }}
                            >
                                {connected ? 'Desconectar' : 'Conectar cuenta'}
                            </PanelButton>
                        ) : null
                    ) : (
                        <PanelSwitch
                            checked={connected}
                            onChange={handleToggle}
                            disabled={loading || busy || locked || readOnly}
                            ariaLabel={switchLabel}
                            size="sm"
                        />
                    )}
                    {extraControl}
                </div>
            </div>
            {locked && lockedHint ? (
                <div className="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-(--fg-secondary)">{lockedHint}</p>
                    {canManagePlan ? (
                        <Link href={subscriptionsHref} className="shrink-0">
                            <PanelButton variant="accent" size="sm">Ver planes</PanelButton>
                        </Link>
                    ) : (
                        <p className="text-xs text-(--fg-muted)">Pide a quien administra este espacio que revise el plan.</p>
                    )}
                </div>
            ) : null}
            {readOnly && readOnlyHint ? (
                <p className="text-xs leading-relaxed text-(--fg-muted)">{readOnlyHint}</p>
            ) : null}
            {footer}
        </div>
    );
}
