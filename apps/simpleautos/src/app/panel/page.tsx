'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { IconCar, IconChevronRight } from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { fetchMyPanelListings, type PanelListing } from '@/lib/panel-listings';
import { PanelBlockHeader, PanelButton, PanelCard, PanelList, PanelListRow, PanelNotice, PanelStatCard } from '@simple/ui';

function formatAgo(updatedAt: number): string {
    const diffMs = Date.now() - updatedAt;
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${Math.floor(diffHours / 24)}d`;
}

export default function DashboardPage() {
    const [items, setItems] = useState<PanelListing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const result = await fetchMyPanelListings();
            setItems(result.items);
            setLoading(false);
        })();
    }, []);

    const activeItems = useMemo(
        () => items.filter((item) => item.status === 'active' || item.status === 'paused').sort((a, b) => b.updatedAt - a.updatedAt),
        [items]
    );

    const stats = useMemo(() => {
        const totalViews = items.reduce((sum, item) => sum + item.views, 0);
        const totalFavs = items.reduce((sum, item) => sum + item.favs, 0);
        const totalLeads = items.reduce((sum, item) => sum + item.leads, 0);
        return [
            { label: 'Publicaciones', value: String(items.length), sub: `${activeItems.length} activas o pausadas` },
            { label: 'Visitas', value: totalViews.toLocaleString('es-CL'), sub: 'Datos reales del panel' },
            { label: 'Favoritos', value: totalFavs.toLocaleString('es-CL'), sub: 'Guardados acumulados' },
            { label: 'Contactos', value: totalLeads.toLocaleString('es-CL'), sub: 'Leads acumulados' },
        ];
    }, [activeItems.length, items]);

    return (
        <div className="container-app panel-page py-8">
            <PanelSectionHeader title="Dashboard" description="Resumen real de tu actividad" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} meta={item.sub} />
                ))}
            </div>

            <PanelCard className="mb-4" size="md">
                <PanelBlockHeader
                    title="Publicaciones activas"
                    actions={(
                        <Link href="/panel/publicaciones" className="text-sm flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                            Ver todas
                            <IconChevronRight size={11} />
                        </Link>
                    )}
                />
                {loading ? (
                    <div className="h-28 rounded-[18px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : activeItems.length === 0 ? (
                    <div className="space-y-3">
                        <PanelNotice tone="neutral">Aún no tienes publicaciones activas.</PanelNotice>
                        <Link href="/panel/publicar">
                            <PanelButton type="button" className="w-full">Publicar mi primer vehículo</PanelButton>
                        </Link>
                    </div>
                ) : (
                    <PanelList className="border-0 rounded-[18px]">
                        {activeItems.slice(0, 5).map((item, index) => (
                            <PanelListRow key={item.id} divider={index > 0} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-12 h-9 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--fg-faint)' }}>
                                    <IconCar size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="type-listing-title line-clamp-1" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                    <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        {item.price} · {item.views.toLocaleString('es-CL')} visitas · {item.leads.toLocaleString('es-CL')} contactos
                                    </div>
                                </div>
                                <IconChevronRight size={13} style={{ color: 'var(--fg-faint)' }} />
                            </PanelListRow>
                        ))}
                    </PanelList>
                )}
            </PanelCard>

            <PanelCard size="md">
                <PanelBlockHeader title="Actividad reciente" />
                {loading ? (
                    <div className="h-24 rounded-[18px] animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                ) : items.length === 0 ? (
                    <div className="space-y-3">
                        <PanelNotice tone="neutral">Cuando publiques avisos aquí verás su actividad reciente.</PanelNotice>
                        <Link href="/panel/publicar">
                            <PanelButton type="button" variant="secondary" className="w-full">Crear publicación</PanelButton>
                        </Link>
                    </div>
                ) : (
                    <PanelList className="border-0 rounded-[18px]">
                        {items
                            .slice()
                            .sort((a, b) => b.updatedAt - a.updatedAt)
                            .slice(0, 4)
                            .map((item, index) => (
                                <PanelListRow key={item.id} divider={index > 0} className="flex items-start gap-3 px-4 py-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--fg-muted)' }} />
                                    <div>
                                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            {item.title} quedó con estado <strong>{item.status}</strong>.
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{formatAgo(item.updatedAt)}</p>
                                    </div>
                                </PanelListRow>
                            ))}
                    </PanelList>
                )}
            </PanelCard>
        </div>
    );
}
