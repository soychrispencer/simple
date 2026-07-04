'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconCheck,
    IconLoader2,
    IconMusic,
    IconStar,
    IconTrendingUp,
    IconUsers,
} from '@tabler/icons-react';
import {
    FinanceSummaryCards,
    FinanceBarChart,
    PanelCard,
    type FinanceSummaryCard,
    type BarChartData,
} from '@simple/ui/panel';
import { serenatasApi, type Serenata } from '@/lib/serenatas-api';
import { money } from '@/components/panel/shared';

export function EstadisticasView() {
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const response = await serenatasApi.serenatas();
            setSerenatas(response.ok ? response.items : []);
            setLoading(false);
        })();
    }, []);

    const stats = useMemo(() => {
        const completed = serenatas.filter((s) => s.status === 'completed');
        const totalRevenue = completed.reduce((sum, s) => sum + (s.price ?? 0), 0);
        const ratings = completed.filter((s) => s.clientRating != null);
        const avgRating = ratings.length > 0
            ? ratings.reduce((sum, s) => sum + (s.clientRating ?? 0), 0) / ratings.length
            : 0;

        const byMonth: Record<string, { count: number; revenue: number }> = {};
        for (const s of completed) {
            const month = s.eventDate.slice(0, 7);
            if (!byMonth[month]) byMonth[month] = { count: 0, revenue: 0 };
            byMonth[month].count++;
            byMonth[month].revenue += s.price ?? 0;
        }

        const monthlyData: BarChartData[] = Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, data]) => ({
                label: new Date(month + '-01').toLocaleDateString('es-CL', { month: 'short' }),
                value: data.revenue,
            }));

        const bySource = {
            own: serenatas.filter((s) => s.source === 'own_lead').length,
            platform: serenatas.filter((s) => s.source === 'platform_lead').length,
        };

        return { completed, totalRevenue, avgRating, monthlyData, bySource };
    }, [serenatas]);

    const hasData = stats.completed.length > 0 || serenatas.length > 0;

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={14} className="animate-spin" /> Cargando estadísticas...
            </div>
        );
    }

    const cards: FinanceSummaryCard[] = [
        {
            label: 'Serenatas',
            value: stats.completed.length.toString(),
            icon: <IconCheck size={14} />,
        },
        {
            label: 'Ingresos',
            value: money(stats.totalRevenue),
            icon: <IconTrendingUp size={14} />,
            tone: 'success',
        },
        {
            label: 'Calificación',
            value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',
            icon: <IconStar size={14} />,
            hint: stats.completed.length > 0 ? `${stats.completed.length} completadas` : undefined,
        },
        {
            label: 'Solicitudes',
            value: serenatas.length.toString(),
            icon: <IconUsers size={14} />,
        },
    ];

    return (
        <div className="grid gap-5">
            <FinanceSummaryCards cards={cards} />

            {!hasData ? (
                <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center py-10">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <IconMusic size={22} />
                    </div>
                    <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                        Sin serenatas aún
                    </p>
                    <p className="text-sm max-w-md" style={{ color: 'var(--fg-muted)' }}>
                        Cuando completes tus primeras serenatas, verás tus estadísticas de ingresos, calificaciones y más aquí.
                    </p>
                </PanelCard>
            ) : (
                <>
                    {stats.monthlyData.length > 0 ? (
                        <PanelCard size="md">
                            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Ingresos mensuales</h3>
                            <FinanceBarChart
                                data={stats.monthlyData}
                                formatValue={(v) => money(v)}
                            />
                        </PanelCard>
                    ) : null}

                    <PanelCard size="md">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Por origen</h3>
                        <FinanceBarChart
                            data={[
                                { label: 'Propias', value: stats.bySource.own },
                                { label: 'Plataforma', value: stats.bySource.platform },
                            ]}
                        />
                    </PanelCard>
                </>
            )}
        </div>
    );
}
