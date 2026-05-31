'use client';

import { useState } from 'react';
import { IconCheck, IconLoader2, IconPlus, IconStar, IconStarFilled } from '@tabler/icons-react';
import type { Serenata } from '@/lib/serenatas-api';
import { serenatasApi } from '@/lib/serenatas-api';
import { startSerenataCheckout } from '@/lib/payments';
import { panelSectionHref } from '@/lib/panel-routes';
import { PanelButton, PanelCard } from '@simple/ui/panel';
import { ClientSerenataCancelPrompt } from '../client-serenata-cancel-prompt';
import { ClientSerenataRebook } from './client-serenata-rebook';
import { EmptyBlock, FormFeedback, SerenataRow, type FormStatus } from '../shared';

type PanelActionProps = {
    action?: string | null;
    clearAction?: () => void;
};

function ClientPaymentPrompt({ item }: { item: Serenata }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    if (item.status !== 'payment_pending') return null;

    async function pay() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await startSerenataCheckout({
            serenataId: item.id,
            returnUrl: `${window.location.origin}${panelSectionHref('serenatas')}`,
        });
        if (!response.ok || !response.checkoutUrl) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos iniciar el pago.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: 'Redirigiendo al pago…' });
        window.location.assign(response.checkoutUrl);
    }

    return (
        <div className="mt-3 rounded-xl border border-accent-border bg-accent-soft p-3">
            <p className="text-sm font-semibold text-fg">Falta confirmar el pago</p>
            <p className="mt-1 text-xs text-fg-muted">El grupo recibirá tu solicitud cuando el pago quede confirmado.</p>
            <FormFeedback status={status} />
            <PanelButton className="mt-3 w-full" size="sm" disabled={status.loading} onClick={() => void pay()}>
                {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : null}
                Pagar ahora
            </PanelButton>
        </div>
    );
}

function ClientSerenataConfirmPrompt({ item, refresh }: { item: Serenata; refresh: () => Promise<void> }) {
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const showRating = Boolean(item.providerGroupId);
    if (item.status !== 'completed' || item.clientConfirmedAt) return null;

    async function confirm() {
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.confirmClientSerenata(
            item.id,
            showRating
                ? {
                    ...(rating != null ? { rating } : {}),
                    ...(comment.trim() ? { comment: comment.trim() } : {}),
                }
                : undefined,
        );
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No pudimos confirmar la serenata.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Gracias por confirmar tu serenata.' });
        await refresh();
    }

    return (
        <div className="mt-3 rounded-xl border border-accent-border bg-accent-soft p-3">
            <p className="text-sm font-semibold text-fg">¿Se realizó la serenata?</p>
            <p className="mt-1 text-xs text-fg-muted">Confirma para cerrar el seguimiento de este evento.</p>
            {showRating ? (
                <div className="mt-3">
                    <p className="text-xs font-medium text-fg-muted">Califica al mariachi (opcional)</p>
                    <div className="mt-2 flex gap-1">
                        {[1, 2, 3, 4, 5].map((value) => {
                            const active = rating != null && rating >= value;
                            const Icon = active ? IconStarFilled : IconStar;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    className={`rounded-lg p-2 ${active ? 'bg-accent-soft text-amber-500' : 'border border-border bg-surface text-fg-muted'}`}
                                    onClick={() => setRating(value)}
                                    aria-label={`${value} estrellas`}
                                >
                                    <Icon size={18} aria-hidden />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
            {showRating ? (
                <div className="mt-3">
                    <p className="text-xs font-medium text-fg-muted">Comentario (opcional)</p>
                    <textarea
                        rows={2}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
                        placeholder="Cuéntanos cómo fue la experiencia."
                    />
                </div>
            ) : null}
            <FormFeedback status={status} />
            <PanelButton className="mt-3 w-full" size="sm" disabled={status.loading} onClick={() => void confirm()}>
                {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                Confirmar que se realizó
            </PanelButton>
        </div>
    );
}

export function ClientSerenatasView({
    serenatas,
    refresh,
    onContract,
}: { serenatas: Serenata[]; refresh: () => Promise<void>; onContract?: () => void } & PanelActionProps) {
    const pendingCount = serenatas.filter((item) => item.status === 'payment_pending' || item.status === 'pending' || item.status === 'accepted_pending_group').length;
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="type-section-title text-fg">Historial de serenatas</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Revisa el estado de las serenatas que contrataste desde tu cuenta.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ClientMetric label="Contratadas" value={serenatas.length} />
                <ClientMetric label="En proceso" value={pendingCount} />
                <ClientMetric label="Confirmadas" value={scheduledCount} />
            </div>

            <div className="mt-5 grid gap-3">
                {serenatas.length === 0
                    ? (
                        <div className="rounded-xl border border-border bg-bg-subtle p-5 text-center">
                            <EmptyBlock title="Sin serenatas contratadas" description="Cuando contrates una serenata, verás aquí su seguimiento." />
                            {onContract ? (
                                <PanelButton className="mt-4" onClick={onContract}>
                                    <IconPlus size={15} />
                                    Contratar serenata
                                </PanelButton>
                            ) : null}
                        </div>
                    )
                    : serenatas.map((item) => (
                        <div key={item.id}>
                            <SerenataRow item={item} context="client" />
                            <ClientPaymentPrompt item={item} />
                            <ClientSerenataCancelPrompt item={item} refresh={refresh} />
                            <ClientSerenataConfirmPrompt item={item} refresh={refresh} />
                            <ClientSerenataRebook item={item} />
                        </div>
                    ))}
            </div>
        </PanelCard>
    );
}

export function ClientMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-bg-subtle p-4">
            <p className="text-2xl font-semibold text-(--fg)">{value}</p>
            <p className="text-sm text-fg-muted">{label}</p>
        </div>
    );
}
