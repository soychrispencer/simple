'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    IconCalendar, IconUsers, IconCreditCard, IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight, IconPlus, } from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaAppointments, fetchAgendaStats, fetchAgendaProfile, hasAgendaFullAccess, type AgendaAppointment, type AgendaStats, type AgendaProfile, type AgendaWeekDay } from '@/lib/agenda-api';
import { AGENDA_PRICING, fmtCLP, fmtTodayLabel } from '@simple/utils';
import { usePanelFormatters } from '@simple/auth';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import { PanelButton, PanelButtonLink, PanelPageHeader, PanelStatCard } from '@simple/ui/panel';
import { AgendaOnboardingRail } from '@/components/panel/agenda-onboarding-rail';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pctChange(current: number, prev: number): number | null {
    if (prev === 0) return current > 0 ? 100 : null;
    return Math.round(((current - prev) / prev) * 100);
}

function dateKeyInTimezone(value: Date, timeZone: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(value);
        const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
        return `${part('year')}-${part('month')}-${part('day')}`;
    } catch {
        return value.toISOString().slice(0, 10);
    }
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
                    const fill = d.isToday ? 'var(--signal)' : d.count > 0 ? 'var(--accent-soft)' : 'var(--border)';
                    const textColor = d.isToday ? 'var(--accent-ink)' : 'var(--fg-muted)';

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
    const vocab = useAgendaVocab();
    const [stats, setStats] = useState<AgendaStats | null>(null);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [upcoming, setUpcoming] = useState<AgendaAppointment[] | null>(null);
    const fmt = usePanelFormatters();

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const start = new Date();
            const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            const [s, p, appointments] = await Promise.all([
                fetchAgendaStats(),
                fetchAgendaProfile(),
                fetchAgendaAppointments(start.toISOString(), end.toISOString()).catch(() => null),
            ]);
            setStats(s);
            setProfile(p);
            setUpcoming(appointments?.filter((item) => ['pending', 'scheduled', 'confirmed'].includes(item.status)).slice(0, 4) ?? null);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const greeting = profile?.displayName ? `Hola, ${profile.displayName.split(' ')[0]}` : null;
    const activeTimezone = profile?.timezone || fmt.timezone;
    const dateLabel = fmtTodayLabel(activeTimezone);
    const hasProAccess = profile ? hasAgendaFullAccess(profile) : false;
    const monthlyBookingsUsed = profile?.monthlyBookingsUsed ?? 0;
    const monthlyBookingsLimit = profile?.monthlyBookingsLimit ?? AGENDA_PRICING.free.monthlyBookings;
    const panelDescription = greeting
        ? `${greeting} · ${dateLabel}`
        : `Resumen de agenda y clientes · ${dateLabel}`;

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
            label: hasProAccess ? 'Pagos pendientes' : 'Citas este mes',
            value: loading ? null : hasProAccess ? fmtCLP(stats?.pendingPayments ?? 0) : `${monthlyBookingsUsed}/${monthlyBookingsLimit}`,
            icon: hasProAccess ? IconCreditCard : IconCalendar,
            href: hasProAccess ? '/panel/finanzas' : '/panel/agenda',
            accent: false,
        },
    ];

    return (
        <div className="panel-page container-app min-w-0 max-w-full py-4 pb-6 lg:py-8 lg:pb-8">
            <PanelPageHeader
                title="Hoy"
                description={panelDescription}
                className="min-w-0"
                actions={!loading && !loadError ? (
                    <PanelButtonLink href="/panel/agenda?nueva=1">
                        <IconPlus size={17} aria-hidden /> Nueva cita
                    </PanelButtonLink>
                ) : undefined}
            />

            {!loadError && <AgendaOnboardingRail className="mb-4" />}

            {loadError && (
                <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-100">
                    <span>No se pudo cargar el resumen: {loadError}</span>
                    <button type="button" className="font-semibold underline" onClick={() => void load()}>Reintentar</button>
                </div>
            )}

            {!loadError && (
                <div className="grid gap-4 pb-2">
                    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
                        {statCards.map((stat) => (
                            <Link
                                key={stat.label}
                                href={stat.href}
                                className="agenda-panel-stat-link block min-w-0 rounded-card transition-transform active:scale-[0.98]"
                            >
                                <PanelStatCard
                                    label={stat.label}
                                    value={stat.value ?? '—'}
                                    icon={<stat.icon size={18} />}
                                    accent={stat.accent}
                                />
                            </Link>
                        ))}
                    </div>

                    <section className="agenda-home-surface min-w-0 rounded-2xl border p-4 sm:p-5" aria-labelledby="upcoming-agenda">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                            <h2 id="upcoming-agenda" className="font-semibold agenda-home-fg">Próximas citas</h2>
                            <Link href="/panel/agenda" className="inline-flex items-center gap-1 text-sm font-semibold agenda-home-accent">
                                Ver agenda <IconChevronRight size={15} aria-hidden />
                            </Link>
                        </div>
                        {loading ? (
                            <p className="py-3 text-sm agenda-home-muted" role="status">Cargando próximas citas…</p>
                        ) : upcoming === null ? (
                            <p className="py-3 text-sm agenda-home-muted">No pudimos cargar las próximas citas. Puedes consultarlas en Agenda.</p>
                        ) : upcoming.length === 0 ? (
                            <p className="py-3 text-sm agenda-home-muted">No tienes citas programadas para los próximos siete días.</p>
                        ) : (
                            <ul>
                                {upcoming.map((appointment) => (
                                    <li key={appointment.id} className="border-t border-(--border)">
                                        <Link
                                            href={`/panel/agenda?appt=${appointment.id}`}
                                            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                                        >
                                            <span className="break-words font-semibold agenda-home-fg">{appointment.clientName || 'Cita'}</span>
                                            <span className="agenda-home-muted">
                                                {new Intl.DateTimeFormat('es-CL', { timeZone: activeTimezone, day: 'numeric', month: 'short' }).format(new Date(appointment.startsAt))}
                                                {' · '}
                                                {new Intl.DateTimeFormat('es-CL', { timeZone: activeTimezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(appointment.startsAt))}
                                            </span>
                                            <span className="rounded-full bg-(--bg-subtle) px-2.5 py-1 text-xs font-semibold agenda-home-fg">
                                                {appointment.status === 'confirmed' ? 'Confirmada' : appointment.status === 'scheduled' ? 'Agendada' : 'Pendiente'}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                        <div className="lg:col-span-3 rounded-2xl border p-4 sm:p-5 agenda-home-surface min-w-0">
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

                        <div className="lg:col-span-2 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between agenda-home-surface min-w-0">
                            {hasProAccess ? (
                                <>
                                    <div>
                                        <p className="text-sm font-semibold mb-0.5 agenda-home-fg">Ingresos del mes</p>
                                        <p className="text-xs mb-3 sm:mb-4 agenda-home-muted">Cobros confirmados</p>
                                        <p className="text-2xl sm:text-3xl font-bold tracking-tight agenda-home-fg break-words">
                                            {loading ? '—' : fmtCLP(stats?.thisMonthRevenue ?? 0)}
                                        </p>
                                        <div className="mt-2">
                                            <RevenueTrend current={stats?.thisMonthRevenue ?? 0} prev={stats?.lastMonthRevenue ?? 0} loading={loading} />
                                        </div>
                                    </div>
                                    <div className="mt-5 pt-4 flex items-center justify-between agenda-home-border-top">
                                        <div>
                                            <p className="text-xs agenda-home-muted">Citas este mes</p>
                                            <p className="text-lg font-bold agenda-home-fg">{loading ? '—' : (stats?.thisMonthAppointments ?? 0)}</p>
                                        </div>
                                        <Link href="/panel/finanzas" className="shrink-0 text-xs font-medium inline-flex items-center gap-1 px-2 py-1.5 -my-1.5 rounded-lg transition-colors active:bg-(--bg-subtle) lg:hover:opacity-70 agenda-home-accent">
                                            Ver cobros <IconChevronRight size={14} />
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full flex-col justify-center">
                                    <p className="text-sm font-semibold agenda-home-fg">Tu plan Gratis</p>
                                    <p className="mt-1 text-xs agenda-home-muted">Citas nuevas este mes</p>
                                    <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight agenda-home-fg">
                                        {loading ? '—' : `${monthlyBookingsUsed} / ${monthlyBookingsLimit}`}
                                    </p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--border)" aria-label={`${monthlyBookingsUsed} de ${monthlyBookingsLimit} citas creadas`}>
                                        <div className="h-full rounded-full bg-(--accent)" style={{ width: `${Math.min(100, monthlyBookingsLimit ? monthlyBookingsUsed / monthlyBookingsLimit * 100 : 0)}%` }} />
                                    </div>
                                    <Link href="/panel/mi-negocio/plan" className="mt-5 inline-flex items-center gap-1 text-xs font-medium agenda-home-accent">
                                        Activar Pro <IconChevronRight size={14} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
