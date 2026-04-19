'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconChartBar,
    IconUsers,
    IconHeart,
    IconAlertTriangle,
    IconRefresh,
    IconLoader2,
    IconTrendingUp,
    IconMessage,
} from '@tabler/icons-react';
import {
    fetchAgendaAnalytics,
    fetchNpsResponses,
    type AnalyticsData,
    type NpsResponseRow,
} from '@/lib/agenda-api';
import { fmtCLP, fmtDateMedium } from '@/lib/format';
import { Skeleton, SkeletonStat } from '@/components/panel/skeleton';

const MAX_BARS = 12;

const percent = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

function StatCard({
    label,
    value,
    hint,
    icon: Icon,
}: {
    label: string;
    value: string;
    hint?: string;
    icon: typeof IconChartBar;
}) {
    return (
        <div
            className="p-4 rounded-2xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                <span
                    className="w-7 h-7 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                >
                    <Icon size={14} stroke={1.8} />
                </span>
            </div>
            <div className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</div>
            {hint ? (
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{hint}</div>
            ) : null}
        </div>
    );
}

function SectionCard({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>
                {right}
            </div>
            {children}
        </div>
    );
}

function npsColor(score: number) {
    if (score >= 9) return 'var(--accent)';
    if (score >= 7) return '#d97706';
    return '#dc2626';
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [nps, setNps] = useState<NpsResponseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setRefreshing(true);
        const [analytics, npsRows] = await Promise.all([
            fetchAgendaAnalytics(),
            fetchNpsResponses(),
        ]);
        setData(analytics);
        setNps(npsRows);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { void load(); }, []);

    const monthly = data?.monthly ?? [];
    const maxRevenue = useMemo(() => {
        return monthly.reduce((m, r) => Math.max(m, r.revenue), 0);
    }, [monthly]);

    const totalRevenue12m = useMemo(
        () => monthly.reduce((s, r) => s + r.revenue, 0),
        [monthly],
    );

    const avgRevenue = useMemo(() => {
        const nonZero = monthly.filter((r) => r.revenue > 0);
        if (nonZero.length === 0) return 0;
        return Math.round(totalRevenue12m / nonZero.length);
    }, [monthly, totalRevenue12m]);

    const lastComments = useMemo(
        () => nps.filter((r) => (r.comment ?? '').trim() && r.submittedAt).slice(0, 5),
        [nps],
    );

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton width={180} height="1.5rem" />
                    <Skeleton width={100} height="2rem" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
                </div>
                <Skeleton height="14rem" rounded="2xl" />
                <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton height="12rem" rounded="2xl" />
                    <Skeleton height="12rem" rounded="2xl" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-6">
                <div
                    className="rounded-2xl border p-8 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        No se pudieron cargar las estadísticas. Intenta de nuevo.
                    </div>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                    >
                        <IconRefresh size={14} /> Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const { byService, topClients, noShowRate, totalCompleted, totalNoShow, totalCancelled, nps: npsStats } = data;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Estadísticas
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Resumen de los últimos 12 meses.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                    aria-label="Actualizar estadísticas"
                >
                    {refreshing ? <IconLoader2 size={14} className="animate-spin" /> : <IconRefresh size={14} />}
                    <span className="hidden sm:inline">Actualizar</span>
                </button>
            </header>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Ingresos 12m"
                    value={fmtCLP(totalRevenue12m)}
                    hint={avgRevenue > 0 ? `Promedio ${fmtCLP(avgRevenue)}/mes` : undefined}
                    icon={IconTrendingUp}
                />
                <StatCard
                    label="Citas completadas"
                    value={String(totalCompleted)}
                    hint={totalCancelled > 0 ? `${totalCancelled} canceladas` : undefined}
                    icon={IconChartBar}
                />
                <StatCard
                    label="No asistencia"
                    value={percent(noShowRate, 1)}
                    hint={totalNoShow > 0 ? `${totalNoShow} de ${totalCompleted + totalNoShow}` : 'Sin no-shows'}
                    icon={IconAlertTriangle}
                />
                <StatCard
                    label="NPS"
                    value={npsStats.score !== null ? String(npsStats.score) : '—'}
                    hint={npsStats.count > 0 ? `${npsStats.count} respuesta${npsStats.count === 1 ? '' : 's'}` : 'Sin datos'}
                    icon={IconHeart}
                />
            </section>

            <SectionCard
                title="Ingresos mensuales"
                right={
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {monthly.length} meses
                    </span>
                }
            >
                {maxRevenue === 0 ? (
                    <div className="text-sm py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                        Aún no hay cobros registrados.
                    </div>
                ) : (
                    <div className="flex items-end gap-1.5 h-40 px-1">
                        {monthly.slice(-MAX_BARS).map((row) => {
                            const h = maxRevenue > 0 ? Math.max(2, Math.round((row.revenue / maxRevenue) * 100)) : 0;
                            return (
                                <div key={row.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                                    <div className="relative w-full flex-1 flex items-end">
                                        <div
                                            title={`${row.label}: ${fmtCLP(row.revenue)}`}
                                            className="w-full rounded-t-md transition-all"
                                            style={{
                                                height: `${h}%`,
                                                background: row.revenue > 0 ? 'var(--accent)' : 'var(--border)',
                                                opacity: row.revenue > 0 ? 1 : 0.4,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] truncate" style={{ color: 'var(--fg-muted)' }}>
                                        {row.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            <div className="grid md:grid-cols-2 gap-4">
                <SectionCard title="Servicios más solicitados">
                    {byService.length === 0 ? (
                        <div className="text-sm py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                            Sin datos todavía.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {byService.map((s) => {
                                const max = byService[0]?.count ?? 1;
                                const pct = max > 0 ? (s.count / max) * 100 : 0;
                                return (
                                    <li key={s.serviceId ?? s.serviceName} className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>{s.serviceName}</span>
                                                <span className="text-xs shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                                    {s.count} · {fmtCLP(s.revenue)}
                                                </span>
                                            </div>
                                            <div
                                                className="h-1.5 rounded-full overflow-hidden"
                                                style={{ background: 'var(--bg-subtle)' }}
                                            >
                                                <div
                                                    className="h-full"
                                                    style={{ width: `${pct}%`, background: 'var(--accent)' }}
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard title="Pacientes más frecuentes" right={<IconUsers size={14} style={{ color: 'var(--fg-muted)' }} />}>
                    {topClients.length === 0 ? (
                        <div className="text-sm py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                            Sin pacientes recurrentes.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {topClients.map((c, idx) => (
                                <li
                                    key={(c.clientId ?? '') + c.clientName + idx}
                                    className="flex items-center gap-3 py-1.5 border-b last:border-b-0"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    <span
                                        className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-semibold shrink-0"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--fg)' }}>{c.clientName}</span>
                                    <span className="text-xs shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                        {c.count} cita{c.count === 1 ? '' : 's'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>
            </div>

            <SectionCard title="Satisfacción (NPS)" right={<IconHeart size={14} style={{ color: 'var(--fg-muted)' }} />}>
                {npsStats.count === 0 ? (
                    <div className="text-sm py-6 text-center" style={{ color: 'var(--fg-muted)' }}>
                        Aún no hay respuestas. Envía la encuesta al completar una cita.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div
                                className="p-3 rounded-xl border"
                                style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
                            >
                                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Promotores</div>
                                <div className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>{npsStats.promoters}</div>
                            </div>
                            <div
                                className="p-3 rounded-xl border"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Pasivos</div>
                                <div className="text-lg font-semibold" style={{ color: '#d97706' }}>{npsStats.passives}</div>
                            </div>
                            <div
                                className="p-3 rounded-xl border"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Detractores</div>
                                <div className="text-lg font-semibold" style={{ color: '#dc2626' }}>{npsStats.detractors}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <span>Promedio: <strong style={{ color: 'var(--fg)' }}>{npsStats.avg !== null ? npsStats.avg.toFixed(1) : '—'}</strong>/10</span>
                            <span>Score NPS: <strong style={{ color: 'var(--fg)' }}>{npsStats.score !== null ? npsStats.score : '—'}</strong></span>
                        </div>

                        {lastComments.length > 0 ? (
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>
                                    Últimos comentarios
                                </div>
                                <ul className="space-y-2">
                                    {lastComments.map((r) => (
                                        <li
                                            key={r.id}
                                            className="flex items-start gap-3 p-3 rounded-xl border"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <span
                                                className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-semibold shrink-0"
                                                style={{
                                                    borderColor: 'var(--border)',
                                                    color: npsColor(r.score ?? 0),
                                                }}
                                            >
                                                {r.score ?? '—'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>
                                                        {r.clientName ?? 'Anónimo'}
                                                    </span>
                                                    {r.submittedAt ? (
                                                        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                                            · {fmtDateMedium(r.submittedAt)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                                    <IconMessage size={12} className="inline mr-1" style={{ color: 'var(--fg-muted)' }} />
                                                    {r.comment}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
