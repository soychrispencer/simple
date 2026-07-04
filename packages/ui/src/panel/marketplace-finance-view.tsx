'use client';

import { useEffect, useState } from 'react';
import {
    IconBuildingStore,
    IconEye,
    IconHeart,
    IconLoader2,
    IconMessageCircle,
    IconTrendingUp,
} from '@tabler/icons-react';
import {
    FinanceSummaryCards,
    FinancePeriodFilter,
    FinanceBarChart,
    PanelCard,
    PanelNotice,
    type FinanceSummaryCard,
    type BarChartData,
    type PeriodOption,
} from '@simple/ui/panel';
import { fetchMarketplaceOperatorAnalytics, type MarketplaceOperatorAnalytics } from '@simple/utils';

const PERIOD_OPTIONS: PeriodOption[] = [
    { key: 'month', label: 'Este mes' },
    { key: '30d', label: '30 días' },
    { key: '90d', label: '90 días' },
];

const TITLES: Record<string, { title: string; description: string }> = {
    autos: {
        title: 'Finanzas',
        description: 'Resumen de publicaciones, visitas y contactos de tus avisos.',
    },
    propiedades: {
        title: 'Finanzas',
        description: 'Resumen de publicaciones, visitas y contactos de tus propiedades.',
    },
};

export function MarketplaceFinanceView({ vertical }: { vertical: 'autos' | 'propiedades' }) {
    const [analytics, setAnalytics] = useState<MarketplaceOperatorAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        void (async () => {
            const data = await fetchMarketplaceOperatorAnalytics(vertical);
            setAnalytics(data);
            setLoading(false);
        })();
    }, [vertical]);

    const copy = TITLES[vertical] ?? TITLES.autos;

    if (loading) {
        return (
            <div className="container-app panel-page py-4 lg:py-8">
                <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{copy.title}</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{copy.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={14} className="animate-spin" /> Cargando datos...
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="container-app panel-page py-4 lg:py-8">
                <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{copy.title}</h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{copy.description}</p>
                    </div>
                </div>
                <PanelNotice tone="neutral">
                    No pudimos cargar los datos. Intenta recargar la página.
                </PanelNotice>
            </div>
        );
    }

    const { summary, bySection } = analytics;
    const hasData = summary.totalListings > 0 || summary.views > 0;

    const cards: FinanceSummaryCard[] = [
        {
            label: 'Publicaciones',
            value: summary.totalListings.toString(),
            icon: <IconBuildingStore size={14} />,
        },
        {
            label: 'Visitas',
            value: summary.views.toLocaleString('es-CL'),
            icon: <IconEye size={14} />,
        },
        {
            label: 'Favoritos',
            value: summary.favorites.toLocaleString('es-CL'),
            icon: <IconHeart size={14} />,
        },
        {
            label: 'Contactos',
            value: summary.leads.toLocaleString('es-CL'),
            icon: <IconMessageCircle size={14} />,
            tone: summary.leads > 0 ? 'success' : undefined,
        },
    ];

    const sectionData: BarChartData[] = bySection.map((s) => ({
        label: s.label,
        value: s.views,
    }));

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6 flex-wrap">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{copy.title}</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{copy.description}</p>
                </div>
            </div>

            <div className="grid gap-5">
                <FinancePeriodFilter
                    options={PERIOD_OPTIONS}
                    value={period}
                    onChange={setPeriod}
                />

                <FinanceSummaryCards cards={cards} />

                {!hasData ? (
                    <PanelCard size="lg" className="flex flex-col items-center gap-3 text-center py-10">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <IconTrendingUp size={22} />
                        </div>
                        <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                            Sin datos aún
                        </p>
                        <p className="text-sm max-w-md" style={{ color: 'var(--fg-muted)' }}>
                            Cuando tengas publicaciones activas con visitas y contactos, verás tus estadísticas aquí.
                        </p>
                    </PanelCard>
                ) : sectionData.length > 0 ? (
                    <PanelCard size="md">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Visitas por sección</h3>
                        <FinanceBarChart data={sectionData} />
                    </PanelCard>
                ) : null}
            </div>
        </div>
    );
}
