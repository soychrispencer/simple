'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconCalendar, IconUsers, IconCreditCard, IconClockHour4, IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight, IconCheck, IconUser, IconBriefcase, IconClock, IconRocket, IconX, } from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaStats, fetchAgendaProfile, isAgendaTrialPeriod, agendaTrialDaysRemaining, type AgendaStats, type AgendaProfile, type AgendaWeekDay } from '@/lib/agenda-api';
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
        return (
            <div className="flex items-end gap-2.5 h-20">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-lg animate-pulse agenda-home-skeleton"
                        style={{ height: `${30 + (i % 3) * 15}px` }}
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
        return <div className="h-8 w-24 rounded-lg animate-pulse agenda-home-skeleton" />;
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

// ── Onboarding checklist ──────────────────────────────────────────────────────

type ChecklistStep = {
    key: string;
    label: string;
    description: string;
    href: string;
    icon: typeof IconUser;
    done: boolean;
};

function SetupChecklist({
    profile,
    stats,
    dismissed,
    onDismiss,
}: {
    profile: AgendaProfile;
    stats: AgendaStats;
    dismissed: boolean;
    onDismiss: () => void;
}) {
    const steps: ChecklistStep[] = [
        {
            key: 'profile',
            label: 'Tus datos',
            description: 'Nombre y profesión',
            href: '/panel/mi-negocio',
            icon: IconUser,
            done: !!(profile.displayName && profile.profession),
        },
        {
            key: 'services',
            label: 'Servicios',
            description: 'Qué ofreces y cuánto dura',
            href: '/panel/mi-negocio/servicios',
            icon: IconBriefcase,
            done: stats.hasServices,
        },
        {
            key: 'availability',
            label: 'Disponibilidad',
            description: 'Tus horarios de atención',
            href: '/panel/mi-negocio/disponibilidad',
            icon: IconClock,
            done: stats.hasRules,
        },
        {
            key: 'publish',
            label: 'Publica tu página',
            description: 'Activa tu link público de reservas',
            href: '/panel/mi-negocio/configuraciones',
            icon: IconRocket,
            done: profile.isPublished,
        },
    ];

    const completed = steps.filter((s) => s.done).length;
    const total = steps.length;
    const allDone = completed === total;
    const pct = Math.round((completed / total) * 100);

    if (allDone || dismissed) return null;

    return (
        <div
            className="rounded-2xl border p-5 mb-3 agenda-home-surface"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <p className="text-sm font-semibold agenda-home-fg">
                        Configura tu agenda
                    </p>
                    <p className="text-xs mt-0.5 agenda-home-muted">
                        {completed} de {total} pasos · {pct === 0 ? 'comencemos' : `${pct}% listo`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Ocultar checklist"
                    className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[--accent-soft] agenda-home-muted"
                >
                    <IconX size={14} />
                </button>
            </div>

            {/* Progress bar */}
            <div
                className="h-1 rounded-full overflow-hidden mb-4 agenda-home-progress-track"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full transition-all duration-500 agenda-home-progress-fill"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Steps */}
            <ul className="flex flex-col gap-1">
                {steps.map((step) => {
                    const Icon = step.done ? IconCheck : step.icon;
                    return (
                        <li key={step.key}>
                            <Link
                                href={step.href}
                                aria-label={`${step.label}${step.done ? ' (completado)' : ' (pendiente)'}`}
                                className="group flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-[--accent-soft]"
                            >
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${step.done ? 'agenda-home-step-icon--done' : 'agenda-home-step-icon--pending'}`}
                                >
                                    <Icon size={15} stroke={step.done ? 3 : 2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`text-sm font-medium truncate ${step.done ? 'agenda-home-step-title--done' : 'agenda-home-step-title--pending'}`}
                                    >
                                        {step.label}
                                    </p>
                                    <p
                                        className={`text-xs truncate ${step.done ? 'agenda-home-step-desc--done' : 'agenda-home-step-desc--pending'}`}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                                {!step.done && (
                                    <IconChevronRight
                                        size={14}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 agenda-home-accent"
                                    />
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanelHomePage() {
    const router = useRouter();
    const [stats, setStats] = useState<AgendaStats | null>(null);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [checklistDismissed, setChecklistDismissed] = useState(false);
    const fmt = usePanelFormatters();

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([fetchAgendaStats(), fetchAgendaProfile()]);
            setStats(s);
            setProfile(p);
            setLoading(false);
            // Redirigir a mi negocio si el perfil no existe o está vacío (usuario nuevo)
            if (!p || (!p.displayName && !p.profession)) {
                router.replace('/panel/mi-negocio');
            }
        };
        void load();
        if (typeof window !== 'undefined') {
            setChecklistDismissed(window.localStorage.getItem('simpleagenda:setup-dismissed') === '1');
        }
     
    }, []);

    const handleDismissChecklist = () => {
        setChecklistDismissed(true);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simpleagenda:setup-dismissed', '1');
        }
    };

    const isOnTrial = !loading && profile !== null && isAgendaTrialPeriod(profile);
    const trialDays = profile ? agendaTrialDaysRemaining(profile) : null;
    const showTrialBanner = isOnTrial && trialDays !== null;

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
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader title="Mi panel" description={panelDescription} />

            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCards.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="group block transition-transform active:scale-[0.98]"
                    >
                        {stat.value === null ? (
                            <div className="rounded-card border p-4 animate-pulse agenda-home-surface">
                                <div className="mb-3 h-8 w-8 rounded-xl agenda-home-skeleton" />
                                <div className="h-7 w-16 rounded-lg agenda-home-skeleton" />
                            </div>
                        ) : (
                            <PanelStatCard
                                label={stat.label}
                                value={stat.value}
                                icon={<stat.icon size={18} />}
                            />
                        )}
                    </Link>
                ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

                {/* Weekly bar chart — 3 cols */}
                <div
                    className="lg:col-span-3 rounded-2xl border p-4 sm:p-5 agenda-home-surface"
                >
                    <div className="flex items-center justify-between mb-5 gap-2">
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
                    <WeekBarChart data={stats?.weeklyData ?? []} loading={loading} />
                </div>

                {/* Revenue summary — 2 cols */}
                <div
                    className="lg:col-span-2 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between agenda-home-surface"
                >
                    <div>
                        <p className="text-sm font-semibold mb-0.5 agenda-home-fg">Ingresos del mes</p>
                        <p className="text-xs mb-4 agenda-home-muted">Cobros confirmados</p>
                        {loading ? (
                            <div className="h-9 w-32 rounded-lg animate-pulse agenda-home-skeleton" />
                        ) : (
                            <p className="text-3xl font-bold tracking-tight agenda-home-fg">
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
                        className="mt-5 pt-4 flex items-center justify-between agenda-home-border-top"
                    >
                        <div>
                            <p className="text-xs agenda-home-muted">Citas este mes</p>
                            {loading ? (
                                <div className="h-5 w-8 rounded animate-pulse mt-1 agenda-home-skeleton" />
                            ) : (
                                <p className="text-lg font-bold agenda-home-fg">{stats?.thisMonthAppointments ?? 0}</p>
                            )}
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

                {/* Onboarding checklist — auto-hides when complete or dismissed */}
                {!loading && profile && stats && (
                <SetupChecklist
                    profile={profile}
                    stats={stats}
                    dismissed={checklistDismissed}
                    onDismiss={handleDismissChecklist}
                />
                )}

                {/* Prueba gratuita activa */}
                {showTrialBanner && (
                <Link
                    href="/panel/mi-cuenta/suscripcion"
                    className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:border-[--accent-border] agenda-home-warning-banner"
                >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 agenda-home-warning-icon">
                        <IconClockHour4 size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold agenda-home-fg">Prueba gratuita activa</p>
                        <p className="text-xs mt-0.5 agenda-home-muted">
                            {trialDays === 0
                                ? 'Tu prueba termina hoy. Activa Pro para seguir operando sin interrupciones.'
                                : `Te ${trialDays === 1 ? 'queda' : 'quedan'} ${trialDays} ${trialDays === 1 ? 'día' : 'días'} con acceso completo. Puedes activar Pro cuando quieras.`}
                        </p>
                    </div>
                    <IconChevronRight size={16} className="agenda-home-warning-chevron" />
                </Link>
                )}
            </div>

        </div>
    );
}
