// Shared domain types across API modules

// Enums / Union Types
export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'verified' | 'suspended';
export type VerticalType = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type AccountType = 'general' | 'autos' | 'propiedades' | 'agenda' | 'crm_only';
export type AccountRole = 'owner' | 'admin' | 'agent';
export type CrmEntityType = 'listing' | 'service' | 'external';
export type AddressBookKind = 'personal' | 'shipping' | 'billing' | 'company' | 'branch' | 'warehouse' | 'pickup' | 'other';
export type ListingLocationSourceMode = 'saved_address' | 'custom' | 'area_only';
export type ListingLocationVisibilityMode = 'exact' | 'approximate' | 'sector_only' | 'commune_only' | 'hidden';
export type GeocodePrecision = 'exact' | 'approximate' | 'commune' | 'none';
export type GeocodeProvider = 'none' | 'catalog_seed' | 'manual' | 'external';
export type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';
export type PortalKey = 'yapo' | 'chileautos' | 'mercadolibre' | 'facebook';
export type PortalSyncStatus = 'missing' | 'ready' | 'published' | 'failed';
export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
export type CheckoutKind = 'boost' | 'advertising' | 'subscription';
export type ValuationFeedLicense = 'internal' | 'partner_feed' | 'commercial_feed' | 'public_open_data';
export type ValuationFeedTransport = 'snapshot' | 'remote_json';
export type ValuationFeedHealth = 'ready' | 'degraded' | 'disabled';
export type PublicProfileAccountKind = 'individual' | 'independent' | 'company';
export type PublicProfileLeadRoutingMode = 'owner' | 'round_robin' | 'unassigned';
export type PublicProfileDayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Complex Types
export interface GeoPoint {
    latitude: number | null;
    longitude: number | null;
    precision: GeocodePrecision;
    accuracyMeters?: number | null;
}

export interface AddressBookEntry {
    id: string;
    kind: AddressBookKind;
    label: string;
    name: string;
    phone: string | null;
    email: string | null;
    countryCode: string;
    region: string | null;
    city: string | null;
    commune: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    instructions: string | null;
    latitude: number | null;
    longitude: number | null;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ListingLocation {
    sourceMode: ListingLocationSourceMode;
    sourceAddressId: string | null;
    countryCode: string;
    region: string | null;
    city: string | null;
    commune: string | null;
    latitude: number | null;
    longitude: number | null;
    precision: GeocodePrecision;
    addressLine: string | null;
    visibility: ListingLocationVisibilityMode;
    publicLabel: string;
}

export interface AppUser {
    id: string;
    email: string;
    passwordHash?: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    phone: string | null;
    imageUrl: string | null;
    whatsappEnabled: boolean;
    whatsappPhone: string | null;
    primaryAccountId?: string | null;
}

export interface PublicUser {
    id: string;
    email: string;
    name: string;
    imageUrl: string | null;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    primaryAccountId?: string | null;
}

export interface AccountRecord {
    id: string;
    name: string;
    type: AccountType;
    createdAt: number;
    updatedAt: number;
}

export interface AccountUserRecord {
    id: string;
    accountId: string;
    userId: string;
    role: AccountRole;
    createdAt: number;
    updatedAt: number;
}

export interface PublicProfileSocialLinks {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    x: string | null;
}

export interface PublicProfileTeamSocialLinks {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
}

export interface PublicProfileBusinessHour {
    day: PublicProfileDayId;
    open: string | null;
    close: string | null;
    closed: boolean;
}

export interface PublicProfileTeamMember {
    id: string;
    userId: string;
    vertical: VerticalType;
    role: string;
    order: number;
    bio: string | null;
    phone: string | null;
    email: string | null;
    imageUrl: string | null;
    socials: PublicProfileTeamSocialLinks;
    createdAt: number;
    updatedAt: number;
}

export interface SavedListingRecord {
    id: string;
    href: string;
    title: string;
    price: number;
    location: string;
    imageUrl: string | null;
    savedAt: number;
}

export interface FollowRecord {
    followeeUserId: string;
    vertical: VerticalType;
    followedAt: number;
}

export interface FeedClip {
    id: string;
    vertical: VerticalType;
    section: 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
    title: string;
    price: number;
    location: string;
    imageUrl: string | null;
    href: string;
    sellerUserId: string;
    sellerName: string;
    sellerImageUrl: string | null;
    sellerAccountType: AccountType;
    boosted?: boolean;
    featured?: boolean;
}

export interface BoostListingRecord {
    id: string;
    vertical: VerticalType;
    section: BoostSection;
    listingId: string;
    status: BoostOrderStatus;
    startDate: string;
    endDate: string;
    planId: BoostPlanId;
    createdAt: number;
    imageUrls?: string[];
}

export interface BoostPlanRecord {
    id: BoostPlanId;
    name: string;
    days: number;
    price: number;
    visibilityLift: string;
}

export interface BoostOrder {
    id: string;
    accountId?: string | null;
    userId: string;
    listingId: string;
    listingTitle: string;
    section: BoostSection;
    planId: BoostPlanId;
    status: BoostOrderStatus;
    createdAt: number;
    updatedAt: number;
}

export interface ListingPortalSyncRecord {
    portal: PortalKey;
    status: PortalSyncStatus;
    publishedAt: number | null;
    externalUrl: string | null;
    lastAttemptAt: number | null;
}

export interface ValuationHistoricalPoint {
    ts: number;
    medianPrice: number;
    medianPricePerM2: number | null;
    sampleSize: number;
}

export interface ValuationSourceBreakdown {
    source: string;
    comparables: number;
    weight: number;
    freshnessDays: number | null;
}

export interface ValuationConfidenceBreakdown {
    dataCoverage: number;
    locationAccuracy: number;
    similarity: number;
    recency: number;
}

export interface ValuationFeedSourceStatus {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    health: ValuationFeedHealth;
    lastLoadedAt: number | null;
    recordCount: number;
    supportsHistory: boolean;
}

export interface ValuationFeedConnectorLoadResult<T> {
    records: T[];
    historyBySegment?: Record<string, ValuationHistoricalPoint[]>;
    sourceUrl: string | null;
}

// Feed connector types for property valuation
export interface ValuationFeedConnector {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    supportsHistory: boolean;
    envUrlKey?: string;
    load: () => Promise<ValuationFeedConnectorLoadResult<ValuationFeedRecord>>;
}

export interface VehicleValuationFeedConnectorLoadResult {
    records: VehicleValuationFeedRecord[];
    historyBySegment?: Record<string, ValuationHistoricalPoint[]>;
    sourceUrl: string | null;
}

export interface VehicleValuationFeedConnector extends Omit<ValuationFeedConnector, 'load'> {
    load: () => Promise<VehicleValuationFeedConnectorLoadResult>;
}

// Valuation feed records
export interface ValuationFeedRecord {
    id: string;
    source: string;
    externalId: string | null;
    title: string;
    price: number;
    currency: string;
    operationType: 'sale' | 'rent';
    propertyType: string;
    regionId: string | null;
    communeId: string | null;
    addressLabel: string | null;
    latitude: number | null;
    longitude: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
    publishedAt: number | null;
    url: string | null;
    fetchedAt: number;
}

export interface VehicleValuationFeedRecord {
    id: string;
    source: string;
    externalId: string | null;
    title: string;
    price: number;
    currency: string;
    operationType: 'sale' | 'rent';
    vehicleType: string;
    brand: string;
    model: string;
    version: string | null;
    year: number | null;
    mileageKm: number | null;
    fuelType: string | null;
    transmission: string | null;
    bodyType: string | null;
    regionId: string | null;
    communeId: string | null;
    addressLabel: string | null;
    latitude: number | null;
    longitude: number | null;
    publishedAt: number | null;
    url: string | null;
    fetchedAt: number;
}
