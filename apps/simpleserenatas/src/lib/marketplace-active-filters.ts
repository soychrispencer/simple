import {
    EMPTY_MARKETPLACE_SEARCH,
    formatMarketplaceDate,
    marketplaceCatalogHref,
    type MarketplaceSearchFilters,
} from '@/lib/marketplace-search';

export type MarketplaceFilterChip = {
    id: string;
    label: string;
    href: string;
};

export function marketplaceActiveFilterChips(filters: MarketplaceSearchFilters): MarketplaceFilterChip[] {
    const chips: MarketplaceFilterChip[] = [];

    if (filters.q.trim()) {
        chips.push({
            id: 'q',
            label: `Nombre: ${filters.q.trim()}`,
            href: marketplaceCatalogHref({ ...filters, q: '' }),
        });
    }
    if (filters.comuna.trim()) {
        chips.push({
            id: 'comuna',
            label: filters.comuna.trim(),
            href: marketplaceCatalogHref({ ...filters, comuna: '' }),
        });
    }
    if (filters.region.trim()) {
        chips.push({
            id: 'region',
            label: filters.region.trim(),
            href: marketplaceCatalogHref({ ...filters, region: '', comuna: '' }),
        });
    }
    if (filters.date.trim()) {
        chips.push({
            id: 'date',
            label: `Fecha: ${formatMarketplaceDate(filters.date)}`,
            href: marketplaceCatalogHref({ ...filters, date: '' }),
        });
    }

    return chips;
}

export function hasActiveMarketplaceFilters(filters: MarketplaceSearchFilters): boolean {
    return marketplaceActiveFilterChips(filters).length > 0;
}

export function clearAllMarketplaceFiltersHref(): string {
    return marketplaceCatalogHref(EMPTY_MARKETPLACE_SEARCH);
}
