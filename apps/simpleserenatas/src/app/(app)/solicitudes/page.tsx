'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconMapPin,
    IconClock,
    IconChevronRight,
    IconLoader,
    IconPlus,
    IconMusic,
} from '@tabler/icons-react';
import { useToast } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { requestsApi } from '@/lib/api';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import Link from 'next/link';

type SerenataFilter = 'all' | 'today' | 'pending' | 'completed';

interface CoordinatorSerenata {
    id: string;
    clientName: string;
    address: string;
    city?: string | null;
    eventDate: string;
    eventTime?: string;
    price?: number | null;
    status: string;
    recipientName?: string | null;
}

function todayDateStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function isToday(dateStr: string) {
    return dateStr.slice(0, 10) === todayDateStr();
}

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

/** Misma regla que `isCoordinatorSubscriptionActive` en el API (leads de plataforma). */
function coordinatorHasPlatformLeadsAccess(p: {
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: string | null;
} | null): boolean {
    if (!p) return false;
    if (p.subscriptionPlan === 'free') return false;
    if (p.subscriptionStatus !== 'active') return false;
    if (p.subscriptionEndsAt) {
        const t = new Date(p.subscriptionEndsAt).getTime();
        if (Number.isFinite(t) && t < Date.now()) return false;
    }
    return true;
}

function statusStyle(status: string): { bg: string; fg: string } {
    if (status === 'completed' || status === 'cancelled') {
        return { bg: 'var(--bg-subtle)', fg: 'var(--fg-muted)' };
    }
    if (status === 'confirmed' || status === 'in_progress' || status === 'accepted') {
        return { bg: '#d1fae5', fg: '#047857' };
    }
    return { bg: '#fef3c7', fg: '#b45309' };
}

export default function SolicitudesCoordinatorPage() {
    const { showToast } = useToast();
    const { coordinatorProfile } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<CoordinatorSerenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<SerenataFilter>('all');

    const load = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await requestsApi.list({ assignedToMe: true });
            if (!res.ok || !res.data?.ok) {
                throw new Error(res.error || 'Error al cargar');
            }
            const raw = (res.data as { serenatas?: CoordinatorSerenata[] }).serenatas ?? [];
            const sorted = [...raw].sort((a, b) => {
                const ta = `${a.eventDate ?? ''}T${a.eventTime ?? '00:00'}`;
                const tb = `${b.eventDate ?? ''}T${b.eventTime ?? '00:00'}`;
                return ta.localeCompare(tb);
            });
            setItems(sorted);
        } catch {
            showToast('Error al cargar tus serenatas', 'error');
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        return items.filter((r) => {
            if (filter === 'all') return true;
            if (filter === 'today') return isToday(r.eventDate);
            if (filter === 'pending') {
                return !['completed', 'cancelled', 'rejected'].includes(r.status);
            }
            if (filter === 'completed') return r.status === 'completed';
            return true;
        });
    }, [items, filter]);

    const seesPlatformLeads = coordinatorHasPlatformLeadsAccess(coordinatorProfile);

    const counts = useMemo(() => {
        const today = items.filter((r) => isToday(r.eventDate)).length;
        const pending = items.filter(
            (r) => !['completed', 'cancelled', 'rejected'].includes(r.status)
        ).length;
        const completed = items.filter((r) => r.status === 'completed').length;
        return { today, pending, completed };
    }, [items]);

    const formatCurrency = (amount?: number | null) => {
        if (amount == null) return '—';
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatWhen = (dateStr: string, timeStr?: string) => {
        const t = timeStr?.slice(0, 5) ?? '';
        const d = new Date(dateStr + (t ? `T${t}` : ''));
        if (Number.isNaN(d.getTime())) return `${dateStr} ${t}`;
        return (
            d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) +
            (t ? ` · ${t}` : '')
        );
    };

    if (isLoading) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="space-y-4 animate-pulse">
                    <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-10 w-full rounded-xl bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-28 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-28 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <SerenatasPageShell fullWidth>
            <SerenatasPageHeader
                title="Mis serenatas"
                description={`${filtered.length} en esta vista · ${counts.today} hoy`}
            />

            {!seesPlatformLeads ? (
                <div
                    className="mb-4 rounded-2xl border p-4 text-sm"
                    style={{
                        background: 'color-mix(in oklab, var(--surface) 80%, var(--accent) 20%)',
                        borderColor: 'var(--accent)',
                        color: 'var(--fg)',
                    }}
                >
                    <p className="font-medium">Plan Free: solo tus serenatas cargadas por ti</p>
                    <p className="mt-1" style={{ color: 'var(--fg-secondary)' }}>
                        Las solicitudes de clientes desde la app (leads Simple) aparecen si activas{' '}
                        <strong className="text-[var(--fg)]">Suscripción Pro</strong>. Sin bloqueos duros:
                        puedes seguir usando serenatas manuales y tu operación habitual.
                    </p>
                    <Link
                        href="/suscripcion"
                        className="mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        Ver planes y beneficios
                    </Link>
                </div>
            ) : null}

            <div className="mb-4 flex flex-wrap gap-2">
                <Link
                    href="/solicitudes/nueva"
                    className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-sm sm:flex-none sm:px-5"
                    style={{ background: 'var(--accent)' }}
                >
                    <IconPlus size={20} />
                    Nueva serenata
                </Link>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
                    Todas
                </FilterTab>
                <FilterTab
                    active={filter === 'today'}
                    onClick={() => setFilter('today')}
                    count={counts.today}
                >
                    Hoy
                </FilterTab>
                <FilterTab
                    active={filter === 'pending'}
                    onClick={() => setFilter('pending')}
                    count={counts.pending}
                >
                    Pendientes
                </FilterTab>
                <FilterTab
                    active={filter === 'completed'}
                    onClick={() => setFilter('completed')}
                    count={counts.completed}
                >
                    Completadas
                </FilterTab>
            </div>

            {filtered.length === 0 ? (
                <div className="py-12 text-center">
                    <IconMusic
                        size={48}
                        className="mx-auto mb-4"
                        style={{ color: 'var(--border-strong)' }}
                    />
                    <p className="mb-2 text-lg font-medium" style={{ color: 'var(--fg)' }}>
                        No hay serenatas
                    </p>
                    <p className="mb-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Crea una serenata con los datos del cliente o revisa los filtros.
                    </p>
                    <Link
                        href="/solicitudes/nueva"
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white"
                        style={{ background: 'var(--accent)' }}
                    >
                        <IconPlus size={20} />
                        Nueva serenata
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {filtered.map((r) => {
                        const st = statusStyle(r.status);
                        return (
                            <li key={r.id}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/solicitudes/${r.id}`)}
                                    className="w-full rounded-2xl p-4 text-left transition-opacity hover:opacity-95"
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className="mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                                                style={{ background: st.bg, color: st.fg }}
                                            >
                                                {statusLabel(r.status)}
                                            </span>
                                            <h3
                                                className="truncate font-semibold text-lg"
                                                style={{ color: 'var(--fg)' }}
                                            >
                                                {r.recipientName || r.clientName}
                                            </h3>
                                            <p
                                                className="truncate text-sm"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                {r.clientName}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <span
                                                className="text-lg font-bold"
                                                style={{ color: 'var(--accent)' }}
                                            >
                                                {formatCurrency(r.price)}
                                            </span>
                                            <IconChevronRight
                                                size={20}
                                                style={{ color: 'var(--fg-muted)' }}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="space-y-1 text-sm"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <IconClock size={14} />
                                            <span>{formatWhen(r.eventDate, r.eventTime)}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <IconMapPin size={14} className="mt-0.5 shrink-0" />
                                            <span className="line-clamp-2">
                                                {r.address}
                                                {r.city ? ` · ${r.city}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </SerenatasPageShell>
    );
}

function FilterTab({
    children,
    active,
    onClick,
    count,
}: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    count?: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-medium transition-all sm:text-sm"
            style={
                active
                    ? { background: 'var(--accent-subtle)', color: 'var(--accent)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }
            }
        >
            {children}
            {count !== undefined && count > 0 && (
                <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs"
                    style={{
                        background: active ? 'var(--accent)' : 'var(--border)',
                        color: active ? 'white' : 'var(--fg-muted)',
                    }}
                >
                    {count}
                </span>
            )}
        </button>
    );
}
