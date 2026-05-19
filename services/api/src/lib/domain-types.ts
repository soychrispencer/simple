import type { listings, listingDrafts } from '../db/schema.js';
import type {
    ListingLeadChannel,
    ListingLeadSource,
    ListingPortalSyncRecord,
    PortalKey,
} from '../modules/listings/portals.js';

export type ListingRow = typeof listings.$inferSelect;
export type ListingDraftRow = typeof listingDrafts.$inferSelect;
export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'verified' | 'suspended';
export type VerticalType = 'autos' | 'propiedades' | 'agenda';
export type PaymentVerticalType = VerticalType | 'serenatas';
export type AccountType = 'general' | 'autos' | 'propiedades' | 'agenda' | 'crm_only';
export type AccountRole = 'owner' | 'admin' | 'agent';
export type CrmEntityType = 'listing' | 'service' | 'external';
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
    arrivalInstructions: string | null;
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

export type AppUser = {
    id: string;
    email: string;
    passwordHash?: string; // Optional for OAuth users
    name: string;
    phone?: string | null;
    whatsappEnabled?: boolean;
    role: UserRole;
    status: UserStatus;
    primaryVertical?: VerticalType | null;
    avatar?: string;
    provider?: string; // 'local' | 'google' | etc.
    providerId?: string; // ID from OAuth provider
    lastLoginAt?: Date | null;
    primaryAccountId?: string | null;
};

export type PublicUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    whatsappEnabled?: boolean;
    role: UserRole;
    status: UserStatus;
    primaryVertical?: VerticalType | null;
    avatar?: string;
    provider?: string;
    lastLoginAt?: Date | null;
    primaryAccountId?: string | null;
};

export type AccountRecord = {
    id: string;
    name: string;
    type: AccountType;
    ownerUserId: string;
    isPersonal: boolean;
    createdAt: number;
    updatedAt: number;
};

export type AccountUserRecord = {
    id: string;
    accountId: string;
    userId: string;
    role: AccountRole;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
};

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
    specs?: Array<{ label: string; value: string; icon?: string }>;
    /** Badges visuales (verticales autos / propiedades). */
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
};

export type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

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
    imageUrls?: string[];
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
    accountId?: string | null;
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

export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';

export type ListingRecord = {
    id: string;
    accountId?: string | null;
    vertical: VerticalType;
    section: BoostSection;
    listingType: BoostSection;
    ownerId: string;
    title: string;
    description: string;
    price: string;
    location?: string;
    locationData?: ListingLocation;
    href: string;
    status: ListingStatus;
    views: number;
    favs: number;
    leads: number;
    createdAt: number;
    updatedAt: number;
    rawData?: unknown;
    integrations: Partial<Record<PortalKey, ListingPortalSyncRecord>>;
};

export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';
export type AdCampaignVerticalType = VerticalType | 'serenatas' | 'plataforma';
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
export type CheckoutKind = 'boost' | 'advertising' | 'subscription' | 'serenata_booking';
export type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
export type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';
export type ActiveSubscriptionStatus = 'active' | 'cancelled' | 'paused';
export type InstagramAccountStatus = 'connected' | 'error' | 'disconnected';
export type InstagramPublicationStatus = 'published' | 'failed';
export type ServiceLeadType = 'venta_asistida' | 'gestion_inmobiliaria';
export type ServiceLeadPlanId = 'basico' | 'premium';
export type ServiceLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type LeadPriority = 'low' | 'medium' | 'high';
export type LeadAttentionLevel = 'fresh' | 'attention' | 'urgent';
export type LeadSlaSignalKey = 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
export type LeadSlaSignal = {
    key: LeadSlaSignalKey;
    label: string;
    tone: Exclude<LeadAttentionLevel, 'fresh'>;
};
export type LeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
export type PipelineColumnScope = 'listing';
export type ServiceLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'contact';
export type ListingLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type ListingLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'message' | 'contact';
export type MessageSenderRole = 'buyer' | 'seller' | 'system';
export type MessageFolder = 'inbox' | 'archived' | 'spam';

export type SubscriptionPlanRecord = {
    id: SubscriptionPlanId;
    name: string;
    description: string;
    priceMonthly: number;
    currency: 'CLP';
    maxListings: number;
    maxFeaturedListings: number;
    maxImagesPerListing: number;
    analyticsEnabled: boolean;
    crmEnabled: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    recommended?: boolean;
    isComingSoon?: boolean;
    maxFreeBoostsPerMonth: number;
    features: string[];
};

export type PaidSubscriptionPlanRecord = SubscriptionPlanRecord & {
    id: Exclude<SubscriptionPlanId, 'free'>;
};

export type ActiveSubscription = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    planId: Exclude<SubscriptionPlanId, 'free'>;
    planName: string;
    priceMonthly: number;
    currency: 'CLP';
    features: string[];
    status: ActiveSubscriptionStatus;
    providerPreapprovalId: string;
    providerStatus: string | null;
    startedAt: number;
    updatedAt: number;
};

export type PaymentOrderMetadata =
    | {
        kind: 'boost';
        listingId: string;
        section: BoostSection;
        planId: BoostPlanId;
        listingTitle: string;
    }
    | {
        kind: 'advertising';
        campaignId: string;
        format: AdFormat;
        durationDays: AdDurationDays;
        campaignName: string;
    }
    | {
        kind: 'subscription';
        planId: Exclude<SubscriptionPlanId, 'free'>;
        planName: string;
    }
    | {
        kind: 'serenata_booking';
        serenataId: string;
        recipientName: string;
    };

export type PaymentOrderRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: PaymentVerticalType;
    kind: CheckoutKind;
    title: string;
    amount: number;
    currency: 'CLP';
    status: PaymentOrderStatus;
    providerStatus: string | null;
    providerReferenceId: string | null;
    preferenceId: string | null;
    checkoutUrl: string | null;
    createdAt: number;
    updatedAt: number;
    appliedAt: number | null;
    appliedResourceId: string | null;
    metadata: PaymentOrderMetadata;
};

export type InstagramAccountRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    instagramUserId: string;
    username: string;
    displayName: string | null;
    accountType: string | null;
    profilePictureUrl: string | null;
    accessToken: string;
    tokenExpiresAt: number | null;
    scopes: string[];
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
    status: InstagramAccountStatus;
    lastSyncedAt: number | null;
    lastPublishedAt: number | null;
    lastError: string | null;
    createdAt: number;
    updatedAt: number;
};

export type InstagramPublicationRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    instagramAccountId: string;
    vertical: VerticalType;
    listingId: string;
    listingTitle: string;
    instagramMediaId: string | null;
    instagramPermalink: string | null;
    caption: string;
    imageUrl: string;
    status: InstagramPublicationStatus;
    errorMessage: string | null;
    sourceUpdatedAt: number | null;
    publishedAt: number | null;
    createdAt: number;
    updatedAt: number;
};

export type PublicProfileRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    slug: string;
    isPublished: boolean;
    accountKind: PublicProfileAccountKind;
    leadRoutingMode: PublicProfileLeadRoutingMode;
    leadRoutingCursor: number;
    displayName: string;
    headline: string | null;
    bio: string | null;
    companyName: string | null;
    website: string | null;
    publicEmail: string | null;
    publicPhone: string | null;
    publicWhatsapp: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    socialLinks: PublicProfileSocialLinks;
    businessHours: PublicProfileBusinessHour[];
    specialties: string[];
    scheduleNote: string | null;
    alwaysOpen: boolean;
    createdAt: number;
    updatedAt: number;
};

export type PublicProfileTeamMemberRecord = PublicProfileTeamMember;

export type CrmAssigneeResponse = {
    id: string;
    kind: 'user' | 'team_member';
    value: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: UserRole | null;
    roleTitle: string | null;
    isLeadContact: boolean;
};

export type AdCampaignRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: AdCampaignVerticalType;
    name: string;
    format: AdFormat;
    status: AdStatus;
    paymentStatus: AdPaymentStatus;
    destinationType: AdDestinationType;
    destinationUrl: string | null;
    listingHref: string | null;
    profileSlug: string | null;
    desktopImageDataUrl: string;
    mobileImageDataUrl: string | null;
    overlayEnabled: boolean;
    overlayTitle: string | null;
    overlaySubtitle: string | null;
    overlayCta: string | null;
    overlayAlign: AdOverlayAlign;
    placementSection: AdPlacementSection | null;
    startAt: number;
    endAt: number;
    durationDays: AdDurationDays;
    paidAt: number | null;
    createdAt: number;
    updatedAt: number;
};

export type PipelineColumnRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    scope: PipelineColumnScope;
    name: string;
    status: ListingLeadStatus;
    position: number;
    createdAt: number;
    updatedAt: number;
};

export type ServiceLeadRecord = {
    id: string;
    accountId?: string | null;
    userId: string | null;
    entityType: CrmEntityType;
    entityId: string;
    vertical: VerticalType;
    serviceType: ServiceLeadType;
    planId: ServiceLeadPlanId;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string | null;
    locationLabel: string | null;
    assetType: string | null;
    assetBrand: string | null;
    assetModel: string | null;
    assetYear: string | null;
    assetMileage: string | null;
    assetArea: string | null;
    expectedPrice: string | null;
    notes: string | null;
    status: ServiceLeadStatus;
    priority: LeadPriority;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    sourcePage: string | null;
    lastActivityAt: number;
    createdAt: number;
    updatedAt: number;
};

export type ServiceLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ServiceLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

export type ListingLeadRecord = {
    id: string;
    accountId?: string | null;
    listingId: string;
    entityType: CrmEntityType;
    entityId: string;
    ownerUserId: string;
    buyerUserId: string | null;
    vertical: VerticalType;
    source: ListingLeadSource;
    channel: ListingLeadChannel;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    contactWhatsapp: string | null;
    message: string | null;
    status: ListingLeadStatus;
    priority: LeadPriority;
    closeReason: string | null;
    tags: string[];
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
    pipelineColumnId: string | null;
    nextTaskTitle: string | null;
    nextTaskAt: number | null;
    sourcePage: string | null;
    externalSourceId: string | null;
    lastActivityAt: number;
    createdAt: number;
    updatedAt: number;
};

export type ListingLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ListingLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

export type MessageThreadRecord = {
    id: string;
    accountId?: string | null;
    vertical: VerticalType;
    listingId: string;
    ownerUserId: string;
    buyerUserId: string;
    leadId: string;
    ownerUnreadCount: number;
    buyerUnreadCount: number;
    ownerArchivedAt: number | null;
    buyerArchivedAt: number | null;
    ownerSpamAt: number | null;
    buyerSpamAt: number | null;
    lastMessageAt: number;
    createdAt: number;
    updatedAt: number;
};

export type MessageEntryRecord = {
    id: string;
    threadId: string;
    senderUserId: string;
    senderRole: MessageSenderRole;
    body: string;
    createdAt: number;
};
