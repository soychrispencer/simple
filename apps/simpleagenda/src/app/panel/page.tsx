'use client';

import { useEffect, useState } from 'react';
import {
    IconCalendar, IconUsers, IconCreditCard, IconClockHour4, IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight, } from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaStats, fetchAgendaProfile, type AgendaStats, type AgendaProfile, type AgendaWeekDay } from '@/lib/agenda-api';
import { fmtCLP, fmtTodayLabel } from '@simple/utils';
import { usePanelFormatters } from '@simple/auth';
import { vocab } from '@/lib/vocabulary';
import { PanelPageHeader } from '@simple/ui/panel';
import { PanelStatCard } from '@simple/ui/panel';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        return <div className="h-[96px]" aria-hidden />;
    }

    const totalWeek = data.reduce((s, d) => s + d.count, 0);

    return (
        <div>
            <svg
                width="100%"
                viewBox={`0 0 ${total_w} ${H + LABEL_H + COUNT_H}`}
                className="agenda-home-chart-overflow"
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
            <p className="text-xs mt-1 agenda-home-muted">
                {totalWeek === 0 ? 'Sin citas esta semana' : `${totalWeek} cita${totalWeek !== 1 ? 's' : ''} esta semana`}
            </p>
        </div>
    );
}

// ── Revenue sparkline ─────────────────────────────────────────────────────────

function RevenueTrend({ current, prev, loading }: { current: number; prev: number; loading: boolean }) {
    if (loading) {
        return null;
    }
    const pct = pctChange(current, prev);
    if (pct === null) return null;
    const up = pct >= 0;
    const Icon = pct === 0 ? IconMinus : up ? IconTrendingUp : IconTrendingDown;
    const trendClass =
        pct === 0 ? 'agenda-home-trend-neutral' : up ? 'agenda-home-trend-up' : 'agenda-home-trend-down';

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${trendClass}`}>
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
    const fmt = usePanelFormatters();

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([fetchAgendaStats(), fetchAgendaProfile()]);
            setStats(s);
            setProfile(p);
            setLoading(false);
        };
        void load();
    }, []);

    const greeting = profile?.displayName ? `Hola, ${profile.displayName.split(' ')[0]}` : null;
    const dateLabel = fmtTodayLabel(fmt.timezone);
    const panelDescription = greeting
        ? `${greeting} · ${dateLabel}`
        : `Resumen de citas, clientes y cobros · ${dateLabel}`;

    const statCards = [
        {
            label: 'Citas hoy',
            value: loading ? null : String(stats?.todayCount ?? 0),
            icon: IconCalendar,
            href: '/panel/agenda',
            accent: true,
        },
        {
            label: `${vocab.Clients} activos`,
            value: loading ? null : String(stats?.activeClients ?? 0),
            icon: IconUsers,
            href: '/panel/clientes',
            accent: false,
        },
        {
            label: 'Pagos pendientes',
            value: loading ? null : fmtCLP(stats?.pendingPayments ?? 0),
            icon: IconCreditCard,
            href: '/panel/finanzas',
            accent: false,
        },
        {
            label: 'Próxima cita',
            value: loading ? null : (
                stats?.nextAppointment
                    ? `${fmt.dateShort(stats.nextAppointment.startsAt)} ${fmt.time(stats.nextAppointment.startsAt)}`
                    : '—'
            ),
            icon: IconClockHour4,
            href: '/panel/agenda',
            accent: false,
        },
    ];

    return (
        <div className="panel-page container-app min-w-0 max-w-full py-4 pb-6 lg:py-8 lg:pb-8">
            <PanelPageHeader title="Mi panel" description={panelDescription} className="min-w-0" />

            <div className="grid gap-4 pb-2">
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
                {statCards.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="group block transition-transform active:scale-[0.98]"
                    >
                        <PanelStatCard
                            label={stat.label}
                            value={stat.value ?? '—'}
                            icon={<stat.icon size={18} />}
                        />
                    </Link>
                ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

                <div
                    className="lg:col-span-3 rounded-2xl border p-4 sm:p-5 agenda-home-surface min-w-0"
                >
                    <div className="flex items-center justify-between mb-4 gap-2 sm:mb-5">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold agenda-home-fg">Citas esta semana</p>
                            <p className="text-xs mt-0.5 agenda-home-muted">Lunes a domingo</p>
                        </div>
                        <Link
                            href="/panel/agenda"
                            className="shrink-0 text-xs font-medium inline-flex items-center gap-1 px-2 py-1.5 -my-1.5 rounded-lg transition-colors active:bg-(--bg-subtle) lg:hover:opacity-70 agenda-home-accent"
                        >
                            Ver agenda <IconChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="w-full overflow-x-auto -mx-1 px-1">
                        <WeekBarChart data={stats?.weeklyData ?? []} loading={loading} />
                    </div>
                </div>

                <div
                    className="lg:col-span-2 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between agenda-home-surface min-w-0"
                >
                    <div>
                        <p className="text-sm font-semibold mb-0.5 agenda-home-fg">Ingresos del mes</p>
                        <p className="text-xs mb-3 sm:mb-4 agenda-home-muted">Cobros confirmados</p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight agenda-home-fg break-words">
                            {loading ? '—' : fmtCLP(stats?.thisMonthRevenue ?? 0)}
                        </p>
                        <div className="mt-2">
                            <RevenueTrend
                                current={stats?.thisMonthRevenue ?? 0}
                                prev={stats?.lastMonthRevenue ?? 0}
                                loading={loading}
                            />
                        </div>
                    </div>

                    <div
                        className="mt-5 pt-4 flex items-center justify-between agenda-home-border-top"
                    >
                        <div>
                            <p className="text-xs agenda-home-muted">Citas este mes</p>
                            <p className="text-lg font-bold agenda-home-fg">
                                {loading ? '—' : (stats?.thisMonthAppointments ?? 0)}
                            </p>
                        </div>
                        <Link
                            href="/panel/finanzas"
                            className="shrink-0 text-xs font-medium inline-flex items-center gap-1 px-2 py-1.5 -my-1.5 rounded-lg transition-colors active:bg-(--bg-subtle) lg:hover:opacity-70 agenda-home-accent"
                        >
                            Ver cobros <IconChevronRight size={14} />
                        </Link>
                    </div>
                </div>
                </div>
            </div>

        </div>
    );
}
