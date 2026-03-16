'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconEye, IconHeart, IconMessageCircle, IconTrendingUp } from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { fetchMyPanelListings, type PanelListing } from '@/lib/panel-listings';
import { PanelBlockHeader, PanelCard, PanelNotice, PanelPillNav, PanelStatCard } from '@simple/ui';

export default function EstadisticasPage() {
    const [items, setItems] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const result = await fetchMyPanelListings();
            setItems(result.items);
            setLoading(false);
        })();
    }, []);

    const totals = useMemo(() => {
        const views = items.reduce((sum, item) => sum + item.views, 0);
        const favs = items.reduce((sum, item) => sum + item.favs, 0);
        const leads = items.reduce((sum, item) => sum + item.leads, 0);
        const conversion = views > 0 ? `${((leads / views) * 100).toFixed(1)}%` : '0.0%';
        return { views, favs, leads, conversion };
    }, [items]);

    const topItems = useMemo(
        () => items.slice().sort((a, b) => b.views - a.views).slice(0, 5),
        [items]
    );

    const statusRows = useMemo(() => {
        const counts = new Map<string, number>();
        for (const item of items) {
            counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
        }
        return Array.from(counts.entries());
    }, [items]);

    const stats = [
        { label: 'Visitas totales', value: totals.views.toLocaleString('es-CL'), icon: <IconEye size={16} /> },
        { label: 'Favoritos', value: totals.favs.toLocaleString('es-CL'), icon: <IconHeart size={16} /> },
        { label: 'Contactos', value: totals.leads.toLocaleString('es-CL'), icon: <IconMessageCircle size={16} /> },
        { label: 'Conversión', value: totals.conversion, icon: <IconTrendingUp size={16} /> },
    ];

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader
                title="Estadísticas"
                description="Métricas reales de tus publicaciones"
                actions={
                    <PanelPillNav
                        items={['Actual'].map((period) => ({ key: period, label: period }))}
                        activeKey="Actual"
                        onChange={() => undefined}
                        showMobileDropdown={false}
                        breakpoint="sm"
                        size="sm"
                        ariaLabel="Rango de estadísticas"
                    />
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {stats.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PanelCard size="md">
                    <PanelBlockHeader title="Top publicaciones" className="mb-4" />
                    {loading ? (
                        <div className="h-28 rounded-[18px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    ) : topItems.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay publicaciones para medir.</PanelNotice>
                    ) : (
                        <div className="space-y-3">
                            {topItems.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="type-listing-title truncate" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {item.views.toLocaleString('es-CL')} visitas · {item.favs.toLocaleString('es-CL')} favs · {item.leads.toLocaleString('es-CL')} contactos
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                <PanelCard size="md">
                    <PanelBlockHeader title="Estado del inventario" className="mb-4" />
                    {loading ? (
                        <div className="h-28 rounded-[18px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    ) : statusRows.length === 0 ? (
                        <PanelNotice tone="neutral">No hay publicaciones para analizar estados.</PanelNotice>
                    ) : (
                        <div className="space-y-3">
                            {statusRows.map(([status, count]) => (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm capitalize" style={{ color: 'var(--fg-secondary)' }}>{status}</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{count}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${items.length > 0 ? (count / items.length) * 100 : 0}%`, background: 'var(--fg)', opacity: 0.7 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>
            </div>
        </div>
    );
}
