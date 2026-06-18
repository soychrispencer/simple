import type { StructuredLocation } from '@simple/types';
import {
    getCommuneById,
    getRegionById,
    LOCATION_COMMUNES,
    LOCATION_REGIONS,
    resolveLocationNames,
} from './location-catalog.js';
import {
    getCachedCountryLocationData,
    getInternationalLocalities,
    getInternationalRegions,
    hasInternationalCatalog,
    loadCountryLocationData,
    matchInternationalLocalityByName,
    matchInternationalRegionByName,
    resolveInternationalLocalityName,
    resolveInternationalRegion,
} from './international-location-catalog.js';

export type { StructuredLocation };

export type SupportedCountry = {
    code: string;
    name: string;
    /** Catálogo completo región/localidad en el cliente. */
    hasFullCatalog: boolean;
};

/** Países soportados con catálogo estructurado (región + ciudad). */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
    { code: 'CL', name: 'Chile', hasFullCatalog: true },
    { code: 'MX', name: 'México', hasFullCatalog: true },
    { code: 'AR', name: 'Argentina', hasFullCatalog: true },
    { code: 'CO', name: 'Colombia', hasFullCatalog: true },
    { code: 'PE', name: 'Perú', hasFullCatalog: true },
    { code: 'ES', name: 'España', hasFullCatalog: true },
    { code: 'VE', name: 'Venezuela', hasFullCatalog: true },
    { code: 'EC', name: 'Ecuador', hasFullCatalog: true },
    { code: 'UY', name: 'Uruguay', hasFullCatalog: true },
    { code: 'PY', name: 'Paraguay', hasFullCatalog: true },
    { code: 'BO', name: 'Bolivia', hasFullCatalog: true },
    { code: 'CR', name: 'Costa Rica', hasFullCatalog: true },
    { code: 'PA', name: 'Panamá', hasFullCatalog: true },
    { code: 'GT', name: 'Guatemala', hasFullCatalog: true },
    { code: 'HN', name: 'Honduras', hasFullCatalog: true },
    { code: 'SV', name: 'El Salvador', hasFullCatalog: true },
    { code: 'NI', name: 'Nicaragua', hasFullCatalog: true },
    { code: 'CU', name: 'Cuba', hasFullCatalog: true },
    { code: 'GQ', name: 'Guinea Ecuatorial', hasFullCatalog: true },
    { code: 'DO', name: 'República Dominicana', hasFullCatalog: true },
    { code: 'PR', name: 'Puerto Rico', hasFullCatalog: true },
    { code: 'DE', name: 'Alemania', hasFullCatalog: true },
    { code: 'US', name: 'Estados Unidos', hasFullCatalog: true },
];

export function getSupportedCountries(): SupportedCountry[] {
    return [...SUPPORTED_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function getCountryByCode(code?: string | null): SupportedCountry | undefined {
    const normalized = (code ?? '').trim().toUpperCase();
    return SUPPORTED_COUNTRIES.find((c) => c.code === normalized);
}

export function emptyStructuredLocation(countryCode = 'CL'): StructuredLocation {
    return {
        countryCode: countryCode.toUpperCase(),
        regionId: null,
        regionName: null,
        localityId: null,
        localityName: null,
    };
}

export function normalizeCountryCode(code?: string | null): string {
    const normalized = (code ?? 'CL').trim().toUpperCase();
    return getCountryByCode(normalized)?.code ?? 'CL';
}

function normalizeInternationalStructuredLocation(
    countryCode: string,
    regionId: string | null,
    localityId: string | null,
    regionName: string | null,
    localityName: string | null,
): StructuredLocation {
    let nextRegionId = regionId;
    let nextLocalityId = localityId;
    let nextRegionName = regionName;
    let nextLocalityName = localityName;

    if (nextRegionId && !nextRegionName) {
        nextRegionName = resolveInternationalRegion(countryCode, nextRegionId)?.name ?? nextRegionName;
    }
    if (nextRegionId && nextLocalityId && !nextLocalityName) {
        nextLocalityName = resolveInternationalLocalityName(countryCode, nextRegionId, nextLocalityId) ?? nextLocalityName;
    }
    if (!nextRegionId && nextRegionName) {
        const match = matchInternationalRegionByName(countryCode, nextRegionName);
        if (match) {
            nextRegionId = match.id;
            nextRegionName = match.name;
        }
    }
    if (nextRegionId && !nextLocalityId && nextLocalityName) {
        const match = matchInternationalLocalityByName(countryCode, nextRegionId, nextLocalityName);
        if (match) {
            nextLocalityId = match;
            nextLocalityName = match;
        }
    }

    return {
        countryCode,
        regionId: nextRegionId,
        regionName: nextRegionName,
        localityId: nextLocalityId,
        localityName: nextLocalityName,
    };
}

/** Normaliza IDs/nombres desde catálogo (Chile e internacional en caché). */
export function normalizeStructuredLocation(input: Partial<StructuredLocation> | null | undefined): StructuredLocation {
    const countryCode = normalizeCountryCode(input?.countryCode);
    let regionId = input?.regionId?.trim() || null;
    let localityId = input?.localityId?.trim() || null;
    let regionName = input?.regionName?.trim() || null;
    let localityName = input?.localityName?.trim() || null;

    if (countryCode === 'CL') {
        if (regionId && !regionName) {
            regionName = getRegionById(regionId)?.name ?? regionName;
        }
        if (localityId && !localityName) {
            localityName = getCommuneById(localityId)?.name ?? localityName;
        }
        if (regionId && localityId) {
            const resolved = resolveLocationNames(regionId, localityId);
            regionName = resolved.regionName ?? regionName;
            localityName = resolved.communeName ?? localityName;
        }
        return { countryCode, regionId, regionName, localityId, localityName };
    }

    if (hasInternationalCatalog(countryCode) && getCachedCountryLocationData(countryCode)) {
        return normalizeInternationalStructuredLocation(
            countryCode,
            regionId,
            localityId,
            regionName,
            localityName,
        );
    }

    return { countryCode, regionId, regionName, localityId, localityName };
}

export async function normalizeStructuredLocationAsync(
    input: Partial<StructuredLocation> | null | undefined,
): Promise<StructuredLocation> {
    const countryCode = normalizeCountryCode(input?.countryCode);
    if (countryCode !== 'CL' && hasInternationalCatalog(countryCode)) {
        await loadCountryLocationData(countryCode);
    }
    return normalizeStructuredLocation(input);
}

export function structuredLocationFromLegacyNames(
    countryCode: string,
    regionName?: string | null,
    localityName?: string | null,
): StructuredLocation {
    const code = normalizeCountryCode(countryCode);
    if (code !== 'CL') {
        if (hasInternationalCatalog(code) && getCachedCountryLocationData(code)) {
            const regionMatch = matchInternationalRegionByName(code, regionName);
            const localityMatch = regionMatch
                ? matchInternationalLocalityByName(code, regionMatch.id, localityName)
                : null;
            return normalizeStructuredLocation({
                countryCode: code,
                regionId: regionMatch?.id ?? null,
                regionName: regionMatch?.name ?? regionName?.trim() ?? null,
                localityId: localityMatch,
                localityName: localityMatch ?? localityName?.trim() ?? null,
            });
        }
        return {
            countryCode: code,
            regionId: null,
            regionName: regionName?.trim() || null,
            localityId: null,
            localityName: localityName?.trim() || null,
        };
    }
    const regionMatch = regionName?.trim()
        ? LOCATION_REGIONS.find((r) => r.name.toLowerCase() === regionName.trim().toLowerCase())
        : undefined;
    const communeMatch = regionMatch && localityName?.trim()
        ? LOCATION_COMMUNES.find(
            (c) => c.regionId === regionMatch.id
                && c.name.toLowerCase() === localityName.trim().toLowerCase(),
        )
        : undefined;
    return normalizeStructuredLocation({
        countryCode: 'CL',
        regionId: regionMatch?.id ?? null,
        regionName: regionMatch?.name ?? regionName?.trim() ?? null,
        localityId: communeMatch?.id ?? null,
        localityName: communeMatch?.name ?? localityName?.trim() ?? null,
    });
}

export function formatStructuredLocationLabel(location: StructuredLocation): string {
    const country = getCountryByCode(location.countryCode)?.name ?? location.countryCode;
    const parts = [
        location.localityName,
        location.regionName,
        country,
    ].filter(Boolean);
    return parts.join(', ') || country;
}

export function structuredLocationsEqual(a: StructuredLocation, b: StructuredLocation): boolean {
    return a.countryCode === b.countryCode
        && (a.regionId ?? '') === (b.regionId ?? '')
        && (a.localityId ?? '') === (b.localityId ?? '')
        && (a.regionName ?? '').toLowerCase() === (b.regionName ?? '').toLowerCase()
        && (a.localityName ?? '').toLowerCase() === (b.localityName ?? '').toLowerCase();
}

export function getRegionsForCountry(countryCode: string) {
    const code = normalizeCountryCode(countryCode);
    if (code === 'CL') {
        return LOCATION_REGIONS;
    }
    return getCachedCountryLocationData(code)?.regions ?? [];
}

export function getLocalitiesForRegion(countryCode: string, regionId: string) {
    const code = normalizeCountryCode(countryCode);
    if (code === 'CL' && regionId) {
        return LOCATION_COMMUNES
            .filter((c) => c.regionId === regionId)
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    const cities = getCachedCountryLocationData(code)?.citiesByRegion[regionId] ?? [];
    return cities.map((name) => ({ id: name, regionId, name }));
}

export async function getRegionsForCountryAsync(countryCode: string) {
    const code = normalizeCountryCode(countryCode);
    if (code === 'CL') return LOCATION_REGIONS;
    return getInternationalRegions(code);
}

export async function getLocalitiesForRegionAsync(countryCode: string, regionId: string) {
    const code = normalizeCountryCode(countryCode);
    if (code === 'CL' && regionId) {
        return getLocalitiesForRegion(code, regionId);
    }
    return getInternationalLocalities(code, regionId);
}

export type LocationFieldLabels = {
    region: string;
    locality: string;
    regionPlaceholder: string;
    localityPlaceholder: string;
    catalogHint: string | null;
};

/** Etiquetas según país (estado/provincia/comuna autónoma). */
export function getLocationFieldLabels(countryCode: string): LocationFieldLabels {
    const code = normalizeCountryCode(countryCode);
    if (code === 'CL') {
        return {
            region: 'Región',
            locality: 'Comuna / ciudad',
            regionPlaceholder: 'Selecciona región',
            localityPlaceholder: 'Selecciona comuna',
            catalogHint: null,
        };
    }
    if (code === 'MX' || code === 'US') {
        return {
            region: 'Estado',
            locality: 'Ciudad',
            regionPlaceholder: 'Selecciona estado',
            localityPlaceholder: 'Selecciona o busca ciudad',
            catalogHint: null,
        };
    }
    if (code === 'ES') {
        return {
            region: 'Comunidad autónoma',
            locality: 'Ciudad',
            regionPlaceholder: 'Selecciona comunidad autónoma',
            localityPlaceholder: 'Selecciona o busca ciudad',
            catalogHint: null,
        };
    }
    if (code === 'DE') {
        return {
            region: 'Estado federado',
            locality: 'Ciudad',
            regionPlaceholder: 'Selecciona estado',
            localityPlaceholder: 'Selecciona o busca ciudad',
            catalogHint: null,
        };
    }
    if (code === 'PR') {
        return {
            region: 'Territorio',
            locality: 'Ciudad',
            regionPlaceholder: 'Puerto Rico',
            localityPlaceholder: 'Selecciona ciudad',
            catalogHint: null,
        };
    }
    return {
        region: 'Región o estado',
        locality: 'Ciudad',
        regionPlaceholder: 'Selecciona región o estado',
        localityPlaceholder: 'Selecciona o busca ciudad',
        catalogHint: null,
    };
}

export { hasInternationalCatalog, loadCountryLocationData };
