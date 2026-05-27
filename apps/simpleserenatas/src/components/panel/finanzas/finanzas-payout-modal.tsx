'use client';

import { useEffect, useMemo, useState } from 'react';
import { PanelButton, PanelCard, PanelField, PanelNotice } from '@simple/ui/panel';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    serenatasApi,
    type MusicianPayoutLineInput,
    type Serenata,
    type SerenataGroup,
} from '@/lib/serenatas-api';
import { OWNER_COLLECTION_METHOD_OPTIONS } from '@/lib/owner-collection-method';
import { FieldInput, FieldSelect, FormFeedback, money, type FormStatus } from '../shared';
import { SerenataFormModalShell } from '../serenata-form-layout';

type PayoutLine = MusicianPayoutLineInput & { key: string };

function newLine(partial?: Partial<PayoutLine>): PayoutLine {
    return {
        key: crypto.randomUUID(),
        musicianId: partial?.musicianId ?? null,
        musicianName: partial?.musicianName ?? '',
        amount: partial?.amount ?? 0,
        status: partial?.status ?? 'pending',
        paymentMethod: partial?.paymentMethod ?? '',
        notes: partial?.notes ?? '',
    };
}

export function FinanzasPayoutModal({
    serenata,
    groups,
    open,
    onClose,
    onSaved,
}: {
    serenata: Serenata;
    groups: SerenataGroup[];
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [lines, setLines] = useState<PayoutLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [distributionTotal, setDistributionTotal] = useState<number>(serenata.price ?? 0);
    const [status, setStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });

    const group = useMemo(
        () => groups.find((entry) => entry.id === serenata.groupId) ?? null,
        [groups, serenata.groupId],
    );

    const acceptedMembers = useMemo(
        () => (group?.members ?? []).filter((member) => member.status === 'accepted'),
        [group],
    );

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setDistributionTotal(serenata.price ?? 0);
        setStatus({ loading: false, error: null, ok: null });
        void serenatasApi.serenataPayouts(serenata.id).then((response) => {
            if (cancelled) return;
            if (response.ok && response.items.length > 0) {
                setLines(response.items.map((item) => newLine({
                    musicianId: item.musicianId,
                    musicianName: item.musicianName ?? '',
                    amount: item.amount,
                    status: item.status,
                    paymentMethod: item.paymentMethod ?? '',
                    notes: item.notes ?? '',
                })));
            } else if (acceptedMembers.length > 0) {
                const share = serenata.price && acceptedMembers.length > 0
                    ? Math.floor(serenata.price / acceptedMembers.length)
                    : 0;
                setLines(acceptedMembers.map((member) => newLine({
                    musicianId: member.musicianId,
                    musicianName: member.musicianName ?? 'Músico',
                    amount: share,
                })));
            } else {
                setLines([newLine()]);
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [open, serenata.id, acceptedMembers, serenata.price]);

    if (!open) return null;

    function applyEqualDistribution() {
        const activeIndexes = lines
            .map((line, index) => ({ line, index }))
            .filter(({ line }) => Boolean(line.musicianId || line.musicianName?.trim()))
            .map(({ index }) => index);
        if (activeIndexes.length === 0) {
            setStatus({ loading: false, error: 'Agrega músicos antes de repartir.', ok: null });
            return;
        }
        const total = Math.max(0, Math.round(distributionTotal || 0));
        const base = Math.floor(total / activeIndexes.length);
        let remainder = total - base * activeIndexes.length;
        setLines((prev) => prev.map((line, index) => {
            const position = activeIndexes.indexOf(index);
            if (position === -1) return line;
            const extra = remainder > 0 ? 1 : 0;
            if (remainder > 0) remainder -= 1;
            return { ...line, amount: base + extra };
        }));
        setStatus({ loading: false, error: null, ok: 'Reparto aplicado en partes iguales.' });
    }

    async function handleSave() {
        const payload = lines
            .filter((line) => line.amount > 0 && (line.musicianId || line.musicianName?.trim()))
            .map(({ key: _key, ...line }) => ({
                musicianId: line.musicianId,
                musicianName: line.musicianName?.trim() || null,
                amount: Number(line.amount),
                status: line.status ?? 'pending',
                paymentMethod: line.paymentMethod?.trim() || null,
                notes: line.notes?.trim() || null,
            }));
        if (payload.length === 0) {
            setStatus({ loading: false, error: 'Agrega al menos un pago con monto.', ok: null });
            return;
        }
        setStatus({ loading: true, error: null, ok: null });
        const response = await serenatasApi.saveSerenataPayouts(serenata.id, payload);
        if (!response.ok) {
            setStatus({ loading: false, error: response.error ?? 'No se pudieron guardar los pagos.', ok: null });
            return;
        }
        setStatus({ loading: false, error: null, ok: 'Pagos guardados.' });
        onSaved();
        onClose();
    }

    return (
        <SerenataFormModalShell
            title="Pagos al grupo"
            subtitle={`${serenata.recipientName} · ${money(serenata.price)}`}
            onClose={onClose}
            footer={(
                <>
                    <FormFeedback status={status} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <PanelButton variant="secondary" onClick={onClose} disabled={status.loading}>
                            Cancelar
                        </PanelButton>
                        <PanelButton variant="accent" onClick={() => void handleSave()} disabled={status.loading || loading}>
                            {status.loading ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                            Guardar pagos
                        </PanelButton>
                    </div>
                </>
            )}
        >
            {loading ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={16} className="animate-spin" />
                    Cargando…
                </p>
            ) : !serenata.groupId ? (
                <PanelNotice tone="warning">
                    Asigna un grupo operativo a la serenata antes de registrar pagos a músicos.
                </PanelNotice>
            ) : (
                <div className="space-y-3">
                    <PanelCard size="sm" className="space-y-3">
                        <PanelField label="Monto total a repartir (CLP)">
                            <FieldInput
                                type="number"
                                min={0}
                                value={distributionTotal || ''}
                                onChange={(e) => setDistributionTotal(Number(e.target.value))}
                            />
                        </PanelField>
                        <div className="flex flex-wrap gap-2">
                            <PanelButton
                                variant="secondary"
                                size="sm"
                                onClick={applyEqualDistribution}
                            >
                                Repartir en partes iguales
                            </PanelButton>
                        </div>
                    </PanelCard>
                    {lines.map((line, index) => (
                        <PanelCard key={line.key} size="sm" className="space-y-3">
                            <PanelField label="Músico">
                                {line.musicianId ? (
                                    <p className="text-sm font-medium text-fg">{line.musicianName || 'Músico'}</p>
                                ) : (
                                    <FieldInput
                                        value={line.musicianName ?? ''}
                                        onChange={(e) => setLines((prev) => prev.map((row, i) => (
                                            i === index ? { ...row, musicianName: e.target.value } : row
                                        )))}
                                        placeholder="Nombre"
                                    />
                                )}
                            </PanelField>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <PanelField label="Monto (CLP)">
                                    <FieldInput
                                        type="number"
                                        min={0}
                                        value={line.amount || ''}
                                        onChange={(e) => setLines((prev) => prev.map((row, i) => (
                                            i === index ? { ...row, amount: Number(e.target.value) } : row
                                        )))}
                                    />
                                </PanelField>
                                <PanelField label="Estado">
                                    <FieldSelect
                                        value={line.status ?? 'pending'}
                                        options={[
                                            { value: 'pending', label: 'Pendiente' },
                                            { value: 'paid', label: 'Pagado' },
                                        ]}
                                        onChange={(e) => setLines((prev) => prev.map((row, i) => (
                                            i === index ? { ...row, status: e.target.value as 'pending' | 'paid' } : row
                                        )))}
                                    />
                                </PanelField>
                            </div>
                            <PanelField label="Forma de pago">
                                <FieldSelect
                                    value={line.paymentMethod ?? ''}
                                    options={[{ value: '', label: '—' }, ...OWNER_COLLECTION_METHOD_OPTIONS.filter((o) => o.value)]}
                                    onChange={(e) => setLines((prev) => prev.map((row, i) => (
                                        i === index ? { ...row, paymentMethod: e.target.value } : row
                                    )))}
                                />
                            </PanelField>
                        </PanelCard>
                    ))}
                    <PanelButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setLines((prev) => [...prev, newLine()])}
                    >
                        Agregar línea
                    </PanelButton>
                </div>
            )}
        </SerenataFormModalShell>
    );
}
