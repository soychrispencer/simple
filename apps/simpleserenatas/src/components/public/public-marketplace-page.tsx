'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import {
    interleaveDirectoryGridItems,
    OperatorDirectoryBoostedSection,
    OperatorDirectoryPageFrame,
} from '@simple/ui/operator-directory';
import { PublicAdInlineCard } from '@simple/ui/public-advertising';
import { PanelButton } from '@simple/ui/panel';
import { boostKeysFromFeatured, boostSlugsFromFeatured, splitDirectoryByBoostOrder } from '@simple/utils';
import { serenatasPublicNavLinks } from '@/components/layout/landing-header';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { Footer } from '@/components/layout/footer';
import { MarketplaceSearchPanel } from '@/components/public/marketplace-search-panel';
import { PublicProviderGroupCard } from '@/components/public/public-provider-group-card';
import { FieldSelect } from '@/components/panel/shared';
import { MARKETPLACE_SORT_OPTIONS, type MarketplaceGroupSort } from '@/lib/marketplace-group-display';
import {
    formatMarketplaceDate,
    MARKETPLACE_CATALOG_PAGE_SIZE,
    marketplaceCatalogHref,
    parseMarketplaceSearchParams,
    profileHrefWithDate,
    type MarketplaceSearchFilters,
} from '@/lib/marketplace-search';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import {
    clearAllMarketplaceFiltersHref,
    hasActiveMarketplaceFilters,
    marketplaceActiveFilterChips,
} from '@/lib/marketplace-active-filters';
import { fetchFeaturedBoosted } from '@/lib/boost';

type LoadStatus = { loading: boolean; error: string | null };

export function PublicMarketplacePage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseMarketplaceSearchParams(searchParams),
        [searchParams],
    );
    const [draft, setDraft] = useState<MarketplaceSearchFilters>(filters);
    const [items, setItems] = useState<ProviderGroup[]>([]);
    const [boostedOrder, setBoostedOrder] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [nextOffset, setNextOffset] = useState<number | null>(null);
    const [status, setStatus] = useState<LoadStatus>({ loading: true, error: null });
    const [loadingMore, setLoadingMore] = useState(false);
    const loadMoreLockRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setDraft(filters);
    }, [filters]);

    const loadGroups = useCallback(async (
        next: MarketplaceSearchFilters,
        offset: number,
        append: boolean,
    ) => {
        if (append) {
            if (loadMoreLockRef.current) return;
            loadMoreLockRef.current = true;
            setLoadingMore(true);
        } else {
            setStatus({ loading: true, error: null });
            setItems([]);
            setBoostedOrder([]);
            setTotal(0);
            setHasMore(false);
            setNextOffset(null);
        }

        const response = await serenatasApi.marketplaceGroups({
            country: next.country || undefined,
            region: next.region || undefined,
            comuna: next.comuna || undefined,
            q: next.q || undefined,
            date: next.date || undefined,
            sort: next.sort,
            limit: MARKETPLACE_CATALOG_PAGE_SIZE,
            offset,
        });

        const featured = !append
            ? await fetchFeaturedBoosted('marketplace', 12)
            : [];

        if (append) {
            loadMoreLockRef.current = false;
            setLoadingMore(false);
        }

        if (!response.ok) {
            if (!append) {
                setItems([]);
                setStatus({
                    loading: false,
                    error: response.error ?? 'No pudimos cargar mariachis en este momento.',
                });
            }
            return;
        }

        setTotal(response.total);
        setHasMore(response.hasMore);
        setNextOffset(response.nextOffset);
        setItems((current) => (append ? [...current, ...response.items] : response.items));
        if (!append) {
            setBoostedOrder([
                ...boostKeysFromFeatured(featured),
                ...boostSlugsFromFeatured(featured),
            ]);
            setStatus({ loading: false, error: null });
        }
    }, []);

    useEffect(() => {
        void loadGroups(filters, 0, false);
    }, [filters, loadGroups]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || status.loading || loadingMore || nextOffset == null) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting || loadMoreLockRef.current) return;
                void loadGroups(filters, nextOffset, true);
            },
            { rootMargin: '240px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [filters, hasMore, status.loading, loadingMore, nextOffset, loadGroups]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.push(marketplaceCatalogHref(draft));
    };

    const openGroup = (slug: string) => {
        router.push(profileHrefWithDate(slug, filters.date));
    };

    const resultsLabel = [
        filters.q ? `“${filters.q}”` : null,
        filters.comuna || filters.region
            ? `${filters.comuna || 'todas las comunas'}${filters.region ? `, ${filters.region}` : ''}`
            : filters.q ? null : 'todas las zonas',
    ].filter(Boolean).join(' · ') || 'todas las zonas';

    const applyCatalogFilters = (patch: Partial<MarketplaceSearchFilters>) => {
        router.push(marketplaceCatalogHref({ ...filters, ...patch }));
    };

    const dateSuffix = filters.date
        ? ` · con cupo el ${formatMarketplaceDate(filters.date)}`
        : '';

    const activeFilterChips = useMemo(() => marketplaceActiveFilterChips(filters), [filters]);
    const showFilterChips = hasActiveMarketplaceFilters(filters);

    const resultsCountLabel = status.loading
        ? 'Cargando mariachis…'
        : total > 0
            ? items.length < total
                ? `Mostrando ${items.length} de ${total} mariachi${total === 1 ? '' : 's'} en ${resultsLabel}${dateSuffix}.`
                : `${total} mariachi${total === 1 ? '' : 's'} en ${resultsLabel}${dateSuffix}.`
            : `0 mariachis en ${resultsLabel}${dateSuffix}.`;

    const { boosted, regular } = useMemo(
        () => splitDirectoryByBoostOrder(
            items,
            boostedOrder,
            (group) => group.id,
            (group) => group.slug,
        ),
        [items, boostedOrder],
    );

    const gridItems = useMemo(
        () => interleaveDirectoryGridItems(
            regular,
            (group) => (
                <PublicProviderGroupCard
                    key={group.id}
                    group={group}
                    href={profileHrefWithDate(group.slug, filters.date)}
                    onOpen={openGroup}
                />
            ),
            (slotIndex) => (
                <PublicAdInlineCard
                    key={`ad-${slotIndex}`}
                    vertical="serenatas"
                    placementSection="mariachis"
                    placeholderLabel="Espacio publicitario"
                />
            ),
            6,
        ),
        [filters.date, regular],
    );

    return (
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-(--bg) text-(--fg)">
            <SerenatasChromeHeader publicLinks={serenatasPublicNavLinks} />

            <main className="flex-1 border-b border-border">
                <OperatorDirectoryPageFrame
                    breadcrumb={(
                        <nav className="text-sm text-fg-muted">
                            <Link href="/" className="font-medium transition-colors hover:text-fg">
                                Inicio
                            </Link>
                            <span className="mx-2 opacity-50">/</span>
                            <span className="font-medium text-fg">Mariachis</span>
                        </nav>
                    )}
                    title="Mariachis en el catálogo"
                    description="Busca por nombre, zona y fecha para ver grupos con servicios activos y horarios posibles."
                    search={(
                        <MarketplaceSearchPanel
                            value={draft}
                            onChange={setDraft}
                            onSubmit={submitSearch}
                            loading={status.loading}
                        />
                    )}
                    resultsLabel={resultsCountLabel}
                    filterChips={activeFilterChips}
                    clearFiltersHref={clearAllMarketplaceFiltersHref()}
                    clearFiltersLabel="Ver todos los mariachis"
                    sortControl={(
                        <>
                            <span className="text-xs font-medium text-fg-muted">Ordenar</span>
                            <FieldSelect
                                value={filters.sort}
                                options={MARKETPLACE_SORT_OPTIONS.map((option) => ({
                                    value: option.value,
                                    label: option.label,
                                }))}
                                onChange={(event) => applyCatalogFilters({
                                    sort: event.target.value as MarketplaceGroupSort,
                                })}
                                className="h-11 text-sm font-semibold"
                            />
                        </>
                    )}
                >
                    {status.error ? (
                        <div className="rounded-card border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                            {status.error}
                        </div>
                    ) : status.loading ? null : items.length > 0 ? (
                        <>
                            {boosted.length > 0 ? (
                                <OperatorDirectoryBoostedSection
                                    title="Destacados"
                                    description="Mariachis con boost activo en el catálogo."
                                >
                                    {boosted.map((group) => (
                                        <PublicProviderGroupCard
                                            key={`boosted-${group.id}`}
                                            group={group}
                                            href={profileHrefWithDate(group.slug, filters.date)}
                                            onOpen={openGroup}
                                            boosted
                                        />
                                    ))}
                                </OperatorDirectoryBoostedSection>
                            ) : null}
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {gridItems}
                            </div>
                            {hasMore ? (
                                <div
                                    ref={sentinelRef}
                                    className="mt-8 flex justify-center py-4"
                                    aria-hidden={!loadingMore}
                                >
                                    {loadingMore ? (
                                        <p className="text-sm text-fg-muted">Cargando más mariachis…</p>
                                    ) : (
                                        <span className="sr-only">Cargar más al desplazarse</span>
                                    )}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="rounded-card border border-border bg-surface p-8 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-button bg-accent-soft text-accent">
                                <IconSearch size={24} />
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-fg">No encontramos mariachis con esos filtros</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                                Prueba quitando un filtro o amplía la búsqueda.
                            </p>
                            {showFilterChips ? (
                                <div className="mx-auto mt-4 flex max-w-lg flex-wrap justify-center gap-2">
                                    {activeFilterChips.map((chip) => (
                                        <Link
                                            key={chip.id}
                                            href={chip.href}
                                            className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-3 py-1 text-xs font-medium text-fg transition-colors hover:bg-bg-muted"
                                        >
                                            {chip.label}
                                            <span className="text-fg-muted" aria-hidden>×</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                            <PanelButton
                                type="button"
                                variant="accent"
                                className="mt-5 h-11 px-5"
                                onClick={() => router.push(clearAllMarketplaceFiltersHref())}
                            >
                                Ver todos los mariachis
                            </PanelButton>
                        </div>
                    )}
                </OperatorDirectoryPageFrame>
            </main>

            <Footer />
        </div>
    );
}
