'use client';

import Link from 'next/link';
import { IconEye, IconHeart, IconMessageCircle, IconTrendingUp, IconUser, IconUsers } from '@tabler/icons-react';
import type { MarketplaceOperatorAnalytics } from '@simple/utils';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelStatCard } from './panel-display.js';

export type MarketplaceOperatorAnalyticsViewProps = {
    analytics: MarketplaceOperatorAnalytics | null;
    loading?: boolean;
    miNegocioHref?: string;
};

export function MarketplaceOperatorAnalyticsView({
    analytics,
    loading = false,
    miNegocioHref = '/panel/mi-negocio',
}: MarketplaceOperatorAnalyticsViewProps) {
    if (loading) return null;

    if (!analytics) {
        return (
            <PanelNotice tone="neutral">
                No pudimos cargar las estadísticas de tu operación. Intenta recargar la página.
            </PanelNotice>
        );
    }

    const { operator, summary, bySection, byStatus, topListings } = analytics;
    const conversionLabel = summary.conversionRate != null ? `${summary.conversionRate}%` : '0%';

    const stats = [
        { label: 'Visitas', value: summary.views.toLocaleString('es-CL'), icon: <IconEye size={16} /> },
        { label: 'Favoritos', value: summary.favorites.toLocaleString('es-CL'), icon: <IconHeart size={16} /> },
        { label: 'Contactos', value: summary.leads.toLocaleString('es-CL'), icon: <IconMessageCircle size={16} /> },
        { label: 'Conversión', value: conversionLabel, icon: <IconTrendingUp size={16} /> },
    ];

    return (
        <div className="grid gap-6">
            <PanelCard size="md">
                <PanelBlockHeader
                    title="Tu operación"
                    description="Métricas agregadas según tu perfil y publicaciones."
                    className="mb-4"
                />
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                        >
                            <IconUser size={18} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                                {operator.displayName}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {operator.operatorLabel}
                                {operator.isPublished ? ' · Perfil público activo' : ' · Perfil en borrador'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full px-2.5 py-1" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                            {summary.activeListings} activas · {summary.totalListings} total
                        </span>
                        {operator.followers > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                <IconUsers size={14} />
                                {operator.followers} seguidores
                            </span>
                        ) : null}
                        {operator.operationTags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full px-2.5 py-1" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                {!operator.isPublished ? (
                    <PanelNotice tone="info" className="mt-4">
                        Activa tu perfil público en{' '}
                        <Link href={miNegocioHref} className="underline" style={{ color: 'inherit' }}>
                            Mi negocio
                        </Link>{' '}
                        para que los visitantes te conozcan además de tus avisos.
                    </PanelNotice>
                ) : null}
            </PanelCard>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((item) => (
                    <PanelStatCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PanelCard size="md">
                    <PanelBlockHeader title="Top publicaciones" className="mb-4" />
                    {topListings.length === 0 ? (
                        <PanelNotice tone="neutral">Todavía no hay publicaciones para medir.</PanelNotice>
                    ) : (
                        <div className="space-y-3">
                            {topListings.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                    >
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="type-listing-title truncate" style={{ color: 'var(--fg)' }}>
                                            {item.title}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {item.sectionLabel} · {item.views.toLocaleString('es-CL')} visitas · {item.favorites.toLocaleString('es-CL')} favs · {item.leads.toLocaleString('es-CL')} contactos
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                <PanelCard size="md">
                    <PanelBlockHeader title="Por tipo de aviso" className="mb-4" />
                    {bySection.length === 0 ? (
                        <PanelNotice tone="neutral">Publica avisos para ver desglose por operación.</PanelNotice>
                    ) : (
                        <div className="space-y-3">
                            {bySection.map((row) => (
                                <div key={row.section}>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            {row.label} ({row.count})
                                        </span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            {row.views.toLocaleString('es-CL')} visitas
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${summary.views > 0 ? (row.views / summary.views) * 100 : 0}%`,
                                                background: 'var(--fg)',
                                                opacity: 0.7,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>
            </div>

            <PanelCard size="md">
                <PanelBlockHeader title="Estado del inventario" className="mb-4" />
                {byStatus.length === 0 ? (
                    <PanelNotice tone="neutral">No hay publicaciones para analizar estados.</PanelNotice>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {byStatus.map((row) => (
                            <div key={row.status}>
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{row.label}</span>
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{row.count}</span>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-muted)' }}>
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${summary.totalListings > 0 ? (row.count / summary.totalListings) * 100 : 0}%`,
                                            background: 'var(--fg)',
                                            opacity: 0.7,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
