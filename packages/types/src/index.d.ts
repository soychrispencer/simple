import { z } from 'zod';
export declare const addressBookKindSchema: z.ZodEnum<{
    personal: "personal";
    shipping: "shipping";
    billing: "billing";
    company: "company";
    branch: "branch";
    warehouse: "warehouse";
    pickup: "pickup";
    other: "other";
}>;
export type AddressBookKind = z.infer<typeof addressBookKindSchema>;
export declare const listingLocationSourceModeSchema: z.ZodEnum<{
    saved_address: "saved_address";
    custom: "custom";
    area_only: "area_only";
}>;
export type ListingLocationSourceMode = z.infer<typeof listingLocationSourceModeSchema>;
export declare const listingLocationVisibilityModeSchema: z.ZodEnum<{
    exact: "exact";
    approximate: "approximate";
    sector_only: "sector_only";
    commune_only: "commune_only";
    hidden: "hidden";
}>;
export type ListingLocationVisibilityMode = z.infer<typeof listingLocationVisibilityModeSchema>;
export declare const geocodePrecisionSchema: z.ZodEnum<{
    exact: "exact";
    approximate: "approximate";
    commune: "commune";
    none: "none";
}>;
export type GeocodePrecision = z.infer<typeof geocodePrecisionSchema>;
export declare const geoPointSchema: z.ZodObject<{
    latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    precision: z.ZodDefault<z.ZodEnum<{
        exact: "exact";
        approximate: "approximate";
        commune: "commune";
        none: "none";
    }>>;
}, z.core.$strip>;
export type GeoPoint = z.infer<typeof geoPointSchema>;
export declare const addressBookEntrySchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodDefault<z.ZodEnum<{
        personal: "personal";
        shipping: "shipping";
        billing: "billing";
        company: "company";
        branch: "branch";
        warehouse: "warehouse";
        pickup: "pickup";
        other: "other";
    }>>;
    label: z.ZodString;
    countryCode: z.ZodDefault<z.ZodString>;
    regionId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    regionName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    communeId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    communeName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    neighborhood: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLine1: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLine2: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    postalCode: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    contactName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    contactPhone: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    isDefault: z.ZodDefault<z.ZodBoolean>;
    geoPoint: z.ZodDefault<z.ZodObject<{
        latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        precision: z.ZodDefault<z.ZodEnum<{
            exact: "exact";
            approximate: "approximate";
            commune: "commune";
            none: "none";
        }>>;
    }, z.core.$strip>>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    updatedAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type AddressBookEntry = z.infer<typeof addressBookEntrySchema>;
export declare const listingLocationSchema: z.ZodObject<{
    sourceMode: z.ZodDefault<z.ZodEnum<{
        saved_address: "saved_address";
        custom: "custom";
        area_only: "area_only";
    }>>;
    sourceAddressId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    countryCode: z.ZodDefault<z.ZodString>;
    regionId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    regionName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    communeId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    communeName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    neighborhood: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLine1: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLine2: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    postalCode: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    geoPoint: z.ZodDefault<z.ZodObject<{
        latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        precision: z.ZodDefault<z.ZodEnum<{
            exact: "exact";
            approximate: "approximate";
            commune: "commune";
            none: "none";
        }>>;
    }, z.core.$strip>>;
    visibilityMode: z.ZodDefault<z.ZodEnum<{
        exact: "exact";
        approximate: "approximate";
        sector_only: "sector_only";
        commune_only: "commune_only";
        hidden: "hidden";
    }>>;
    publicMapEnabled: z.ZodDefault<z.ZodBoolean>;
    publicGeoPoint: z.ZodDefault<z.ZodObject<{
        latitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        longitude: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        precision: z.ZodDefault<z.ZodEnum<{
            exact: "exact";
            approximate: "approximate";
            commune: "commune";
            none: "none";
        }>>;
    }, z.core.$strip>>;
    publicLabel: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type ListingLocation = z.infer<typeof listingLocationSchema>;
export declare const valuationComparableSchema: z.ZodObject<{
    source: z.ZodString;
    externalId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    price: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    operationType: z.ZodDefault<z.ZodEnum<{
        sale: "sale";
        rent: "rent";
    }>>;
    propertyType: z.ZodString;
    regionId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    communeId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLabel: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    distanceKm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bedrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bathrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    areaM2: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    publishedAt: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    url: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type ValuationComparable = z.infer<typeof valuationComparableSchema>;
export declare const propertyValuationRequestSchema: z.ZodObject<{
    operationType: z.ZodEnum<{
        sale: "sale";
        rent: "rent";
    }>;
    propertyType: z.ZodString;
    regionId: z.ZodString;
    communeId: z.ZodString;
    neighborhood: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    addressLine1: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    areaM2: z.ZodNumber;
    builtAreaM2: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bedrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bathrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    parkingSpaces: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    storageUnits: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    yearBuilt: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    condition: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type PropertyValuationRequest = z.infer<typeof propertyValuationRequestSchema>;
export declare const propertyValuationEstimateSchema: z.ZodObject<{
    currency: z.ZodDefault<z.ZodString>;
    minPrice: z.ZodNumber;
    estimatedPrice: z.ZodNumber;
    maxPrice: z.ZodNumber;
    estimatedPricePerM2: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    confidenceScore: z.ZodNumber;
    comparablesUsed: z.ZodNumber;
    comparables: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        externalId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        title: z.ZodString;
        price: z.ZodNumber;
        currency: z.ZodDefault<z.ZodString>;
        operationType: z.ZodDefault<z.ZodEnum<{
            sale: "sale";
            rent: "rent";
        }>>;
        propertyType: z.ZodString;
        regionId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        communeId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        addressLabel: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        distanceKm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        bedrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        bathrooms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        areaM2: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        publishedAt: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        url: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    notes: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type PropertyValuationEstimate = z.infer<typeof propertyValuationEstimateSchema>;
export declare function createEmptyListingLocation(overrides?: Partial<ListingLocation>): ListingLocation;
export declare function createAddressBookEntry(input: Omit<AddressBookEntry, 'geoPoint'> & {
    geoPoint?: Partial<GeoPoint>;
}): AddressBookEntry;
export declare function buildLocationPublicLabel(location: Partial<ListingLocation> | null | undefined): string;
export declare function buildAddressBookSummary(address: Partial<AddressBookEntry> | null | undefined): string;
