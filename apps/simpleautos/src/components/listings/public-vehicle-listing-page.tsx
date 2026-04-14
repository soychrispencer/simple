'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconArrowsSort, IconGridDots, IconList } from '@tabler/icons-react';
import InlineResultAd from '@/components/ads/inline-result-ad';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import ModernSelect from '@/components/ui/modern-select';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';
import { fetchPublicListings, type PublicListing, type PublicListingSection, type PublicListingsFilters } from '@/lib/public-listings';
import { PanelCard, PanelNotice, PanelPageHeader, PanelSegmentedToggle } from '@simple/ui';

type ViewMode = 'grid' | 'list';

function extractPriceNumber(value: string): number {
    const normalized = value.replace(/[^\d]/g, '');
    return Number(normalized || '0');
}

function toCardData(item: PublicListing): VehicleListingCardData {
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: item.section === 'rent' ? 'Arriendo' : item.section === 'auction' ? 'Oferta actual' : 'Precio',
        subtitle: item.description,
        meta: item.summary,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimpleAutos',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
        ctaLabel: item.section === 'rent' ? 'Ver disponibilidad' : item.section === 'auction' ? 'Ver subasta' : 'Ver detalle',
    };
}

function PublicVehicleListingPageContent(props: {
    section: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    description: string;
}) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortOrder, setSortOrder] = useState('recent');
    const [items, setItems] = useState<PublicListing[]>([]);

    useEffect(() => {
        setLoading(true);
        void (async () => {
            const filters: PublicListingsFilters = {
                q: searchParams.get('q') || undefined,
                region: searchParams.get('region') || undefined,
                price: searchParams.get('price') || undefined,
                brand: searchParams.get('brand') || undefined,
                year_from: searchParams.get('year_from') || undefined,
                year_to: searchParams.get('year_to') || undefined,
                fuel: searchParams.get('fuel') || undefined,
                transmission: searchParams.get('transmission') || undefined,
            };
            const nextItems = await fetchPublicListings(props.section, filters);
            setItems(nextItems);
            setLoading(false);
        })();
    }, [props.section, searchParams]);

    const sortedItems = useMemo(() => {
        const next = [...items];
        if (sortOrder === 'price_asc') return next.sort((a, b) => extractPriceNumber(a.price) - extractPriceNumber(b.price));
        if (sortOrder === 'price_desc') return next.sort((a, b) => extractPriceNumber(b.price) - extractPriceNumber(a.price));
        if (sortOrder === 'views') return next.sort((a, b) => b.views - a.views);
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [items, sortOrder]);

    const cards = useMemo(() => sortedItems.map((item) => toCardData(item)), [sortedItems]);

    return (
        <div className="container-app py-6">
            <PublicBreadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: props.breadcrumbLabel }]} />

            <PanelPageHeader
                title={props.title}
                description={loading ? 'Cargando publicaciones...' : `${cards.length.toLocaleString('es-CL')} resultados reales`}
                actions={(
                    <div className="flex shrink-0 items-center justify-end gap-2 flex-nowrap">
                        <ModernSelect
                            value={sortOrder}
                            onChange={setSortOrder}
                            options={[
                                { value: 'recent', label: 'Recientes' },
                                { value: 'views', label: 'Más vistas' },
                                { value: 'price_asc', label: 'Menor precio' },
                                { value: 'price_desc', label: 'Mayor precio' },
                            ]}
                            leadingIcon={<IconArrowsSort size={14} />}
                            ariaLabel="Ordenar vehículos"
                            triggerClassName="h-9 min-w-[156px] shrink-0 text-sm"
                        />
                        <PanelSegmentedToggle
                            className="hidden shrink-0 sm:inline-flex"
                            size="sm"
                            iconOnly
                            items={[
                                { key: 'grid', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista vertical' },
                                { key: 'list', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista horizontal' },
                            ]}
                            activeKey={viewMode}
                            onChange={(key) => setViewMode(key as ViewMode)}
                        />
                    </div>
                )}
            />

            <p className="mb-5 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                {props.description}
            </p>

            <InlineResultAd section={props.section === 'auction' ? 'subastas' : props.section === 'rent' ? 'arriendos' : 'ventas'} className="mb-5" />

            {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-72 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    ))}
                </div>
            ) : cards.length === 0 ? (
                <PanelCard size="lg">
                    <PanelNotice tone="neutral">
                        Aún no hay publicaciones en esta sección. Crea una desde el panel para verla aquí.
                    </PanelNotice>
                </PanelCard>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                    {cards.map((item) => (
                        <VehicleListingCard key={item.id} data={item} mode={viewMode} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PublicVehicleListingPage(props: {
    section: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    description: string;
}) {
    return (
        <Suspense fallback={
            <div className="container-app py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-72 rounded-xl animate-pulse" style={{ background: 'var(--bg-muted)' }} />
                    ))}
                </div>
            </div>
        }>
            <PublicVehicleListingPageContent {...props} />
        </Suspense>
    );
}
