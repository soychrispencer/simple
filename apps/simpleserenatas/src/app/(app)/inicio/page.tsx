'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    IconPlus,
    IconCalendar,
    IconLoader,
    IconBell,
    IconChevronRight,
    IconMusic,
    IconClock,
    IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { coordinatorStatsApi } from '@/lib/api';
import { SerenatasPageShell } from '@/components/shell';

interface Serenata {
    id: string;
    date?: string;
    time?: string;
    dateTime?: string;
    location?: string;
    address?: string;
    city?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | string;
    clientName: string;
    recipientName?: string;
    price?: number;
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'info' {
    if (status === 'completed') return 'success';
    if (['accepted', 'payment_pending', 'confirmed', 'in_progress'].includes(status)) return 'info';
    if (['cancelled', 'rejected'].includes(status)) return 'neutral';
    return 'warning';
}

function statusLabel(status: string): string {
    if (status === 'pending') return 'Pendiente';
    if (status === 'quoted') return 'Cotizada';
    if (status === 'accepted') return 'Aceptada';
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'in_progress') return 'En camino';
    if (status === 'completed') return 'Completada';
    if (status === 'cancelled') return 'Cancelada';
    if (status === 'rejected') return 'Rechazada';
    return 'En curso';
}

function formatDateTime(s: Serenata): string {
    if (s.dateTime) {
        const d = new Date(s.dateTime);
        return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (s.date && s.time) {
        const d = new Date(s.date);
        return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${s.time}`;
    }
    if (s.date) {
        const d = new Date(s.date);
        return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    }
    return 'Fecha por definir';
}

function formatPrice(price?: number): string {
    if (typeof price !== 'number') return '';
    return `$${price.toLocaleString('es-CL')}`;
}

function toDate(item: Serenata): Date | null {
    if (item.dateTime) {
        const d = new Date(item.dateTime);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (item.date && item.time) {
        const d = new Date(`${item.date}T${item.time}`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (item.date) {
        const d = new Date(item.date);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function serenataHref(id: string, role: 'client' | 'musician' | 'coordinator'): string {
    if (role === 'client') return `/tracking/${id}`;
    if (role === 'coordinator') return `/solicitudes/${id}`;
    return `/tracking/${id}`;
}

export default function InicioPage() {
    const { user, coordinatorProfile, musicianProfile, effectiveRole, isLoading: authLoading } = useAuth();
    const [items, setItems] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        monthIncome: 0,
    });
    const [dashboardStats, setDashboardStats] = useState<{
        totalSerenatas?: number;
        completedSerenatas?: number;
        pendingSerenatas?: number;
        monthlyRevenue?: number;
        weeklyCompleted?: number;
    } | null>(null);

    const isCoordinator = effectiveRole === 'coordinator' || !!coordinatorProfile;
    const isMusician = effectiveRole === 'musician' || !!musicianProfile;
    const isClient = effectiveRole === 'client' || (!effectiveRole && !coordinatorProfile && !musicianProfile);
    const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setIsLoading(true);
            try {
                let endpoint = '/api/serenatas/requests';
                if (isCoordinator) endpoint = '/api/serenatas/requests?assignedToMe=true';
                else if (isMusician) endpoint = '/api/serenatas/requests/my/assigned';

                const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
                const data = await res.json().catch(() => ({}));
                if (!cancelled && res.ok && data.ok && Array.isArray(data.serenatas)) {
                    const serenatas = data.serenatas as Serenata[];
                    setItems(serenatas);
                    setStats({
                        total: serenatas.length,
                        pending: serenatas.filter((s) => s.status === 'pending').length,
                        confirmed: serenatas.filter((s) => s.status === 'confirmed').length,
                        completed: serenatas.filter((s) => s.status === 'completed').length,
                        monthIncome: serenatas
                            .filter((s) => s.status === 'completed' && typeof s.price === 'number')
                            .reduce((sum, s) => sum + (s.price || 0), 0),
                    });
                } else if (!cancelled) {
                    setItems([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        if (!authLoading) {
            void run();
        }

        return () => {
            cancelled = true;
        };
    }, [authLoading, isCoordinator, isMusician]);

    useEffect(() => {
        const run = async () => {
            if (!isCoordinator || authLoading) return;
            const res = await coordinatorStatsApi.get();
            const statsPayload = (res.data as { stats?: any } | undefined)?.stats;
            if (res.ok && statsPayload) {
                setDashboardStats(statsPayload);
            }
        };
        void run();
    }, [isCoordinator, authLoading]);

    const todayKey = new Date().toDateString();
    const todayItems = useMemo(
        () => items.filter((s) => toDate(s)?.toDateString() === todayKey),
        [items, todayKey]
    );
    const todayIncome = useMemo(
        () => todayItems.reduce((sum, s) => sum + (typeof s.price === 'number' ? s.price : 0), 0),
        [todayItems]
    );
    const upcoming = useMemo(
        () =>
            [...items]
                .filter((s) => !['cancelled', 'rejected', 'completed'].includes(s.status))
                .map((s) => ({ s, d: toDate(s) }))
                .filter((x): x is { s: Serenata; d: Date } => !!x.d)
                .sort((a, b) => a.d.getTime() - b.d.getTime())
                .slice(0, 3)
                .map((x) => x.s),
        [items]
    );

    if (isClient) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Hola {firstName}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        ¿Necesitas una serenata? ¡Solicítala ahora!
                    </p>
                </div>

                <Link href="/solicitar" className="block mb-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'var(--accent)', color: 'white' }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <IconPlus size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Solicitar serenata</p>
                            <p className="text-sm opacity-90">Crea una nueva solicitud</p>
                        </div>
                        <IconChevronRight size={20} />
                    </div>
                </Link>
            </SerenatasPageShell>
        );
    }

    if (isCoordinator) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Hola {firstName}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Hoy tienes {todayItems.length} serenatas programadas.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard value={String(todayItems.length)} label="Serenatas hoy" color="var(--accent)" />
                    <StatCard value={formatPrice(todayIncome) || '$0'} label="Ingreso hoy" color="var(--info)" />
                    <StatCard value={String(dashboardStats?.completedSerenatas ?? stats.completed)} label="Completadas mes" color="var(--success)" />
                    <StatCard value={formatPrice(dashboardStats?.monthlyRevenue ?? stats.monthIncome) || '$0'} label="Ingreso mes" color="var(--warning)" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <QuickLink href="/solicitudes/nueva" accent icon={<IconPlus size={24} />} label="Nueva serenata" />
                    <QuickLink href="/agenda" accent icon={<IconCalendar size={24} />} label="Ver agenda" />
                    <QuickLink href="/solicitudes" icon={<IconBell size={24} style={{ color: 'var(--accent)' }} />} label="Mis serenatas" />
                    <QuickLink href="/cuadrilla" icon={<IconUsersGroup size={24} style={{ color: 'var(--accent)' }} />} label="Mi cuadrilla" />
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Próximas serenatas</h2>
                        <Link href="/agenda" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                            Ver agenda
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                        </div>
                    ) : upcoming.length > 0 ? (
                        <div className="space-y-3">
                            {upcoming.map((item) => (
                                <Link key={item.id} href={serenataHref(item.id, 'coordinator')}>
                                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `var(--${statusTone(item.status)}-subtle)` }}>
                                            <IconClock size={20} style={{ color: `var(--${statusTone(item.status)})` }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                                                {item.recipientName || item.clientName}
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                {formatDateTime(item)} · {item.address || item.location || item.city || 'Sin ubicación'}
                                            </p>
                                        </div>
                                        {item.price ? (
                                            <p className="font-medium text-sm" style={{ color: 'var(--success)' }}>
                                                {formatPrice(item.price)}
                                            </p>
                                        ) : null}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                            <IconCalendar size={48} className="mx-auto mb-3 opacity-50" />
                            <p>No tienes serenatas próximas</p>
                            <Link href="/solicitudes/nueva" className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--accent)' }}>
                                Crear primera serenata
                            </Link>
                        </div>
                    )}
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <SerenatasPageShell fullWidth>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                    Panel de Músico
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                    Bienvenido, {firstName}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCard value={String(stats.total)} label="Total" color="var(--accent)" />
                <StatCard value={String(stats.pending)} label="Pendientes" color="var(--warning)" />
                <StatCard value={String(stats.confirmed)} label="Confirmadas" color="var(--info)" />
                <StatCard value={String(stats.completed)} label="Completadas" color="var(--success)" />
            </div>

            <div className="space-y-3 mb-6">
                <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Acciones rápidas</h2>
                <QuickLink href="/invitaciones" accent icon={<IconBell size={20} />} label="Ver invitaciones" row />
                <QuickLink href="/agenda" icon={<IconCalendar size={20} style={{ color: 'var(--accent)' }} />} label="Ver agenda" row />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                </div>
            ) : null}
        </SerenatasPageShell>
    );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
    return (
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{label}</p>
        </div>
    );
}

function QuickLink({
    href,
    label,
    icon,
    accent = false,
    row = false,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
    accent?: boolean;
    row?: boolean;
}) {
    return (
        <Link href={href}>
            <div
                className={row ? 'flex items-center gap-3 p-4 rounded-xl' : 'flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center'}
                style={
                    accent
                        ? { background: 'var(--accent)', color: 'white' }
                        : { background: 'var(--bg-elevated)', border: '1px solid var(--border)' }
                }
            >
                {icon}
                <span className="font-medium text-sm" style={accent ? undefined : { color: 'var(--fg)' }}>
                    {label}
                </span>
            </div>
        </Link>
    );
}
