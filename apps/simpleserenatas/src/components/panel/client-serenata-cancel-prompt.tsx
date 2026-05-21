'use client';

import { useState } from 'react';
import { PanelButton, PanelField, usePanelConfirm } from '@simple/ui';
import { type Serenata, serenatasApi } from '@/lib/serenatas-api';
import {
    canClientCancelSerenata,
    clientCancelActionLabel,
    clientCancelConfirmCopy,
    clientCancelRequiresReason,
    clientCancelSheetDescription,
    isClientUnpaidDraft,
} from '@/lib/client-serenata-cancel';
import { PanelSheet } from './panel-sheet';
import { FieldTextarea, FormFeedback, type FormStatus } from './shared';

export function ClientSerenataCancelPrompt({
    item,
    refresh,
}: {
    item: Serenata;
    refresh: () => Promise<void>;
}) {
    const { confirm } = usePanelConfirm();
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [sheetOpen, setSheetOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    if (!canClientCancelSerenata(item)) return null;

    const requiresReason = clientCancelRequiresReason(item);
    const actionLabel = clientCancelActionLabel(item);

    async function runCancel(reason?: string) {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.cancelClientSerenata(
            item.id,
            reason ? { cancelReason: reason } : undefined,
        );
        if (!response.ok) {
            setStatus({
                loading: false,
                error: response.error ?? 'No pudimos cancelar la solicitud.',
                ok: null,
            });
            return false;
        }
        setStatus({
            loading: false,
            error: null,
            ok: isClientUnpaidDraft(item) ? 'Solicitud anulada.' : 'Solicitud cancelada.',
        });
        setSheetOpen(false);
        setCancelReason('');
        await refresh();
        return true;
    }

    async function handleUnpaidCancel() {
        const copy = clientCancelConfirmCopy(item);
        const confirmed = await confirm({
            title: copy.title,
            message: copy.message,
            confirmLabel: copy.confirmLabel,
            cancelLabel: 'Volver',
            tone: 'danger',
        });
        if (!confirmed) return;
        await runCancel();
    }

    function openPaidCancelSheet() {
        setCancelReason('');
        setStatus({ loading: false, error: null, ok: null });
        setSheetOpen(true);
    }

    async function submitPaidCancel() {
        const reason = cancelReason.trim();
        if (reason.length < 3) {
            setStatus({
                loading: false,
                error: 'Indica un motivo de al menos 3 caracteres.',
                ok: null,
            });
            return;
        }
        const copy = clientCancelConfirmCopy(item);
        const confirmed = await confirm({
            title: copy.title,
            message: copy.message,
            confirmLabel: 'Cancelar solicitud',
            cancelLabel: 'Volver',
            tone: 'danger',
        });
        if (!confirmed) return;
        await runCancel(reason);
    }

    return (
        <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <PanelButton
                    variant="secondary"
                    size="sm"
                    disabled={status.loading}
                    onClick={() => (requiresReason ? openPaidCancelSheet() : void handleUnpaidCancel())}
                >
                    {actionLabel}
                </PanelButton>
                {!requiresReason ? (
                    <p className="text-xs text-fg-muted">
                        Solo disponible antes de que el mariachi acepte tu solicitud.
                    </p>
                ) : null}
                <FormFeedback status={status} />
            </div>

            {sheetOpen ? (
                <PanelSheet ariaLabel="Cancelar solicitud pagada" onClose={() => setSheetOpen(false)} maxWidthClass="sm:max-w-lg">
                    <div className="p-5 sm:p-6">
                        <h3 className="text-lg font-semibold text-fg">Cancelar solicitud pagada</h3>
                        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                            {clientCancelSheetDescription(item)}
                        </p>
                        <PanelField label="Motivo de cancelación" className="mt-5">
                            <FieldTextarea
                                rows={4}
                                value={cancelReason}
                                onChange={(e) => {
                                    setCancelReason(e.target.value);
                                    if (status.error) setStatus({ loading: false, error: null, ok: null });
                                }}
                                placeholder="Ej: cambié de fecha, elegí otro mariachi, error al contratar…"
                            />
                        </PanelField>
                        <FormFeedback status={status} />
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <PanelButton
                                variant="secondary"
                                disabled={status.loading}
                                onClick={() => setSheetOpen(false)}
                            >
                                Volver
                            </PanelButton>
                            <PanelButton
                                variant="danger"
                                disabled={status.loading || cancelReason.trim().length < 3}
                                onClick={() => void submitPaidCancel()}
                            >
                                {status.loading ? 'Cancelando…' : 'Confirmar cancelación'}
                            </PanelButton>
                        </div>
                    </div>
                </PanelSheet>
            ) : null}
        </>
    );
}
