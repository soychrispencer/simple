import type { CatalogCommune, CatalogRegion } from './location-catalog.js';

export type CountryLocationData = {
    countryCode: string;
    regions: CatalogRegion[];
    citiesByRegion: Record<string, string[]>;
};

const cache = new Map<string, CountryLocationData>();

function normalizeCatalogCountryCode(code?: string | null): string {
    return (code ?? '').trim().toUpperCase();
}

const DATA_LOADERS: Record<string, () => Promise<CountryLocationData>> = {
    MX: () => import('./data/locations/mx.json').then((m) => m.default as CountryLocationData),
    AR: () => import('./data/locations/ar.json').then((m) => m.default as CountryLocationData),
    CO: () => import('./data/locations/co.json').then((m) => m.default as CountryLocationData),
    PE: () => import('./data/locations/pe.json').then((m) => m.default as CountryLocationData),
    ES: () => import('./data/locations/es.json').then((m) => m.default as CountryLocationData),
    VE: () => import('./data/locations/ve.json').then((m) => m.default as CountryLocationData),
    EC: () => import('./data/locations/ec.json').then((m) => m.default as CountryLocationData),
    UY: () => import('./data/locations/uy.json').then((m) => m.default as CountryLocationData),
    PY: () => import('./data/locations/py.json').then((m) => m.default as CountryLocationData),
    BO: () => import('./data/locations/bo.json').then((m) => m.default as CountryLocationData),
    CR: () => import('./data/locations/cr.json').then((m) => m.default as CountryLocationData),
    PA: () => import('./data/locations/pa.json').then((m) => m.default as CountryLocationData),
    GT: () => import('./data/locations/gt.json').then((m) => m.default as CountryLocationData),
    HN: () => import('./data/locations/hn.json').then((m) => m.default as CountryLocationData),
    SV: () => import('./data/locations/sv.json').then((m) => m.default as CountryLocationData),
    NI: () => import('./data/locations/ni.json').then((m) => m.default as CountryLocationData),
    CU: () => import('./data/locations/cu.json').then((m) => m.default as CountryLocationData),
    GQ: () => import('./data/locations/gq.json').then((m) => m.default as CountryLocationData),
    DO: () => import('./data/locations/do.json').then((m) => m.default as CountryLocationData),
    PR: () => import('./data/locations/pr.json').then((m) => m.default as CountryLocationData),
    DE: () => import('./data/locations/de.json').then((m) => m.default as CountryLocationData),
    US: () => import('./data/locations/us.json').then((m) => m.default as CountryLocationData),
};

export const INTERNATIONAL_CATALOG_COUNTRIES = Object.keys(DATA_LOADERS);

export function hasInternationalCatalog(countryCode: string): boolean {
    return Boolean(DATA_LOADERS[normalizeCatalogCountryCode(countryCode)]);
}

export async function loadCountryLocationData(countryCode: string): Promise<CountryLocationData | null> {
    const code = normalizeCatalogCountryCode(countryCode);
    if (code === 'CL') return null;
    const cached = cache.get(code);
    if (cached) return cached;
    const loader = DATA_LOADERS[code];
    if (!loader) return null;
    const data = await loader();
    cache.set(code, data);
    return data;
}

export function getCachedCountryLocationData(countryCode: string): CountryLocationData | null {
    return cache.get(normalizeCatalogCountryCode(countryCode)) ?? null;
}

export async function getInternationalRegions(countryCode: string): Promise<CatalogRegion[]> {
    const data = await loadCountryLocationData(countryCode);
    return data?.regions ?? [];
}

export async function getInternationalLocalities(
    countryCode: string,
    regionId: string,
): Promise<CatalogCommune[]> {
    const data = await loadCountryLocationData(countryCode);
    if (!data || !regionId) return [];
    const cities = data.citiesByRegion[regionId] ?? [];
    return cities.map((name) => ({
        id: name,
        regionId,
        name,
    }));
}

export function resolveInternationalRegion(
    countryCode: string,
    regionId: string,
): CatalogRegion | undefined {
    const data = getCachedCountryLocationData(countryCode);
    return data?.regions.find((region) => region.id === regionId);
}

export function resolveInternationalLocalityName(
    countryCode: string,
    regionId: string,
    localityId: string,
): string | null {
    const data = getCachedCountryLocationData(countryCode);
    const cities = data?.citiesByRegion[regionId] ?? [];
    if (cities.includes(localityId)) return localityId;
    const match = cities.find((city) => city.toLowerCase() === localityId.toLowerCase());
    return match ?? null;
}

export function matchInternationalRegionByName(
    countryCode: string,
    regionName?: string | null,
): CatalogRegion | undefined {
    const name = regionName?.trim().toLowerCase();
    if (!name) return undefined;
    const data = getCachedCountryLocationData(countryCode);
    return data?.regions.find((region) => region.name.toLowerCase() === name);
}

export function matchInternationalLocalityByName(
    countryCode: string,
    regionId: string,
    localityName?: string | null,
): string | null {
    const name = localityName?.trim().toLowerCase();
    if (!name || !regionId) return null;
    const data = getCachedCountryLocationData(countryCode);
    const cities = data?.citiesByRegion[regionId] ?? [];
    const match = cities.find((city) => city.toLowerCase() === name);
    return match ?? null;
}
