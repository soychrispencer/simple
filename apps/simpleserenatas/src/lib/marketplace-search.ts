import type { MarketplaceGroupSort } from '@/lib/marketplace-group-display';

export const DEFAULT_MARKETPLACE_REGION = 'Región Metropolitana';
export const DEFAULT_MARKETPLACE_COMUNA = 'Santiago';

/** Tamaño de página del catálogo público (scroll infinito). */
export const MARKETPLACE_CATALOG_PAGE_SIZE = 12;

export type MarketplaceSearchFilters = {
    country: string;
    region: string;
    comuna: string;
    date: string;
    /** Búsqueda por nombre del mariachi (parcial, sin distinguir mayúsculas). */
    q: string;
    sort: MarketplaceGroupSort;
};

export const EMPTY_MARKETPLACE_SEARCH: MarketplaceSearchFilters = {
    country: 'CL',
    region: '',
    comuna: '',
    date: '',
    q: '',
    sort: 'recommended',
};

export function parseMarketplaceSortParam(raw: string | null | undefined): MarketplaceGroupSort {
    if (raw === 'price_asc' || raw === 'name_asc') return raw;
    return 'recommended';
}

export function defaultLandingSearch(): MarketplaceSearchFilters {
    return {
        country: 'CL',
        region: DEFAULT_MARKETPLACE_REGION,
        comuna: DEFAULT_MARKETPLACE_COMUNA,
        date: '',
        q: '',
        sort: 'recommended',
    };
}

export function parseMarketplaceSearchParams(params: URLSearchParams): MarketplaceSearchFilters {
    return {
        country: params.get('country')?.trim() || params.get('pais')?.trim() || 'CL',
        region: params.get('region')?.trim() ?? '',
        comuna: params.get('comuna')?.trim() ?? '',
        date: params.get('fecha')?.trim() ?? params.get('date')?.trim() ?? '',
        q: params.get('q')?.trim() ?? '',
        sort: parseMarketplaceSortParam(params.get('sort')),
    };
}

export function marketplaceSearchToParams(search: MarketplaceSearchFilters): URLSearchParams {
    const params = new URLSearchParams();
    if (search.country && search.country !== 'CL') params.set('country', search.country);
    if (search.region) params.set('region', search.region);
    if (search.comuna) params.set('comuna', search.comuna);
    if (search.date) params.set('fecha', search.date);
    if (search.q) params.set('q', search.q);
    if (search.sort !== 'recommended') params.set('sort', search.sort);
    return params;
}

export function marketplaceCatalogHref(search: MarketplaceSearchFilters): string {
    const query = marketplaceSearchToParams(search).toString();
    return query ? `/mariachis?${query}` : '/mariachis';
}

export function profileHrefWithDate(slug: string, date: string): string {
    const params = new URLSearchParams();
    if (date) params.set('fecha', date);
    const query = params.toString();
    const path = `/${encodeURIComponent(slug)}`;
    return query ? `${path}?${query}` : path;
}

export function todayIsoDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatMarketplaceDate(value: string): string {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(date);
}
