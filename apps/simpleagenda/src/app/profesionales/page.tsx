'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import {
    interleaveDirectoryGridItems,
    OperatorDirectoryBoostedSection,
    OperatorDirectoryPageFrame,
    OperatorSearchShell,
} from '@simple/ui/operator-directory';
import { PublicAdInlineCard } from '@simple/ui/public-advertising';
import { PanelButton } from '@simple/ui/panel';
import { boostSlugsFromFeatured, splitDirectoryByBoostOrder } from '@simple/utils';
import { PublicProfessionalCard } from '@/components/public/public-professional-card';
import { fetchFeaturedBoosted } from '@/lib/boost';
import { AGENDA_INLINE_AD_PLACEHOLDER } from '@/lib/ad-placeholders';
import type { MarketplaceProfessional } from '@/lib/marketplace-professionals';
import {
    AGENDA_DIRECTORY_SEARCH_COPY,
    AGENDA_DIRECTORY_SEARCH_FIELDS,
    AGENDA_DIRECTORY_SORT_OPTIONS,
    agendaDirectoryActiveFilterChips,
    agendaDirectoryFiltersToParams,
    agendaDirectoryHref,
    EMPTY_AGENDA_DIRECTORY_FILTERS,
    hasActiveAgendaDirectoryFilters,
    parseAgendaDirectoryParams,
    type AgendaDirectoryFilters,
} from '@/lib/operator-directory-search';

function sortProfessionals(items: MarketplaceProfessional[], sort: AgendaDirectoryFilters['sort']) {
    if (sort === 'name_asc') {
        return [...items].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', 'es'));
    }
    return items;
}

export default function ProfesionalesPage() {
    return (
        <Suspense fallback={<div className="container-app py-8 text-sm text-fg-muted">Cargando profesionales…</div>}>
            <ProfesionalesPageInner />
        </Suspense>
    );
}

function ProfesionalesPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filters = useMemo(() => parseAgendaDirectoryParams(searchParams), [searchParams]);
    const [draft, setDraft] = useState(filters);
    const [items, setItems] = useState<MarketplaceProfessional[]>([]);
    const [boostedOrder, setBoostedOrder] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDraft(filters);
    }, [filters]);

    const load = useCallback(async (next: AgendaDirectoryFilters) => {
        setLoading(true);
        setError(null);
        const params = agendaDirectoryFiltersToParams(next);
        const [response, featured] = await Promise.all([
            fetch(`${API_BASE}/api/public/agenda/marketplace/professionals?${params.toString()}`),
            fetchFeaturedBoosted('marketplace', 12),
        ]);
        const data = await response.json().catch(() => null) as { ok?: boolean; items?: MarketplaceProfessional[]; error?: string };
        if (!response.ok || !data?.ok) {
            setItems([]);
            setBoostedOrder([]);
            setError(data?.error ?? 'No pudimos cargar profesionales.');
            setLoading(false);
            return;
        }
        setBoostedOrder(boostSlugsFromFeatured(featured));
        setItems(sortProfessionals(data.items ?? [], next.sort));
        setLoading(false);
    }, []);

    useEffect(() => {
        void load(filters);
    }, [filters, load]);

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        router.push(agendaDirectoryHref({ ...draft, sort: filters.sort }));
    };

    const applyFilters = (patch: Partial<AgendaDirectoryFilters>) => {
        router.push(agendaDirectoryHref({ ...filters, ...patch }));
    };

    const activeChips = useMemo(() => agendaDirectoryActiveFilterChips(filters), [filters]);
    const resultsLabel = loading
        ? 'Cargando profesionales…'
        : error
            ? error
            : items.length === 0
                ? 'No encontramos profesionales con esos filtros.'
                : `${items.length} profesional${items.length === 1 ? '' : 'es'} encontrado${items.length === 1 ? '' : 's'}.`;

    const { boosted, regular } = useMemo(
        () => splitDirectoryByBoostOrder(items, boostedOrder, (item) => item.slug),
        [items, boostedOrder],
    );

    const gridItems = useMemo(
        () => interleaveDirectoryGridItems(
            regular,
            (item) => <PublicProfessionalCard key={item.slug} professional={item} />,
            (slotIndex) => (
                <PublicAdInlineCard
                    key={`ad-${slotIndex}`}
                    vertical="agenda"
                    placementSection="professionals"
                    placeholderLabel="Espacio publicitario"
                    placeholderImageUrl={AGENDA_INLINE_AD_PLACEHOLDER}
                />
            ),
            6,
        ),
        [regular],
    );

    return (
        <OperatorDirectoryPageFrame
            breadcrumb={(
                <nav className="text-sm text-fg-muted">
                    <Link href="/" className="font-medium transition-colors hover:text-fg">Inicio</Link>
                    <span className="mx-2 opacity-50">/</span>
                    <span className="font-medium text-fg">Profesionales</span>
                </nav>
            )}
            title="Encuentra un profesional"
            description="Directorio de profesionales con reserva directa en su perfil público. Sin comisiones de Simple por cita."
            search={(
                <OperatorSearchShell
                    value={draft}
                    onChange={(next) => setDraft({ ...draft, ...next })}
                    onSubmit={submitSearch}
                    fields={[...AGENDA_DIRECTORY_SEARCH_FIELDS]}
                    copy={AGENDA_DIRECTORY_SEARCH_COPY}
                    loading={loading}
                />
            )}
            resultsLabel={resultsLabel}
            filterChips={activeChips}
            clearFiltersHref={agendaDirectoryHref(EMPTY_AGENDA_DIRECTORY_FILTERS)}
            clearFiltersLabel="Ver todos"
            sortControl={(
                <>
                    <span className="text-xs font-medium text-fg-muted">Ordenar</span>
                    <select
                        className="form-input h-11 text-sm font-semibold"
                        value={filters.sort}
                        onChange={(event) => applyFilters({ sort: event.target.value as AgendaDirectoryFilters['sort'] })}
                        aria-label="Ordenar resultados"
                    >
                        {AGENDA_DIRECTORY_SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </>
            )}
        >
            {loading ? null : error ? (
                <div className="rounded-card border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-100">
                    {error}
                </div>
            ) : items.length > 0 ? (
                <>
                    {boosted.length > 0 ? (
                        <OperatorDirectoryBoostedSection
                            title="Destacados"
                            description="Profesionales con boost activo en el directorio."
                        >
                            {boosted.map((professional) => (
                                <PublicProfessionalCard
                                    key={`boosted-${professional.slug}`}
                                    professional={{ ...professional, boosted: true }}
                                />
                            ))}
                        </OperatorDirectoryBoostedSection>
                    ) : null}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {gridItems}
                    </div>
                </>
            ) : (
                <div className="rounded-card border border-border bg-surface p-8 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-button bg-accent-soft text-accent">
                        <IconSearch size={24} />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-fg">No encontramos profesionales con esos filtros</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                        Prueba ampliando la zona, quitando el rubro o cambiando la modalidad.
                    </p>
                    {hasActiveAgendaDirectoryFilters(filters) ? (
                        <PanelButton
                            type="button"
                            variant="accent"
                            className="mt-5 h-11 px-5"
                            onClick={() => router.push(agendaDirectoryHref(EMPTY_AGENDA_DIRECTORY_FILTERS))}
                        >
                            Ver todos los profesionales
                        </PanelButton>
                    ) : null}
                </div>
            )}
        </OperatorDirectoryPageFrame>
    );
}
