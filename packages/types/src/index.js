import { z } from 'zod';
export const addressBookKindSchema = z.enum([
    'personal',
    'shipping',
    'billing',
    'company',
    'branch',
    'warehouse',
    'pickup',
    'other',
]);
export const listingLocationSourceModeSchema = z.enum(['saved_address', 'custom', 'area_only']);
export const listingLocationVisibilityModeSchema = z.enum([
    'exact',
    'approximate',
    'sector_only',
    'commune_only',
    'hidden',
]);
export const geocodePrecisionSchema = z.enum(['exact', 'approximate', 'commune', 'none']);
export const geoPointSchema = z.object({
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    precision: geocodePrecisionSchema.default('none'),
});
export const addressBookEntrySchema = z.object({
    id: z.string().min(1),
    kind: addressBookKindSchema.default('personal'),
    label: z.string().trim().min(1).max(80),
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().nullable().default(null),
    regionName: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    communeName: z.string().trim().nullable().default(null),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    addressLine2: z.string().trim().nullable().default(null),
    postalCode: z.string().trim().nullable().default(null),
    contactName: z.string().trim().nullable().default(null),
    contactPhone: z.string().trim().nullable().default(null),
    isDefault: z.boolean().default(false),
    geoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    createdAt: z.number().int().nonnegative().optional(),
    updatedAt: z.number().int().nonnegative().optional(),
});
export const listingLocationSchema = z.object({
    sourceMode: listingLocationSourceModeSchema.default('area_only'),
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
    visibilityMode: listingLocationVisibilityModeSchema.default('commune_only'),
    publicMapEnabled: z.boolean().default(true),
    publicGeoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    publicLabel: z.string().trim().max(160).default(''),
});
export const valuationComparableSchema = z.object({
    source: z.string().trim().min(1),
    externalId: z.string().trim().nullable().default(null),
    title: z.string().trim().min(1),
    price: z.number().positive(),
    currency: z.string().trim().default('CLP'),
    operationType: z.enum(['sale', 'rent']).default('sale'),
    propertyType: z.string().trim().min(1),
    regionId: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    addressLabel: z.string().trim().nullable().default(null),
    distanceKm: z.number().nonnegative().nullable().default(null),
    bedrooms: z.number().nonnegative().nullable().default(null),
    bathrooms: z.number().nonnegative().nullable().default(null),
    areaM2: z.number().positive().nullable().default(null),
    publishedAt: z.number().int().nonnegative().nullable().default(null),
    url: z.string().trim().nullable().default(null),
});
export const propertyValuationRequestSchema = z.object({
    operationType: z.enum(['sale', 'rent']),
    propertyType: z.string().trim().min(1),
    regionId: z.string().trim().min(1),
    communeId: z.string().trim().min(1),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    areaM2: z.number().positive(),
    builtAreaM2: z.number().positive().nullable().default(null),
    bedrooms: z.number().nonnegative().nullable().default(null),
    bathrooms: z.number().nonnegative().nullable().default(null),
    parkingSpaces: z.number().nonnegative().nullable().default(null),
    storageUnits: z.number().nonnegative().nullable().default(null),
    yearBuilt: z.number().int().nullable().default(null),
    condition: z.string().trim().nullable().default(null),
});
export const propertyValuationEstimateSchema = z.object({
    currency: z.string().trim().default('CLP'),
    minPrice: z.number().nonnegative(),
    estimatedPrice: z.number().nonnegative(),
    maxPrice: z.number().nonnegative(),
    estimatedPricePerM2: z.number().nonnegative().nullable().default(null),
    confidenceScore: z.number().int().min(0).max(100),
    comparablesUsed: z.number().int().min(0),
    comparables: z.array(valuationComparableSchema).default([]),
    notes: z.array(z.string()).default([]),
});
export function createEmptyListingLocation(overrides = {}) {
    return listingLocationSchema.parse(overrides);
}
export function createAddressBookEntry(input) {
    return addressBookEntrySchema.parse({
        ...input,
        geoPoint: {
            latitude: input.geoPoint?.latitude ?? null,
            longitude: input.geoPoint?.longitude ?? null,
            precision: input.geoPoint?.precision ?? 'none',
        },
    });
}
export function buildLocationPublicLabel(location) {
    if (!location)
        return '';
    const visibilityMode = location.visibilityMode ?? 'commune_only';
    const parts = {
        address: (location.addressLine1 ?? '').trim(),
        neighborhood: (location.neighborhood ?? '').trim(),
        commune: (location.communeName ?? '').trim(),
        region: (location.regionName ?? '').trim(),
    };
    if (visibilityMode === 'hidden')
        return '';
    if (visibilityMode === 'exact') {
        return [parts.address, parts.neighborhood, parts.commune, parts.region].filter(Boolean).join(', ');
    }
    if (visibilityMode === 'approximate' || visibilityMode === 'sector_only') {
        return [parts.neighborhood, parts.commune, parts.region].filter(Boolean).join(', ');
    }
    return [parts.commune, parts.region].filter(Boolean).join(', ');
}
export function buildAddressBookSummary(address) {
    if (!address)
        return '';
    return [
        (address.label ?? '').trim(),
        (address.addressLine1 ?? '').trim(),
        (address.communeName ?? '').trim(),
        (address.regionName ?? '').trim(),
    ]
        .filter(Boolean)
        .join(' · ');
}
