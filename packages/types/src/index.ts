import { z } from 'zod';

export const listingLocationKindSchema = z.enum([
    'personal',
    'office',
    'clinic',
    'store',
    'branch',
    'company',
    'warehouse',
    'shipping',
    'pickup',
    'billing',
    'other',
]);
export type ListingLocationKind = z.infer<typeof listingLocationKindSchema>;

export const addressBookKindSchema = listingLocationKindSchema;
export type AddressBookKind = ListingLocationKind;

export const listingLocationSourceModeSchema = z.enum(['saved_address', 'custom', 'area_only']);
export type ListingLocationSourceMode = z.infer<typeof listingLocationSourceModeSchema>;

export const listingLocationVisibilityModeSchema = z.enum([
    'exact',
    'approximate',
    'sector_only',
    'commune_only',
    'hidden',
]);
export type ListingLocationVisibilityMode = z.infer<typeof listingLocationVisibilityModeSchema>;

export const geocodePrecisionSchema = z.enum(['exact', 'approximate', 'commune', 'none']);
export type GeocodePrecision = z.infer<typeof geocodePrecisionSchema>;
export const geocodeProviderSchema = z.enum(['none', 'catalog_seed', 'manual', 'external']);
export type GeocodeProvider = z.infer<typeof geocodeProviderSchema>;

export const geoPointSchema = z.object({
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    precision: geocodePrecisionSchema.default('none'),
    provider: geocodeProviderSchema.optional(),
    accuracyMeters: z.number().positive().nullable().optional(),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

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
    arrivalInstructions: z.string().trim().nullable().default(null),
    isDefault: z.boolean().default(false),
    geoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    createdAt: z.number().int().nonnegative().optional(),
    updatedAt: z.number().int().nonnegative().optional(),
});
export type AddressBookEntry = z.infer<typeof addressBookEntrySchema>;

export const listingLocationSchema = z.object({
    sourceMode: listingLocationSourceModeSchema.default('area_only'),
    sourceAddressId: z.string().trim().nullable().default(null),
    countryCode: z.string().trim().min(2).max(3).default('CL'),
    regionId: z.string().trim().nullable().default(null),
    regionName: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    communeName: z.string().trim().nullable().default(null),
    label: z.string().trim().nullable().default(null),
    kind: listingLocationKindSchema.nullable().default(null),
    neighborhood: z.string().trim().nullable().default(null),
    addressLine1: z.string().trim().nullable().default(null),
    addressLine2: z.string().trim().nullable().default(null),
    postalCode: z.string().trim().nullable().default(null),
    arrivalInstructions: z.string().trim().nullable().default(null),
    geoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    visibilityMode: listingLocationVisibilityModeSchema.default('commune_only'),
    publicMapEnabled: z.boolean().default(true),
    publicGeoPoint: geoPointSchema.default({ latitude: null, longitude: null, precision: 'none' }),
    publicLabel: z.string().trim().max(160).default(''),
});
export type ListingLocation = z.infer<typeof listingLocationSchema>;

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
export type ValuationComparable = z.infer<typeof valuationComparableSchema>;

export const valuationHistoricalPointSchema = z.object({
    ts: z.number().int().nonnegative(),
    medianPrice: z.number().nonnegative(),
    medianPricePerM2: z.number().nonnegative().nullable().default(null),
    sampleSize: z.number().int().min(0).default(0),
});
export type ValuationHistoricalPoint = z.infer<typeof valuationHistoricalPointSchema>;

export const valuationSourceBreakdownSchema = z.object({
    source: z.string().trim().min(1),
    comparables: z.number().int().min(0),
    weight: z.number().min(0).max(1),
    freshnessDays: z.number().nonnegative().nullable().default(null),
});
export type ValuationSourceBreakdown = z.infer<typeof valuationSourceBreakdownSchema>;

export const propertyValuationSourceLicenseSchema = z.enum(['internal', 'partner_feed', 'commercial_feed', 'public_open_data']);
export type PropertyValuationSourceLicense = z.infer<typeof propertyValuationSourceLicenseSchema>;

export const propertyValuationSourceTransportSchema = z.enum(['snapshot', 'remote_json']);
export type PropertyValuationSourceTransport = z.infer<typeof propertyValuationSourceTransportSchema>;

export const propertyValuationSourceStatusSchema = z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    license: propertyValuationSourceLicenseSchema,
    transport: propertyValuationSourceTransportSchema,
    status: z.enum(['ready', 'degraded', 'disabled']),
    sourceUrl: z.string().trim().nullable().default(null),
    itemCount: z.number().int().min(0).default(0),
    lastSyncAt: z.number().int().nonnegative().nullable().default(null),
    lastError: z.string().trim().nullable().default(null),
    supportsHistory: z.boolean().default(false),
});
export type PropertyValuationSourceStatus = z.infer<typeof propertyValuationSourceStatusSchema>;

export const valuationConfidenceBreakdownSchema = z.object({
    dataCoverage: z.number().int().min(0).max(100).default(0),
    locationAccuracy: z.number().int().min(0).max(100).default(0),
    similarity: z.number().int().min(0).max(100).default(0),
    recency: z.number().int().min(0).max(100).default(0),
});
export type ValuationConfidenceBreakdown = z.infer<typeof valuationConfidenceBreakdownSchema>;

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
export type PropertyValuationRequest = z.infer<typeof propertyValuationRequestSchema>;

export const propertyValuationEstimateSchema = z.object({
    engineVersion: z.string().trim().default('v1'),
    currency: z.string().trim().default('CLP'),
    minPrice: z.number().nonnegative(),
    estimatedPrice: z.number().nonnegative(),
    maxPrice: z.number().nonnegative(),
    estimatedPricePerM2: z.number().nonnegative().nullable().default(null),
    confidenceScore: z.number().int().min(0).max(100),
    confidenceBreakdown: valuationConfidenceBreakdownSchema.default({
        dataCoverage: 0,
        locationAccuracy: 0,
        similarity: 0,
        recency: 0,
    }),
    comparablesUsed: z.number().int().min(0),
    comparables: z.array(valuationComparableSchema).default([]),
    sourceBreakdown: z.array(valuationSourceBreakdownSchema).default([]),
    historicalSeries: z.array(valuationHistoricalPointSchema).default([]),
    estimatedLiquidityDays: z.number().int().positive().nullable().default(null),
    marketTrendPct30d: z.number().nullable().default(null),
    notes: z.array(z.string()).default([]),
});
export type PropertyValuationEstimate = z.infer<typeof propertyValuationEstimateSchema>;

export const vehicleValuationComparableSchema = z.object({
    source: z.string().trim().min(1),
    externalId: z.string().trim().nullable().default(null),
    title: z.string().trim().min(1),
    price: z.number().positive(),
    currency: z.string().trim().default('CLP'),
    operationType: z.enum(['sale', 'rent']).default('sale'),
    vehicleType: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().nullable().default(null),
    year: z.number().int().nullable().default(null),
    mileageKm: z.number().nonnegative().nullable().default(null),
    fuelType: z.string().trim().nullable().default(null),
    transmission: z.string().trim().nullable().default(null),
    bodyType: z.string().trim().nullable().default(null),
    regionId: z.string().trim().nullable().default(null),
    communeId: z.string().trim().nullable().default(null),
    addressLabel: z.string().trim().nullable().default(null),
    distanceKm: z.number().nonnegative().nullable().default(null),
    publishedAt: z.number().int().nonnegative().nullable().default(null),
    url: z.string().trim().nullable().default(null),
});
export type VehicleValuationComparable = z.infer<typeof vehicleValuationComparableSchema>;

export const vehicleValuationRequestSchema = z.object({
    operationType: z.enum(['sale', 'rent']),
    vehicleType: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().nullable().default(null),
    year: z.number().int().min(1900).max(2100),
    mileageKm: z.number().nonnegative().nullable().default(null),
    condition: z.string().trim().nullable().default(null),
    fuelType: z.string().trim().nullable().default(null),
    transmission: z.string().trim().nullable().default(null),
    traction: z.string().trim().nullable().default(null),
    bodyType: z.string().trim().nullable().default(null),
    regionId: z.string().trim().min(1),
    communeId: z.string().trim().min(1),
    addressLine1: z.string().trim().nullable().default(null),
});
export type VehicleValuationRequest = z.infer<typeof vehicleValuationRequestSchema>;

export const vehicleValuationEstimateSchema = z.object({
    engineVersion: z.string().trim().default('v1'),
    currency: z.string().trim().default('CLP'),
    minPrice: z.number().nonnegative(),
    estimatedPrice: z.number().nonnegative(),
    maxPrice: z.number().nonnegative(),
    confidenceScore: z.number().int().min(0).max(100),
    confidenceBreakdown: valuationConfidenceBreakdownSchema.default({
        dataCoverage: 0,
        locationAccuracy: 0,
        similarity: 0,
        recency: 0,
    }),
    comparablesUsed: z.number().int().min(0),
    comparables: z.array(vehicleValuationComparableSchema).default([]),
    sourceBreakdown: z.array(valuationSourceBreakdownSchema).default([]),
    historicalSeries: z.array(valuationHistoricalPointSchema).default([]),
    estimatedLiquidityDays: z.number().int().positive().nullable().default(null),
    marketTrendPct30d: z.number().nullable().default(null),
    notes: z.array(z.string()).default([]),
});
export type VehicleValuationEstimate = z.infer<typeof vehicleValuationEstimateSchema>;

export const vehicleValuationSourceStatusSchema = propertyValuationSourceStatusSchema;
export type VehicleValuationSourceStatus = z.infer<typeof vehicleValuationSourceStatusSchema>;

export const geocodeLocationRequestSchema = z.object({
    location: listingLocationSchema,
});
export type GeocodeLocationRequest = z.infer<typeof geocodeLocationRequestSchema>;

export const geocodeLocationResponseSchema = z.object({
    ok: z.boolean(),
    provider: geocodeProviderSchema.default('none'),
    location: listingLocationSchema.optional(),
    error: z.string().optional(),
});
export type GeocodeLocationResponse = z.infer<typeof geocodeLocationResponseSchema>;

export function createEmptyListingLocation(
    overrides: Partial<ListingLocation> = {}
): ListingLocation {
    return listingLocationSchema.parse(overrides);
}

export function createAddressBookEntry(
    input: Omit<AddressBookEntry, 'geoPoint'> & { geoPoint?: Partial<GeoPoint> }
): AddressBookEntry {
    return addressBookEntrySchema.parse({
        ...input,
        geoPoint: {
            latitude: input.geoPoint?.latitude ?? null,
            longitude: input.geoPoint?.longitude ?? null,
            precision: input.geoPoint?.precision ?? 'none',
            provider: input.geoPoint?.provider ?? 'none',
            accuracyMeters: input.geoPoint?.accuracyMeters ?? null,
        },
    });
}

export function patchListingLocation(
    current: ListingLocation,
    patch: Partial<ListingLocation>
): ListingLocation {
    const next: ListingLocation = {
        ...current,
        ...patch,
        geoPoint: {
            ...current.geoPoint,
            ...(patch.geoPoint ?? {}),
        },
        publicGeoPoint: {
            ...current.publicGeoPoint,
            ...(patch.publicGeoPoint ?? {}),
        },
    };

    return {
        ...next,
        publicMapEnabled: next.visibilityMode === 'hidden' ? false : next.publicMapEnabled,
        publicLabel: buildLocationPublicLabel(next),
    };
}

export function applyAddressBookEntryToLocation(
    address: AddressBookEntry,
    current: ListingLocation
): ListingLocation {
    return patchListingLocation(current, {
        sourceMode: 'saved_address',
        sourceAddressId: address.id,
        countryCode: address.countryCode,
        regionId: address.regionId,
        regionName: address.regionName,
        communeId: address.communeId,
        communeName: address.communeName,
        neighborhood: address.neighborhood,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        postalCode: address.postalCode,
        geoPoint: address.geoPoint,
    });
}

export function buildLocationPublicLabel(location: Partial<ListingLocation> | null | undefined): string {
    if (!location) return '';

    const visibilityMode = location.visibilityMode ?? 'commune_only';
    const parts = {
        address: (location.addressLine1 ?? '').trim(),
        neighborhood: (location.neighborhood ?? '').trim(),
        commune: (location.communeName ?? '').trim(),
        region: (location.regionName ?? '').trim(),
    };

    if (visibilityMode === 'hidden') return '';
    if (visibilityMode === 'exact') {
        return [parts.address, parts.neighborhood, parts.commune, parts.region].filter(Boolean).join(', ');
    }
    if (visibilityMode === 'approximate' || visibilityMode === 'sector_only') {
        return [parts.neighborhood, parts.commune, parts.region].filter(Boolean).join(', ');
    }
    return [parts.commune, parts.region].filter(Boolean).join(', ');
}

export function buildAddressBookSummary(address: Partial<AddressBookEntry> | null | undefined): string {
    if (!address) return '';
    return [
        (address.label ?? '').trim(),
        (address.addressLine1 ?? '').trim(),
        (address.communeName ?? '').trim(),
        (address.regionName ?? '').trim(),
    ]
        .filter(Boolean)
        .join(' · ');
}
