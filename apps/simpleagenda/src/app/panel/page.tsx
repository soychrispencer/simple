'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconClockHour4,
    IconTrendingUp,
    IconTrendingDown,
    IconMinus,
    IconChevronRight,
    IconCheck,
    IconUser,
    IconBriefcase,
    IconClock,
    IconRocket,
    IconX,
} from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaStats, fetchAgendaProfile, isPlanActive, type AgendaStats, type AgendaWeekDay, type AgendaProfile } from '@/lib/agenda-api';
import { fmtCLP, fmtTime, fmtDateShort as fmtDate } from '@/lib/format';
import { vocab } from '@/lib/vocabulary';

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
            href: '/panel/configuracion/perfil',
            icon: IconUser,
            done: !!(profile.displayName && profile.profession),
        },
        {
            key: 'services',
            label: 'Servicios',
            description: 'Qué ofreces y cuánto dura',
            href: '/panel/configuracion/servicios',
            icon: IconBriefcase,
            done: stats.hasServices,
        },
        {
            key: 'availability',
            label: 'Disponibilidad',
            description: 'Tus horarios de atención',
            href: '/panel/configuracion/disponibilidad',
            icon: IconClock,
            done: stats.hasRules,
        },
        {
            key: 'publish',
            label: 'Publica tu página',
            description: 'Activa tu link público de reservas',
            href: '/panel/configuracion/link',
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
            className="rounded-2xl border p-5 mb-3"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                        Configura tu agenda
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {completed} de {total} pasos · {pct === 0 ? 'comencemos' : `${pct}% listo`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Ocultar checklist"
                    className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[--accent-soft]"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    <IconX size={14} />
                </button>
            </div>

            {/* Progress bar */}
            <div
                className="h-1 rounded-full overflow-hidden mb-4"
                style={{ background: 'var(--border)' }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'var(--accent)' }}
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
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                        background: step.done ? 'var(--accent)' : 'var(--accent-soft)',
                                        color: step.done ? '#fff' : 'var(--accent)',
                                    }}
                                >
                                    <Icon size={15} stroke={step.done ? 3 : 2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className="text-sm font-medium truncate"
                                        style={{
                                            color: 'var(--fg)',
                                            textDecoration: step.done ? 'line-through' : 'none',
                                            opacity: step.done ? 0.5 : 1,
                                        }}
                                    >
                                        {step.label}
                                    </p>
                                    <p
                                        className="text-xs truncate"
                                        style={{ color: 'var(--fg-muted)', opacity: step.done ? 0.5 : 1 }}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                                {!step.done && (
                                    <IconChevronRight
                                        size={14}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        style={{ color: 'var(--accent)' }}
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

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([fetchAgendaStats(), fetchAgendaProfile()]);
            setStats(s);
            setProfile(p);
            setLoading(false);
            // Redirigir al onboarding si el perfil está vacío (usuario nuevo)
            if (p && !p.displayName && !p.profession) {
                router.replace('/panel/onboarding');
            }
        };
        void load();
        if (typeof window !== 'undefined') {
            setChecklistDismissed(window.localStorage.getItem('simpleagenda:setup-dismissed') === '1');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDismissChecklist = () => {
        setChecklistDismissed(true);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simpleagenda:setup-dismissed', '1');
        }
    };

    const isFreePlan = !loading && profile !== null && !isPlanActive(profile);
    const clientsUsed = stats?.activeClients ?? 0;
    const appsUsed = stats?.thisMonthAppointments ?? 0;
    const clientsNearLimit = isFreePlan && clientsUsed >= 3;
    const appsNearLimit = isFreePlan && appsUsed >= 7;
    const showFreeBanner = isFreePlan && (clientsNearLimit || appsNearLimit);

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
            label: `${vocab.Clients} activos`,
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

            {/* Onboarding checklist — auto-hides when complete or dismissed */}
            {!loading && profile && stats && (
                <SetupChecklist
                    profile={profile}
                    stats={stats}
                    dismissed={checklistDismissed}
                    onDismiss={handleDismissChecklist}
                />
            )}

            {/* Free plan limits banner */}
            {showFreeBanner && (
                <Link
                    href="/panel/suscripciones"
                    className="flex items-center gap-4 rounded-2xl border p-4 mb-3 transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.06)' }}
                >
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(234,179,8,0.12)', color: 'rgb(161,120,0)' }}
                    >
                        <IconCreditCard size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Acercándote al límite del plan gratuito</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            {clientsNearLimit && `${clientsUsed}/5 ${vocab.clients}`}{clientsNearLimit && appsNearLimit ? ' · ' : ''}{appsNearLimit && `${appsUsed}/10 citas este mes`}. Actualiza a Pro para uso ilimitado.
                        </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: 'rgb(161,120,0)' }} />
                </Link>
            )}

        </div>
    );
}
