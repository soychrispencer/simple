'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
    IconMapPin,
    IconClock,
    IconCalendar,
    IconChevronRight,
    IconChevronLeft,
} from '@tabler/icons-react';
import Link from 'next/link';
import { requestsApi } from '@/lib/api';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { useAuth } from '@/context/AuthContext';

interface SerenataAgendaItem {
    id: string;
    clientName: string;
    recipientName?: string;
    address: string;
    city?: string;
    eventDate: string;
    eventTime?: string;
    price?: number;
    status: string;
}

function formatCurrency(amount?: number) {
    if (typeof amount !== 'number') return '—';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
    }).format(amount);
}

function dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function googleMapsSearchUrl(address: string, city?: string) {
    const q = [address, city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function detailPathForRole(serenataId: string, role: string | undefined): string {
    if (role === 'coordinator' || role === 'admin' || role === 'superadmin') {
        return `/solicitudes/${serenataId}`;
    }
    return `/tracking/${serenataId}`;
}

function statusTone(status: string) {
    if (status === 'completed' || status === 'cancelled') {
        return {
            bg: 'var(--bg-subtle)',
            color: 'var(--fg-muted)',
            label: status === 'completed' ? 'Completada' : 'Cancelada',
        };
    }
    if (status === 'in_progress') {
        return { bg: '#d1fae5', color: '#047857', label: 'En curso' };
    }
    if (status === 'accepted') {
        return { bg: '#d1fae5', color: '#047857', label: 'Aceptada' };
    }
    if (status === 'confirmed') {
        return { bg: '#d1fae5', color: '#047857', label: 'Confirmada' };
    }
    return { bg: '#fef3c7', color: '#b45309', label: 'Pendiente' };
}

export default function AgendaPage() {
    const { effectiveRole } = useAuth();
    const [items, setItems] = useState<SerenataAgendaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const loadAssigned = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await requestsApi.assignedByDay(dateKey(selectedDate));
            const serenatas = ((res.data as { serenatas?: SerenataAgendaItem[] } | undefined)?.serenatas ?? []);
            const sorted = [...serenatas].sort((a, b) => {
                const ta = `${a.eventDate}T${a.eventTime ?? '00:00'}`;
                const tb = `${b.eventDate}T${b.eventTime ?? '00:00'}`;
                return ta.localeCompare(tb);
            });
            setItems(sorted);
        } catch {
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadAssigned();
    }, [loadAssigned]);

    const selectedKey = dateKey(selectedDate);
    const dayItems = useMemo(() => items, [items]);
    const dayActiveItems = useMemo(
        () => dayItems.filter((s) => !['cancelled', 'rejected'].includes(s.status)),
        [dayItems]
    );

    const dayIncomeEstimate = useMemo(
        () =>
            dayActiveItems.reduce(
                (sum, s) => sum + (typeof s.price === 'number' ? s.price : 0),
                0
            ),
        [dayActiveItems]
    );

    const dayLabel = selectedDate.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    const isToday = dateKey(new Date()) === selectedKey;

    if (isLoading) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="space-y-4 animate-pulse">
                    <div className="h-8 w-56 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-10 w-full rounded-xl bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-24 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <SerenatasPageShell fullWidth>
            <SerenatasPageHeader
                title="Agenda"
                description={
                    isToday
                        ? `${dayActiveItems.length} serenatas hoy`
                        : `${dayActiveItems.length} serenatas para ${selectedDate.toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'short',
                          })}`
                }
            />

            <div
                className="mb-4 flex items-center justify-between rounded-xl border px-3 py-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
                <button
                    type="button"
                    onClick={() =>
                        setSelectedDate((prev) => {
                            const d = new Date(prev);
                            d.setDate(d.getDate() - 1);
                            return d;
                        })
                    }
                    className="rounded-lg p-2"
                    style={{ color: 'var(--fg-muted)' }}
                    aria-label="Día anterior"
                >
                    <IconChevronLeft size={18} />
                </button>
                <div className="text-center">
                    <p className="text-sm font-semibold capitalize" style={{ color: 'var(--fg)' }}>
                        {dayLabel}
                    </p>
                    {isToday ? (
                        <p className="text-xs" style={{ color: 'var(--accent)' }}>
                            Hoy
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() =>
                        setSelectedDate((prev) => {
                            const d = new Date(prev);
                            d.setDate(d.getDate() + 1);
                            return d;
                        })
                    }
                    className="rounded-lg p-2"
                    style={{ color: 'var(--fg-muted)' }}
                    aria-label="Día siguiente"
                >
                    <IconChevronRight size={18} />
                </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                        {dayActiveItems.length}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {isToday ? 'Serenatas hoy' : 'Serenatas del día'}
                    </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(dayIncomeEstimate)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Ingreso estimado
                    </p>
                </div>
            </div>

            {dayItems.length === 0 ? (
                <div
                    className="rounded-2xl p-8 text-center"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                    <IconCalendar size={42} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>
                        Sin serenatas para este día
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                        {effectiveRole === 'musician'
                            ? 'Cuando aceptes invitaciones al lineup, aparecerán aquí.'
                            : effectiveRole === 'coordinator' || effectiveRole === 'admin'
                              ? 'Cambia de fecha o crea una nueva serenata.'
                              : 'Prueba otra fecha o revisa tus solicitudes.'}
                    </p>
                    {effectiveRole === 'musician' ? (
                        <Link
                            href="/invitaciones"
                            className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white"
                            style={{ background: 'var(--accent)' }}
                        >
                            Ver invitaciones
                        </Link>
                    ) : effectiveRole === 'coordinator' || effectiveRole === 'admin' ? (
                        <Link
                            href="/solicitudes/nueva"
                            className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white"
                            style={{ background: 'var(--accent)' }}
                        >
                            Nueva serenata
                        </Link>
                    ) : null}
                </div>
            ) : (
                <div className="space-y-3">
                    {dayItems.map((item) => {
                        const tone = statusTone(item.status);
                        const detailHref = detailPathForRole(item.id, effectiveRole);
                        const mapsHref = googleMapsSearchUrl(item.address, item.city);
                        return (
                            <div
                                key={item.id}
                                className="overflow-hidden rounded-2xl"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                            >
                                <Link href={detailHref} className="block p-4">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <span
                                                className="mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                                                style={{ background: tone.bg, color: tone.color }}
                                            >
                                                {tone.label}
                                            </span>
                                            <p className="truncate font-semibold" style={{ color: 'var(--fg)' }}>
                                                {item.recipientName || item.clientName}
                                            </p>
                                            <p className="truncate text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                {item.clientName}
                                            </p>
                                        </div>
                                        <p className="font-semibold" style={{ color: 'var(--accent)' }}>
                                            {formatCurrency(item.price)}
                                        </p>
                                    </div>

                                    <div className="space-y-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        <p className="flex items-center gap-2">
                                            <IconClock size={14} />
                                            {item.eventTime?.slice(0, 5) || 'Hora por confirmar'}
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <IconMapPin size={14} className="mt-0.5" />
                                            <span className="line-clamp-2">
                                                {item.address}
                                                {item.city ? ` · ${item.city}` : ''}
                                            </span>
                                        </p>
                                    </div>
                                </Link>
                                {item.address ? (
                                    <a
                                        href={mapsHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 border-t px-4 py-2.5 text-sm font-medium"
                                        style={{
                                            borderColor: 'var(--border)',
                                            color: 'var(--accent)',
                                            background: 'color-mix(in oklab, var(--accent) 6%, transparent)',
                                        }}
                                    >
                                        <IconMapPin size={16} />
                                        Abrir en Google Maps
                                    </a>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </SerenatasPageShell>
    );
}
