/**
 * Tipos compartidos de la API.
 * Centraliza todos los tipos usados en las diferentes rutas.
 */

// === User Types ===
export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'verified' | 'suspended';

export type AppUser = {
    id: string;
    email: string;
    passwordHash?: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    avatar?: string;
    provider?: string;
    providerId?: string;
    lastLoginAt?: Date | null;
};

export type PublicUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    avatar?: string;
    provider?: string;
    lastLoginAt?: Date | null;
};

// === Vertical Types ===
export type VerticalType = 'autos' | 'propiedades';
export type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';
export type PortalKey = 'yapo' | 'chileautos' | 'mercadolibre' | 'facebook';
export type PortalSyncStatus = 'missing' | 'ready' | 'published' | 'failed';

// === Address Types ===
export type AddressBookKind = 'personal' | 'shipping' | 'billing' | 'company' | 'branch' | 'warehouse' | 'pickup' | 'other';
export type ListingLocationSourceMode = 'saved_address' | 'custom' | 'area_only';
export type ListingLocationVisibilityMode = 'exact' | 'approximate' | 'sector_only' | 'commune_only' | 'hidden';
export type GeocodePrecision = 'exact' | 'approximate' | 'commune' | 'none';
export type GeocodeProvider = 'none' | 'catalog_seed' | 'manual' | 'external';

export type GeoPoint = {
    latitude: number | null;
    longitude: number | null;
    precision: GeocodePrecision;
    provider?: GeocodeProvider;
    accuracyMeters?: number | null;
};

export type AddressBookEntry = {
    id: string;
    kind: AddressBookKind;
    label: string;
    countryCode: string;
    regionId: string | null;
    regionName: string | null;
    communeId: string | null;
    communeName: string | null;
    neighborhood: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    contactName: string | null;
    contactPhone: string | null;
    isDefault: boolean;
    geoPoint: GeoPoint;
    createdAt: number;
    updatedAt: number;
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

// === Valuation Types ===
export type ValuationComparable = {
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
    distanceKm: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
    publishedAt: number | null;
    url: string | null;
};

export type VehicleValuationComparable = {
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
    distanceKm: number | null;
    publishedAt: number | null;
    url: string | null;
};

// === Public Profile Types ===
export type PublicProfileAccountKind = 'individual' | 'independent' | 'company';
export type PublicProfileLeadRoutingMode = 'owner' | 'round_robin' | 'unassigned';
export type PublicProfileDayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type PublicProfileSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    x: string | null;
};

export type PublicProfileTeamSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
};

export type PublicProfileBusinessHour = {
    day: PublicProfileDayId;
    open: string | null;
    close: string | null;
    closed: boolean;
};

export type PublicProfileTeamMember = {
    id: string;
    userId: string;
    vertical: VerticalType;
    name: string;
    roleTitle: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    avatarImageUrl: string | null;
    socialLinks: PublicProfileTeamSocialLinks;
    specialties: string[];
    isLeadContact: boolean;
    receivesLeads: boolean;
    isPublished: boolean;
    position: number;
    createdAt: number;
    updatedAt: number;
};

// === Boost & Payment Types ===
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type CheckoutKind = 'boost' | 'advertising' | 'subscription';
export type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
export type SubscriptionPlanId = 'free' | 'basic' | 'pro' | 'enterprise';
export type ActiveSubscriptionStatus = 'active' | 'cancelled' | 'paused';

export type BoostListingRecord = {
    id: string;
    vertical: VerticalType;
    section: BoostSection;
    ownerId: string;
    href: string;
    title: string;
    subtitle: string;
    price: string;
    location: string;
    imageUrl?: string;
};

export type BoostPlanRecord = {
    id: BoostPlanId;
    name: string;
    days: number;
    price: number;
    visibilityLift: string;
};

export type BoostOrder = {
    id: string;
    userId: string;
    vertical: VerticalType;
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
    planName: string;
    days: number;
    price: number;
    startAt: number;
    endAt: number;
    status: BoostOrderStatus;
    createdAt: number;
    updatedAt: number;
};

// === Advertising Types ===
export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';

// === Instagram Types ===
export type InstagramAccountStatus = 'connected' | 'error' | 'disconnected';
export type InstagramPublicationStatus = 'published' | 'failed';

// === Lead Types ===
export type ServiceLeadType = 'venta_asistida' | 'gestion_inmobiliaria';
export type ServiceLeadPlanId = 'basico' | 'premium';
export type ServiceLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ListingLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ListingLeadSource = 'internal_form' | 'direct_message' | 'whatsapp' | 'phone_call' | 'email' | 'instagram' | 'facebook' | 'mercadolibre' | 'yapo' | 'chileautos' | 'portal';
export type ListingLeadChannel = 'lead' | 'message' | 'social' | 'portal';
export type LeadPriority = 'low' | 'medium' | 'high';
export type LeadAttentionLevel = 'fresh' | 'attention' | 'urgent';
export type LeadSlaSignalKey = 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
export type ServiceLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'contact';
export type ListingLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'message' | 'contact';
export type LeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
export type PipelineColumnScope = 'listing';

export type LeadSlaSignal = {
    key: LeadSlaSignalKey;
    label: string;
    tone: Exclude<LeadAttentionLevel, 'fresh'>;
};

// === Message Types ===
export type MessageSenderRole = 'buyer' | 'seller' | 'system';
export type MessageFolder = 'inbox' | 'archived' | 'spam';

// === Saved & Follow Types ===
export type SavedListingRecord = {
    id: string;
    href: string;
    title: string;
    price: string;
    location?: string;
    subtitle?: string;
    meta?: string[];
    badge?: string;
    sellerName?: string;
    sellerMeta?: string;
    savedAt: number;
};

export type FollowRecord = {
    followeeUserId: string;
    vertical: VerticalType;
    followedAt: number;
};

// === Feed Types ===
export type FeedClip = {
    id: string;
    vertical: VerticalType;
    section: 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
    href: string;
    title: string;
    price: string;
    location: string;
    authorId: string;
    mediaType: 'video' | 'image';
    mediaUrl: string;
    posterUrl?: string;
    views: number;
    saves: number;
    publishedAt: number;
    featured?: boolean;
};

// === Portal Integration Types ===
export type ListingPortalSyncRecord = {
    portal: PortalKey;
    status: PortalSyncStatus;
    publishedAt: number | null;
    externalId: string | null;
    lastError: string | null;
    lastAttemptAt: number | null;
};

// === Constants ===
export const PUBLIC_PROFILE_DAYS: PublicProfileDayId[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const PUBLIC_PROFILE_SOCIAL_KEYS: Array<keyof PublicProfileSocialLinks> = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'];
export const PUBLIC_PROFILE_TEAM_SOCIAL_KEYS: Array<keyof PublicProfileTeamSocialLinks> = ['instagram', 'facebook', 'linkedin'];
export const LISTING_INTEGRATIONS_STORAGE_KEY = '__simpleIntegrations';