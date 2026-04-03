'use client';

import { useEffect, useState } from 'react';
import {
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconClockHour4,
    IconLoader2,
    IconCheck,
    IconTrendingUp,
    IconTrendingDown,
    IconMinus,
    IconChevronRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaStats, fetchAgendaProfile, type AgendaStats, type AgendaWeekDay, type AgendaProfile } from '@/lib/agenda-api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function pctChange(current: number, prev: number): number | null {
    if (prev === 0) return current > 0 ? 100 : null;
    return Math.round(((current - prev) / prev) * 100);
}

// ── Week bar chart (pure SVG) ─────────────────────────────────────────────────

function WeekBarChart({ data, loading }: { data: AgendaWeekDay[]; loading: boolean }) {
    const BAR_W = 28;
    const GAP = 10;
    const H = 64;
    const LABEL_H = 18;
    const COUNT_H = 14;
    const total_w = data.length * (BAR_W + GAP) - GAP;
    const max = Math.max(...data.map((d) => d.count), 1);

    if (loading) {
        return (
            <div className="flex items-end gap-2.5 h-20">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-lg animate-pulse"
                        style={{ height: `${30 + (i % 3) * 15}px`, background: 'var(--border)' }}
                    />
                ))}
            </div>
        );
    }

    const totalWeek = data.reduce((s, d) => s + d.count, 0);

    return (
        <div>
            <svg
                width="100%"
                viewBox={`0 0 ${total_w} ${H + LABEL_H + COUNT_H}`}
                style={{ overflow: 'visible' }}
                aria-label="Citas por día de la semana"
            >
                {data.map((d, i) => {
                    const barH = Math.max((d.count / max) * H, d.count > 0 ? 6 : 2);
                    const x = i * (BAR_W + GAP);
                    const y = H - barH;
                    const fill = d.isToday ? 'var(--accent)' : d.count > 0 ? 'var(--accent-soft)' : 'var(--border)';
                    const textColor = d.isToday ? 'var(--accent)' : 'var(--fg-muted)';

                    return (
                        <g key={d.date}>
                            {/* Count above bar */}
                            {d.count > 0 && (
                                <text
                                    x={x + BAR_W / 2}
                                    y={y - 4}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fontWeight={d.isToday ? '600' : '400'}
                                    fill={textColor}
                                >
                                    {d.count}
                                </text>
                            )}
                            {/* Bar */}
                            <rect x={x} y={y} width={BAR_W} height={barH} rx={5} fill={fill} />
                            {/* Day label */}
                            <text
                                x={x + BAR_W / 2}
                                y={H + LABEL_H}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={d.isToday ? '700' : '400'}
                                fill={textColor}
                            >
                                {d.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                {totalWeek === 0 ? 'Sin citas esta semana' : `${totalWeek} cita${totalWeek !== 1 ? 's' : ''} esta semana`}
            </p>
        </div>
    );
}

// ── Revenue sparkline ─────────────────────────────────────────────────────────

function RevenueTrend({ current, prev, loading }: { current: number; prev: number; loading: boolean }) {
    if (loading) {
        return <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />;
    }
    const pct = pctChange(current, prev);
    if (pct === null) return null;
    const up = pct >= 0;
    const Icon = pct === 0 ? IconMinus : up ? IconTrendingUp : IconTrendingDown;
    const color = pct === 0 ? 'var(--fg-muted)' : up ? 'var(--accent)' : '#ef4444';

    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg" style={{ background: up ? 'rgba(13,148,136,0.08)' : 'rgba(239,68,68,0.08)', color }}>
            <Icon size={12} />
            {pct === 0 ? 'Igual' : `${up ? '+' : ''}${pct}%`} vs mes anterior
        </span>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanelHomePage() {
    const [stats, setStats] = useState<AgendaStats | null>(null);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([fetchAgendaStats(), fetchAgendaProfile()]);
            setStats(s);
            setProfile(p);
            setLoading(false);
        };
        void load();
    }, []);

    const setupSteps = [
        {
            label: 'Completa tu perfil profesional',
            href: '/panel/configuracion/perfil',
            done: !!(profile?.displayName && profile?.profession),
        },
        {
            label: 'Agrega tus servicios o tipos de sesión',
            href: '/panel/configuracion/servicios',
            done: stats?.hasServices === true,
        },
        {
            label: 'Configura tu disponibilidad semanal',
            href: '/panel/configuracion/disponibilidad',
            done: stats?.hasRules === true,
        },
        {
            label: 'Publica tu agenda y comparte tu link',
            href: '/panel/configuracion/link',
            done: profile?.isPublished === true,
        },
    ];

    const setupDone = !loading && setupSteps.every((s) => s.done);
    const greeting = profile?.displayName ? `Hola, ${profile.displayName.split(' ')[0]}` : 'Bienvenido';

    const statCards = [
        {
            label: 'Citas hoy',
            value: loading ? null : String(stats?.todayCount ?? 0),
            icon: IconCalendar,
            href: '/panel/agenda',
            accent: true,
        },
        {
            label: 'Pacientes activos',
            value: loading ? null : String(stats?.activeClients ?? 0),
            icon: IconUsers,
            href: '/panel/clientes',
            accent: false,
        },
        {
            label: 'Cobros pendientes',
            value: loading ? null : fmtCLP(stats?.pendingPayments ?? 0),
            icon: IconCreditCard,
            href: '/panel/pagos',
            accent: false,
        },
        {
            label: 'Próxima cita',
            value: loading ? null : (
                stats?.nextAppointment
                    ? `${fmtDate(stats.nextAppointment.startsAt)} ${fmtTime(stats.nextAppointment.startsAt)}`
                    : '—'
            ),
            icon: IconClockHour4,
            href: '/panel/agenda',
            accent: false,
        },
    ];

    return (
        <div className="container-app panel-page py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--fg)' }}>{greeting}</h1>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="group p-4 rounded-2xl border transition-all hover:border-[--accent-border] hover:shadow-sm"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <stat.icon size={16} />
                        </div>
                        {stat.value === null ? (
                            <div className="h-7 w-16 rounded-lg animate-pulse mb-1" style={{ background: 'var(--border)' }} />
                        ) : (
                            <p className="text-xl font-bold truncate leading-tight" style={{ color: 'var(--fg)' }}>{stat.value}</p>
                        )}
                        <p className="text-xs mt-0.5 flex items-center justify-between" style={{ color: 'var(--fg-muted)' }}>
                            {stat.label}
                            <IconChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
                        </p>
                    </Link>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">

                {/* Weekly bar chart — 3 cols */}
                <div
                    className="lg:col-span-3 rounded-2xl border p-5"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Citas esta semana</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Lunes a domingo</p>
                        </div>
                        <Link
                            href="/panel/agenda"
                            className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--accent)' }}
                        >
                            Ver agenda <IconChevronRight size={12} />
                        </Link>
                    </div>
                    <WeekBarChart data={stats?.weeklyData ?? []} loading={loading} />
                </div>

                {/* Revenue summary — 2 cols */}
                <div
                    className="lg:col-span-2 rounded-2xl border p-5 flex flex-col justify-between"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div>
                        <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>Ingresos del mes</p>
                        <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>Cobros confirmados</p>
                        {loading ? (
                            <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />
                        ) : (
                            <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
                                {fmtCLP(stats?.thisMonthRevenue ?? 0)}
                            </p>
                        )}
                        <div className="mt-2">
                            <RevenueTrend
                                current={stats?.thisMonthRevenue ?? 0}
                                prev={stats?.lastMonthRevenue ?? 0}
                                loading={loading}
                            />
                        </div>
                    </div>

                    <div
                        className="mt-5 pt-4 flex items-center justify-between"
                        style={{ borderTop: '1px solid var(--border)' }}
                    >
                        <div>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Citas este mes</p>
                            {loading ? (
                                <div className="h-5 w-8 rounded animate-pulse mt-1" style={{ background: 'var(--border)' }} />
                            ) : (
                                <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{stats?.thisMonthAppointments ?? 0}</p>
                            )}
                        </div>
                        <Link
                            href="/panel/pagos"
                            className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                            style={{ color: 'var(--accent)' }}
                        >
                            Ver cobros <IconChevronRight size={12} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Setup checklist — hidden if all done */}
            {!setupDone && !loading && (
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Configura tu agenda</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            {setupSteps.filter((s) => s.done).length}/{setupSteps.length} pasos
                        </span>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'var(--fg-muted)' }}>Completa estos pasos para empezar a recibir reservas.</p>

                    {/* Progress bar */}
                    <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${(setupSteps.filter((s) => s.done).length / setupSteps.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        {setupSteps.map((step) => (
                            <Link
                                key={step.label}
                                href={step.href}
                                className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-[--accent-border]"
                                style={{ borderColor: 'var(--border)', opacity: step.done ? 0.55 : 1 }}
                            >
                                <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                        background: step.done ? 'var(--accent)' : 'transparent',
                                        border: step.done ? 'none' : '1.5px solid var(--border)',
                                    }}
                                >
                                    {step.done && <IconCheck size={11} color="#fff" />}
                                </span>
                                <span
                                    className="text-sm flex-1"
                                    style={{
                                        color: step.done ? 'var(--fg-muted)' : 'var(--fg)',
                                        textDecoration: step.done ? 'line-through' : 'none',
                                    }}
                                >
                                    {step.label}
                                </span>
                                {!step.done && <IconChevronRight size={14} style={{ color: 'var(--fg-muted)' }} />}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
