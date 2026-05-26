'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { LandingHeader } from '@/components/layout/landing-header';
import { Footer } from '@/components/layout/footer';
import { MarketplaceSearchPanel } from '@/components/public/marketplace-search-panel';
import {
    PublicProviderGroupCard,
    PublicProviderGroupCardSkeleton,
} from '@/components/public/public-provider-group-card';
import { MARKETPLACE_SORT_OPTIONS, type MarketplaceGroupSort } from '@/lib/marketplace-group-display';
import {
    EMPTY_MARKETPLACE_SEARCH,
    formatMarketplaceDate,
    MARKETPLACE_CATALOG_PAGE_SIZE,
    marketplaceCatalogHref,
    parseMarketplaceSearchParams,
    profileHrefWithDate,
    type MarketplaceSearchFilters,
} from '@/lib/marketplace-search';
import { persistSignupProfile } from '@/lib/signup-profile';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';

type LoadStatus = { loading: boolean; error: string | null };

export function PublicMarketplacePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { openAuth } = useAuth();

    const filters = useMemo(
        () => parseMarketplaceSearchParams(searchParams),
        [searchParams],
    );
    const [draft, setDraft] = useState<MarketplaceSearchFilters>(filters);
    const [items, setItems] = useState<ProviderGroup[]>([]);
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
            setTotal(0);
            setHasMore(false);
            setNextOffset(null);
        }

        const response = await serenatasApi.marketplaceGroups({
            region: next.region || undefined,
            comuna: next.comuna || undefined,
            q: next.q || undefined,
            date: next.date || undefined,
            sort: next.sort,
            limit: MARKETPLACE_CATALOG_PAGE_SIZE,
            offset,
        });

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

    const openRegisterClient = () => {
        persistSignupProfile('client');
        openAuth('register');
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

    const resultsCountLabel = status.loading
        ? 'Cargando mariachis…'
        : total > 0
            ? items.length < total
                ? `Mostrando ${items.length} de ${total} mariachi${total === 1 ? '' : 's'} en ${resultsLabel}${dateSuffix}.`
                : `${total} mariachi${total === 1 ? '' : 's'} en ${resultsLabel}${dateSuffix}.`
            : `0 mariachis en ${resultsLabel}${dateSuffix}.`;

    return (
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--bg)] text-[var(--fg)]">
            <LandingHeader
                onLogin={() => openAuth('login')}
                onRegister={openRegisterClient}
            />

            <main className="flex-1 border-b landing-border">
                <div className="container-app max-w-6xl py-8 sm:py-12">
                    <nav className="mb-6 text-sm landing-text-muted">
                        <Link href="/" className="font-medium transition-colors hover:text-[var(--fg)]">
                            Inicio
                        </Link>
                        <span className="mx-2 opacity-50">/</span>
                        <span className="font-medium landing-text-fg">Mariachis</span>
                    </nav>

                    <div className="mb-8 max-w-2xl">
                        <h1 className="text-3xl font-bold tracking-tight landing-text-fg sm:text-4xl">
                            Mariachis en el marketplace
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed landing-text-muted sm:text-base">
                            Filtra por zona, nombre y fecha con cupo disponible.
                        </p>
                    </div>

                    <MarketplaceSearchPanel
                        value={draft}
                        onChange={setDraft}
                        onSubmit={submitSearch}
                        loading={status.loading}
                    />

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] landing-text-accent">
                                Resultados
                            </p>
                            <p className="mt-2 text-sm landing-text-muted">
                                {resultsCountLabel}
                            </p>
                        </div>
                        <label className="grid w-full gap-1.5 sm:w-52">
                            <span className="text-xs font-medium landing-text-muted">Ordenar</span>
                            <select
                                value={filters.sort}
                                onChange={(event) => applyCatalogFilters({
                                    sort: event.target.value as MarketplaceGroupSort,
                                })}
                                className="h-11 rounded-button border border-border bg-surface px-3 text-sm font-semibold outline-none"
                            >
                                {MARKETPLACE_SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-6">
                        {status.error ? (
                            <div className="rounded-card border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                                {status.error}
                            </div>
                        ) : status.loading ? (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 6 }, (_, index) => (
                                    <PublicProviderGroupCardSkeleton key={index} />
                                ))}
                            </div>
                        ) : items.length > 0 ? (
                            <>
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {items.map((group) => (
                                        <PublicProviderGroupCard
                                            key={group.id}
                                            group={group}
                                            href={profileHrefWithDate(group.slug, filters.date)}
                                            onOpen={openGroup}
                                        />
                                    ))}
                                </div>
                                {hasMore ? (
                                    <div
                                        ref={sentinelRef}
                                        className="mt-8 flex justify-center py-4"
                                        aria-hidden={!loadingMore}
                                    >
                                        {loadingMore ? (
                                            <p className="text-sm landing-text-muted">Cargando más mariachis…</p>
                                        ) : (
                                            <span className="sr-only">Cargar más al desplazarse</span>
                                        )}
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <div className="rounded-card border landing-border landing-bg-surface p-8 text-center">
                                <div className="mx-auto flex size-12 items-center justify-center rounded-button bg-accent-soft text-accent">
                                    <IconSearch size={24} />
                                </div>
                                <h2 className="mt-4 text-xl font-bold landing-text-fg">No encontramos mariachis con esos filtros</h2>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed landing-text-muted">
                                    {filters.date
                                        ? 'Prueba otra fecha, otra zona o un nombre distinto.'
                                        : filters.q
                                            ? 'Prueba otro nombre o quita filtros de zona para ampliar la búsqueda.'
                                            : 'Prueba otra comuna o amplía la región para ver más opciones.'}
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-outline mt-5 h-11 px-5 font-semibold"
                                    onClick={() => router.push(marketplaceCatalogHref(EMPTY_MARKETPLACE_SEARCH))}
                                >
                                    Ver todos los mariachis
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
