'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconArrowsSort, IconGridDots, IconList, IconChevronLeft, IconChevronRight, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import InlineResultAd from '@/components/ads/inline-result-ad';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import { ModernSelect } from '@simple/ui';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';
import VehicleFilters, { type VehicleType } from '@/components/listings/vehicle-filters';
import { fetchPublicListings, type PublicListing, type PublicListingSection, type PublicListingsFilters } from '@/lib/public-listings';
import { PanelCard, PanelNotice, PanelPageHeader, PanelSegmentedToggle } from '@simple/ui';

type ViewMode = 'grid' | 'list';

function extractPriceNumber(value: string): number {
    const normalized = value.replace(/[^\d]/g, '');
    return Number(normalized || '0');
}

function orderVehicleTags(tags: string[]): string[] {
    const allowedPatterns = [
        /auto|sedán|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /km|kilometraje|kilómetro/i,
        /bencina|diesel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i,
        /automático|automatico|manual|cvt|secuencial/i
    ];

    const ordered: string[] = [];

    for (const tag of tags) {
        const lower = tag.toLowerCase();
        for (let i = 0; i < allowedPatterns.length; i++) {
            if (allowedPatterns[i].test(lower)) {
                ordered[i] = tag;
                break;
            }
        }
    }

    return ordered.filter(Boolean).slice(0, 5);
}

function toCardData(item: PublicListing): VehicleListingCardData {
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: item.section === 'rent' ? 'Arriendo' : item.section === 'auction' ? 'Oferta actual' : 'Precio',
        subtitle: item.description,
        meta: orderVehicleTags(item.summary),
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
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window === 'undefined') return 'grid';
        const saved = window.localStorage.getItem('simpleautos:publicListings:viewMode');
        return saved === 'list' ? 'list' : 'grid';
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simpleautos:publicListings:viewMode', viewMode);
        }
    }, [viewMode]);
    const [filtersCollapsed, setFiltersCollapsed] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = window.localStorage.getItem('simpleautos:publicListings:filtersCollapsed');
        if (saved === '1') setFiltersCollapsed(true);
    }, []);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simpleautos:publicListings:filtersCollapsed', filtersCollapsed ? '1' : '0');
        }
    }, [filtersCollapsed]);
    const [sortOrder, setSortOrder] = useState('recent');
    const [items, setItems] = useState<PublicListing[]>([]);

    useEffect(() => {
        setLoading(true);
        void (async () => {
            const filters: PublicListingsFilters = {
                q: searchParams.get('q') || undefined,
                region: searchParams.get('region') || undefined,
                commune: searchParams.get('commune') || undefined,
                price_from: searchParams.get('price_from') || undefined,
                price_to: searchParams.get('price_to') || undefined,
                brand: searchParams.get('brand') || undefined,
                model: searchParams.get('model') || undefined,
                year_from: searchParams.get('year_from') || undefined,
                year_to: searchParams.get('year_to') || undefined,
                fuel: searchParams.get('fuel') || undefined,
                vehicle_type: searchParams.get('vehicle_type') || undefined,
                motorcycle_type: searchParams.get('motorcycle_type') || undefined,
                truck_type: searchParams.get('truck_type') || undefined,
                truck_body_type: searchParams.get('truck_body_type') || undefined,
                bus_type: searchParams.get('bus_type') || undefined,
                machinery_type: searchParams.get('machinery_type') || undefined,
                nautical_type: searchParams.get('nautical_type') || undefined,
                aerial_type: searchParams.get('aerial_type') || undefined,
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

    const currentVehicleType = (searchParams.get('vehicle_type') || '') as VehicleType | '';

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

            <div className="flex flex-col lg:flex-row gap-4 items-start">
                {/* Desktop sidebar - collapsible like panel sidebar */}
                <aside className={`hidden lg:block shrink-0 transition-[width] duration-200 ${filtersCollapsed ? 'w-14' : 'w-72'}`}>
                    <div
                        className="sticky top-4 rounded-2xl border p-3 flex flex-col"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        <div className={`mb-3 flex ${filtersCollapsed ? 'justify-center' : 'justify-end'}`}>
                            <button
                                onClick={() => setFiltersCollapsed((prev) => !prev)}
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                aria-label={filtersCollapsed ? 'Expandir filtros' : 'Contraer filtros'}
                            >
                                {filtersCollapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
                            </button>
                        </div>

                        {filtersCollapsed ? (
                            <button
                                type="button"
                                onClick={() => setFiltersCollapsed(false)}
                                className="w-8 h-8 mx-auto rounded-[10px] flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                aria-label="Mostrar filtros"
                                title="Filtros"
                            >
                                <IconAdjustmentsHorizontal size={15} />
                            </button>
                        ) : (
                            <VehicleFilters currentVehicleType={currentVehicleType} />
                        )}
                    </div>
                </aside>

                {/* Mobile filters - stack on top */}
                <div className="lg:hidden w-full mb-4">
                    <div
                        className="rounded-2xl border p-3"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                        }}
                    >
                        <VehicleFilters currentVehicleType={currentVehicleType} />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {loading ? (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
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
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
                            {cards.map((item) => (
                                <VehicleListingCard key={item.id} data={item} mode={viewMode} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
