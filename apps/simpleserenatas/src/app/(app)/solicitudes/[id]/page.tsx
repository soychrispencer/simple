'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconPhone,
    IconMapPin,
    IconPencil,
    IconCheck,
    IconX,
    IconClock,
} from '@tabler/icons-react';
import { useToast } from '@/hooks';
import { requestsApi } from '@/lib/api';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

type SerenataDetail = {
    id: string;
    clientName: string;
    clientPhone?: string | null;
    address: string;
    city?: string | null;
    eventDate: string;
    eventTime?: string;
    price?: number | null;
    status: string;
    message?: string | null;
    recipientName?: string | null;
    eventType?: string | null;
    coordinatorName?: string | null;
    coordinatorPhone?: string | null;
};

function statusLabel(status: string) {
    const m: Record<string, string> = {
        pending: 'Pendiente',
        quoted: 'Cotizada',
        accepted: 'Aceptada',
        payment_pending: 'Pago pendiente',
        confirmed: 'Confirmada',
        in_progress: 'En curso',
        completed: 'Completada',
        cancelled: 'Cancelada',
        rejected: 'Rechazada',
    };
    return m[status] ?? status;
}

function badgeStyle(status: string): { bg: string; fg: string } {
    if (status === 'completed' || status === 'cancelled') {
        return { bg: 'var(--bg-subtle)', fg: 'var(--fg-muted)' };
    }
    if (['confirmed', 'in_progress', 'accepted'].includes(status)) {
        return { bg: '#d1fae5', fg: '#047857' };
    }
    return { bg: '#fef3c7', fg: '#b45309' };
}

export default function SerenataDetalleCoordinatorPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';
    const { showToast } = useToast();
    const [row, setRow] = useState<SerenataDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [modal, setModal] = useState<'complete' | 'cancel' | null>(null);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await requestsApi.get(id);
            const body = res.data as { ok?: boolean; serenata?: SerenataDetail } | undefined;
            if (!res.ok || !body?.ok || !body.serenata) {
                throw new Error(res.error || 'No encontrada');
            }
            setRow(body.serenata);
        } catch {
            showToast('No se pudo cargar la serenata', 'error');
            setRow(null);
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const mapsHref = row
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [row.address, row.city].filter(Boolean).join(', ')
          )}`
        : '#';

    const telHref = row?.clientPhone
        ? `tel:${String(row.clientPhone).replace(/\s/g, '')}`
        : null;

    const canEdit =
        row &&
        ['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed'].includes(row.status);

    const handleComplete = async () => {
        if (!row) return;
        setActionLoading(true);
        try {
            const res = await requestsApi.complete(row.id);
            const body = res.data as { ok?: boolean } | undefined;
            if (!res.ok || !body?.ok) throw new Error(res.error);
            showToast('Marcada como completada', 'success');
            setModal(null);
            await load();
        } catch {
            showToast('No se pudo completar', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!row) return;
        setActionLoading(true);
        try {
            const res = await requestsApi.cancel(row.id);
            const body = res.data as { ok?: boolean } | undefined;
            if (!res.ok || !body?.ok) throw new Error(res.error);
            showToast('Serenata cancelada', 'success');
            setModal(null);
            await load();
        } catch {
            showToast('No se pudo cancelar', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <SerenatasPageShell width="narrow">
                <div className="space-y-4 animate-pulse py-4">
                    <div className="h-8 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-32 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                </div>
            </SerenatasPageShell>
        );
    }

    if (!row) {
        return (
            <SerenatasPageShell width="narrow">
                <p className="py-8 text-center" style={{ color: 'var(--fg-muted)' }}>
                    Serenata no encontrada.
                </p>
                <Link href="/solicitudes" className="block text-center font-medium text-rose-600">
                    Volver a la lista
                </Link>
            </SerenatasPageShell>
        );
    }

    const st = badgeStyle(row.status);

    return (
        <SerenatasPageShell width="narrow">
            <Link
                href="/solicitudes"
                className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--fg-muted)' }}
            >
                <IconArrowLeft size={18} />
                Volver
            </Link>

            <SerenatasPageHeader
                title={row.recipientName || row.clientName}
                description={`Cliente: ${row.clientName}`}
            />

            <div
                className="mb-6 inline-flex rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: st.bg, color: st.fg }}
            >
                {statusLabel(row.status)}
            </div>

            <section
                className="mb-6 space-y-3 rounded-2xl p-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
                <Row icon={IconClock} label="Cuándo">
                    {row.eventDate} {row.eventTime ? `· ${row.eventTime.slice(0, 5)}` : ''}
                </Row>
                <Row icon={IconMapPin} label="Dónde">
                    {row.address}
                    {row.city ? `, ${row.city}` : ''}
                </Row>
                {row.price != null && (
                    <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        {new Intl.NumberFormat('es-CL', {
                            style: 'currency',
                            currency: 'CLP',
                            minimumFractionDigits: 0,
                        }).format(row.price)}
                    </p>
                )}
                {row.message ? (
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {row.message}
                    </p>
                ) : null}
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {telHref && (
                    <a
                        href={telHref}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold sm:flex-none sm:px-5"
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                        }}
                    >
                        <IconPhone size={20} />
                        Llamar al cliente
                    </a>
                )}
                <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold sm:flex-none sm:px-5"
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--fg)',
                    }}
                >
                    <IconMapPin size={20} />
                    Abrir en Maps
                </a>
                {canEdit && (
                    <Link
                        href={`/solicitudes/${row.id}/editar`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold sm:flex-none sm:px-5"
                        style={{
                            background: 'var(--accent-subtle)',
                            color: 'var(--accent)',
                        }}
                    >
                        <IconPencil size={20} />
                        Editar
                    </Link>
                )}
            </div>

            {row.status !== 'completed' && row.status !== 'cancelled' && (
                <div className="mt-8 space-y-3 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => setModal('complete')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white"
                        style={{ background: 'var(--accent)' }}
                    >
                        <IconCheck size={20} />
                        Marcar como completada
                    </button>
                    <button
                        type="button"
                        onClick={() => setModal('cancel')}
                        className="w-full rounded-xl py-3 font-medium"
                        style={{
                            background: 'var(--bg-subtle)',
                            color: 'var(--fg-muted)',
                        }}
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            <IconX size={18} />
                            Cancelar serenata
                        </span>
                    </button>
                </div>
            )}

            {modal === 'complete' && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
                    <div
                        className="w-full max-w-md rounded-2xl p-6 shadow-xl"
                        style={{ background: 'var(--bg-elevated)' }}
                    >
                        <p className="mb-4 font-semibold" style={{ color: 'var(--fg)' }}>
                            ¿Marcar esta serenata como completada?
                        </p>
                        <p className="mb-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            El cliente verá el evento como finalizado.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 rounded-xl py-3 font-medium"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                                onClick={() => setModal(null)}
                                disabled={actionLoading}
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                                style={{ background: 'var(--accent)' }}
                                onClick={handleComplete}
                                disabled={actionLoading}
                            >
                                {actionLoading ? '…' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal === 'cancel' && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
                    <div
                        className="w-full max-w-md rounded-2xl p-6 shadow-xl"
                        style={{ background: 'var(--bg-elevated)' }}
                    >
                        <p className="mb-4 font-semibold" style={{ color: 'var(--fg)' }}>
                            ¿Cancelar esta serenata?
                        </p>
                        <p className="mb-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Esta acción notifica al cliente si corresponde.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 rounded-xl py-3 font-medium"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                                onClick={() => setModal(null)}
                                disabled={actionLoading}
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                                style={{ background: '#b91c1c' }}
                                onClick={handleCancel}
                                disabled={actionLoading}
                            >
                                {actionLoading ? '…' : 'Cancelar serenata'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SerenatasPageShell>
    );
}

function Row({
    icon: Icon,
    label,
    children,
}: {
    icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex gap-3">
            <Icon size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
            <div>
                <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                    {label}
                </div>
                <div style={{ color: 'var(--fg)' }}>{children}</div>
            </div>
        </div>
    );
}
