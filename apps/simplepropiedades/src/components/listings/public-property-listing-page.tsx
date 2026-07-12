'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { IconArrowsSort, IconGridDots, IconList, IconChevronLeft, IconChevronRight, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import InlineResultAd from '@/components/ads/inline-result-ad';
import { PublicBreadcrumbs } from '@/components/layout/public-breadcrumbs';
import { ModernSelect } from '@simple/ui/forms';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';
import PropertyFilters from '@/components/listings/property-filters';
import { fetchPublicListings, type PublicListing, type PublicListingSection } from '@/lib/public-listings';
import { parsePropertyListingSearchParams } from '@/lib/property-search-params';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import { orderPropertyCardTags } from '@simple/ui/listings';
import { PanelCard } from '@simple/ui/panel';
import { PanelNotice, PanelPageHeader, PanelSegmentedToggle } from '@simple/ui/panel';

type ViewMode = 'grid' | 'list';

function extractPriceNumber(value: string): number {
    const normalized = value.replace(/[^\d]/g, '');
    return Number(normalized || '0');
}

function toCardData(item: PublicListing): PropertyListingCardData {
    const meta = orderPropertyCardTags(item.summary);
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceOriginal: item.priceOriginal ?? undefined,
        discountPercent: item.discountPercent ?? undefined,
        priceLabel: item.section === 'project' ? 'Proyecto' : item.section === 'rent' ? 'Arriendo' : 'Precio',
        subtitle: item.description,
        meta,
        highlights: item.summary,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimplePropiedades',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerAvatarUrl: resolveListingSellerAvatarUrl(item.seller),
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        videoUrl: item.videoUrl ?? undefined,
        videoThumbnail: item.images[0],
        projectStatus: item.section === 'project' ? item.summary[3] : undefined,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

function PublicPropertyListingPageContent(props: {
    section: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    description: string;
}) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window === 'undefined') return 'grid';
        const saved = window.localStorage.getItem('simplepropiedades:publicListings:viewMode');
        return saved === 'list' ? 'list' : 'grid';
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simplepropiedades:publicListings:viewMode', viewMode);
        }
    }, [viewMode]);
    const [filtersCollapsed, setFiltersCollapsed] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = window.localStorage.getItem('simplepropiedades:publicListings:filtersCollapsed');
        if (saved === '1') setFiltersCollapsed(true);
    }, []);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simplepropiedades:publicListings:filtersCollapsed', filtersCollapsed ? '1' : '0');
        }
    }, [filtersCollapsed]);
    const [sortOrder, setSortOrder] = useState('recent');
    const [items, setItems] = useState<PublicListing[]>([]);

    useEffect(() => {
        setLoading(true);
        void (async () => {
            const filters = parsePropertyListingSearchParams(searchParams);
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
                    <div className="flex w-full min-w-0 flex-nowrap items-center justify-end gap-2 sm:w-auto">
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
                            ariaLabel="Ordenar propiedades"
                            triggerClassName="h-9 min-w-0 flex-1 text-sm sm:w-auto sm:min-w-[156px] sm:flex-none"
                        />
                        <PanelSegmentedToggle
                            className="inline-flex shrink-0"
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

            <InlineResultAd section={props.section === 'project' ? 'proyectos' : props.section === 'rent' ? 'arriendos' : 'ventas'} className="mb-5" />

            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
                <aside className={`hidden lg:block shrink-0 transition-[width] duration-200 ${filtersCollapsed ? 'w-14' : 'w-72'}`}>
                    <div className="sticky top-4 rounded-card border p-3 flex flex-col border-(--border) bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] shadow-md">
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
                            <PropertyFilters section={props.section} />
                        )}
                    </div>
                </aside>

                <div className="lg:hidden w-full mb-4">
                    <div className="rounded-card border p-3 border-(--border) bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]">
                        <PropertyFilters section={props.section} />
                    </div>
                </div>

                <div className="w-full min-w-0 flex-1">
                    {loading ? null : cards.length === 0 ? (
                        <PanelCard size="lg">
                            <PanelNotice tone="neutral">
                                No encontramos publicaciones con esos filtros. Prueba ampliar la búsqueda o limpiar los filtros.
                            </PanelNotice>
                        </PanelCard>
                    ) : (
                        <div className={viewMode === 'grid' ? 'listings-grid grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'w-full space-y-3'}>
                            {cards.map((item) => (
                                <div key={item.id} className="w-full min-w-0">
                                    <PropertyListingCard data={item} mode={viewMode} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {props.section === 'sale' ? (
                <p className="mt-8 text-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
                    ¿Buscas financiamiento?{' '}
                    <Link href="/simulador-hipotecario" className="font-medium underline underline-offset-2" style={{ color: 'var(--fg)' }}>
                        Simula tu crédito hipotecario
                    </Link>
                </p>
            ) : null}
        </div>
    );
}

export default function PublicPropertyListingPage(props: {
    section: PublicListingSection;
    title: string;
    breadcrumbLabel: string;
    description: string;
}) {
    return (
        <Suspense fallback={null}>
            <PublicPropertyListingPageContent {...props} />
        </Suspense>
    );
}
