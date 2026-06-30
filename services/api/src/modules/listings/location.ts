import { z } from 'zod';
import { asString } from '../shared/helpers.js';

export type GeocodePrecision = 'exact' | 'approximate' | 'commune' | 'none';
export type GeocodeProvider = 'none' | 'catalog_seed' | 'manual' | 'external';
export type ListingLocationSourceMode = 'saved_address' | 'custom' | 'area_only';
export type ListingLocationVisibilityMode = 'exact' | 'approximate' | 'sector_only' | 'commune_only' | 'hidden';

export type GeoPoint = {
    latitude: number | null;
    longitude: number | null;
    precision: GeocodePrecision;
    provider?: GeocodeProvider;
    accuracyMeters?: number | null;
};

export type ListingLocation = {
    sourceMode: ListingLocationSourceMode;
    sourceAddressId: string | null;
    countryCode: string;
    regionId: string | null;
    regionName: string | null;
    communeId: string | null;
    communeName: string | null;
    neighborhood: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    geoPoint: GeoPoint;
    visibilityMode: ListingLocationVisibilityMode;
    publicMapEnabled: boolean;
    publicGeoPoint: GeoPoint;
    publicLabel: string;
};

export const geocodePrecisionSchema = z.enum(['exact', 'approximate', 'commune', 'none']);
export const geocodeProviderSchema = z.enum(['none', 'catalog_seed', 'manual', 'external']);

export const geoPointSchema = z.object({
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    precision: geocodePrecisionSchema.default('none'),
    provider: geocodeProviderSchema.optional(),
    accuracyMeters: z.number().positive().nullable().optional(),
});

export const listingLocationSchema = z.object({
    sourceMode: z.enum(['saved_address', 'custom', 'area_only']).default('area_only'),
    sourceAddressId: z.string().trim().nullable().default(null),
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().nullable().default(null),
    regionName: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    communeName: z.string().trim().nullable().default(null),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    addressLine2: z.string().trim().nullable().default(null),
    postalCode: z.string().trim().nullable().default(null),
    geoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    visibilityMode: z.enum(['exact', 'approximate', 'sector_only', 'commune_only', 'hidden']).default('commune_only'),
    publicMapEnabled: z.boolean().default(true),
    publicGeoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    publicLabel: z.string().trim().max(160).default(''),
});

export const geocodeLocationRequestSchema = z.object({
    location: listingLocationSchema,
});

const COMMUNE_CENTERS: Record<string, { latitude: number; longitude: number }> = {
    providencia: { latitude: -33.4262, longitude: -70.6111 },
    'rm-providencia': { latitude: -33.4262, longitude: -70.6111 },
    nunoa: { latitude: -33.4543, longitude: -70.5972 },
    'rm-nunoa': { latitude: -33.4543, longitude: -70.5972 },
    'las-condes': { latitude: -33.4080, longitude: -70.5672 },
    'rm-las-condes': { latitude: -33.4080, longitude: -70.5672 },
    santiago: { latitude: -33.4489, longitude: -70.6693 },
    'rm-santiago': { latitude: -33.4489, longitude: -70.6693 },
    colina: { latitude: -33.2000, longitude: -70.6833 },
    'rm-colina': { latitude: -33.2000, longitude: -70.6833 },
    'v-vina-del-mar': { latitude: -33.0245, longitude: -71.5518 },
    'v-valparaiso': { latitude: -33.0472, longitude: -71.6127 },
    'bio-concepcion': { latitude: -36.8270, longitude: -73.0498 },
    'coq-la-serena': { latitude: -29.9045, longitude: -71.2489 },
};

export function makeGeoPoint(
    latitude: number | null,
    longitude: number | null,
    precision: GeocodePrecision,
    provider: GeocodeProvider = 'none',
    accuracyMeters: number | null = null,
): GeoPoint {
    return { latitude, longitude, precision, provider, accuracyMeters };
}

function hashString(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}

function jitterFromHash(hash: number, spread: number): number {
    const normalized = (hash % 10000) / 10000;
    return (normalized - 0.5) * spread;
}

function buildLocationSearchQuery(
    location: Partial<ListingLocation>,
    options: { includeNeighborhood?: boolean; includeAddressLine2?: boolean } = {},
): string {
    return [
        asString(location.addressLine1),
        options.includeAddressLine2 ? asString(location.addressLine2) : '',
        options.includeNeighborhood ? asString(location.neighborhood) : '',
        asString(location.communeName) || asString(location.communeId),
        asString(location.regionName) || asString(location.regionId),
        asString(location.countryCode).toUpperCase() === 'CL' ? 'Chile' : asString(location.countryCode),
    ]
        .filter(Boolean)
        .join(', ');
}

function hasTrustedGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
    return Boolean(
        point
        && point.latitude != null
        && point.longitude != null
        && point.provider
        && point.provider !== 'none'
        && point.provider !== 'catalog_seed',
    );
}

function buildPublicGeoPoint(location: ListingLocation, internalGeoPoint: GeoPoint): GeoPoint {
    const communeKey = asString(location.communeId).toLowerCase();
    const basePoint = COMMUNE_CENTERS[communeKey];
    const hashBase = hashString([
        asString(location.addressLine1),
        asString(location.addressLine2),
        asString(location.neighborhood),
        asString(location.communeId),
    ].join('|'));

    if (location.visibilityMode === 'hidden' || !location.publicMapEnabled) {
        return makeGeoPoint(null, null, 'none');
    }

    switch (location.visibilityMode) {
        case 'exact':
            return hasTrustedGeoPoint(internalGeoPoint)
                ? makeGeoPoint(
                    internalGeoPoint.latitude,
                    internalGeoPoint.longitude,
                    'exact',
                    internalGeoPoint.provider ?? 'external',
                    internalGeoPoint.accuracyMeters ?? 25,
                )
                : makeGeoPoint(null, null, 'none');
        case 'approximate':
            if (hasTrustedGeoPoint(internalGeoPoint)) {
                return makeGeoPoint(
                    internalGeoPoint.latitude! + jitterFromHash(hashBase >> 2, 0.004),
                    internalGeoPoint.longitude! + jitterFromHash(hashBase >> 3, 0.005),
                    'approximate',
                    internalGeoPoint.provider ?? 'external',
                    350,
                );
            }
            if (basePoint) {
                return makeGeoPoint(basePoint.latitude, basePoint.longitude, 'commune', 'catalog_seed', 1800);
            }
            return makeGeoPoint(null, null, 'none');
        case 'sector_only':
            if (hasTrustedGeoPoint(internalGeoPoint)) {
                return makeGeoPoint(
                    internalGeoPoint.latitude! + jitterFromHash(hashBase >> 4, 0.009),
                    internalGeoPoint.longitude! + jitterFromHash(hashBase >> 5, 0.011),
                    'approximate',
                    internalGeoPoint.provider ?? 'external',
                    700,
                );
            }
            if (basePoint) {
                return makeGeoPoint(
                    basePoint.latitude + jitterFromHash(hashBase >> 4, 0.012),
                    basePoint.longitude + jitterFromHash(hashBase >> 5, 0.014),
                    'approximate',
                    'catalog_seed',
                    1200,
                );
            }
            return makeGeoPoint(null, null, 'none');
        case 'commune_only':
            return basePoint
                ? makeGeoPoint(basePoint.latitude, basePoint.longitude, 'commune', 'catalog_seed', 1800)
                : makeGeoPoint(null, null, 'none');
        default:
            return makeGeoPoint(null, null, 'none');
    }
}

export function geocodeListingLocation(location: ListingLocation): ListingLocation {
    const communeKey = asString(location.communeId).toLowerCase();
    const basePoint = COMMUNE_CENTERS[communeKey];
    const hasAddress = asString(location.addressLine1).length > 0;
    const geoPoint = hasTrustedGeoPoint(location.geoPoint)
        ? location.geoPoint
        : (!hasAddress && basePoint
            ? makeGeoPoint(basePoint.latitude, basePoint.longitude, 'commune', 'catalog_seed', 1800)
            : makeGeoPoint(null, null, 'none'));
    const publicGeoPoint = buildPublicGeoPoint(location, geoPoint);

    const nextLocation: ListingLocation = {
        ...location,
        geoPoint,
        publicGeoPoint,
    };

    return {
        ...nextLocation,
        publicLabel: buildLocationPublicLabel(nextLocation),
    };
}

export async function geocodeLocationRemotely(location: ListingLocation): Promise<ListingLocation | null> {
    if (hasTrustedGeoPoint(location.geoPoint)) {
        return geocodeListingLocation(location);
    }

    const queries = Array.from(new Set([
        buildLocationSearchQuery(location),
        [
            asString(location.addressLine1),
            asString(location.communeName) || asString(location.communeId),
            asString(location.countryCode).toUpperCase() === 'CL' ? 'Chile' : asString(location.countryCode),
        ].filter(Boolean).join(', '),
        [
            asString(location.addressLine1),
            asString(location.regionName) || asString(location.regionId),
            asString(location.countryCode).toUpperCase() === 'CL' ? 'Chile' : asString(location.countryCode),
        ].filter(Boolean).join(', '),
        buildLocationSearchQuery(location, { includeNeighborhood: true }),
        buildLocationSearchQuery(location, { includeNeighborhood: true, includeAddressLine2: true }),
    ].filter(Boolean)));
    if (queries.length === 0) return null;

    const googleKey = asString(process.env.GOOGLE_MAPS_API_KEY)
        || asString(process.env.GOOGLE_GEOCODING_API_KEY)
        || asString(process.env.GOOGLE_MAPS_SERVER_KEY);

    try {
        if (googleKey) {
            for (const query of queries) {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=cl&language=es&key=${encodeURIComponent(googleKey)}`,
                );
                if (!response.ok) continue;
                const payload = await response.json().catch(() => null) as {
                    status?: string;
                    results?: Array<{
                        geometry?: {
                            location?: { lat?: number; lng?: number };
                            location_type?: string;
                        };
                    }>;
                } | null;
                const result = payload?.status === 'OK' && Array.isArray(payload.results) ? payload.results[0] : null;
                const lat = result?.geometry?.location?.lat;
                const lng = result?.geometry?.location?.lng;
                if (typeof lat === 'number' && typeof lng === 'number') {
                    const locationType = asString(result?.geometry?.location_type).toUpperCase();
                    const accuracyMeters = locationType === 'ROOFTOP' ? 20 : locationType === 'RANGE_INTERPOLATED' ? 60 : 220;
                    const precision: GeocodePrecision = locationType === 'APPROXIMATE' ? 'approximate' : 'exact';
                    return geocodeListingLocation({
                        ...location,
                        geoPoint: makeGeoPoint(lat, lng, precision, 'external', accuracyMeters),
                    });
                }
            }
        }

        for (const query of queries) {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&addressdetails=1&q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'User-Agent': 'simple-v2-geocoder/1.0',
                    },
                },
            );
            if (!response.ok) continue;
            const payload = await response.json().catch(() => null) as Array<{ lat?: string; lon?: string }> | null;
            const first = Array.isArray(payload) ? payload[0] : null;
            const lat = first?.lat ? Number(first.lat) : NaN;
            const lon = first?.lon ? Number(first.lon) : NaN;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

            return geocodeListingLocation({
                ...location,
                geoPoint: makeGeoPoint(lat, lon, 'exact', 'external', 35),
            });
        }
    } catch {
        return null;
    }
    return null;
}

export function buildLocationPublicLabel(location: Partial<ListingLocation> | null | undefined): string {
    if (!location) return '';
    const explicitPublicLabel = asString(location.publicLabel);
    if (explicitPublicLabel) return humanizePublicLocationFallback(explicitPublicLabel);

    const visibilityMode = location.visibilityMode ?? 'commune_only';
    const address = asString(location.addressLine1);
    const neighborhood = asString(location.neighborhood);
    const commune = humanizePublicLocationFallback(asString(location.communeName) || asString(location.communeId));
    const region = humanizePublicLocationFallback(asString(location.regionName) || asString(location.regionId));

    if (visibilityMode === 'hidden') return '';
    if (visibilityMode === 'exact') return [address, neighborhood, commune, region].filter(Boolean).join(', ');
    if (visibilityMode === 'approximate' || visibilityMode === 'sector_only') {
        return [neighborhood, commune, region].filter(Boolean).join(', ');
    }
    return [commune, region].filter(Boolean).join(', ');
}

export function humanizePublicLocationFallback(value: string | null | undefined): string {
    const normalized = asString(value);
    if (!normalized) return '';
    if (normalized.includes(',')) return normalized;
    const compact = normalized.toLowerCase().trim();
    const withoutRegionPrefix = compact.replace(
        /^(rm|arica|tarapaca|antofagasta|atacama|coquimbo|valparaiso|ohiggins|maule|nuble|bio|araucania|rios|lagos|aysen|magallanes)-/,
        '',
    );
    const label = withoutRegionPrefix.replace(/-/g, ' ').trim();
    if (!label) return normalized;
    return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeListingLocation(value: unknown): ListingLocation | undefined {
    const parsed = listingLocationSchema.safeParse(value);
    if (!parsed.success) return undefined;
    const next = parsed.data;
    const normalized = {
        ...next,
        publicMapEnabled: next.visibilityMode === 'hidden' ? false : next.publicMapEnabled,
    };
    const geocoded = geocodeListingLocation(normalized);

    return {
        ...geocoded,
        publicLabel: geocoded.publicLabel.trim() || buildLocationPublicLabel(geocoded),
    };
}
