'use client';

import { useEffect, useState } from 'react';
import { PanelButton, PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui';
import { IconClock, IconMapPin } from '@tabler/icons-react';
import { serenatasApi, type Serenata } from '@/lib/serenatas-api';
import { isPendingSerenataAction } from '@/lib/serenata-pending';
import type { Section } from '@/context/serenata-context';
import {
    EmptyBlock,
    FormFeedback,
    formatShortSerenataDate,
    money,
    serenataStatusLabel,
    serenataStatusTone,
    type FormStatus,
} from './shared';

export function ProviderGroupRequestsSection({
    groupId,
    groupName,
    setSection,
    refresh,
}: {
    groupId: string;
    groupName: string;
    setSection: (section: Section) => void;
    refresh: () => Promise<void>;
}) {
    const [items, setItems] = useState<Serenata[]>([]);
    const [status, setStatus] = useState<FormStatus>({ loading: true, error: null, ok: null });
    const [actionStatus, setActionStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    async function load() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.providerGroupRequests(groupId);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos cargar solicitudes.', ok: null });
            return;
        }
        setItems(response.items);
        setStatus({ loading: false, error: null, ok: null });
    }

    useEffect(() => {
        void load();
    }, [groupId]);

    const pending = items.filter((item) => isPendingSerenataAction(item));

    async function respond(serenataId: string, action: 'accept' | 'reject') {
        setActionStatus({ loading: true, error: null, ok: null });
        const response = action === 'accept'
            ? await serenatasApi.acceptSerenataOffer(serenataId)
            : await serenatasApi.rejectSerenataOffer(serenataId);
        if (!response.ok) {
            setActionStatus({
                loading: false,
                error: response.error ?? 'No pudimos actualizar la solicitud.',
                ok: null,
            });
            return;
        }
        await load();
        await refresh();
        setActionStatus({
            loading: false,
            error: null,
            ok: action === 'accept' ? 'Solicitud aceptada.' : 'Solicitud rechazada.',
        });
    }

    return (
        <PanelCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--fg)]">Solicitudes recibidas</h3>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                        Solo solicitudes enviadas a <strong>{groupName}</strong> desde el marketplace.
                    </p>
                </div>
                <PanelButton variant="secondary" size="sm" onClick={() => setSection('solicitudes')}>
                    Ver todas en Solicitudes
                </PanelButton>
            </div>

            <PanelNotice tone="neutral" className="mt-4">
                La vista global de <strong>Solicitudes</strong> incluye también serenatas propias y del flujo anterior de
                la aplicación.
            </PanelNotice>

            {status.loading ? (
                <p className="mt-4 text-sm text-[var(--fg-muted)]">Cargando solicitudes…</p>
            ) : status.error ? (
                <p className="mt-4 text-sm text-[var(--danger)]">{status.error}</p>
            ) : pending.length === 0 ? (
                <div className="mt-4">
                    <EmptyBlock
                        title="Sin solicitudes pendientes"
                        description="Cuando un cliente solicite este grupo en el marketplace, aparecerá aquí."
                    />
                </div>
            ) : (
                <div className="mt-4 grid gap-3">
                    {pending.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-card border border-border bg-surface p-4"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-[var(--fg)]">{item.recipientName}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                                        <span className="flex items-center gap-1.5">
                                            <IconClock size={15} className="shrink-0" />
                                            {formatShortSerenataDate(item)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <IconMapPin size={15} className="shrink-0" />
                                            {item.comuna ?? 'Sin comuna'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-lg font-bold text-accent">{money(item.price)}</p>
                                </div>
                                <PanelStatusBadge
                                    tone={serenataStatusTone(item.status)}
                                    label={serenataStatusLabel(item.status)}
                                    size="sm"
                                />
                            </div>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <PanelButton
                                    className="flex-1"
                                    disabled={actionStatus.loading}
                                    onClick={() => void respond(item.id, 'accept')}
                                >
                                    Aceptar
                                </PanelButton>
                                <PanelButton
                                    className="flex-1"
                                    variant="secondary"
                                    disabled={actionStatus.loading}
                                    onClick={() => void respond(item.id, 'reject')}
                                >
                                    Rechazar
                                </PanelButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <FormFeedback status={actionStatus} />
        </PanelCard>
    );
}
