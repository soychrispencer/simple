'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconArrowsSort, IconGridDots, IconList, IconPlayerPlay, IconChevronDown, IconChevronLeft, IconChevronRight, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import InlineResultAd from '@/components/ads/inline-result-ad';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import { ModernSelect } from '@simple/ui/forms';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';
import VehicleFilters, { type VehicleType } from '@/components/listings/vehicle-filters';
import { fetchPublicListings, type PublicListing, type PublicListingSection, type PublicListingsFilters } from '@/lib/public-listings';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import { orderVehicleCardTags } from '@simple/ui/listings';
import { PanelCard } from '@simple/ui/panel';
import { PanelNotice, PanelPageHeader, PanelSegmentedToggle } from '@simple/ui/panel';

type ViewMode = 'feed' | 'grid' | 'list';
type FeedSection = PublicListingSection | 'all';

const FEED_SECTIONS: Array<{ value: FeedSection; label: string }> = [
    { value: 'all', label: 'Todo' },
    { value: 'sale', label: 'Venta' },
    { value: 'rent', label: 'Arriendo' },
    { value: 'auction', label: 'Subasta' },
];

function parseFeedSection(value: string | null): FeedSection | null {
    if (value === 'sale' || value === 'rent' || value === 'auction') return value;
    if (value === 'all') return 'all';
    return null;
}

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
        priceOriginal: item.priceOriginal ?? undefined,
        discountPercent: item.discountPercent ?? undefined,
        priceLabel: item.section === 'rent' ? 'Arriendo' : item.section === 'auction' ? 'Oferta actual' : 'Precio',
        subtitle: item.description,
        meta: orderVehicleCardTags(item.summary),
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimpleAutos',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerAvatarUrl: resolveListingSellerAvatarUrl(item.seller),
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        videoUrl: item.videoUrl ?? undefined,
        videoThumbnail: item.images[0],
        condition: item.condition ?? undefined,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

function PublicVehicleListingPageContent(props: {
    section?: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    integratedFeed?: boolean;
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialFeedSection = parseFeedSection(searchParams.get('section'));
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (props.integratedFeed) return 'feed';
        if (typeof window === 'undefined') return 'grid';
        const saved = window.localStorage.getItem('simpleautos:publicListings:viewMode');
        return saved === 'list' ? 'list' : 'grid';
    });
    const [feedSection, setFeedSection] = useState<FeedSection>(initialFeedSection ?? 'all');
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
    const activeSection = props.integratedFeed
        ? feedSection === 'all' ? undefined : feedSection
        : props.section;

    useEffect(() => {
        if (!props.integratedFeed) return;
        setFeedSection(parseFeedSection(searchParams.get('section')) ?? 'all');
    }, [props.integratedFeed, searchParams]);

    const selectFeedSection = (section: FeedSection) => {
        setFeedSection(section);
        const params = new URLSearchParams(searchParams.toString());
        if (section === 'all') params.delete('section');
        else params.set('section', section);
        const query = params.toString();
        router.replace(query ? `/ventas?${query}` : '/ventas', { scroll: false });
    };

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
            const nextItems = await fetchPublicListings(activeSection, filters);
            setItems(nextItems);
            setLoading(false);
        })();
    }, [activeSection, searchParams]);

    const sortedItems = useMemo(() => {
        const next = [...items];
        if (sortOrder === 'price_asc') return next.sort((a, b) => extractPriceNumber(a.price) - extractPriceNumber(b.price));
        if (sortOrder === 'price_desc') return next.sort((a, b) => extractPriceNumber(b.price) - extractPriceNumber(a.price));
        if (sortOrder === 'views') return next.sort((a, b) => b.views - a.views);
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [items, sortOrder]);

    const cards = useMemo(() => sortedItems.map((item) => toCardData(item)), [sortedItems]);

    const currentVehicleType = (searchParams.get('vehicle_type') || '') as VehicleType | '';
    const isFeedLayout = props.integratedFeed && viewMode === 'feed';
    const headerActions = (
        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-[156px] sm:flex-none">
                {isFeedLayout ? (
                    <label className="relative block">
                        <span className="sr-only">Ordenar vehículos</span>
                        <select
                            value={sortOrder}
                            onChange={(event) => setSortOrder(event.target.value)}
                            className="form-input h-9 w-full appearance-none pl-9 pr-8 text-sm"
                            aria-label="Ordenar vehículos"
                        >
                            <option value="recent">Recientes</option>
                            <option value="views">Más vistas</option>
                            <option value="price_asc">Menor precio</option>
                            <option value="price_desc">Mayor precio</option>
                        </select>
                        <IconArrowsSort className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--fg-muted)' }} />
                        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--fg-muted)' }} />
                    </label>
                ) : (
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
                        triggerClassName="h-9 w-full text-sm"
                    />
                )}
            </div>
            <PanelSegmentedToggle
                className="inline-flex shrink-0"
                size="sm"
                iconOnly
                items={[
                    ...(props.integratedFeed ? [{ key: 'feed', label: 'Feed', icon: <IconPlayerPlay size={13} />, ariaLabel: 'Feed de publicaciones' }] : []),
                    { key: 'grid', label: 'Tarjetas', icon: <IconGridDots size={13} />, ariaLabel: 'Vista vertical' },
                    { key: 'list', label: 'Lista', icon: <IconList size={13} />, ariaLabel: 'Vista horizontal' },
                ]}
                activeKey={viewMode}
                onChange={(key) => setViewMode(key as ViewMode)}
            />
        </div>
    );

    return (
        <div className={props.integratedFeed ? 'container-app py-6 pb-24 md:pb-6' : 'container-app py-6'}>
            {isFeedLayout ? (
                <div className="mx-auto mb-5 w-full max-w-[430px] md:max-w-none">
                    <PublicBreadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: props.breadcrumbLabel }]} />
                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{props.title}</h1>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                {loading ? 'Cargando publicaciones...' : `${cards.length.toLocaleString('es-CL')} resultados reales`}
                            </p>
                        </div>
                        {headerActions}
                    </div>
                </div>
            ) : (
                <>
                    <PublicBreadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: props.breadcrumbLabel }]} />
                    <PanelPageHeader
                        title={props.title}
                        description={loading ? 'Cargando publicaciones...' : `${cards.length.toLocaleString('es-CL')} resultados reales`}
                        actions={headerActions}
                    />
                </>
            )}

            {props.integratedFeed ? (
                <div
                    className={isFeedLayout
                        ? 'mx-auto mb-4 flex w-full max-w-[430px] min-w-0 gap-2 overflow-x-auto pb-1 md:mx-0 md:max-w-none'
                        : 'mb-5 flex min-w-0 gap-2 overflow-x-auto pb-1'}
                    role="group"
                    aria-label="Filtrar publicaciones por tipo"
                >
                    {FEED_SECTIONS.map((option) => {
                        const selected = feedSection === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectFeedSection(option.value)}
                                className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                                style={selected
                                    ? { borderColor: 'var(--fg)', background: 'var(--fg)', color: 'var(--bg)' }
                                    : { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)' }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {isFeedLayout ? (
                <div className="mx-auto mb-5 w-full max-w-[430px] md:mx-0">
                    <VehicleFilters currentVehicleType={currentVehicleType} alwaysShowSearch collapsible />
                </div>
            ) : null}

            {viewMode !== 'feed' ? (
                <InlineResultAd
                    section={activeSection === 'auction' ? 'subastas' : activeSection === 'rent' ? 'arriendos' : 'ventas'}
                    className="mb-5"
                />
            ) : null}

            <div className={isFeedLayout ? 'w-full' : 'flex flex-col lg:flex-row gap-4 items-stretch lg:items-start'}>
                {/* Desktop sidebar - collapsible like panel sidebar */}
                {viewMode !== 'feed' ? (
                    <aside className={`hidden lg:block shrink-0 transition-[width] duration-200 ${filtersCollapsed ? 'w-14' : 'w-72'}`}>
                        <div
                            className="sticky top-4 rounded-card border p-3 flex flex-col border-(--border) bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] shadow-md"
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
                                <VehicleFilters currentVehicleType={currentVehicleType} alwaysShowSearch={props.integratedFeed} />
                            )}
                        </div>
                    </aside>
                ) : null}

                {/* Mobile filters - stack on top */}
                {viewMode !== 'feed' ? (
                    <div className="lg:hidden w-full mb-4">
                        <div
                            className="rounded-card border p-3 border-(--border) bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]"
                        >
                            <VehicleFilters currentVehicleType={currentVehicleType} alwaysShowSearch={props.integratedFeed} />
                        </div>
                    </div>
                ) : null}

                <div className="w-full min-w-0 flex-1">
                    {loading ? null : cards.length === 0 ? (
                        <div className={isFeedLayout ? 'mx-auto w-full max-w-[430px] md:max-w-[800px]' : undefined}>
                            <PanelCard size="lg">
                                <PanelNotice tone="neutral">
                                    Aún no hay publicaciones en esta sección. Crea una desde el panel para verla aquí.
                                </PanelNotice>
                            </PanelCard>
                        </div>
                    ) : (
                        <div className={viewMode === 'feed'
                            ? 'mx-auto grid w-full grid-cols-1 gap-6 pb-8 md:grid-cols-2 xl:grid-cols-3 2xl:max-w-[1600px]'
                            : viewMode === 'grid'
                                ? 'listings-grid grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                : 'w-full space-y-3'}>
                            {cards.map((item) => (
                                <div
                                    key={item.id}
                                    className={viewMode === 'feed' ? 'mx-auto w-full max-w-[430px] md:max-w-none' : 'w-full min-w-0'}
                                >
                                    <VehicleListingCard data={item} mode={viewMode} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PublicVehicleListingPage(props: {
    section?: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    integratedFeed?: boolean;
}) {
    return (
        <Suspense fallback={null}>
            <PublicVehicleListingPageContent {...props} />
        </Suspense>
    );
}
