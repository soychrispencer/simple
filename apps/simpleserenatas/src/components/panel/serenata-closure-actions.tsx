'use client';

import { useState, type ReactNode } from 'react';
import { PanelButton, PanelField } from '@simple/ui';
import { IconCheck, IconLoader2, IconX } from '@tabler/icons-react';
import { type Serenata, serenatasApi } from '@/lib/serenatas-api';
import { isEventBeforeToday, needsClosure } from '@/lib/serenata-dates';
import { PanelSheet } from './panel-sheet';
import { FieldTextarea, FormFeedback, type FormStatus } from './shared';

export function canOwnerCompleteSerenata(item: Serenata): boolean {
    return item.status === 'scheduled' || needsClosure(item);
}

export function canOwnerCancelSerenata(item: Serenata): boolean {
    return (item.status === 'scheduled' || item.status === 'accepted_pending_group') && !isEventBeforeToday(item.eventDate);
}

export function shouldShowSerenataPastDateNotice(item: Serenata): boolean {
    return (item.status === 'scheduled' || item.status === 'accepted_pending_group')
        && isEventBeforeToday(item.eventDate);
}

export function SerenataPastDateNotice({ item }: { item: Serenata }) {
    if (!shouldShowSerenataPastDateNotice(item)) return null;
    return (
        <p className="text-xs text-fg-muted">
            La fecha ya pasó: completa la serenata o contacta soporte.
        </p>
    );
}

export function SerenataClosureActions({
    item,
    refresh,
    size = 'sm',
    inline = false,
}: {
    item: Serenata;
    refresh: () => Promise<void>;
    size?: 'sm' | 'default';
    /** Botones en la misma fila que otras acciones; aviso de fecha pasada va fuera (p. ej. footer de la card). */
    inline?: boolean;
}) {
    const [loadingAction, setLoadingAction] = useState<'complete' | 'cancel' | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [cancelReason, setCancelReason] = useState('');
    const showActions = canOwnerCompleteSerenata(item) || canOwnerCancelSerenata(item);
    const cancelBlocked = shouldShowSerenataPastDateNotice(item);

    if (!showActions) return null;

    const btnSize = size === 'sm' ? 'sm' as const : undefined;

    async function complete() {
        setLoadingAction('complete');
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateSerenataStatus(item.id, 'complete');
        setLoadingAction(null);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos completar la serenata.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Serenata completada.' });
        await refresh();
    }

    async function submitCancel() {
        const reason = cancelReason.trim();
        if (reason.length < 3) {
            setStatus({ loading: false, error: 'Indica un motivo de al menos 3 caracteres.', ok: null });
            return;
        }
        setLoadingAction('cancel');
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.updateSerenataStatus(item.id, 'cancel', { cancelReason: reason });
        setLoadingAction(null);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos cancelar la serenata.', ok: null });
            return;
        }
        setCancelOpen(false);
        setCancelReason('');
        setStatus({ loading: false, error: null, ok: 'Serenata cancelada.' });
        await refresh();
    }

    const buttons = (
        <>
            {canOwnerCompleteSerenata(item) ? (
                <PanelButton size={btnSize} variant="secondary" disabled={loadingAction != null} onClick={() => void complete()}>
                    {loadingAction === 'complete' ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                    Completar
                </PanelButton>
            ) : null}
            {canOwnerCancelSerenata(item) ? (
                <PanelButton
                    size={btnSize}
                    variant="secondary"
                    disabled={loadingAction != null}
                    onClick={() => {
                        setStatus({ loading: false, error: null, ok: null });
                        setCancelOpen(true);
                    }}
                >
                    <IconX size={13} />
                    Cancelar
                </PanelButton>
            ) : null}
        </>
    );

    return (
        <>
            {inline ? buttons : (
                <>
                    {cancelBlocked ? (
                        <p className="w-full text-xs text-fg-muted">La fecha ya pasó: completa la serenata o contacta soporte.</p>
                    ) : null}
                    <ButtonsRow>{buttons}</ButtonsRow>
                </>
            )}
            {status.ok && !cancelOpen ? (
                <p className={`text-xs text-success ${inline ? 'basis-full w-full' : 'w-full'}`}>{status.ok}</p>
            ) : null}
            {status.error && !cancelOpen ? (
                <p className={`text-xs text-danger ${inline ? 'basis-full w-full' : 'w-full'}`}>{status.error}</p>
            ) : null}
            {cancelOpen ? (
                <PanelSheet ariaLabel="Cancelar serenata" onClose={() => setCancelOpen(false)} maxWidthClass="sm:max-w-lg">
                    <div className="p-5">
                        <h3 className="text-lg font-semibold text-fg">Cancelar serenata</h3>
                        <p className="mt-2 text-sm text-fg-muted">Indica el motivo. El cliente recibirá una notificación.</p>
                        <PanelField className="mt-4" label="Motivo" required>
                            <FieldTextarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                rows={4}
                                placeholder="Ej.: el cliente reprogramó por fuera de la app"
                            />
                        </PanelField>
                        <FormFeedback status={status} />
                        <ButtonsRow className="mt-5">
                            <PanelButton className="flex-1" disabled={loadingAction === 'cancel'} onClick={() => void submitCancel()}>
                                {loadingAction === 'cancel' ? <IconLoader2 size={15} className="animate-spin" /> : null}
                                Confirmar cancelación
                            </PanelButton>
                            <PanelButton className="flex-1" variant="secondary" disabled={loadingAction === 'cancel'} onClick={() => setCancelOpen(false)}>
                                Volver
                            </PanelButton>
                        </ButtonsRow>
                    </div>
                </PanelSheet>
            ) : null}
        </>
    );
}

function ButtonsRow({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`flex flex-wrap gap-2 ${className}`.trim()}>{children}</div>;
}
