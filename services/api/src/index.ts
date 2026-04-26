import { existsSync, appendFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { createDebugLogger, asString, asNumber, asObject } from './modules/shared/index.js';
import type { ValuationFeedRecord, VehicleValuationFeedRecord, ValuationHistoricalPoint, ValuationSourceBreakdown, ValuationConfidenceBreakdown, ValuationFeedLicense, ValuationFeedTransport, ValuationFeedHealth, ValuationFeedSourceStatus, ValuationFeedConnectorLoadResult, ValuationFeedConnector, VehicleValuationFeedConnector, ValuationComparable, VehicleValuationComparable } from './modules/shared/index.js';

// Load environment variables FIRST, before any other imports
const API_ROOT_DIR = path.resolve(__dirname, '..');

for (const candidate of [
    path.join(API_ROOT_DIR, '.env.local'),
    path.join(API_ROOT_DIR, '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env')
]) {
    try {
        if (existsSync(candidate)) {
            console.log('Loading env file:', candidate);
            process.loadEnvFile?.(candidate);
        }
    } catch {
        // Local dev can run without an env file.
    }
}
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Safety Polyfill for 'File' in Node.js environment
if (typeof global !== 'undefined' && typeof (global as any).File === 'undefined') {
    (global as any).File = class File extends Blob {
        name: string;
        lastModified: number;
        constructor(parts: any[], name: string, options?: any) {
            super(parts, options);
            this.name = name;
            this.lastModified = options?.lastModified || Date.now();
        }
    };
}
import { cors } from 'hono/cors';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { evaluatePublicationLifecycle, getPublicationLifecyclePolicy } from '@simple/config';
import {
    generateSmartTemplates,
    type InstagramTemplateView as InstagramRenderTemplate,
    type ListingData as InstagramListingData,
} from './modules/instagram/templates.js';
import {
    createCheckoutPreference,
    createPreapproval,
    getPaymentById,
    getPreapprovalById,
    isMercadoPagoConfigured,
} from './modules/mercadopago/service.js';
import {
    buildInstagramAuthorizationUrl,
    exchangeInstagramCode,
    exchangeToLongLivedToken,
    getInstagramBusinessAccounts,
    getInstagramProfile,
    getInstagramPublicApiOrigin,
    isInstagramConfigured,
    publishInstagramCarousel,
    publishInstagramImage,
    refreshInstagramAccessToken,
    getInstagramInsights,
    createABTestCampaign,
    analyzeABTestResults,
    scheduleInstagramPost,
    getSchedulingInsights,
    optimizeInstagramContent,
} from './modules/instagram/service.js';
import { InstagramSchedulerService } from './modules/instagram/scheduler.js';
import { db } from './db/index.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq, and, or, desc, asc, gt, lt, gte, lte, isNull, sql, inArray, type SQL } from 'drizzle-orm';
import {
    users,
    accounts,
    accountUsers,
    listings,
    savedListings,
    listingDrafts,
    follows,
    boostOrders,
    passwordResetTokens,
    emailVerificationTokens,
    instagramAccounts,
    instagramPublications,
    publicProfiles,
    publicProfileTeamMembers,
    crmPipelineColumns,
    serviceLeads,
    serviceLeadActivities,
    listingLeads,
    listingLeadActivities,
    messageThreads,
    messageEntries,
    adCampaigns,
    addressBook,
    agendaProfessionalProfiles,

    agendaServices,
    agendaAvailabilityRules,
    agendaLocations,
    agendaBlockedSlots,
    agendaClients,
    agendaClientAttachments,
    agendaAppointments,
    agendaSessionNotes,
    agendaPayments,
    pushSubscriptions,
    subscriptionPlans,
    subscriptions,
    paymentOrders,
    agendaAuditEvents,
    agendaNotificationEvents,
    agendaClientTags,
    agendaClientTagAssignments,
    agendaNpsResponses,
    agendaReferrals,
    agendaPromotions,
    agendaPacks,
    agendaClientPacks,
    agendaGroupSessions,
    agendaGroupAttendees,
    serenataGroups,
    serenataGroupMembers,
    serenataMusicians,
    serenataRequests,
    serenataAssignments,
    serenataRoutes,
    serenataNotifications,
    serenataCaptainProfiles,
    serenataMusicianProfiles,
    serenatas,
    serenataSubscriptions,
    serenataSubscriptionPayments,
    serenataPayments,
    serenataReviews,
    serenataAvailability,
    serenataMessages,
    mortgageRates,
} from './db/schema.js';
import { createSerenatasRouter } from './modules/serenatas/router.js';
import { SerenatasService } from './modules/serenatas/service.js';
import { createAccountsRouter } from './modules/accounts/index.js';
import { createCrmRouter } from './modules/crm/index.js';
import { createAdminRouter } from './modules/admin/index.js';
import { createAuthRouter } from './modules/auth/router.js';
import { createListingsRouter, createListingDraftRouter } from './modules/listings/index.js';
import { createBoostRouter } from './modules/boost/index.js';
import { createAddressBookRouter } from './modules/address-book/index.js';
import { createPaymentsRouter } from './modules/payments/index.js';
import bcrypt from 'bcryptjs';
import webpush from 'web-push';
import { googleAuth } from '@hono/oauth-providers/google';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import cron from 'node-cron';
import {
    notifyConfirmation,
    notifyReminder24h,
    notifyReminder30min,
    notifyCancellation,
    notifyProfessionalNewBooking,
    sendTestMessage,
} from './modules/whatsapp/service.js';
import { getStorageProvider } from './storage-providers/index.js';
import { rateLimit } from './lib/rate-limit.js';
import { logAudit, logNotification } from './lib/audit.js';
import { createAgendaRouter, createPublicAgendaRouter } from './modules/agenda/router.js';
import { createAccountRouter } from './modules/public-profile/index.js';
import { createAdvertisingRouter } from './modules/advertising/index.js';
import { createLeadsRouter } from './modules/leads/index.js';
import { createMessagesRouter, createPanelNotificationsRouter } from './modules/messages/index.js';
import { createInstagramRouter, createInstagramPublicImageRouter } from './modules/instagram/index.js';
import { createMediaRouter, createStorageRouter } from './modules/media/index.js';
import { createSystemRouter } from './modules/system/index.js';
import { createSocialRouter } from './modules/social/index.js';
import { createPublicRouter } from './modules/public/index.js';

const DEBUG_LOG_FILE = path.resolve(process.cwd(), 'api_debug.log');
const logDebug = createDebugLogger(DEBUG_LOG_FILE);

logDebug('--- API RESTARTED ---');

// Core domain types (defined locally to match existing structure)

// Valuation types imported from shared module as needed inline

type UserRole = 'user' | 'admin' | 'superadmin';
type UserStatus = 'active' | 'verified' | 'suspended';
type VerticalType = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
type AccountType = 'general' | 'autos' | 'propiedades' | 'agenda' | 'crm_only';
type AccountRole = 'owner' | 'admin' | 'agent';
type CrmEntityType = 'listing' | 'service' | 'external';
type AddressBookKind = 'personal' | 'shipping' | 'billing' | 'company' | 'branch' | 'warehouse' | 'pickup' | 'other';
type ListingLocationSourceMode = 'saved_address' | 'custom' | 'area_only';
type ListingLocationVisibilityMode = 'exact' | 'approximate' | 'sector_only' | 'commune_only' | 'hidden';
type GeocodePrecision = 'exact' | 'approximate' | 'commune' | 'none';
type GeocodeProvider = 'none' | 'catalog_seed' | 'manual' | 'external';

type GeoPoint = {
    latitude: number | null;
    longitude: number | null;
    precision: GeocodePrecision;
    provider?: GeocodeProvider;
    accuracyMeters?: number | null;
};

type AddressBookEntry = {
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

type ListingLocation = {
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

type AppUser = {
    id: string;
    email: string;
    passwordHash?: string; // Optional for OAuth users
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    primaryVertical?: VerticalType | null;
    avatar?: string;
    provider?: string; // 'local' | 'google' | etc.
    providerId?: string; // ID from OAuth provider
    lastLoginAt?: Date | null;
    primaryAccountId?: string | null;
};

type PublicUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    primaryVertical?: VerticalType | null;
    avatar?: string;
    provider?: string;
    lastLoginAt?: Date | null;
    primaryAccountId?: string | null;
};

type AccountRecord = {
    id: string;
    name: string;
    type: AccountType;
    ownerUserId: string;
    isPersonal: boolean;
    createdAt: number;
    updatedAt: number;
};

type AccountUserRecord = {
    id: string;
    accountId: string;
    userId: string;
    role: AccountRole;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
};

type PublicProfileAccountKind = 'individual' | 'independent' | 'company';
type PublicProfileLeadRoutingMode = 'owner' | 'round_robin' | 'unassigned';
type PublicProfileDayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type PublicProfileSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    x: string | null;
};

type PublicProfileTeamSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
};

type PublicProfileBusinessHour = {
    day: PublicProfileDayId;
    open: string | null;
    close: string | null;
    closed: boolean;
};

type PublicProfileTeamMember = {
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

type SavedListingRecord = {
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

type FollowRecord = {
    followeeUserId: string;
    vertical: VerticalType;
    followedAt: number;
};

type FeedClip = {
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

type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

type BoostListingRecord = {
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

type BoostPlanRecord = {
    id: BoostPlanId;
    name: string;
    days: number;
    price: number;
    visibilityLift: string;
};

type BoostOrder = {
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

type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';
type PortalKey = 'yapo' | 'chileautos' | 'mercadolibre' | 'facebook';
type PortalSyncStatus = 'missing' | 'ready' | 'published' | 'failed';

type ListingPortalSyncRecord = {
    portal: PortalKey;
    status: PortalSyncStatus;
    publishedAt: number | null;
    externalId: string | null;
    lastError: string | null;
    lastAttemptAt: number | null;
};

type ListingRow = typeof listings.$inferSelect;

type ListingRecord = {
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

type AdFormat = 'hero' | 'card' | 'inline';
type AdDurationDays = 7 | 15 | 30;
type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
type AdOverlayAlign = 'left' | 'center' | 'right';
type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';
type CheckoutKind = 'boost' | 'advertising' | 'subscription';
type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';
type ActiveSubscriptionStatus = 'active' | 'cancelled' | 'paused';
type InstagramAccountStatus = 'connected' | 'error' | 'disconnected';
type InstagramPublicationStatus = 'published' | 'failed';
type ServiceLeadType = 'venta_asistida' | 'gestion_inmobiliaria';
type ServiceLeadPlanId = 'basico' | 'premium';
type ServiceLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
type LeadPriority = 'low' | 'medium' | 'high';
type LeadAttentionLevel = 'fresh' | 'attention' | 'urgent';
type LeadSlaSignalKey = 'response_overdue' | 'task_due_today' | 'task_overdue' | 'hot_lead' | 'idle_follow_up';
type LeadSlaSignal = {
    key: LeadSlaSignalKey;
    label: string;
    tone: Exclude<LeadAttentionLevel, 'fresh'>;
};
type LeadQuickAction = 'call' | 'whatsapp' | 'email' | 'follow_up';
type PipelineColumnScope = 'listing';
type ServiceLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'contact';
type ListingLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
type ListingLeadActivityType = 'created' | 'note' | 'status' | 'assignment' | 'task' | 'message' | 'contact';
type ListingLeadSource = 'internal_form' | 'direct_message' | 'whatsapp' | 'phone_call' | 'email' | 'instagram' | 'facebook' | 'mercadolibre' | 'yapo' | 'chileautos' | 'portal';
type ListingLeadChannel = 'lead' | 'message' | 'social' | 'portal';
type MessageSenderRole = 'buyer' | 'seller' | 'system';
type MessageFolder = 'inbox' | 'archived' | 'spam';
type ListingDraftRow = typeof listingDrafts.$inferSelect;

const LISTING_INTEGRATIONS_STORAGE_KEY = '__simpleIntegrations';
const PUBLIC_PROFILE_DAYS: PublicProfileDayId[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PUBLIC_PROFILE_SOCIAL_KEYS: Array<keyof PublicProfileSocialLinks> = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'];
const PUBLIC_PROFILE_TEAM_SOCIAL_KEYS: Array<keyof PublicProfileTeamSocialLinks> = ['instagram', 'facebook', 'linkedin'];

type SubscriptionPlanRecord = {
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

type PaidSubscriptionPlanRecord = SubscriptionPlanRecord & {
    id: Exclude<SubscriptionPlanId, 'free'>;
};

type ActiveSubscription = {
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

type PaymentOrderMetadata =
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
    };

type PaymentOrderRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
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

type InstagramAccountRecord = {
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

type InstagramPublicationRecord = {
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

type PublicProfileRecord = {
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

type PublicProfileTeamMemberRecord = PublicProfileTeamMember;

type CrmAssigneeResponse = {
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

type AdCampaignRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
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

type PipelineColumnRecord = {
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

type ServiceLeadRecord = {
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

type ServiceLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ServiceLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

type ListingLeadRecord = {
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

type ListingLeadActivityRecord = {
    id: string;
    leadId: string;
    actorUserId: string | null;
    type: ListingLeadActivityType;
    body: string;
    meta: Record<string, unknown> | null;
    createdAt: number;
};

type MessageThreadRecord = {
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

type MessageEntryRecord = {
    id: string;
    threadId: string;
    senderUserId: string;
    senderRole: MessageSenderRole;
    body: string;
    createdAt: number;
};

const SESSION_COOKIE = 'simple_session';
const OAUTH_STATE_COOKIE = 'simple_oauth_state';
const INSTAGRAM_STATE_COOKIE = 'simple_instagram_state';
const SESSION_SECRET = asString(process.env.SESSION_SECRET);

// ── Web Push (VAPID) ──────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hola@simpleplataforma.app';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 3;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const authCookieSameSite = (() => {
    const raw = asString(process.env.AUTH_COOKIE_SAMESITE).toLowerCase();
    if (raw === 'strict') return 'Strict' as const;
    if (raw === 'none') return 'None' as const;
    if (raw === 'lax') return 'Lax' as const;
    return process.env.NODE_ENV === 'production' ? 'None' as const : 'Lax' as const;
})();
const authCookieSecure = process.env.NODE_ENV === 'production' || authCookieSameSite === 'None';

if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
}

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const registerSchema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(120),
});

const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20).nullable().optional().default(null),
});

const publicProfileAccountKindSchema = z.enum(['individual', 'independent', 'company']);
const publicProfileLeadRoutingModeSchema = z.enum(['owner', 'round_robin', 'unassigned']);
const publicProfileDayIdSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
const publicProfileSocialLinksSchema = z.object({
    instagram: z.string().trim().max(120).nullable().optional().default(null),
    facebook: z.string().trim().max(120).nullable().optional().default(null),
    linkedin: z.string().trim().max(120).nullable().optional().default(null),
    youtube: z.string().trim().max(120).nullable().optional().default(null),
    tiktok: z.string().trim().max(120).nullable().optional().default(null),
    x: z.string().trim().max(120).nullable().optional().default(null),
});
const publicProfileBusinessHourSchema = z.object({
    day: publicProfileDayIdSchema,
    open: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    close: z.string().trim().regex(/^\d{2}:\d{2}$/).nullable().optional().default(null),
    closed: z.boolean().default(false),
});
const publicProfileTeamSocialLinksSchema = z.object({
    instagram: z.string().trim().max(120).nullable().optional().default(null),
    facebook: z.string().trim().max(120).nullable().optional().default(null),
    linkedin: z.string().trim().max(120).nullable().optional().default(null),
});
const publicProfileTeamMemberSchema = z.object({
    id: z.string().uuid().nullable().optional().default(null),
    name: z.string().trim().min(2).max(160),
    roleTitle: z.string().trim().max(120).nullable().optional().default(null),
    bio: z.string().trim().max(1200).nullable().optional().default(null),
    email: z.string().trim().email().max(255).nullable().optional().default(null),
    phone: z.string().trim().max(40).nullable().optional().default(null),
    whatsapp: z.string().trim().max(40).nullable().optional().default(null),
    avatarImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    socialLinks: publicProfileTeamSocialLinksSchema.default({
        instagram: null,
        facebook: null,
        linkedin: null,
    }),
    specialties: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
    isLeadContact: z.boolean().default(false),
    receivesLeads: z.boolean().default(true),
    isPublished: z.boolean().default(true),
});
const publicProfileWriteSchema = z.object({
    slug: z.string().trim().min(3).max(80),
    isPublished: z.boolean().default(false),
    accountKind: publicProfileAccountKindSchema.default('individual'),
    leadRoutingMode: publicProfileLeadRoutingModeSchema.default('round_robin'),
    displayName: z.string().trim().min(2).max(160),
    headline: z.string().trim().max(180).nullable().optional().default(null),
    bio: z.string().trim().max(2400).nullable().optional().default(null),
    companyName: z.string().trim().max(160).nullable().optional().default(null),
    website: z.string().trim().max(500).nullable().optional().default(null),
    publicEmail: z.string().trim().email().max(255).nullable().optional().default(null),
    publicPhone: z.string().trim().max(40).nullable().optional().default(null),
    publicWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    addressLine: z.string().trim().max(255).nullable().optional().default(null),
    city: z.string().trim().max(120).nullable().optional().default(null),
    region: z.string().trim().max(120).nullable().optional().default(null),
    coverImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    avatarImageUrl: z.string().trim().max(500).nullable().optional().default(null),
    socialLinks: publicProfileSocialLinksSchema.default({
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    }),
    businessHours: z.array(publicProfileBusinessHourSchema).length(7),
    specialties: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    teamMembers: z.array(publicProfileTeamMemberSchema).max(12).default([]),
    scheduleNote: z.string().trim().max(255).nullable().optional().default(null),
    alwaysOpen: z.boolean().default(false),
});

const passwordResetRequestSchema = z.object({
    email: z.string().email(),
});

const passwordResetConfirmSchema = z.object({
    token: z.string().min(32).max(256),
    password: z.string().min(8).max(120),
});

const savedRecordSchema = z.object({
    id: z.string().min(1),
});

const followToggleSchema = z.object({
    followeeUserId: z.string().min(1),
    vertical: z.enum(['autos', 'propiedades']),
});

const boostVerticalSchema = z.enum(['autos', 'propiedades', 'agenda']);
const boostPlanIdSchema = z.enum(['boost_starter', 'boost_pro', 'boost_max']);
const boostSectionSchema = z.enum(['sale', 'rent', 'auction', 'project']);
const portalKeySchema = z.enum(['yapo', 'chileautos', 'mercadolibre', 'facebook']);
const adFormatSchema = z.enum(['hero', 'card', 'inline']);
const adDurationDaysSchema = z.union([z.literal(7), z.literal(15), z.literal(30)]);
const adDestinationTypeSchema = z.enum(['none', 'custom_url', 'listing', 'profile']);
const adOverlayAlignSchema = z.enum(['left', 'center', 'right']);
const adPlacementSectionSchema = z.enum(['home', 'ventas', 'arriendos', 'subastas', 'proyectos']);
const subscriptionPlanIdSchema = z.enum(['free', 'pro', 'enterprise']);
const paidSubscriptionPlanIdSchema = z.enum(['pro', 'enterprise']);
const listingStatusSchema = z.enum(['draft', 'active', 'paused', 'sold', 'archived']);
const listingManageStatusSchema = z.enum(['draft', 'active', 'paused', 'sold', 'archived']);
const addressBookKindSchema = z.enum(['personal', 'shipping', 'billing', 'company', 'branch', 'warehouse', 'pickup', 'other']);
const listingLocationSourceModeSchema = z.enum(['saved_address', 'custom', 'area_only']);
const listingLocationVisibilityModeSchema = z.enum(['exact', 'approximate', 'sector_only', 'commune_only', 'hidden']);
const geocodePrecisionSchema = z.enum(['exact', 'approximate', 'commune', 'none']);
const geocodeProviderSchema = z.enum(['none', 'catalog_seed', 'manual', 'external']);

const geoPointSchema = z.object({
    latitude: z.number().nullable().default(null),
    longitude: z.number().nullable().default(null),
    precision: geocodePrecisionSchema.default('none'),
    provider: geocodeProviderSchema.optional(),
    accuracyMeters: z.number().positive().nullable().optional(),
});

const updateListingStatusSchema = z.object({
    status: listingManageStatusSchema,
});

const listingDraftWriteSchema = z.object({
    draft: z.unknown(),
});

const listingLocationSchema = z.object({
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

const addressBookWriteSchema = z.object({
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
    geoPoint: geoPointSchema.optional(),
});

const propertyValuationRequestSchema = z.object({
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

const vehicleValuationRequestSchema = z.object({
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

const geocodeLocationRequestSchema = z.object({
    location: listingLocationSchema,
});

const createBoostOrderSchema = z.object({
    vertical: boostVerticalSchema,
    listingId: z.string().min(1),
    planId: boostPlanIdSchema,
    startAt: z.number().int().positive().optional(),
    section: boostSectionSchema.optional(),
    useFreeBoost: z.boolean().optional(),
});

const updateBoostOrderSchema = z.object({
    status: z.enum(['active', 'paused', 'ended']),
});

const createListingSchema = z.object({
    vertical: boostVerticalSchema,
    listingType: boostSectionSchema,
    title: z.string().min(3).max(220),
    description: z.string().max(6000),
    priceLabel: z.string().min(1).max(120),
    location: z.string().max(120).optional(),
    locationData: listingLocationSchema.optional(),
    href: z.string().max(240).optional(),
    status: listingStatusSchema.optional(),
    rawData: z.unknown().optional(),
});

const updateListingSchema = z.object({
    listingType: boostSectionSchema,
    title: z.string().min(3).max(220),
    description: z.string().max(6000),
    priceLabel: z.string().min(1).max(120),
    location: z.string().max(120).optional(),
    locationData: listingLocationSchema.optional(),
    href: z.string().max(240).optional(),
    status: listingStatusSchema.optional(),
    rawData: z.unknown().optional(),
});

const publishListingPortalSchema = z.object({
    portal: portalKeySchema,
});

const instagramVerticalSchema = z.enum(['autos', 'propiedades']);
const instagramSettingsSchema = z.object({
    vertical: instagramVerticalSchema,
    autoPublishEnabled: z.boolean(),
    captionTemplate: z.string().trim().max(2200).nullable().optional(),
});

const instagramPublishSchema = z.object({
    vertical: instagramVerticalSchema,
    listingId: z.string().trim().min(1),
    captionOverride: z.string().trim().max(2200).nullable().optional(),
});

const instagramEnhancedPublishSchema = z.object({
    vertical: instagramVerticalSchema,
    listingId: z.string().trim().min(1),
    captionOverride: z.string().trim().max(2200).nullable().optional(),
    templateId: z.string().trim().max(120).nullable().optional(),
    layoutVariant: z.enum(['square', 'portrait']).nullable().optional(),
    options: z.object({
        useAI: z.boolean().optional(),
        enableABTesting: z.boolean().optional(),
        schedulePost: z.boolean().optional(),
        useTemplates: z.boolean().optional(),
        optimizeContent: z.boolean().optional(),
        preferredTime: z.coerce.date().optional(),
        tone: z.enum(['professional', 'casual', 'excited', 'luxury', 'urgent']).optional(),
        targetAudience: z.enum(['young', 'professional', 'investors', 'families', 'general']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    }).optional(),
});

const adCampaignCreateSchema = z.object({
    vertical: boostVerticalSchema,
    name: z.string().trim().min(1).max(120),
    format: adFormatSchema,
    destinationType: adDestinationTypeSchema,
    destinationUrl: z.string().trim().max(2000).nullable().optional().default(null),
    listingHref: z.string().trim().max(500).nullable().optional().default(null),
    profileSlug: z.string().trim().max(255).nullable().optional().default(null),
    desktopImageDataUrl: z.string().trim().min(10),
    mobileImageDataUrl: z.string().trim().nullable().optional().default(null),
    overlayEnabled: z.boolean(),
    overlayTitle: z.string().trim().max(160).nullable().optional().default(null),
    overlaySubtitle: z.string().trim().max(300).nullable().optional().default(null),
    overlayCta: z.string().trim().max(80).nullable().optional().default(null),
    overlayAlign: adOverlayAlignSchema,
    placementSection: adPlacementSectionSchema.nullable().optional().default(null),
    startAt: z.string().datetime(),
    durationDays: adDurationDaysSchema,
});

const adCampaignUpdateSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('content'),
        name: z.string().trim().min(1).max(120),
        destinationType: adDestinationTypeSchema,
        destinationUrl: z.string().trim().max(2000).nullable().optional().default(null),
        listingHref: z.string().trim().max(500).nullable().optional().default(null),
        profileSlug: z.string().trim().max(255).nullable().optional().default(null),
        desktopImageDataUrl: z.string().trim().min(10),
        mobileImageDataUrl: z.string().trim().nullable().optional().default(null),
        overlayEnabled: z.boolean(),
        overlayTitle: z.string().trim().max(160).nullable().optional().default(null),
        overlaySubtitle: z.string().trim().max(300).nullable().optional().default(null),
        overlayCta: z.string().trim().max(80).nullable().optional().default(null),
        overlayAlign: adOverlayAlignSchema,
    }),
    z.object({
        action: z.literal('lifecycle'),
        status: z.enum(['paused', 'scheduled', 'active']),
    }),
]);

const createCheckoutSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('boost'),
        vertical: boostVerticalSchema,
        returnUrl: z.string().url(),
        boost: z.object({
            listingId: z.string().min(1),
            section: boostSectionSchema.optional(),
            planId: boostPlanIdSchema,
        }),
    }),
    z.object({
        kind: z.literal('advertising'),
        vertical: boostVerticalSchema,
        returnUrl: z.string().url(),
        advertising: z.object({
            campaignId: z.string().trim().min(1),
        }),
    }),
    z.object({
        kind: z.literal('subscription'),
        vertical: boostVerticalSchema,
        returnUrl: z.string().url(),
        planId: paidSubscriptionPlanIdSchema.optional(), // top-level (agenda)
        subscription: z.object({
            planId: paidSubscriptionPlanIdSchema,
        }).optional(),
    }).refine((d) => d.planId != null || d.subscription?.planId != null, {
        message: 'planId is required',
    }),
]);

const confirmCheckoutSchema = z.object({
    orderId: z.string().min(1),
    paymentId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
});

const serviceLeadTypeSchema = z.enum(['venta_asistida', 'gestion_inmobiliaria']);
const serviceLeadPlanSchema = z.enum(['basico', 'premium']);
const serviceLeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'closed']);
const listingLeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'closed']);
const leadPrioritySchema = z.enum(['low', 'medium', 'high']);
const listingLeadSourceSchema = z.enum(['internal_form', 'direct_message', 'whatsapp', 'phone_call', 'email', 'instagram', 'facebook', 'mercadolibre', 'yapo', 'chileautos', 'portal']);
const listingLeadChannelSchema = z.enum(['lead', 'message', 'social', 'portal']);
const messageThreadSenderRoleSchema = z.enum(['buyer', 'seller', 'system']);
const listingLeadActionSourceSchema = z.enum(['whatsapp', 'phone_call', 'email']);

const serviceLeadCreateSchema = z.object({
    vertical: boostVerticalSchema,
    serviceType: serviceLeadTypeSchema,
    planId: serviceLeadPlanSchema,
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().email(),
    contactPhone: z.string().trim().min(6).max(40),
    contactWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    locationLabel: z.string().trim().max(255).nullable().optional().default(null),
    assetType: z.string().trim().max(120).nullable().optional().default(null),
    assetBrand: z.string().trim().max(120).nullable().optional().default(null),
    assetModel: z.string().trim().max(120).nullable().optional().default(null),
    assetYear: z.string().trim().max(20).nullable().optional().default(null),
    assetMileage: z.string().trim().max(80).nullable().optional().default(null),
    assetArea: z.string().trim().max(80).nullable().optional().default(null),
    expectedPrice: z.string().trim().max(80).nullable().optional().default(null),
    notes: z.string().trim().max(3000).nullable().optional().default(null),
    sourcePage: z.string().trim().max(255).nullable().optional().default(null),
    acceptedTerms: z.literal(true),
});

const serviceLeadUpdateSchema = z.object({
    status: serviceLeadStatusSchema.optional(),
    priority: leadPrioritySchema.optional(),
    closeReason: z.string().trim().max(255).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
    nextTaskTitle: z.string().trim().max(255).nullable().optional(),
    nextTaskAt: z.union([z.string().trim().min(1), z.null()]).optional(),
});

const serviceLeadNoteSchema = z.object({
    body: z.string().trim().min(2).max(4000),
});

const leadQuickActionSchema = z.object({
    action: z.enum(['call', 'whatsapp', 'email', 'follow_up']),
});

const listingLeadCreateSchema = z.object({
    vertical: boostVerticalSchema,
    listingId: z.string().uuid(),
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().email(),
    contactPhone: z.string().trim().max(40).nullable().optional().default(null),
    contactWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    message: z.string().trim().min(2).max(4000),
    sourcePage: z.string().trim().max(255).nullable().optional().default(null),
    createThread: z.boolean().optional().default(true),
    acceptedTerms: z.literal(true),
});

const listingLeadActionCreateSchema = z.object({
    vertical: boostVerticalSchema,
    listingId: z.string().uuid(),
    source: listingLeadActionSourceSchema,
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().email(),
    contactPhone: z.string().trim().max(40).nullable().optional().default(null),
    contactWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    message: z.string().trim().max(4000).nullable().optional().default(null),
    sourcePage: z.string().trim().max(255).nullable().optional().default(null),
    acceptedTerms: z.literal(true),
});

const externalListingLeadImportSchema = z.object({
    vertical: boostVerticalSchema,
    source: listingLeadSourceSchema,
    channel: listingLeadChannelSchema.optional(),
    portal: portalKeySchema.nullable().optional().default(null),
    listingId: z.string().uuid().nullable().optional().default(null),
    listingSlug: z.string().trim().min(1).max(255).nullable().optional().default(null),
    listingHref: z.string().trim().min(1).max(500).nullable().optional().default(null),
    externalListingId: z.string().trim().min(1).max(255).nullable().optional().default(null),
    externalSourceId: z.string().trim().min(1).max(255).nullable().optional().default(null),
    contactName: z.string().trim().max(120).nullable().optional().default(null),
    contactEmail: z.string().trim().email().nullable().optional().default(null),
    contactPhone: z.string().trim().max(40).nullable().optional().default(null),
    contactWhatsapp: z.string().trim().max(40).nullable().optional().default(null),
    message: z.string().trim().max(4000).nullable().optional().default(null),
    sourcePage: z.string().trim().max(255).nullable().optional().default(null),
    receivedAt: z.union([z.number().int().positive(), z.string().trim().min(1)]).nullable().optional().default(null),
    meta: z.record(z.string(), z.unknown()).nullable().optional().default(null),
}).superRefine((value, ctx) => {
    if (!value.listingId && !value.listingSlug && !value.listingHref && !value.externalListingId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['listingId'],
            message: 'Debes indicar listingId, listingSlug, listingHref o externalListingId.',
        });
    }

    const derivedPortal = inferPortalFromLeadImportSource(value.source, value.portal);
    if (value.source === 'portal' && !derivedPortal) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['portal'],
            message: 'Portal es obligatorio cuando source es portal.',
        });
    }

    if (value.externalListingId && !derivedPortal) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['portal'],
            message: 'Portal es obligatorio para resolver externalListingId.',
        });
    }
});

const listingLeadUpdateSchema = z.object({
    status: listingLeadStatusSchema.optional(),
    priority: leadPrioritySchema.optional(),
    closeReason: z.string().trim().max(255).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
    assignedToTeamMemberId: z.string().uuid().nullable().optional(),
    pipelineColumnId: z.string().uuid().nullable().optional(),
    nextTaskTitle: z.string().trim().max(255).nullable().optional(),
    nextTaskAt: z.union([z.string().trim().min(1), z.null()]).optional(),
});

const listingLeadNoteSchema = z.object({
    body: z.string().trim().min(2).max(4000),
});

const pipelineColumnCreateSchema = z.object({
    name: z.string().trim().min(2).max(80),
    status: listingLeadStatusSchema,
});

const pipelineColumnUpdateSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    status: listingLeadStatusSchema.optional(),
});

const pipelineColumnReorderSchema = z.object({
    columnIds: z.array(z.string().uuid()).min(1),
});

const emailVerificationRequestSchema = z.object({
    email: z.string().email().optional(),
});

const emailVerificationConfirmSchema = z.object({
    token: z.string().trim().min(1),
});

const messageEntryCreateSchema = z.object({
    body: z.string().trim().min(1).max(4000),
});

const messageFolderSchema = z.enum(['inbox', 'archived', 'spam']);
const messageThreadUpdateSchema = z.object({
    action: z.enum(['read', 'archive', 'unarchive', 'spam', 'unspam']),
});

// Temporary Maps for migration
const usersById = new Map<string, AppUser>();
const accountsById = new Map<string, AccountRecord>();
const accountUsersByUserId = new Map<string, AccountUserRecord[]>();
const defaultAccountIdByUserId = new Map<string, string>();
const savedByUser = new Map<string, SavedListingRecord[]>();
const followsByUser = new Map<string, FollowRecord[]>();
const boostOrdersByUser = new Map<string, BoostOrder[]>();
const listingsById = new Map<string, ListingRecord>();
const addressBookByUser = new Map<string, AddressBookEntry[]>();
// Address book is now persisted in the database

const paymentOrdersByUser = new Map<string, PaymentOrderRecord[]>();
const activeSubscriptionsByUser = new Map<string, ActiveSubscription[]>();
const instagramAccountByUserVertical = new Map<string, InstagramAccountRecord>();
const instagramPublicationsByUser = new Map<string, InstagramPublicationRecord[]>();
const publicProfilesByUserVertical = new Map<string, PublicProfileRecord>();
const publicProfilesByVerticalSlug = new Map<string, PublicProfileRecord>();
const publicProfileTeamMembersByUserVertical = new Map<string, PublicProfileTeamMemberRecord[]>();
const listingLeadCountsByListing = new Map<string, number>();

// Load data from DB into Maps on startup
async function loadDataFromDB() {
    console.log('Loading data from database...');

    // Load users
    const userResults = await db.select().from(users);
    usersById.clear();
    for (const user of userResults) {
        usersById.set(user.id, mapUserRowToAppUser(user));
    }
    console.log(`Loaded ${userResults.length} users`);

    const accountResults = await db.select().from(accounts);
    accountsById.clear();
    for (const account of accountResults) {
        accountsById.set(account.id, mapAccountRow(account));
    }

    const accountUserResults = await db.select().from(accountUsers);
    accountUsersByUserId.clear();
    defaultAccountIdByUserId.clear();
    for (const membership of accountUserResults) {
        upsertAccountUserCache(mapAccountUserRow(membership));
    }
    console.log(`Loaded ${accountResults.length} accounts and ${accountUserResults.length} account memberships`);

    const publicProfileResults = await db.select().from(publicProfiles);
    publicProfilesByUserVertical.clear();
    publicProfilesByVerticalSlug.clear();
    for (const profile of publicProfileResults) {
        upsertPublicProfileCache(mapPublicProfileRow(profile));
    }
    console.log(`Loaded ${publicProfileResults.length} public profiles`);

    const publicProfileTeamMemberResults = await db.select().from(publicProfileTeamMembers);
    publicProfileTeamMembersByUserVertical.clear();
    for (const member of publicProfileTeamMemberResults) {
        upsertPublicProfileTeamMemberCache(mapPublicProfileTeamMemberRow(member));
    }
    console.log(`Loaded ${publicProfileTeamMemberResults.length} public profile team members`);

    // Load listings
    const listingResults = await db.select().from(listings);
    listingsById.clear();
    for (const listing of listingResults) {
        listingsById.set(listing.id, mapListingRowToRecord(listing));
    }
    console.log(`Loaded ${listingResults.length} listings`);

    // Sync boost listings from loaded listings
    boostListingsSeed.length = 0;
    for (const listing of listingsById.values()) {
        if (listing.status === 'active') {
            upsertBoostListingFromListing(listing);
        }
    }
    console.log(`Synced ${boostListingsSeed.length} boost listings from DB`);

    // Load listing lead counts
    const listingLeadResults = await db.select({
        listingId: listingLeads.listingId,
    }).from(listingLeads);
    listingLeadCountsByListing.clear();
    for (const row of listingLeadResults) {
        listingLeadCountsByListing.set(row.listingId, (listingLeadCountsByListing.get(row.listingId) ?? 0) + 1);
    }
    for (const [listingId, count] of listingLeadCountsByListing) {
        const listing = listingsById.get(listingId);
        if (listing) {
            listing.leads = count;
            listingsById.set(listingId, listing);
        }
    }
    console.log(`Loaded ${listingLeadResults.length} listing leads`);

    // Load saved listings
    const savedResults = await db.select().from(savedListings);
    const savedByUserMap = new Map<string, SavedListingRecord[]>();
    for (const saved of savedResults) {
        const list = savedByUserMap.get(saved.userId) || [];
        list.push({
            id: saved.id,
            href: '', // will be set later if needed
            title: '', // placeholder
            price: '',
            location: undefined,
            savedAt: saved.savedAt.getTime(),
        });
        savedByUserMap.set(saved.userId, list);
    }
    for (const [userId, list] of savedByUserMap) {
        savedByUser.set(userId, list);
    }
    console.log(`Loaded ${savedResults.length} saved listings`);

    // Load follows
    const followResults = await db.select().from(follows);
    const followsByUserMap = new Map<string, FollowRecord[]>();
    for (const follow of followResults) {
        const list = followsByUserMap.get(follow.followerId) || [];
        list.push({
            followeeUserId: follow.followeeId,
            vertical: follow.vertical as VerticalType,
            followedAt: follow.followedAt.getTime(),
        });
        followsByUserMap.set(follow.followerId, list);
    }
    for (const [userId, list] of followsByUserMap) {
        followsByUser.set(userId, list);
    }
    console.log(`Loaded ${followResults.length} follows`);

    // Load boost orders
    const boostResults = await db.select().from(boostOrders);
    const boostOrdersByUserMap = new Map<string, BoostOrder[]>();
    for (const boost of boostResults) {
        const list = boostOrdersByUserMap.get(boost.userId) || [];
        list.push({
            id: boost.id,
            userId: boost.userId,
            listingId: boost.listingId || '',
            vertical: boost.vertical as VerticalType,
            section: boost.section as any,
            planId: boost.planId as BoostPlanId,
            planName: boost.planId, // placeholder
            days: boost.days,
            price: Number(boost.price),
            startAt: boost.startsAt?.getTime() || 0,
            endAt: boost.endsAt?.getTime() || 0,
            status: boost.status as any,
            createdAt: boost.createdAt.getTime(),
            updatedAt: boost.updatedAt.getTime(),
        });
        boostOrdersByUserMap.set(boost.userId, list);
    }
    for (const [userId, list] of boostOrdersByUserMap) {
        boostOrdersByUser.set(userId, list);
    }
    console.log(`Loaded ${boostResults.length} boost orders`);

    const instagramAccountResults = await db.select().from(instagramAccounts);
    for (const account of instagramAccountResults) {
        const mapped = mapInstagramAccountRow(account);
        instagramAccountByUserVertical.set(instagramAccountKey(mapped.userId, mapped.vertical), mapped);
    }
    console.log(`Loaded ${instagramAccountResults.length} Instagram accounts`);

    const instagramPublicationResults = await db.select().from(instagramPublications);
    const instagramPublicationsByUserMap = new Map<string, InstagramPublicationRecord[]>();
    for (const publication of instagramPublicationResults) {
        const mapped = mapInstagramPublicationRow(publication);
        const current = instagramPublicationsByUserMap.get(mapped.userId) ?? [];
        current.push(mapped);
        instagramPublicationsByUserMap.set(mapped.userId, current);
    }
    for (const [userId, list] of instagramPublicationsByUserMap) {
        instagramPublicationsByUser.set(userId, list.sort((a, b) => b.createdAt - a.createdAt));
    }
    console.log(`Loaded ${instagramPublicationResults.length} Instagram publications`);
    
    // Load address book
    const addressBookResults = await db.select().from(addressBook);
    const addressBookByUserMap = new Map<string, AddressBookEntry[]>();
    for (const entry of addressBookResults) {
        const current = addressBookByUserMap.get(entry.userId) ?? [];
        current.push({
            id: entry.id,
            kind: entry.kind as AddressBookKind,
            label: entry.label,
            countryCode: entry.countryCode,
            regionId: entry.regionId,
            regionName: entry.regionName,
            communeId: entry.communeId,
            communeName: entry.communeName,
            neighborhood: entry.neighborhood,
            addressLine1: entry.addressLine1,
            addressLine2: entry.addressLine2,
            postalCode: entry.postalCode,
            arrivalInstructions: entry.arrivalInstructions ?? null,
            isDefault: entry.isDefault,
            geoPoint: (entry.geoPoint as GeoPoint) || makeGeoPoint(null, null, 'none'),
            createdAt: entry.createdAt.getTime(),
            updatedAt: entry.updatedAt.getTime(),
        });
        addressBookByUserMap.set(entry.userId, current);
    }
    for (const [userId, list] of addressBookByUserMap) {
        addressBookByUser.set(userId, list);
    }
    console.log(`Loaded ${addressBookResults.length} address book entries`);

    console.log('Data loading complete');
}
async function getUserById(id: string): Promise<AppUser | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return null;
    return mapUserRowToAppUser(result[0]);
}

async function getListingById(id: string): Promise<ListingRecord | null> {
    const result = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (result.length === 0) return null;
    return upsertListingCache(mapListingRowToRecord(result[0]));
}

function extractListingSlugCandidate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const segments = new URL(trimmed).pathname.split('/').filter(Boolean);
            return segments.at(-1) ?? null;
        } catch {
            return null;
        }
    }

    const normalizedPath = trimmed.replace(/^\/+|\/+$/g, '');
    if (!normalizedPath) return null;
    const segments = normalizedPath.split('/').filter(Boolean);
    return segments.at(-1) ?? normalizedPath;
}

async function getListingBySlug(slugLike: string): Promise<ListingRecord | null> {
    const slug = extractListingSlugCandidate(slugLike);
    if (!slug) return null;

    const cached = Array.from(listingsById.values()).find((item) => item.href.split('/').filter(Boolean).at(-1) === slug);
    if (cached) return cached;

    const result = await db.select().from(listings).where(eq(listings.hrefSlug, slug)).limit(1);
    if (result.length === 0) return null;
    return upsertListingCache(mapListingRowToRecord(result[0]));
}

async function getListingByPortalExternalId(
    vertical: VerticalType,
    portal: PortalKey,
    externalId: string
): Promise<ListingRecord | null> {
    const normalizedExternalId = externalId.trim();
    if (!normalizedExternalId) return null;

    const cached = Array.from(listingsById.values()).find((item) => (
        item.vertical === vertical
        && item.integrations[portal]?.externalId === normalizedExternalId
    ));
    if (cached) return cached;

    const rows = await db.select().from(listings).where(eq(listings.vertical, vertical));
    for (const row of rows) {
        const mapped = upsertListingCache(mapListingRowToRecord(row));
        if (mapped.integrations[portal]?.externalId === normalizedExternalId) {
            return mapped;
        }
    }

    return null;
}

async function getSavedListingsByUser(userId: string): Promise<SavedListingRecord[]> {
    const result = await db
        .select({
            listingId: listings.id,
            hrefSlug: listings.hrefSlug,
            title: listings.title,
            priceLabel: listings.priceLabel,
            location: listings.location,
            description: listings.description,
            vertical: listings.vertical,
            section: listings.section,
            rawData: listings.rawData,
            savedAt: savedListings.savedAt,
            ownerId: listings.ownerId,
            ownerName: users.name,
            ownerEmail: users.email,
        })
        .from(savedListings)
        .innerJoin(listings, eq(savedListings.listingId, listings.id))
        .innerJoin(users, eq(listings.ownerId, users.id))
        .where(eq(savedListings.userId, userId))
        .orderBy(desc(savedListings.savedAt));

    return result.map(row => ({
        id: row.listingId,
        href: row.hrefSlug || '',
        title: row.title,
        price: row.priceLabel || '',
        location: row.location || undefined,
        subtitle: row.description || undefined,
        meta: extractListingSummary({
            id: row.listingId,
            ownerId: row.ownerId,
            vertical: row.vertical as VerticalType,
            section: row.section as BoostSection,
            listingType: row.section as BoostSection,
            title: row.title,
            description: row.description || '',
            price: row.priceLabel || '',
            location: row.location || '',
            href: row.hrefSlug || '',
            status: 'active',
            views: 0,
            favs: 0,
            leads: 0,
            createdAt: row.savedAt.getTime(),
            updatedAt: row.savedAt.getTime(),
            rawData: row.rawData,
            integrations: {},
        }),
        badge: publicSectionLabel(row.section as BoostSection),
        sellerName: row.ownerName,
        sellerMeta: row.ownerEmail,
        savedAt: row.savedAt.getTime(),
    }));
}

async function getFollowsByUser(userId: string): Promise<FollowRecord[]> {
    const result = await db.select().from(follows).where(eq(follows.followerId, userId));
    return result.map(row => ({
        followeeUserId: row.followeeId,
        vertical: row.vertical as VerticalType,
        followedAt: row.followedAt.getTime(),
    }));
}

async function getBoostOrdersByUser(userId: string): Promise<BoostOrder[]> {
    const result = await db.select().from(boostOrders).where(eq(boostOrders.userId, userId));
    return result.map(row => ({
        id: row.id,
        userId: row.userId,
        listingId: row.listingId || '',
        vertical: row.vertical as VerticalType,
        section: row.section as any, // adjust
        planId: row.planId as BoostPlanId,
        planName: row.planId, // placeholder
        days: row.days,
        price: Number(row.price),
        startAt: row.startsAt?.getTime() || 0,
        endAt: row.endsAt?.getTime() || 0,
        status: row.status as BoostOrderStatus,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    }));
}

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

// ValuationFeedRecord imported from ./modules/shared/index.js

const valuationFeedRecords: import('./modules/shared/index.js').ValuationFeedRecord[] = [
    {
        id: 'pm-001',
        source: 'portalinmobiliario_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Pocuro',
        title: 'Departamento 3D 2B Pocuro',
        price: 5250,
        currency: 'UF',
        areaM2: 88,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
        addressLabel: 'Pocuro, Providencia',
        url: null,
    },
    {
        id: 'tt-001',
        source: 'toctoc_feed',
        operationType: 'sale',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Pedro de Valdivia Norte',
        title: 'Departamento remodelado Providencia',
        price: 5480,
        currency: 'UF',
        areaM2: 91,
        bedrooms: 3,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
        addressLabel: 'Pedro de Valdivia Norte, Providencia',
        url: null,
    },
    {
        id: 'ml-001',
        source: 'mercadolibre_feed',
        operationType: 'rent',
        propertyType: 'departamento',
        regionId: 'rm',
        communeId: 'providencia',
        neighborhood: 'Barrio Italia',
        title: 'Departamento 2D 2B Barrio Italia',
        price: 760000,
        currency: 'CLP',
        areaM2: 70,
        bedrooms: 2,
        bathrooms: 2,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        addressLabel: 'Barrio Italia, Providencia',
        url: null,
    },
    {
        id: 'pm-002',
        source: 'portalinmobiliario_feed',
        operationType: 'sale',
        propertyType: 'casa',
        regionId: 'rm',
        communeId: 'las-condes',
        neighborhood: 'Los Dominicos',
        title: 'Casa 4D 3B Los Dominicos',
        price: 16800,
        currency: 'UF',
        areaM2: 230,
        bedrooms: 4,
        bathrooms: 3,
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
        addressLabel: 'Los Dominicos, Las Condes',
        url: null,
    },
];

const valuationHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = {
    'sale|departamento|rm|providencia': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 5050, medianPricePerM2: 59.2, sampleSize: 18 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 5120, medianPricePerM2: 60.0, sampleSize: 21 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 5180, medianPricePerM2: 60.9, sampleSize: 23 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 5230, medianPricePerM2: 61.5, sampleSize: 25 },
    ],
    'rent|departamento|rm|providencia': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 690000, medianPricePerM2: 10200, sampleSize: 14 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 710000, medianPricePerM2: 10420, sampleSize: 16 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 735000, medianPricePerM2: 10850, sampleSize: 17 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 750000, medianPricePerM2: 11010, sampleSize: 19 },
    ],
};

const valuationFeedState: {
    records: ValuationFeedRecord[];
    historyBySegment: Record<string, ValuationHistoricalPoint[]>;
    sources: ValuationFeedSourceStatus[];
} = {
    records: [...valuationFeedRecords],
    historyBySegment: { ...valuationHistoryBySegment },
    sources: [],
};

function parseFeedRecord(sourceId: string, raw: unknown): ValuationFeedRecord | null {
    const item = asObject(raw);
    const operationType = asString(item.operationType).toLowerCase() === 'rent' ? 'rent' : asString(item.operationType).toLowerCase() === 'sale' ? 'sale' : null;
    const propertyType = normalizePropertyType(item.propertyType ?? item.type ?? item.category ?? '');
    const regionId = asString(item.regionId);
    const communeId = asString(item.communeId);
    const price = typeof item.price === 'number' ? item.price : parseNumberFromString(item.price);
    const areaM2 = typeof item.areaM2 === 'number' ? item.areaM2 : parseNumberFromString(item.areaM2 ?? item.surface ?? item.totalArea);
    const publishedAt = typeof item.publishedAt === 'number'
        ? item.publishedAt
        : (typeof item.updatedAt === 'number' ? item.updatedAt : Date.now());

    if (!operationType || !propertyType || !regionId || !communeId || price == null || areaM2 == null) {
        return null;
    }

    return {
        id: asString(item.id) || `${sourceId}-${hashString(JSON.stringify(item))}`,
        source: asString(item.source) || sourceId,
        operationType,
        propertyType,
        regionId,
        communeId,
        neighborhood: asString(item.neighborhood) || null,
        title: asString(item.title) || `${propertyType} ${operationType}`,
        price,
        currency: asString(item.currency) || (operationType === 'sale' ? 'UF' : 'CLP'),
        areaM2,
        bedrooms: typeof item.bedrooms === 'number' ? item.bedrooms : parseNumberFromString(item.bedrooms),
        bathrooms: typeof item.bathrooms === 'number' ? item.bathrooms : parseNumberFromString(item.bathrooms),
        publishedAt,
        addressLabel: asString(item.addressLabel) || null,
        url: asString(item.url) || null,
    };
}

async function loadPartnerFeed(sourceId: string, envUrlKey: string | undefined, fallbackRecords: ValuationFeedRecord[]): Promise<ValuationFeedConnectorLoadResult<ValuationFeedRecord>> {
    const sourceUrl = envUrlKey ? asString(process.env[envUrlKey]) || null : null;
    if (!sourceUrl) {
        return { records: fallbackRecords, sourceUrl: null };
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Feed ${sourceId} respondió ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(payload)
        ? payload as unknown[]
        : Array.isArray(asObject(payload).items)
            ? asObject(payload).items as unknown[]
            : Array.isArray(asObject(payload).records)
                ? asObject(payload).records as unknown[]
                : [];

    const records = rawItems
        .map((item) => parseFeedRecord(sourceId, item))
        .filter((item): item is ValuationFeedRecord => Boolean(item));

    return {
        records: records.length > 0 ? records : fallbackRecords,
        sourceUrl,
    };
}

const valuationFeedConnectors: ValuationFeedConnector[] = [
    {
        id: 'portalinmobiliario_partner',
        label: 'Portal Inmobiliario',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VALUATION_FEED_PORTALINMOBILIARIO_URL',
        load: () => loadPartnerFeed(
            'portalinmobiliario_partner',
            'VALUATION_FEED_PORTALINMOBILIARIO_URL',
            valuationFeedRecords.filter((item) => item.source === 'portalinmobiliario_feed')
        ),
    },
    {
        id: 'toctoc_partner',
        label: 'TOCTOC',
        license: 'partner_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VALUATION_FEED_TOCTOC_URL',
        load: () => loadPartnerFeed(
            'toctoc_partner',
            'VALUATION_FEED_TOCTOC_URL',
            valuationFeedRecords.filter((item) => item.source === 'toctoc_feed')
        ),
    },
    {
        id: 'mercadolibre_partner',
        label: 'Mercado Libre Inmuebles',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VALUATION_FEED_MERCADOLIBRE_URL',
        load: () => loadPartnerFeed(
            'mercadolibre_partner',
            'VALUATION_FEED_MERCADOLIBRE_URL',
            valuationFeedRecords.filter((item) => item.source === 'mercadolibre_feed')
        ),
    },
];

function primeValuationFeedState() {
    if (valuationFeedState.sources.length > 0) return;
    valuationFeedState.sources = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: Array.from(listingsById.values()).filter((item) => item.vertical === 'propiedades').length,
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
        ...valuationFeedConnectors.map((connector) => ({
            id: connector.id,
            label: connector.label,
            license: connector.license,
            transport: connector.transport,
            status: connector.transport === 'snapshot' ? 'ready' as ValuationFeedHealth : 'degraded' as ValuationFeedHealth,
            sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
            itemCount: valuationFeedRecords.filter((item) => item.source.includes(connector.id.split('_')[0]) || item.source.includes(connector.label.toLowerCase().split(' ')[0])).length,
            lastSyncAt: null,
            lastError: connector.transport === 'snapshot' ? null : 'Usando snapshot local hasta conectar feed licenciado.',
            supportsHistory: connector.supportsHistory,
        })),
    ];
}

async function refreshValuationFeeds() {
    const nextHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = { ...valuationHistoryBySegment };
    const nextRecords: ValuationFeedRecord[] = [];
    const nextSources: ValuationFeedSourceStatus[] = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: Array.from(listingsById.values()).filter((item) => item.vertical === 'propiedades').length,
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
    ];

    for (const connector of valuationFeedConnectors) {
        try {
            const result = await connector.load();
            nextRecords.push(...result.records);
            if (result.historyBySegment) {
                Object.assign(nextHistoryBySegment, result.historyBySegment);
            }
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: result.sourceUrl ? 'ready' : 'degraded',
                sourceUrl: result.sourceUrl,
                itemCount: result.records.length,
                lastSyncAt: Date.now(),
                lastError: result.sourceUrl ? null : 'Usando snapshot local hasta configurar un feed externo.',
                supportsHistory: connector.supportsHistory,
            });
        } catch (error) {
            const fallbackRecords = connector.id === 'portalinmobiliario_partner'
                ? valuationFeedRecords.filter((item) => item.source === 'portalinmobiliario_feed')
                : connector.id === 'toctoc_partner'
                    ? valuationFeedRecords.filter((item) => item.source === 'toctoc_feed')
                    : valuationFeedRecords.filter((item) => item.source === 'mercadolibre_feed');
            nextRecords.push(...fallbackRecords);
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: 'degraded',
                sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
                itemCount: fallbackRecords.length,
                lastSyncAt: Date.now(),
                lastError: error instanceof Error ? error.message : 'No pudimos refrescar esta fuente.',
                supportsHistory: connector.supportsHistory,
            });
        }
    }

    valuationFeedState.records = nextRecords;
    valuationFeedState.historyBySegment = nextHistoryBySegment;
    valuationFeedState.sources = nextSources;
    return valuationFeedState;
}

function getValuationFeedState() {
    primeValuationFeedState();
    return valuationFeedState;
}

// VehicleValuationFeedRecord imported from ./modules/shared/index.js

const vehicleValuationFeedRecords: import('./modules/shared/index.js').VehicleValuationFeedRecord[] = [
    {
        id: 'ca-001',
        source: 'chileautos_feed',
        operationType: 'sale',
        vehicleType: 'car',
        brand: 'toyota',
        model: 'rav4',
        version: '2.5 hybrid cvt',
        year: 2022,
        mileageKm: 36500,
        fuelType: 'Híbrido',
        transmission: 'Automática',
        bodyType: 'SUV',
        regionId: 'rm',
        communeId: 'las-condes',
        title: 'Toyota RAV4 2.5 Hybrid CVT 2022',
        price: 27990000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        addressLabel: 'Las Condes',
        url: null,
    },
    {
        id: 'mlv-001',
        source: 'mercadolibre_vehicles_feed',
        operationType: 'sale',
        vehicleType: 'car',
        brand: 'toyota',
        model: 'rav4',
        version: '2.5 hybrid cvt',
        year: 2022,
        mileageKm: 42100,
        fuelType: 'Híbrido',
        transmission: 'Automática',
        bodyType: 'SUV',
        regionId: 'rm',
        communeId: 'la-florida',
        title: 'Toyota RAV4 Hybrid 2022',
        price: 27290000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        addressLabel: 'La Florida',
        url: null,
    },
    {
        id: 'yp-001',
        source: 'yapo_feed',
        operationType: 'sale',
        vehicleType: 'car',
        brand: 'chevrolet',
        model: 'captiva',
        version: 'ii ls 2.4l 6mt',
        year: 2013,
        mileageKm: 128000,
        fuelType: 'Bencina',
        transmission: 'Manual',
        bodyType: 'SUV',
        regionId: 'rm',
        communeId: 'santiago',
        title: 'Chevrolet Captiva II LS 2.4 2013',
        price: 6890000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 13,
        addressLabel: 'Santiago Centro',
        url: null,
    },
    {
        id: 'kv-001',
        source: 'kavak_feed',
        operationType: 'sale',
        vehicleType: 'car',
        brand: 'kia',
        model: 'sportage',
        version: 'ex 2.0 at',
        year: 2021,
        mileageKm: 51400,
        fuelType: 'Bencina',
        transmission: 'Automática',
        bodyType: 'SUV',
        regionId: 'rm',
        communeId: 'pudahuel',
        title: 'Kia Sportage EX 2.0 AT 2021',
        price: 19490000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        addressLabel: 'Pudahuel',
        url: null,
    },
    {
        id: 'ca-002',
        source: 'chileautos_feed',
        operationType: 'sale',
        vehicleType: 'motorcycle',
        brand: 'yamaha',
        model: 'mt-07',
        version: 'abs',
        year: 2023,
        mileageKm: 8600,
        fuelType: 'Bencina',
        transmission: 'Manual',
        bodyType: 'Naked',
        regionId: 'rm',
        communeId: 'nunoa',
        title: 'Yamaha MT-07 ABS 2023',
        price: 7890000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
        addressLabel: 'Ñuñoa',
        url: null,
    },
    {
        id: 'mlv-002',
        source: 'mercadolibre_vehicles_feed',
        operationType: 'sale',
        vehicleType: 'truck',
        brand: 'volvo',
        model: 'fh',
        version: '460 6x2',
        year: 2021,
        mileageKm: 210000,
        fuelType: 'Diésel',
        transmission: 'Automática',
        bodyType: 'Tracto',
        regionId: 'bio',
        communeId: 'concepcion',
        title: 'Volvo FH 460 6x2 2021',
        price: 86900000,
        currency: 'CLP',
        publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
        addressLabel: 'Concepción',
        url: null,
    },
];

const vehicleValuationHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = {
    'sale|car|toyota|rav4|rm|las-condes': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 26500000, medianPricePerM2: null, sampleSize: 12 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 26900000, medianPricePerM2: null, sampleSize: 14 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 27200000, medianPricePerM2: null, sampleSize: 16 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 27500000, medianPricePerM2: null, sampleSize: 17 },
    ],
    'sale|car|chevrolet|captiva|rm|santiago': [
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 120, medianPrice: 6400000, medianPricePerM2: null, sampleSize: 8 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 90, medianPrice: 6550000, medianPricePerM2: null, sampleSize: 9 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 60, medianPrice: 6680000, medianPricePerM2: null, sampleSize: 11 },
        { ts: Date.now() - 1000 * 60 * 60 * 24 * 30, medianPrice: 6820000, medianPricePerM2: null, sampleSize: 10 },
    ],
};

const vehicleValuationFeedState: {
    records: VehicleValuationFeedRecord[];
    historyBySegment: Record<string, ValuationHistoricalPoint[]>;
    sources: ValuationFeedSourceStatus[];
} = {
    records: [...vehicleValuationFeedRecords],
    historyBySegment: { ...vehicleValuationHistoryBySegment },
    sources: [],
};

function normalizeVehicleType(raw: unknown): string {
    const value = asString(raw).toLowerCase();
    if (value.includes('moto')) return 'motorcycle';
    if (value.includes('camion')) return 'truck';
    if (value.includes('bus')) return 'bus';
    if (value.includes('maquinaria')) return 'machinery';
    if (value.includes('naut')) return 'nautical';
    if (value.includes('aer')) return 'aerial';
    return value || 'car';
}

function normalizeVehicleSlug(raw: unknown): string {
    return asString(raw)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function parseVehicleFeedRecord(sourceId: string, raw: unknown): VehicleValuationFeedRecord | null {
    const item = asObject(raw);
    const operationType = asString(item.operationType).toLowerCase() === 'rent' ? 'rent' : asString(item.operationType).toLowerCase() === 'sale' ? 'sale' : null;
    const brand = normalizeVehicleSlug(item.brand ?? item.make);
    const model = normalizeVehicleSlug(item.model);
    const vehicleType = normalizeVehicleType(item.vehicleType ?? item.category ?? item.type);
    const regionId = asString(item.regionId);
    const communeId = asString(item.communeId);
    const price = typeof item.price === 'number' ? item.price : parseNumberFromString(item.price);

    if (!operationType || !brand || !model || !vehicleType || !regionId || !communeId || price == null) {
        return null;
    }

    return {
        id: asString(item.id) || `${sourceId}-${hashString(JSON.stringify(item))}`,
        source: asString(item.source) || sourceId,
        operationType,
        vehicleType,
        brand,
        model,
        version: asString(item.version) || null,
        year: typeof item.year === 'number' ? item.year : parseNumberFromString(item.year),
        mileageKm: typeof item.mileageKm === 'number' ? item.mileageKm : parseNumberFromString(item.mileageKm ?? item.kilometers ?? item.mileage),
        fuelType: asString(item.fuelType) || null,
        transmission: asString(item.transmission) || null,
        bodyType: asString(item.bodyType) || null,
        regionId,
        communeId,
        title: asString(item.title) || `${brand} ${model}`,
        price,
        currency: asString(item.currency) || 'CLP',
        publishedAt: typeof item.publishedAt === 'number' ? item.publishedAt : Date.now(),
        addressLabel: asString(item.addressLabel) || null,
        url: asString(item.url) || null,
    };
}

async function loadVehiclePartnerFeed(sourceId: string, envUrlKey: string | undefined, fallbackRecords: VehicleValuationFeedRecord[]): Promise<{
    records: VehicleValuationFeedRecord[];
    sourceUrl: string | null;
}> {
    const sourceUrl = envUrlKey ? asString(process.env[envUrlKey]) || null : null;
    if (!sourceUrl) {
        return { records: fallbackRecords, sourceUrl: null };
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Feed ${sourceId} respondió ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    const rawItems: unknown[] = Array.isArray(payload)
        ? payload as unknown[]
        : Array.isArray(asObject(payload).items)
            ? asObject(payload).items as unknown[]
            : Array.isArray(asObject(payload).records)
                ? asObject(payload).records as unknown[]
                : [];

    const records = rawItems
        .map((item) => parseVehicleFeedRecord(sourceId, item))
        .filter((item): item is VehicleValuationFeedRecord => Boolean(item));

    return {
        records: records.length > 0 ? records : fallbackRecords,
        sourceUrl,
    };
}

const vehicleValuationFeedConnectors: VehicleValuationFeedConnector[] = [
    {
        id: 'chileautos_partner',
        label: 'Chileautos',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VEHICLE_VALUATION_FEED_CHILEAUTOS_URL',
        load: () => loadVehiclePartnerFeed(
            'chileautos_partner',
            'VEHICLE_VALUATION_FEED_CHILEAUTOS_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'chileautos_feed')
        ),
    },
    {
        id: 'mercadolibre_vehicles_partner',
        label: 'Mercado Libre Vehículos',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: true,
        envUrlKey: 'VEHICLE_VALUATION_FEED_MERCADOLIBRE_URL',
        load: () => loadVehiclePartnerFeed(
            'mercadolibre_vehicles_partner',
            'VEHICLE_VALUATION_FEED_MERCADOLIBRE_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'mercadolibre_vehicles_feed')
        ),
    },
    {
        id: 'yapo_partner',
        label: 'Yapo',
        license: 'commercial_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VEHICLE_VALUATION_FEED_YAPO_URL',
        load: () => loadVehiclePartnerFeed(
            'yapo_partner',
            'VEHICLE_VALUATION_FEED_YAPO_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'yapo_feed')
        ),
    },
    {
        id: 'kavak_partner',
        label: 'Kavak',
        license: 'partner_feed',
        transport: 'remote_json',
        supportsHistory: false,
        envUrlKey: 'VEHICLE_VALUATION_FEED_KAVAK_URL',
        load: () => loadVehiclePartnerFeed(
            'kavak_partner',
            'VEHICLE_VALUATION_FEED_KAVAK_URL',
            vehicleValuationFeedRecords.filter((item) => item.source === 'kavak_feed')
        ),
    },
];

function primeVehicleValuationFeedState() {
    if (vehicleValuationFeedState.sources.length > 0) return;
    vehicleValuationFeedState.sources = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: Array.from(listingsById.values()).filter((item) => item.vertical === 'autos').length,
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
        ...vehicleValuationFeedConnectors.map((connector) => ({
            id: connector.id,
            label: connector.label,
            license: connector.license,
            transport: connector.transport,
            status: 'degraded' as ValuationFeedHealth,
            sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
            itemCount: vehicleValuationFeedRecords.filter((item) => item.source.includes(connector.label.toLowerCase().split(' ')[0])).length,
            lastSyncAt: null,
            lastError: 'Usando copia local hasta configurar un feed externo.',
            supportsHistory: connector.supportsHistory,
        })),
        {
            id: 'facebook_marketplace',
            label: 'Facebook Marketplace',
            license: 'commercial_feed',
            transport: 'snapshot',
            status: 'disabled',
            sourceUrl: null,
            itemCount: 0,
            lastSyncAt: null,
            lastError: 'Requiere integración autorizada. No usamos scraping como fuente operativa.',
            supportsHistory: false,
        },
    ];
}

async function refreshVehicleValuationFeeds() {
    const nextHistoryBySegment: Record<string, ValuationHistoricalPoint[]> = { ...vehicleValuationHistoryBySegment };
    const nextRecords: VehicleValuationFeedRecord[] = [];
    const nextSources: ValuationFeedSourceStatus[] = [
        {
            id: 'simple_internal',
            label: 'Simple internal',
            license: 'internal',
            transport: 'snapshot',
            status: 'ready',
            sourceUrl: null,
            itemCount: Array.from(listingsById.values()).filter((item) => item.vertical === 'autos').length,
            lastSyncAt: Date.now(),
            lastError: null,
            supportsHistory: false,
        },
    ];

    for (const connector of vehicleValuationFeedConnectors) {
        try {
            const result = await connector.load();
            nextRecords.push(...result.records);
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: result.sourceUrl ? 'ready' : 'degraded',
                sourceUrl: result.sourceUrl,
                itemCount: result.records.length,
                lastSyncAt: Date.now(),
                lastError: result.sourceUrl ? null : 'Usando copia local hasta configurar un feed externo.',
                supportsHistory: connector.supportsHistory,
            });
        } catch (error) {
            const fallbackRecords = connector.id === 'chileautos_partner'
                ? vehicleValuationFeedRecords.filter((item) => item.source === 'chileautos_feed')
                : connector.id === 'mercadolibre_vehicles_partner'
                    ? vehicleValuationFeedRecords.filter((item) => item.source === 'mercadolibre_vehicles_feed')
                    : connector.id === 'yapo_partner'
                        ? vehicleValuationFeedRecords.filter((item) => item.source === 'yapo_feed')
                        : vehicleValuationFeedRecords.filter((item) => item.source === 'kavak_feed');
            nextRecords.push(...fallbackRecords);
            nextSources.push({
                id: connector.id,
                label: connector.label,
                license: connector.license,
                transport: connector.transport,
                status: 'degraded',
                sourceUrl: connector.envUrlKey ? asString(process.env[connector.envUrlKey]) || null : null,
                itemCount: fallbackRecords.length,
                lastSyncAt: Date.now(),
                lastError: error instanceof Error ? error.message : 'No pudimos refrescar esta fuente.',
                supportsHistory: connector.supportsHistory,
            });
        }
    }

    nextSources.push({
        id: 'facebook_marketplace',
        label: 'Facebook Marketplace',
        license: 'commercial_feed',
        transport: 'snapshot',
        status: 'disabled',
        sourceUrl: null,
        itemCount: 0,
        lastSyncAt: null,
        lastError: 'Requiere integración autorizada. No usamos scraping como fuente operativa.',
        supportsHistory: false,
    });

    vehicleValuationFeedState.records = nextRecords;
    vehicleValuationFeedState.historyBySegment = nextHistoryBySegment;
    vehicleValuationFeedState.sources = nextSources;
    return vehicleValuationFeedState;
}

function getVehicleValuationFeedState() {
    primeVehicleValuationFeedState();
    return vehicleValuationFeedState;
}

const seedUsers: AppUser[] = [
    {
        id: '1',
        email: 'admin@simpleplataforma.app',
        name: 'Admin Simple',
        role: 'superadmin',
        status: 'active',
    },
];

for (const user of seedUsers) {
    usersById.set(user.id, user);
}

const MAX_BOOST_SLOTS_PER_SECTION = 10;

const BOOST_PLAN_TEMPLATES: Array<{
    id: BoostPlanId;
    name: string;
    days: number;
    visibilityLift: string;
}> = [
    { id: 'boost_starter', name: 'Starter', days: 7, visibilityLift: 'x2 visibilidad' },
    { id: 'boost_pro', name: 'Pro', days: 15, visibilityLift: 'x3 visibilidad' },
    { id: 'boost_max', name: 'Max', days: 30, visibilityLift: 'x5 visibilidad' },
];

const BOOST_PRICE_BY_VERTICAL_SECTION: Record<VerticalType, Record<BoostSection, Record<BoostPlanId, number>>> = {
    autos: {
        sale: { boost_starter: 9990, boost_pro: 17990, boost_max: 29990 },
        rent: { boost_starter: 6990, boost_pro: 12990, boost_max: 21990 },
        auction: { boost_starter: 4990, boost_pro: 8990, boost_max: 14990 },
        project: { boost_starter: 9990, boost_pro: 17990, boost_max: 29990 },
    },
    propiedades: {
        sale: { boost_starter: 12990, boost_pro: 23990, boost_max: 39990 },
        rent: { boost_starter: 8990, boost_pro: 16990, boost_max: 27990 },
        auction: { boost_starter: 12990, boost_pro: 23990, boost_max: 39990 },
        project: { boost_starter: 14990, boost_pro: 27990, boost_max: 44990 },
    },
    agenda: {
        sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    },
    serenatas: {
        sale: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        rent: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        auction: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
        project: { boost_starter: 0, boost_pro: 0, boost_max: 0 },
    },
};

const AD_FORMAT_LABELS: Record<AdFormat, string> = {
    hero: 'Hero principal',
    card: 'Card destacada',
    inline: 'Banner inline',
};

const MAX_CAMPAIGNS_TOTAL = 10;
const MAX_ACTIVE_HERO_CAMPAIGNS = 5;

const AD_PRICING_BY_VERTICAL: Record<VerticalType, Record<AdFormat, Record<AdDurationDays, number>>> = {
    autos: {
        hero: { 7: 29990, 15: 49990, 30: 79990 },
        card: { 7: 9990, 15: 14990, 30: 24990 },
        inline: { 7: 4990, 15: 9990, 30: 14990 },
    },
    propiedades: {
        hero: { 7: 29990, 15: 49990, 30: 79990 },
        card: { 7: 9990, 15: 14990, 30: 24990 },
        inline: { 7: 4990, 15: 9990, 30: 14990 },
    },
    agenda: {
        hero: { 7: 0, 15: 0, 30: 0 },
        card: { 7: 0, 15: 0, 30: 0 },
        inline: { 7: 0, 15: 0, 30: 0 },
    },
    serenatas: {
        hero: { 7: 0, 15: 0, 30: 0 },
        card: { 7: 0, 15: 0, 30: 0 },
        inline: { 7: 0, 15: 0, 30: 0 },
    },
};

const SUBSCRIPTION_PLANS_BY_VERTICAL: Record<VerticalType, SubscriptionPlanRecord[]> = {
    autos: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para comenzar a publicar vehículos.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 3,
            maxFeaturedListings: 0,
            maxImagesPerListing: 5,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['3 publicaciones activas', '5 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Para equipos comerciales con operación diaria.',
            priceMonthly: 39990,
            currency: 'CLP',
            maxListings: 50,
            maxFeaturedListings: 5,
            maxImagesPerListing: 20,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: false,
            apiAccess: false,
            recommended: true,
            maxFreeBoostsPerMonth: 1,
            features: ['50 publicaciones activas', '5 avisos destacados', 'CRM completo', 'Estadísticas avanzadas', '20 fotos por aviso', '1 boost gratuito al mes'],
        },
        {
            id: 'enterprise',
            name: 'Empresarial',
            description: 'Para empresas con operación multicanal y equipos grandes.',
            priceMonthly: 99990,
            currency: 'CLP',
            maxListings: -1,
            maxFeaturedListings: -1,
            maxImagesPerListing: 50,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            maxFreeBoostsPerMonth: 3,
            features: ['Publicaciones ilimitadas', 'Destacados ilimitados', 'API y branding propio', 'Soporte prioritario 24/7', '50 fotos por aviso', '3 boosts gratuitos al mes'],
        },
    ],
    propiedades: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para comenzar a publicar propiedades.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 3,
            maxFeaturedListings: 0,
            maxImagesPerListing: 12,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['3 propiedades activas', '12 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Para corredoras con operación comercial constante.',
            priceMonthly: 39990,
            currency: 'CLP',
            maxListings: 50,
            maxFeaturedListings: 5,
            maxImagesPerListing: 30,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: false,
            apiAccess: false,
            recommended: true,
            maxFreeBoostsPerMonth: 1,
            features: ['50 propiedades activas', '5 destacadas', 'CRM con pipeline', 'Estadísticas avanzadas', '30 fotos por aviso', '1 boost gratuito al mes'],
        },
        {
            id: 'enterprise',
            name: 'Empresarial',
            description: 'Para equipos grandes, desarrolladoras y franquicias.',
            priceMonthly: 99990,
            currency: 'CLP',
            maxListings: -1,
            maxFeaturedListings: -1,
            maxImagesPerListing: 60,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            maxFreeBoostsPerMonth: 3,
            features: ['Publicaciones ilimitadas', 'Destacados ilimitados', 'API y branding propio', 'Soporte prioritario 24/7', '60 fotos por aviso', '3 boosts gratuitos al mes'],
        },
    ],
    agenda: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Para empezar a ordenar tu consulta.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 1,
            maxFeaturedListings: 0,
            maxImagesPerListing: 5,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['Hasta 10 citas al mes', 'Hasta 5 pacientes', 'Página de reserva pública', 'Confirmación por email al paciente', 'Recordatorio automático 24h antes'],
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Para profesionales con práctica activa.',
            priceMonthly: 14990,
            currency: 'CLP',
            maxListings: 1,
            maxFeaturedListings: 0,
            maxImagesPerListing: 20,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: false,
            apiAccess: false,
            recommended: true,
            maxFreeBoostsPerMonth: 0,
            features: ['Citas y pacientes ilimitados', 'Notas clínicas por sesión', 'Control de pagos y cobros', 'Recordatorios por email y WhatsApp', 'Recordatorio 30 min antes por WhatsApp', 'Estadísticas de consulta', 'Sincronización con Google Calendar'],
        },
        {
            id: 'enterprise',
            name: 'Empresarial',
            description: 'Próximamente. Plan para clínicas y centros médicos.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 1,
            maxFeaturedListings: 0,
            maxImagesPerListing: 50,
            analyticsEnabled: true,
            crmEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            isComingSoon: true,
            maxFreeBoostsPerMonth: 0,
            features: ['Múltiples profesionales', 'Gestión de salas', 'Reportes avanzados', 'Integraciones con sistemas de salud', 'Branding completo'],
        },
    ],
    serenatas: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para músicos y grupos de serenata.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['Acceso básico a SimpleSerenatas'],
        },
    ],
};

const boostListingsSeed: BoostListingRecord[] = [];

function isBoostSectionAllowed(vertical: VerticalType, section: BoostSection): boolean {
    if (vertical === 'autos') return section === 'sale' || section === 'rent' || section === 'auction';
    return section === 'sale' || section === 'rent' || section === 'project';
}

function getSectionsForVertical(vertical: VerticalType): BoostSection[] {
    return vertical === 'autos' ? ['sale', 'rent', 'auction'] : ['sale', 'rent', 'project'];
}

function parseBoostSection(raw: string | undefined, vertical: VerticalType): BoostSection {
    const normalized = raw === 'rent' || raw === 'auction' || raw === 'project' ? raw : 'sale';
    return isBoostSectionAllowed(vertical, normalized) ? normalized : 'sale';
}

function getBoostPlans(vertical: VerticalType, section: BoostSection): BoostPlanRecord[] {
    const safeSection = isBoostSectionAllowed(vertical, section) ? section : 'sale';
    const sectionPricing = BOOST_PRICE_BY_VERTICAL_SECTION[vertical][safeSection];
    return BOOST_PLAN_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        days: template.days,
        visibilityLift: template.visibilityLift,
        price: sectionPricing[template.id],
    }));
}

function getBoostListingById(vertical: VerticalType, listingId: string): BoostListingRecord | null {
    return boostListingsSeed.find((item) => item.vertical === vertical && item.id === listingId) ?? null;
}

function getBoostListingsByOwner(vertical: VerticalType, ownerId: string): BoostListingRecord[] {
    return boostListingsSeed.filter((item) => item.vertical === vertical && item.ownerId === ownerId);
}

function normalizeBoostOrder(order: BoostOrder, now = Date.now()): BoostOrder {
    if (order.status === 'paused' || order.status === 'ended') {
        if (order.status === 'ended') return { ...order, status: 'ended' };
        if (now >= order.endAt) return { ...order, status: 'ended' };
        return order;
    }

    if (now >= order.endAt) return { ...order, status: 'ended' };
    if (now < order.startAt) return { ...order, status: 'scheduled' };
    return { ...order, status: 'active' };
}

function getAllBoostOrdersNormalized(now = Date.now()): BoostOrder[] {
    const all: BoostOrder[] = [];
    for (const [userId, orders] of boostOrdersByUser.entries()) {
        const normalized = orders.map((order) => normalizeBoostOrder(order, now));
        boostOrdersByUser.set(userId, normalized);
        all.push(...normalized);
    }
    return all;
}

function getBoostOrdersForUser(userId: string, vertical?: VerticalType): BoostOrder[] {
    const normalized = (boostOrdersByUser.get(userId) ?? []).map((order) => normalizeBoostOrder(order));
    boostOrdersByUser.set(userId, normalized);
    const filtered = vertical ? normalized.filter((item) => item.vertical === vertical) : normalized;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

function sectionLabel(section: BoostSection): string {
    if (section === 'rent') return 'Arriendos';
    if (section === 'auction') return 'Subastas';
    if (section === 'project') return 'Proyectos';
    return 'Ventas';
}

function makeBoostOrderId(): string {
    return `boost-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

function countReservedSlots(vertical: VerticalType, section: BoostSection): number {
    return getAllBoostOrdersNormalized().filter((order) => {
        if (order.vertical !== vertical) return false;
        if (order.section !== section) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    }).length;
}

function countFreeBoostsUsedThisMonth(userId: string, vertical: VerticalType): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const orders = getBoostOrdersForUser(userId, vertical);
    return orders.filter((order) => order.createdAt >= monthStart && order.price === 0).length;
}

function getFreeBoostQuota(user: AppUser, vertical: VerticalType): { max: number; used: number; remaining: number } {
    if (user.role === 'superadmin') {
        return { max: -1, used: 0, remaining: -1 }; // -1 = ilimitado
    }
    const planId = getEffectivePlanId(user, vertical);
    const plan = getSubscriptionPlans(vertical).find((p) => p.id === planId);
    const max = plan?.maxFreeBoostsPerMonth ?? 0;
    const used = countFreeBoostsUsedThisMonth(user.id, vertical);
    return { max, used, remaining: Math.max(0, max - used) };
}

function createBoostOrderRecord(input: {
    userId: string;
    vertical: VerticalType;
    listing: BoostListingRecord;
    section: BoostSection;
    plan: BoostPlanRecord;
    startAt?: number;
}): { ok: boolean; order?: BoostOrder; error?: string } {
    const ownOrders = getBoostOrdersForUser(input.userId);
    const hasRunningForListing = ownOrders.some((order) => {
        if (order.vertical !== input.vertical || order.listingId !== input.listing.id) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    });

    if (hasRunningForListing) {
        return { ok: false, error: 'Ya tienes un boost vigente para esta publicación' };
    }

    const reserved = countReservedSlots(input.vertical, input.section);
    if (reserved >= MAX_BOOST_SLOTS_PER_SECTION) {
        return { ok: false, error: 'No quedan cupos en esta sección para el periodo seleccionado' };
    }

    const startAt = input.startAt && Number.isFinite(input.startAt) ? input.startAt : Date.now();
    const endAt = startAt + input.plan.days * 24 * 60 * 60 * 1000;
    const createdAt = Date.now();

    const nextOrder = normalizeBoostOrder({
        id: makeBoostOrderId(),
        userId: input.userId,
        vertical: input.vertical,
        listingId: input.listing.id,
        section: input.section,
        planId: input.plan.id,
        planName: input.plan.name,
        days: input.plan.days,
        price: input.plan.price,
        startAt,
        endAt,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
    });

    const existing = boostOrdersByUser.get(input.userId) ?? [];
    boostOrdersByUser.set(input.userId, [nextOrder, ...existing]);

    return { ok: true, order: nextOrder };
}

function getAdvertisingPrice(vertical: VerticalType, format: AdFormat, durationDays: AdDurationDays): number {
    return AD_PRICING_BY_VERTICAL[vertical][format][durationDays];
}

function isAdPlacementSectionAllowed(vertical: VerticalType, section: AdPlacementSection): boolean {
    if (section === 'home') return true;
    if (vertical === 'autos') return section === 'ventas' || section === 'arriendos' || section === 'subastas';
    return section === 'ventas' || section === 'arriendos' || section === 'proyectos';
}

function normalizeAdCampaignStatus(record: AdCampaignRecord, now = Date.now()): AdCampaignRecord {
    if (record.status === 'paused') {
        if (now >= record.endAt) return { ...record, status: 'ended' };
        return record;
    }
    if (now >= record.endAt) return { ...record, status: 'ended' };
    if (now < record.startAt) return { ...record, status: 'scheduled' };
    return { ...record, status: 'active' };
}

function normalizeAdCampaigns(items: AdCampaignRecord[], now = Date.now()): AdCampaignRecord[] {
    const normalized = items.map((item) => normalizeAdCampaignStatus(item, now));

    const activeHeroCandidates = normalized
        .filter((item) => item.paymentStatus === 'paid' && item.format === 'hero' && item.status === 'active')
        .sort((a, b) => a.startAt - b.startAt || a.createdAt - b.createdAt);

    const allowedHeroIds = new Set(
        activeHeroCandidates.slice(0, MAX_ACTIVE_HERO_CAMPAIGNS).map((item) => item.id)
    );

    return normalized.map((item) => {
        if (item.paymentStatus !== 'paid') return item;
        if (item.format !== 'hero' || item.status !== 'active') return item;
        if (allowedHeroIds.has(item.id)) return item;
        return { ...item, status: 'scheduled' };
    });
}

function getAdPaymentStatusFromOrderStatus(status: PaymentOrderStatus): AdPaymentStatus {
    if (status === 'approved' || status === 'authorized') return 'paid';
    if (status === 'rejected') return 'failed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

function isValidHttpDestinationUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function getSubscriptionPlans(vertical: VerticalType): SubscriptionPlanRecord[] {
    return SUBSCRIPTION_PLANS_BY_VERTICAL[vertical];
}

function getPaidSubscriptionPlan(
    vertical: VerticalType,
    planId: Exclude<SubscriptionPlanId, 'free'>
): PaidSubscriptionPlanRecord | null {
    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
    return plan ? (plan as PaidSubscriptionPlanRecord) : null;
}

function getActiveSubscriptionsForUser(userId: string, vertical?: VerticalType): ActiveSubscription[] {
    const items = activeSubscriptionsByUser.get(userId) ?? [];
    const filtered = vertical ? items.filter((item) => item.vertical === vertical) : items;
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getCurrentSubscription(userId: string, vertical: VerticalType): ActiveSubscription | null {
    return getActiveSubscriptionsForUser(userId, vertical).find((item) => item.status === 'active') ?? null;
}

function publicProfileUserVerticalKey(userId: string, vertical: VerticalType): string {
    return `${userId}:${vertical}`;
}

function publicProfileVerticalSlugKey(vertical: VerticalType, slug: string): string {
    return `${vertical}:${slug}`;
}

function createDefaultPublicProfileSocialLinks(): PublicProfileSocialLinks {
    return {
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    };
}

function createDefaultPublicProfileTeamSocialLinks(): PublicProfileTeamSocialLinks {
    return {
        instagram: null,
        facebook: null,
        linkedin: null,
    };
}

function createDefaultPublicProfileBusinessHours(): PublicProfileBusinessHour[] {
    return PUBLIC_PROFILE_DAYS.map((day) => ({
        day,
        open: day === 'saturday' || day === 'sunday' ? null : '09:00',
        close: day === 'saturday' || day === 'sunday' ? null : '18:00',
        closed: day === 'saturday' || day === 'sunday',
    }));
}

function normalizePublicProfileSocialLinks(value: unknown): PublicProfileSocialLinks {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const normalized = createDefaultPublicProfileSocialLinks();
    for (const key of PUBLIC_PROFILE_SOCIAL_KEYS) {
        const next = asString(source[key]);
        normalized[key] = next || null;
    }
    return normalized;
}

function normalizePublicProfileTeamSocialLinks(value: unknown): PublicProfileTeamSocialLinks {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const normalized = createDefaultPublicProfileTeamSocialLinks();
    for (const key of PUBLIC_PROFILE_TEAM_SOCIAL_KEYS) {
        const next = asString(source[key]);
        normalized[key] = next || null;
    }
    return normalized;
}

function normalizePublicProfileBusinessHours(value: unknown): PublicProfileBusinessHour[] {
    const source = Array.isArray(value) ? value : [];
    const byDay = new Map<PublicProfileDayId, PublicProfileBusinessHour>();
    for (const item of source) {
        if (!item || typeof item !== 'object') continue;
        const day = asString((item as Record<string, unknown>).day) as PublicProfileDayId;
        if (!PUBLIC_PROFILE_DAYS.includes(day)) continue;
        const open = asString((item as Record<string, unknown>).open) || null;
        const close = asString((item as Record<string, unknown>).close) || null;
        const closed = Boolean((item as Record<string, unknown>).closed);
        byDay.set(day, {
            day,
            open: closed ? null : open,
            close: closed ? null : close,
            closed,
        });
    }
    return createDefaultPublicProfileBusinessHours().map((item) => byDay.get(item.day) ?? item);
}

function normalizePublicProfileTeamMemberSpecialties(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => asString(item).trim()).filter(Boolean).slice(0, 6);
}

function toNullIfEmpty(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized ? normalized : null;
}

function isValidAbsoluteUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function normalizeExternalUrlInput(value: string | null | undefined): string | null {
    const normalized = toNullIfEmpty(value);
    if (!normalized) return null;
    const candidate = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    return isValidAbsoluteUrl(candidate) ? candidate : normalized;
}

function normalizePublicProfileSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, 80);
}

function isValidPublicProfileSlug(value: string): boolean {
    return /^[a-z0-9][a-z0-9._-]{2,79}$/.test(value);
}

function getDefaultPublicProfileAccountKind(user: AppUser, vertical: VerticalType): PublicProfileAccountKind {
    const planId = getEffectivePlanId(user, vertical);
    if (planId === 'enterprise') return 'company';
    if (planId === 'pro') return 'independent';
    return 'individual';
}

function getDefaultPublicProfileAddress(userId: string): AddressBookEntry | null {
    const entries = addressBookByUser.get(userId) ?? [];
    if (entries.length === 0) return null;
    return entries.find((item) => item.isDefault) ?? entries[0] ?? null;
}

function getCurrentPlanLabel(user: AppUser, vertical: VerticalType): string {
    if (user.role === 'superadmin') return 'Empresa';
    if (user.role === 'admin') return 'Admin';
    const plan = getSubscriptionPlans(vertical).find((item) => item.id === getEffectivePlanId(user, vertical));
    return plan?.name ?? 'Gratuito';
}

function instagramAccountKey(userId: string, vertical: VerticalType): string {
    return `${userId}:${vertical}`;
}

function getInstagramAccount(userId: string, vertical: VerticalType): InstagramAccountRecord | null {
    return instagramAccountByUserVertical.get(instagramAccountKey(userId, vertical)) ?? null;
}

function getInstagramPublicationsForUser(userId: string, vertical?: VerticalType): InstagramPublicationRecord[] {
    const items = instagramPublicationsByUser.get(userId) ?? [];
    const filtered = vertical ? items.filter((item) => item.vertical === vertical) : items;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

function getInstagramRequiredPlanIds(): Array<Exclude<SubscriptionPlanId, 'free'>> {
    return ['pro', 'enterprise'];
}

function getEffectivePlanId(user: AppUser, vertical: VerticalType): SubscriptionPlanId {
    if (user.role === 'superadmin') return 'enterprise';
    return getCurrentSubscription(user.id, vertical)?.planId ?? 'free';
}

function userCanUsePublicProfile(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return getEffectivePlanId(user, vertical) !== 'free';
}

function userCanUseInstagram(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin') return true;
    const planId = getEffectivePlanId(user, vertical);
    return planId === 'pro' || planId === 'enterprise';
}

function userCanUseCrm(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    const planId = getEffectivePlanId(user, vertical);
    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
    return Boolean(plan?.crmEnabled);
}

function makeInstagramStatePayload(input: {
    nonce: string;
    userId: string;
    vertical: VerticalType;
    returnTo: string;
}): string {
    return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function parseInstagramStatePayload(value: string): {
    nonce: string;
    userId: string;
    vertical: VerticalType;
    returnTo: string;
} | null {
    if (!value) return null;
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
        const nonce = asString(decoded.nonce);
        const userId = asString(decoded.userId);
        const vertical = parseVertical(asString(decoded.vertical));
        const returnTo = asString(decoded.returnTo);
        if (!nonce || !userId || !returnTo) return null;
        return { nonce, userId, vertical, returnTo };
    } catch {
        return null;
    }
}

function upsertActiveSubscription(nextSubscription: ActiveSubscription): ActiveSubscription {
    const current = activeSubscriptionsByUser.get(nextSubscription.userId) ?? [];
    const replaced = current.map((item) => {
        if (item.vertical !== nextSubscription.vertical) return item;
        if (item.status !== 'active') return item;
        return {
            ...item,
            status: 'cancelled' as const,
            updatedAt: Date.now(),
        };
    });
    const next = [nextSubscription, ...replaced.filter((item) => item.id !== nextSubscription.id)];
    activeSubscriptionsByUser.set(nextSubscription.userId, next);
    return nextSubscription;
}

function makePaymentOrderId(kind: CheckoutKind): string {
    return `${kind}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

function makeSubscriptionId(vertical: VerticalType, planId: Exclude<SubscriptionPlanId, 'free'>): string {
    return `sub-${vertical}-${planId}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

function getPaymentOrdersForUser(userId: string, options: { vertical?: VerticalType; kind?: CheckoutKind } = {}): PaymentOrderRecord[] {
    const current = paymentOrdersByUser.get(userId) ?? [];
    return current
        .filter((item) => (options.vertical ? item.vertical === options.vertical : true))
        .filter((item) => (options.kind ? item.kind === options.kind : true))
        .sort((a, b) => b.createdAt - a.createdAt);
}

function upsertPaymentOrder(nextOrder: PaymentOrderRecord): PaymentOrderRecord {
    const current = paymentOrdersByUser.get(nextOrder.userId) ?? [];
    const next = [nextOrder, ...current.filter((item) => item.id !== nextOrder.id)];
    paymentOrdersByUser.set(nextOrder.userId, next);
    return nextOrder;
}

function updatePaymentOrder(
    userId: string,
    orderId: string,
    updater: (current: PaymentOrderRecord) => PaymentOrderRecord
): PaymentOrderRecord | null {
    const current = paymentOrdersByUser.get(userId) ?? [];
    const target = current.find((item) => item.id === orderId);
    if (!target) return null;
    const nextOrder = updater(target);
    paymentOrdersByUser.set(
        userId,
        [nextOrder, ...current.filter((item) => item.id !== orderId)]
    );
    return nextOrder;
}

function instagramAccountToResponse(account: InstagramAccountRecord | null) {
    if (!account) return null;
    return {
        id: account.id,
        vertical: account.vertical,
        instagramUserId: account.instagramUserId,
        username: account.username,
        displayName: account.displayName,
        accountType: account.accountType,
        profilePictureUrl: account.profilePictureUrl,
        scopes: account.scopes,
        autoPublishEnabled: account.autoPublishEnabled,
        captionTemplate: account.captionTemplate,
        status: account.status,
        lastSyncedAt: account.lastSyncedAt,
        lastPublishedAt: account.lastPublishedAt,
        lastError: account.lastError,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
    };
}

function instagramPublicationToResponse(publication: InstagramPublicationRecord) {
    return {
        id: publication.id,
        vertical: publication.vertical,
        listingId: publication.listingId,
        listingTitle: publication.listingTitle,
        instagramMediaId: publication.instagramMediaId,
        instagramPermalink: publication.instagramPermalink,
        caption: publication.caption,
        imageUrl: publication.imageUrl,
        status: publication.status,
        errorMessage: publication.errorMessage,
        sourceUpdatedAt: publication.sourceUpdatedAt,
        publishedAt: publication.publishedAt,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
    };
}

async function upsertInstagramAccountRecord(input: {
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
    autoPublishEnabled?: boolean;
    captionTemplate?: string | null;
    status?: InstagramAccountStatus;
    lastSyncedAt?: number | null;
    lastPublishedAt?: number | null;
    lastError?: string | null;
}): Promise<InstagramAccountRecord> {
    const existing = getInstagramAccount(input.userId, input.vertical);
    const now = new Date();
    const accountId = await getPrimaryAccountIdForUser(input.userId);

    if (existing) {
        const [row] = await db.update(instagramAccounts).set({
            instagramUserId: input.instagramUserId,
            username: input.username,
            displayName: input.displayName,
            accountType: input.accountType,
            profilePictureUrl: input.profilePictureUrl,
            accessToken: input.accessToken,
            tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
            scopes: input.scopes,
            autoPublishEnabled: input.autoPublishEnabled ?? existing.autoPublishEnabled,
            captionTemplate: input.captionTemplate === undefined ? existing.captionTemplate : input.captionTemplate,
            status: input.status ?? 'connected',
            lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
            lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null),
            lastError: input.lastError ?? null,
            updatedAt: now,
        }).where(eq(instagramAccounts.id, existing.id)).returning();

        const mapped = mapInstagramAccountRow(row);
        instagramAccountByUserVertical.set(instagramAccountKey(mapped.userId, mapped.vertical), mapped);
        return mapped;
    }

    const [row] = await db.insert(instagramAccounts).values({
        accountId,
        userId: input.userId,
        vertical: input.vertical,
        instagramUserId: input.instagramUserId,
        username: input.username,
        displayName: input.displayName,
        accountType: input.accountType,
        profilePictureUrl: input.profilePictureUrl,
        accessToken: input.accessToken,
        tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
        scopes: input.scopes,
        autoPublishEnabled: input.autoPublishEnabled ?? false,
        captionTemplate: input.captionTemplate ?? defaultInstagramCaptionTemplate(input.vertical),
        status: input.status ?? 'connected',
        lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
        lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : null,
        lastError: input.lastError ?? null,
    }).returning();

    const mapped = mapInstagramAccountRow(row);
    instagramAccountByUserVertical.set(instagramAccountKey(mapped.userId, mapped.vertical), mapped);
    return mapped;
}

async function updateInstagramAccountSettings(
    userId: string,
    vertical: VerticalType,
    patch: {
        autoPublishEnabled?: boolean;
        captionTemplate?: string | null;
        status?: InstagramAccountStatus;
        lastPublishedAt?: number | null;
        lastSyncedAt?: number | null;
        lastError?: string | null;
        accessToken?: string;
        tokenExpiresAt?: number | null;
        scopes?: string[];
    }
): Promise<InstagramAccountRecord | null> {
    const existing = getInstagramAccount(userId, vertical);
    if (!existing) return null;

    const [row] = await db.update(instagramAccounts).set({
        autoPublishEnabled: patch.autoPublishEnabled ?? existing.autoPublishEnabled,
        captionTemplate: patch.captionTemplate === undefined ? existing.captionTemplate : patch.captionTemplate,
        status: patch.status ?? existing.status,
        lastPublishedAt: patch.lastPublishedAt === undefined
            ? (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null)
            : (patch.lastPublishedAt ? new Date(patch.lastPublishedAt) : null),
        lastSyncedAt: patch.lastSyncedAt === undefined
            ? (existing.lastSyncedAt ? new Date(existing.lastSyncedAt) : new Date())
            : (patch.lastSyncedAt ? new Date(patch.lastSyncedAt) : null),
        lastError: patch.lastError === undefined ? existing.lastError : patch.lastError,
        accessToken: patch.accessToken ?? existing.accessToken,
        tokenExpiresAt: patch.tokenExpiresAt === undefined
            ? (existing.tokenExpiresAt ? new Date(existing.tokenExpiresAt) : null)
            : (patch.tokenExpiresAt ? new Date(patch.tokenExpiresAt) : null),
        scopes: patch.scopes ?? existing.scopes,
        updatedAt: new Date(),
    }).where(eq(instagramAccounts.id, existing.id)).returning();

    const mapped = mapInstagramAccountRow(row);
    instagramAccountByUserVertical.set(instagramAccountKey(mapped.userId, mapped.vertical), mapped);
    return mapped;
}

async function disconnectInstagramAccount(userId: string, vertical: VerticalType): Promise<void> {
    const existing = getInstagramAccount(userId, vertical);
    if (!existing) return;
    // Borrar publicaciones primero para evitar FK constraint
    await db.delete(instagramPublications).where(eq(instagramPublications.instagramAccountId, existing.id));
    await db.delete(instagramAccounts).where(eq(instagramAccounts.id, existing.id));
    instagramAccountByUserVertical.delete(instagramAccountKey(userId, vertical));
    // Limpiar también las publicaciones del cache en memoria
    instagramPublicationsByUser.delete(userId);
}

async function createInstagramPublicationRecord(input: {
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
}): Promise<InstagramPublicationRecord> {
    const accountId = await getPrimaryAccountIdForUser(input.userId);
    const [row] = await db.insert(instagramPublications).values({
        accountId,
        userId: input.userId,
        instagramAccountId: input.instagramAccountId,
        vertical: input.vertical,
        listingId: input.listingId,
        listingTitle: input.listingTitle,
        instagramMediaId: input.instagramMediaId,
        instagramPermalink: input.instagramPermalink,
        caption: input.caption,
        imageUrl: input.imageUrl,
        status: input.status,
        errorMessage: input.errorMessage,
        sourceUpdatedAt: input.sourceUpdatedAt ? new Date(input.sourceUpdatedAt) : null,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    }).returning();

    const mapped = mapInstagramPublicationRow(row);
    const current = instagramPublicationsByUser.get(mapped.userId) ?? [];
    instagramPublicationsByUser.set(mapped.userId, [mapped, ...current].sort((a, b) => b.createdAt - a.createdAt));
    return mapped;
}

function getLatestInstagramPublicationForListing(userId: string, vertical: VerticalType, listingId: string): InstagramPublicationRecord | null {
    return getInstagramPublicationsForUser(userId, vertical).find((item) => item.listingId === listingId) ?? null;
}

function defaultInstagramCaptionTemplate(vertical: VerticalType): string {
    if (vertical === 'autos') {
        return '🚗 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimpleAutos #AutosChile #Autos #VentaAutos';
    }
    if (vertical === 'propiedades') {
        return '🏠 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimplePropiedades #PropiedadesChile #Inmobiliaria';
    }
    return '{{title}}\n{{price}}\n{{location}}\n\n{{description}}\n\n{{url}}';
}

function buildInstagramCaption(listing: ListingRecord, publicUrl: string, template: string | null, override: string | null): string {
    if (override) return override.trim();

    const summary = extractListingSummary(listing).join(' · ');
    const locationLabel = getInstagramCommuneLabel(listing, asObject(listing.rawData)) || listing.location || 'Chile';
    const source = (template && template.trim()) || defaultInstagramCaptionTemplate(listing.vertical);
    return source
        .replaceAll('{{title}}', listing.title)
        .replaceAll('{{price}}', listing.price || 'Consultar precio')
        .replaceAll('{{location}}', locationLabel)
        .replaceAll('{{description}}', listing.description || '')
        .replaceAll('{{summary}}', summary)
        .replaceAll('{{url}}', publicUrl)
        .replaceAll('{{vertical}}', listing.vertical === 'autos' ? 'SimpleAutos' : 'SimplePropiedades')
        .trim()
        .slice(0, 2200);
}

function formatInstagramMoneyLabel(value: number | null | undefined): string | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}

function getInstagramCommuneLabel(listing: ListingRecord, rawData: Record<string, unknown>): string | undefined {
    const locationData = asObject(rawData.locationData);
    const nestedLocation = asObject(rawData.location);
    const directCommune =
        asString(listing.locationData?.communeName)
        || asString(locationData.communeName)
        || asString(nestedLocation.communeName);

    if (directCommune) return directCommune;

    const locationParts = (listing.location || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (locationParts.length >= 3) return locationParts[1];
    if (locationParts.length >= 1) return locationParts[0];
    return undefined;
}

function buildInstagramListingData(listing: ListingRecord): InstagramListingData {
    const rawData = asObject(listing.rawData);
    const basic = asObject(rawData.basic);
    const commercial = asObject(rawData.commercial);
    const setup = asObject(rawData.setup);
    const basePrice = parseNumberFromString(listing.price) ?? parseNumberFromString(rawData.price) ?? parseNumberFromString(commercial.price) ?? undefined;
    const offerPrice = parseNumberFromString(commercial.offerPrice) ?? undefined;
    const discountPercent = basePrice && offerPrice && offerPrice < basePrice
        ? Math.round(((basePrice - offerPrice) / basePrice) * 100)
        : null;
    const mileageKm = parseNumberFromString(basic.mileage) ?? undefined;

    return {
        id: listing.id,
        vertical: listing.vertical,
        title: listing.title,
        price: basePrice,
        offerPrice,
        priceLabel: formatInstagramMoneyLabel(basePrice) || listing.price,
        offerPriceLabel: formatInstagramMoneyLabel(offerPrice),
        discountLabel: discountPercent && discountPercent > 0 ? `-${discountPercent}%` : undefined,
        brand: asString(basic.brand) || asString(rawData.brand) || undefined,
        model: asString(basic.model) || asString(rawData.model) || undefined,
        year: parseNumberFromString(basic.year) ?? parseNumberFromString(rawData.year) ?? undefined,
        category: asString(basic.bodyType) || asString(basic.propertyType) || asString(rawData.category) || undefined,
        condition: asString(basic.condition) || asString(rawData.condition) || undefined,
        mileageKm,
        mileageLabel: mileageKm != null ? `${mileageKm.toLocaleString('es-CL')} km` : undefined,
        fuelType: asString(basic.fuelType) || undefined,
        transmission: asString(basic.transmission) || undefined,
        negotiable: commercial.negotiable === true,
        financingAvailable: commercial.financingAvailable === true,
        exchangeAvailable: commercial.exchangeAvailable === true,
        // Property-specific fields
        propertyType: asString(basic.propertyType) || undefined,
        rooms: parseNumberFromString(basic.rooms) ?? undefined,
        bathrooms: parseNumberFromString(basic.bathrooms) ?? undefined,
        surfaceLabel: (() => {
            const surface = parseNumberFromString(basic.totalArea) ?? parseNumberFromString(basic.surface);
            return surface != null ? `${surface.toLocaleString('es-CL')} m²` : undefined;
        })(),
        features: extractListingSummary(listing),
        images: extractListingMediaUrls(listing).map((url) => ({ url })),
        location: getInstagramCommuneLabel(listing, rawData) || listing.location || undefined,
        description: listing.description || '',
        section: asString(setup.operationType) || listing.section,
        summary: extractListingSummary(listing),
    };
}

const INSTAGRAM_BRAND_LOGO_PATHS: Record<'simpleautos' | 'simplepropiedades', string> = {
    simpleautos: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simpleautos', 'public', 'logo.png'),
    simplepropiedades: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simplepropiedades', 'public', 'logo.png'),
};

const INSTAGRAM_BRAND_LOGO_LIGHT_PATHS: Record<'simpleautos' | 'simplepropiedades', string> = {
    simpleautos: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simpleautos', 'public', 'logo-light.png'),
    simplepropiedades: path.resolve(API_ROOT_DIR, '..', '..', 'apps', 'simplepropiedades', 'public', 'logo-light.png'),
};

async function getInstagramBrandLogoBuffer(appId: 'simpleautos' | 'simplepropiedades'): Promise<Buffer | null> {
    try {
        return await fs.readFile(INSTAGRAM_BRAND_LOGO_PATHS[appId]);
    } catch {
        return null;
    }
}

async function getInstagramBrandLogoLightBuffer(appId: 'simpleautos' | 'simplepropiedades'): Promise<Buffer | null> {
    try {
        return await fs.readFile(INSTAGRAM_BRAND_LOGO_LIGHT_PATHS[appId]);
    } catch {
        return null;
    }
}

function escapeSvgText(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function clampTemplateText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

// SVG icon paths (24x24 viewBox) for highlights / badges / location / discount
const SVG_ICON_PATHS: Record<string, string> = {
    // Highlights: autos
    venta: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', // tag
    arriendo: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', // house
    subasta: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', // gavel
    proyecto: 'M2 20h20M5 20V10l7-6 7 6v10M9 20v-6h6v6', // building
    usado: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3', // check-circle
    nuevo: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z', // star
    bencina: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3', // fuel
    diesel: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3', // fuel (same)
    km: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4.5 2.5', // speedometer
    // Highlights: propiedades
    dorm: 'M3 7v11M21 7v11M3 13h18M7 13v5M17 13v5M7 8a2 2 0 012-2h2a2 2 0 012 2M13 8a2 2 0 012-2h2a2 2 0 012 2', // bed
    baño: 'M4 12h16a1 1 0 011 1v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 011-1zM6 12V5a2 2 0 012-2h3v2.25', // bath
    superficie: 'M21 3H3v18h18V3zM3 9h18M3 15h18M9 3v18M15 3v18', // grid/area
    casa: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', // house
    depto: 'M3 21h18V3H3v18zm3-12h3v3H6V9zm0 5h3v3H6v-3zm5-5h3v3h-3V9zm0 5h3v3h-3v-3zm5-5h3v3h-3V9zm0 5h3v3h-3v-3z', // building
    terreno: 'M2 22l5-10 5 6 4-8 6 12H2z', // mountain
    // Badges
    servicio: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.065.71.327 1.39.806 1.946a3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', // badge-check
    // Location
    ubicacion: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z', // map-pin
    // Discount
    descuento: 'M9 9h.01M15 15h.01M16 8l-8 8M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.065.71.327 1.39.806 1.946a3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', // percent-badge
};

function getHighlightIconKey(text: string): string {
    const t = text.toLowerCase().trim();
    if (t === 'venta') return 'venta';
    if (t === 'arriendo') return 'arriendo';
    if (t === 'subasta') return 'subasta';
    if (t.startsWith('proyecto')) return 'proyecto';
    if (t === 'usado' || t === 'semi-nuevo') return 'usado';
    if (t === 'nuevo') return 'nuevo';
    if (t.includes('km')) return 'km';
    if (t.includes('bencina') || t.includes('gasolina')) return 'bencina';
    if (t.includes('diesel') || t.includes('diésel') || t.includes('petróleo')) return 'diesel';
    if (t.includes('dorm')) return 'dorm';
    if (t.includes('baño')) return 'baño';
    if (t.includes('m²') || t.includes('m2') || t.includes('mt')) return 'superficie';
    if (t.includes('casa')) return 'casa';
    if (t.includes('depto') || t.includes('departamento')) return 'depto';
    if (t.includes('terreno') || t.includes('sitio') || t.includes('parcela')) return 'terreno';
    return 'servicio'; // fallback
}

// Función simple para crear texto SVG usando <text> (evita fontconfig)
// Nota: text-to-svg fue removido porque requiere fuentes del sistema no disponibles en Docker
function svgTextElement(
    text: string,
    options: {
        x: number;
        y: number;
        fontSize: number;
        fontWeight?: number;
        fill?: string;
        anchor?: 'start' | 'middle' | 'end';
    }
): string {
    const anchor = options.anchor || 'start';
    const weight = options.fontWeight || 400;
    const escapedText = escapeSvgText(text);
    return `<text x="${options.x}" y="${options.y}" fill="${options.fill || '#000000'}" font-size="${options.fontSize}" font-weight="${weight}" text-anchor="${anchor}" font-family="Arial, sans-serif">${escapedText}</text>`;
}

function svgIcon(key: string, x: number, y: number, size: number, fill: string, strokeW = 1.5): string {
    const p = SVG_ICON_PATHS[key] || SVG_ICON_PATHS['servicio'];
    const scale = size / 24;
    return `<g transform="translate(${x},${y}) scale(${scale})"><path d="${p}" fill="none" stroke="${fill}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function splitTemplatePrice(value: string): { prefix: string; amount: string } {
    const normalized = value.replace(/\s+/g, ' ').trim();
    const ufMatch = normalized.match(/^(UF)\s*(.+)$/i);
    if (ufMatch) {
        return { prefix: ufMatch[1].toUpperCase(), amount: ufMatch[2].trim() };
    }
    const pesoMatch = normalized.match(/^(\$)\s*(.+)$/);
    if (pesoMatch) {
        return { prefix: pesoMatch[1], amount: pesoMatch[2].trim() };
    }
    const tokens = normalized.split(' ');
    if (tokens.length > 1) {
        return { prefix: tokens[0], amount: tokens.slice(1).join(' ') };
    }
    return { prefix: '', amount: normalized };
}

function wrapTemplateText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
    const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (words.length === 0) return [];

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (nextLine.length <= maxCharsPerLine) {
            currentLine = nextLine;
            continue;
        }

        if (currentLine) lines.push(currentLine);
        currentLine = word;

        if (lines.length === maxLines - 1) break;
    }

    if (lines.length < maxLines && currentLine) {
        lines.push(currentLine);
    }

    if (lines.length > maxLines) {
        return lines.slice(0, maxLines);
    }

    const consumed = lines.join(' ').length;
    if (consumed < value.trim().length && lines.length > 0) {
        lines[lines.length - 1] = clampTemplateText(lines[lines.length - 1], Math.max(3, maxCharsPerLine - 1));
    }

    return lines.slice(0, maxLines);
}

function renderSvgTextLines(
    lines: string[],
    options: {
        x: number;
        y: number;
        lineHeight: number;
        fontSize: number;
        fontWeight: number | string;
        fill: string;
        textAnchor?: 'start' | 'middle' | 'end';
    }
): string {
    return lines
        .map((line, index) => `
            <text
                x="${options.x}"
                y="${options.y + index * options.lineHeight}"
                fill="${options.fill}"
                font-size="${options.fontSize}"
                font-weight="${options.fontWeight}"
                ${options.textAnchor ? `text-anchor="${options.textAnchor}"` : ''}
            >${escapeSvgText(line)}</text>
        `)
        .join('');
}

async function buildInstagramTemplateOverlaySvg(
    listing: ListingRecord,
    template: InstagramRenderTemplate,
    width: number,
    height: number
): Promise<Buffer> {
    const brandAccent = template.branding?.appId === 'simplepropiedades' ? '#3232FF' : '#ff3600';
    const titleLines = wrapTemplateText(template.headline || listing.title, template.overlayVariant.startsWith('property') ? 24 : 20, 2);
    const eyebrow = escapeSvgText(clampTemplateText(template.eyebrow, 24));
    const location = escapeSvgText(clampTemplateText(template.locationLabel || listing.location || 'Chile', 28));
    const priceLockup = splitTemplatePrice(clampTemplateText(template.priceLabel || listing.price || 'Consultar precio', 18));
    const pricePrefix = escapeSvgText(priceLockup.prefix);
    const priceAmount = escapeSvgText(priceLockup.amount);
    const highlights = (template.highlights ?? []).slice(0, 4).map((item: string) => clampTemplateText(item, 18));
    const summaryLine = clampTemplateText(highlights.join('   ·   '), 64);
    const badgeText = escapeSvgText(clampTemplateText(template.branding.badgeText, 18));
    const ctaLabel = escapeSvgText(clampTemplateText(template.ctaLabel, 26));
    const topBandHeight = template.layoutVariant === 'portrait' ? 128 : 104;
    const bottomBandHeight = template.layoutVariant === 'portrait' ? 230 : 216;
    // Property template layout vars
    const pillY = template.overlayVariant.startsWith('property')
        ? (template.layoutVariant === 'portrait' ? height - bottomBandHeight - 116 : height - bottomBandHeight - 92)
        : 0;
    const priceY = height - 74;
    const detailsY = height - 136;

    const topBand = template.overlayVariant.startsWith('property')
        ? `
            <rect x="0" y="0" width="${width}" height="${topBandHeight}" fill="${template.colors.secondary}" opacity="0.96" />
            <text x="${width - 34}" y="64" fill="${template.colors.textInverse}" font-size="30" font-weight="800" text-anchor="end">${eyebrow}</text>
        `
        : '';

    const locationPill = template.overlayVariant.startsWith('property')
        ? `
            <rect x="32" y="${pillY}" rx="28" ry="28" width="350" height="64" fill="${template.colors.accent}" />
            <rect x="36" y="${pillY + 4}" rx="24" ry="24" width="342" height="56" fill="#FFFFFF" opacity="0.98" />
            <text x="66" y="${pillY + 42}" fill="${template.colors.secondary}" font-size="30" font-weight="700">${location}</text>
        `
        : '';

    let detailsBand: string;
    if (template.overlayVariant === 'property-conversion') {
        detailsBand = `
            <rect x="24" y="${height - bottomBandHeight - 18}" rx="28" ry="28" width="${width - 48}" height="${bottomBandHeight}" fill="#FFFFFF" opacity="0.88" />
            ${renderSvgTextLines(titleLines, {
                x: 56,
                y: detailsY - 54,
                lineHeight: 42,
                fontSize: 34,
                fontWeight: 800,
                fill: template.colors.textPrimary,
            })}
            <text x="56" y="${detailsY + 18}" fill="${template.colors.textPrimary}" font-size="25" font-weight="700">${escapeSvgText(summaryLine)}</text>
            <text x="56" y="${priceY}" fill="${template.colors.accent}" font-size="36" font-weight="700">${eyebrow}</text>
            ${pricePrefix ? `<text x="${width - 286}" y="${priceY}" fill="${template.colors.secondary}" font-size="26" font-weight="700">${pricePrefix}</text>` : ''}
            <text x="${width - 56}" y="${priceY}" fill="${template.colors.secondary}" font-size="56" font-weight="800" text-anchor="end">${priceAmount}</text>
            <text x="${width - 56}" y="${priceY - 62}" fill="${template.colors.textPrimary}" font-size="24" font-weight="700" text-anchor="end">${ctaLabel}</text>
        `;
    } else if (template.overlayVariant.startsWith('property')) {
        detailsBand = `
            <rect x="0" y="${height - bottomBandHeight}" width="${width}" height="${bottomBandHeight}" fill="${template.colors.secondary}" opacity="0.72" />
            ${renderSvgTextLines(titleLines, {
                x: 56,
                y: detailsY - 54,
                lineHeight: 42,
                fontSize: 34,
                fontWeight: 800,
                fill: template.colors.textInverse,
            })}
            <text x="56" y="${detailsY + 18}" fill="${template.colors.textInverse}" font-size="25" font-weight="700">${escapeSvgText(summaryLine)}</text>
            <rect x="${width - 318}" y="${height - bottomBandHeight + 34}" rx="26" ry="26" width="262" height="132" fill="${template.colors.accent}" />
            <text x="${width - 286}" y="${height - bottomBandHeight + 72}" fill="${template.colors.textInverse}" font-size="20" font-weight="700">${template.overlayVariant === 'property-project' ? 'Desde' : badgeText}</text>
            ${pricePrefix ? `<text x="${width - 286}" y="${height - bottomBandHeight + 118}" fill="${template.colors.textInverse}" font-size="24" font-weight="700">${pricePrefix}</text>` : ''}
            <text x="${width - 76}" y="${height - bottomBandHeight + 124}" fill="${template.colors.textInverse}" font-size="50" font-weight="800" text-anchor="end">${priceAmount}</text>
            <text x="${width - 76}" y="${height - bottomBandHeight + 152}" fill="${template.colors.textInverse}" font-size="18" font-weight="700" text-anchor="end">${ctaLabel}</text>
        `;
    } else if (template.overlayVariant === 'essential-watermark') {
        // BÁSICO: Sin overlay SVG — solo logo (agregado por sharp composite)
        detailsBand = '';
    } else if (template.overlayVariant === 'professional-centered') {
        // PROFESIONAL: Card brandAccent en la parte inferior con precio, título (1 línea), highlights con iconos, ubicación, badges
        const cx = Math.round(width / 2);
        const margin = 40;
        const cardW = width - margin * 2;
        const cardR = 48;
        const fullPriceText = clampTemplateText(template.offerPriceLabel || template.priceLabel || 'Consultar', 20);
        const origPriceText = template.offerPriceLabel ? clampTemplateText(template.priceLabel || '', 20) : '';
        const proTitleText = template.title ? clampTemplateText(template.title.toUpperCase(), 48) : '';
        const locTextRaw = template.locationLabel ? clampTemplateText(template.locationLabel, 24) : '';

        // Dynamic card height
        let ch = 72; // top padding (logo overlap space)
        ch += 80; // price
        if (origPriceText) ch += 28;
        if (proTitleText) ch += 46;
        if (highlights.length > 0) ch += 46;
        if (locTextRaw) ch += 56;
        ch += 28; // bottom padding
        const cardH = Math.max(ch, 260);
        const cardY = height - margin - cardH;

        // Content positions
        let y = cardY + 72;
        const priceBaseline = y + 62;
        y += 78;
        let strikeSvg = '';
        if (origPriceText) {
            const origPricePath = svgTextElement(origPriceText, { x: cx, y: y + 14, fontSize: 22, fill: 'rgba(255,255,255,0.5)', anchor: 'middle' });
            strikeSvg = origPricePath.replace('/>', ' text-decoration="line-through"/>');
            y += 28;
        }
        let titleSvg = '';
        if (proTitleText) {
            y += 6;
            titleSvg = svgTextElement(proTitleText, { x: cx, y: y + 30, fontSize: 38, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' });
            y += 40;
        }
        // Highlights with icons — horizontal row, font 30 semibold
        let hlSvg = '';
        if (highlights.length > 0) {
            y += 8;
            const hlItems = highlights.slice(0, 4);
            const hlTotalW = hlItems.reduce((acc, h) => acc + h.length * 16 + 38, 0) + (hlItems.length - 1) * 16;
            let hx = cx - hlTotalW / 2;
            const hlY = y + 6;
            for (const h of hlItems) {
                const iconKey = getHighlightIconKey(h);
                hlSvg += svgIcon(iconKey, hx, hlY, 24, 'rgba(255,255,255,0.8)');
                hx += 28;
                const hlPath = svgTextElement(h.toUpperCase(), { x: hx, y: hlY + 20, fontSize: 24, fontWeight: 600, fill: 'rgba(255,255,255,0.8)', anchor: 'start' });
                hlSvg += hlPath;
                hx += h.length * 16 + 10 + 16;
            }
            y += 36;
        }
        // Location pill with icon — bigger
        let locSvg = '';
        if (locTextRaw) {
            y += 14;
            const pillW = Math.min(locTextRaw.length * 16 + 80, cardW - 60);
            const pillX = cx - pillW / 2;
            const locPath = svgTextElement(locTextRaw, { x: cx + 12, y: y + 33, fontSize: 24, fontWeight: 700, fill: brandAccent, anchor: 'middle' });
            locSvg = `
                <rect x="${pillX}" y="${y}" rx="24" ry="24" width="${pillW}" height="48" fill="#FFFFFF" />
                ${svgIcon('ubicacion', pillX + 14, y + 12, 24, brandAccent, 2)}
                ${locPath}
            `;
        }

        // Badges top-right — auto-width based on text length
        let badgesSvg = '';
        let bY = 28;
        if (template.discountLabel) {
            const dt = escapeSvgText(template.discountLabel);
            const dtw = Math.min(dt.length * 18 + 72, 240);
            const dtx = width - dtw - 30;
            badgesSvg += `
                <rect x="${dtx}" y="${bY}" rx="22" ry="22" width="${dtw}" height="58" fill="${brandAccent}" />
                ${svgIcon('descuento', dtx + 16, bY + 15, 28, '#FFFFFF', 2)}
                <text x="${dtx + dtw/2 + 14}" y="${bY + 40}" fill="#FFFFFF" font-size="28" font-weight="700" text-anchor="middle">${dt}</text>
            `;
            bY += 68;
        }
        for (const badge of (template.badges ?? []).slice(0, 3)) {
            const bt = escapeSvgText(badge);
            const btw = Math.min(bt.length * 16 + 64, 260);
            const btx = width - btw - 30;
            badgesSvg += `
                <rect x="${btx}" y="${bY}" rx="18" ry="18" width="${btw}" height="48" fill="#FFFFFF" />
                ${svgIcon('servicio', btx + 14, bY + 10, 24, '#111111')}
                <text x="${btx + btw/2 + 12}" y="${bY + 33}" fill="#111111" font-size="22" font-weight="600" text-anchor="middle">${bt}</text>
            `;
            bY += 56;
        }

        detailsBand = `
            ${badgesSvg}
            <rect x="${margin}" y="${cardY}" rx="${cardR}" ry="${cardR}" width="${cardW}" height="${cardH}" fill="${brandAccent}" />
            ${svgTextElement(fullPriceText, { x: cx, y: priceBaseline, fontSize: 80, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' })}
            ${strikeSvg}
            ${titleSvg}
            ${hlSvg}
            ${locSvg}
        `;
    } else if (template.overlayVariant === 'signature-complete') {
        // PREMIUM: Gradiente oscuro elegante, título 1 línea, highlights con iconos, badges/loc más grandes
        const cx = Math.round(width / 2);
        const fullPrice = escapeSvgText(clampTemplateText(template.offerPriceLabel || template.priceLabel || 'Consultar', 20));
        const origPrice = template.offerPriceLabel ? escapeSvgText(clampTemplateText(template.priceLabel || '', 20)) : '';
        const sigTitle = template.title ? escapeSvgText(clampTemplateText(template.title.toUpperCase(), 48)) : '';
        const locText = template.locationLabel ? clampTemplateText(template.locationLabel, 24) : '';

        // Gradient rect covers bottom 55%
        const gradH = Math.round(height * 0.55);
        const gradY = height - gradH;

        // Content positions from bottom
        let y = height - 36; // start from bottom padding
        // Location pill with icon
        let locSvg = '';
        if (locText) {
            y -= 52;
            const pillW = Math.min(locText.length * 16 + 80, width - 100);
            const pillX = cx - pillW / 2;
            locSvg = `
                <rect x="${pillX}" y="${y}" rx="24" ry="24" width="${pillW}" height="48" fill="#FFFFFF" />
                ${svgIcon('ubicacion', pillX + 14, y + 12, 24, brandAccent, 2)}
                <text x="${cx + 12}" y="${y + 33}" fill="${brandAccent}" font-size="24" font-weight="700" text-anchor="middle">${locText}</text>
            `;
            y -= 10;
        }
        // Highlights with icons — horizontal row
        let hlSvg = '';
        if (highlights.length > 0) {
            y -= 36;
            const hlItems = highlights.slice(0, 4);
            const hlTotalW = hlItems.reduce((acc, h) => acc + h.length * 16 + 38, 0) + (hlItems.length - 1) * 16;
            let hx = cx - hlTotalW / 2;
            const hlY = y;
            for (const h of hlItems) {
                const iconKey = getHighlightIconKey(h);
                hlSvg += svgIcon(iconKey, hx, hlY, 24, 'rgba(255,255,255,0.65)');
                hx += 28;
                hlSvg += `<text x="${hx}" y="${hlY + 20}" fill="rgba(255,255,255,0.65)" font-size="24" font-weight="600">${escapeSvgText(h.toUpperCase())}</text>`;
                hx += h.length * 16 + 10 + 16;
            }
            y -= 14;
        }
        // Title — single line, font 38
        let titleSvg = '';
        if (sigTitle) {
            y -= 44;
            titleSvg = `<text x="${cx}" y="${y + 32}" fill="#FFFFFF" font-size="38" font-weight="900" text-anchor="middle">${sigTitle}</text>`;
            y -= 10;
        }
        let strikeSvg = '';
        if (origPrice) {
            y -= 28;
            strikeSvg = `<text x="${cx}" y="${y + 18}" fill="rgba(255,255,255,0.4)" font-size="22" font-weight="500" text-anchor="middle" text-decoration="line-through">${origPrice}</text>`;
            y -= 6;
        }
        const priceBaseline = y;

        // Badges top-right — auto-width based on text length
        let badgesSvg = '';
        let bY = 28;
        if (template.discountLabel) {
            const dtText = clampTemplateText(template.discountLabel, 18);
            const dtw = Math.min(dtText.length * 18 + 72, 240);
            const dtx = width - dtw - 30;
            const dtPath = svgTextElement(dtText, { x: dtx + dtw/2 + 14, y: bY + 40, fontSize: 28, fontWeight: 700, fill: '#FFFFFF', anchor: 'middle' });
            badgesSvg += `
                <rect x="${dtx}" y="${bY}" rx="22" ry="22" width="${dtw}" height="58" fill="${brandAccent}" />
                ${svgIcon('descuento', dtx + 16, bY + 15, 28, '#FFFFFF', 2)}
                ${dtPath}
            `;
            bY += 68;
        }
        for (const badge of (template.badges ?? []).slice(0, 3)) {
            const btText = clampTemplateText(badge, 16);
            const btw = Math.min(btText.length * 16 + 64, 260);
            const btx = width - btw - 30;
            const btPath = svgTextElement(btText, { x: btx + btw/2 + 12, y: bY + 33, fontSize: 22, fontWeight: 600, fill: '#111111', anchor: 'middle' });
            badgesSvg += `
                <rect x="${btx}" y="${bY}" rx="18" ry="18" width="${btw}" height="48" fill="#FFFFFF" />
                ${svgIcon('servicio', btx + 14, bY + 10, 24, '#111111')}
                ${btPath}
            `;
            bY += 56;
        }

        detailsBand = `
            <rect x="0" y="${gradY}" width="${width}" height="${gradH}" fill="url(#premiumGrad)" />
            ${badgesSvg}
            ${svgTextElement(fullPrice, { x: cx, y: priceBaseline, fontSize: 80, fontWeight: 900, fill: '#FFFFFF', anchor: 'middle' })}
            ${strikeSvg}
            ${titleSvg}
            ${hlSvg}
            ${locSvg}
        `;
    } else {
        detailsBand = '';
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif">
            <defs>
                <linearGradient id="titleFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.7" />
                </linearGradient>
                <linearGradient id="essentialGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
                </linearGradient>
                <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0" />
                    <stop offset="30%" stop-color="#000000" stop-opacity="0.3" />
                    <stop offset="60%" stop-color="#000000" stop-opacity="0.75" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.95" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
            ${topBand}
            ${locationPill}
            ${detailsBand}
        </svg>
    `;

    return Buffer.from(svg, 'utf-8');
}

function getInstagramBasePublicOrigin(): string {
    const origin = getInstagramPublicApiOrigin();
    if (!origin) {
        throw new Error('INSTAGRAM_REDIRECT_URI debe apuntar a una URL pública del API.');
    }

    const url = new URL(origin);
    if (url.protocol !== 'https:' || isLocalHostname(url.hostname)) {
        throw new Error('Instagram requiere un API público HTTPS para servir imágenes.');
    }
    return url.origin;
}

function buildListingPublicUrlForInstagram(listing: ListingRecord): string {
    const baseOrigin = getInstagramBasePublicOrigin();
    if (/^https?:\/\//i.test(listing.href)) {
        const target = new URL(listing.href);
        if (target.protocol !== 'https:' || isLocalHostname(target.hostname)) {
            throw new Error('La URL pública del aviso debe ser HTTPS y accesible desde Internet.');
        }
        return target.toString();
    }

    return new URL(listing.href || listingDefaultHref(listing.vertical, listing.id), baseOrigin).toString();
}

// Prepara una imagen JPEG en Backblaze para Instagram.
async function prepareInstagramImageUrl(
    listing: ListingRecord,
    index = 0,
    options: {
        layoutVariant?: 'square' | 'portrait' | null;
        template?: InstagramRenderTemplate | null;
        publishKey?: string | null;
        isCover?: boolean;
    } = {}
): Promise<string> {
    const images = extractListingMediaUrls(listing);
    const rawUrl = images[index];
    if (!rawUrl) throw new Error('La publicación no tiene imágenes en el índice solicitado.');

    const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
    const effectiveLayoutVariant = options.layoutVariant ?? options.template?.layoutVariant ?? 'square';
    const targetHeight = effectiveLayoutVariant === 'portrait' ? 1350 : 1080;

    const templateSuffix = options.template ? `-${options.template.id}` : '';
    const publishKey = options.publishKey?.trim() || randomUUID();
    const assetLabel = options.isCover ? 'cover' : `gallery-${index}`;
    const destKey = `instagram-ready/${listing.id}/${publishKey}-${assetLabel}${templateSuffix}-${targetHeight}.jpg`;
    const downloadOrigin = process.env.BACKBLAZE_DOWNLOAD_URL || 'https://f005.backblazeb2.com';
    const directUrl = `${downloadOrigin}/file/${bucketName}/${destKey}`;

    const client = getMediaProxyS3Client();
    if (!client) throw new Error('Storage no configurado.');

    const sourceKey = extractBackblazeObjectKey(rawUrl) || rawUrl.replace(/^https?:\/\/[^/]+\/file\/[^/]+\//, '');
    let rawBuffer: Buffer;
    try {
        const obj = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: sourceKey }));
        rawBuffer = obj.Body ? Buffer.from(await obj.Body.transformToByteArray()) : Buffer.alloc(0);
    } catch {
        const resp = await fetch(rawUrl);
        rawBuffer = Buffer.from(await resp.arrayBuffer());
    }

    const sharp = require('sharp') as typeof import('sharp');
    let pipeline = sharp(rawBuffer)
        .rotate() // Aplicar orientación EXIF automáticamente
        .resize({ width: 1080, height: targetHeight, fit: 'cover' });

    if (options.template) {
        const overlayBuffer = await buildInstagramTemplateOverlaySvg(listing, options.template, 1080, targetHeight);
        const composites: Array<{ input: Buffer; top: number; left: number }> = [
            {
                input: overlayBuffer,
                top: 0,
                left: 0,
            },
        ];

        const variant = options.template.overlayVariant;
        const appId = options.template.branding.appId;
        // Auto templates (Básico, Profesional, Premium) use logo-light; property templates use logo
        const useLight = ['essential-watermark', 'professional-centered', 'signature-complete'].includes(variant);
        const logoBuffer = !appId ? null : useLight ? await getInstagramBrandLogoLightBuffer(appId) : await getInstagramBrandLogoBuffer(appId);
        if (logoBuffer) {
            let logoPlacement: { width: number; height: number; top: number; left: number; opacity?: number };
            if (variant === 'essential-watermark') {
                // Básico: top-left corner watermark
                logoPlacement = { width: 96, height: 96, top: 36, left: 36, opacity: 0.5 };
            } else if (variant === 'professional-centered') {
                // Profesional: centered above brandAccent card - calculate card height dynamically
                const t = options.template;
                const hasOrigPrice = !!(t.offerPriceLabel && t.priceLabel);
                const hasTitle = !!(t.title);
                const hasHighlights = (t.highlights?.length ?? 0) > 0;
                const hasLocation = !!(t.locationLabel);
                let cardHeight = 72 + 80 + 28; // base: top pad + price + bottom pad
                if (hasOrigPrice) cardHeight += 28;
                if (hasTitle) cardHeight += 46;
                if (hasHighlights) cardHeight += 46;
                if (hasLocation) cardHeight += 56;
                cardHeight = Math.max(cardHeight, 260);
                const cardY = targetHeight - 40 - cardHeight;
                logoPlacement = { width: 96, height: 96, top: cardY - 48, left: (1080 - 96) / 2 };
            } else if (variant === 'signature-complete') {
                // Premium: top-left, subtle opacity
                logoPlacement = { width: 96, height: 96, top: 36, left: 36, opacity: 0.6 };
            } else if (variant.startsWith('property')) {
                logoPlacement = { width: 48, height: 48, top: 34, left: 42 };
            } else {
                logoPlacement = { width: 50, height: 50, top: 30, left: 36 };
            }

            let logoOverlay = await sharp(logoBuffer)
                .resize({
                    width: logoPlacement.width,
                    height: logoPlacement.height,
                    fit: 'contain',
                    withoutEnlargement: false,
                })
                .ensureAlpha()
                .png()
                .toBuffer();

            // Apply opacity by modifying alpha channel directly
            if (logoPlacement.opacity != null && logoPlacement.opacity < 1) {
                const factor = logoPlacement.opacity;
                const { data, info } = await sharp(logoOverlay).raw().toBuffer({ resolveWithObject: true });
                for (let i = 3; i < data.length; i += 4) {
                    data[i] = Math.round(data[i] * factor);
                }
                logoOverlay = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
            }

            composites.push({
                input: logoOverlay,
                top: logoPlacement.top,
                left: logoPlacement.left,
            });
        }

        pipeline = pipeline.composite(composites);
    }

    const jpegBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();

    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: destKey,
        Body: new Uint8Array(jpegBuffer),
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=86400',
    }));

    console.log('[instagram] uploaded to B2:', {
        listingId: listing.id,
        imageIndex: index,
        isCover: options.isCover === true,
        templateId: options.template?.id ?? null,
        destKey,
        url: directUrl,
    });
    return directUrl;
}

// Nueva función: Usa Cloudflare Worker para generar imágenes de Instagram
// Elimina la necesidad de Sharp + fontconfig en el servidor
async function prepareInstagramImageUrlCloudflare(
    listing: ListingRecord,
    index = 0,
    options: {
        layoutVariant?: 'square' | 'portrait' | null;
        template?: InstagramRenderTemplate | null;
        publishKey?: string | null;
        isCover?: boolean;
    } = {}
): Promise<string> {
    const images = extractListingMediaUrls(listing);
    const rawUrl = images[index];
    if (!rawUrl) throw new Error('La publicación no tiene imágenes en el índice solicitado.');

    // Detectar si estamos usando Cloudflare R2
    const storageProvider = getStorageProvider();
    const isCloudflare = storageProvider.constructor.name === 'CloudflareR2Provider';
    
    if (!isCloudflare || !process.env.CLOUDFLARE_WORKER_URL) {
        // Fallback a método tradicional con Sharp
        return prepareInstagramImageUrl(listing, index, options);
    }

    // Si la imagen está en Backblaze (URLs antiguas), usar método tradicional con Sharp
    // porque el Worker no puede componer imagen + overlay todavía
    if (rawUrl.includes('backblazeb2.com') || rawUrl.includes('f005.backblazeb2.com')) {
        console.log('[instagram] imagen en Backblaze detectada, usando método tradicional con Sharp');
        return prepareInstagramImageUrl(listing, index, options);
    }

    const effectiveLayoutVariant = options.layoutVariant ?? options.template?.layoutVariant ?? 'square';
    const targetHeight = effectiveLayoutVariant === 'portrait' ? 1350 : 1080;
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL.replace(/\/$/, '');

    // Si la URL es del proxy de la API, extraer la URL original
    let sourceUrl = rawUrl;
    if (rawUrl.includes('/api/media/proxy')) {
        try {
            const urlObj = new URL(rawUrl);
            const srcParam = urlObj.searchParams.get('src');
            if (srcParam) {
                sourceUrl = decodeURIComponent(srcParam);
            }
        } catch {
            // Si falla, usar la URL original
        }
    }

    // Extraer la key de la imagen original y construir URL directa
    let sourceKey: string;
    let directImageUrl: string;
    
    if (sourceUrl.includes('r2.cloudflarestorage.com') || sourceUrl.includes('.r2.dev')) {
        // Es URL de Cloudflare R2
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        sourceKey = pathParts.join('/');
        const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';
        directImageUrl = `${r2PublicUrl}/${sourceKey}`;
    } else if (sourceUrl.includes('backblazeb2.com')) {
        // Es URL de Backblaze B2 - usar la URL pública directa
        const urlObj = new URL(sourceUrl);
        const pathParts = urlObj.pathname.split('/');
        sourceKey = pathParts.slice(pathParts.indexOf('file') > -1 ? 3 : 1).join('/');
        // Usar la URL pública directa de Backblaze (el Worker debe poder descargarla)
        directImageUrl = sourceUrl;
    } else {
        // URL externa, usar directamente
        directImageUrl = sourceUrl;
        sourceKey = '';
    }

    // Construir datos para el overlay
    const overlayData = {
        title: options.template?.title || listing.title,
        price: options.template?.priceLabel || listing.price || 'Consultar',
        location: options.template?.locationLabel || listing.location || 'Chile',
        highlights: options.template?.highlights || [],
        badges: options.template?.badges || [],
        brand: options.template?.branding?.appId || (listing.vertical === 'propiedades' ? 'simplepropiedades' : 'simpleautos'),
    };

    // Determinar el variant
    let variant: 'essential-watermark' | 'professional-centered' | 'signature-complete' | 'property-conversion';
    if (!options.template) {
        variant = 'essential-watermark';
    } else {
        const overlayVariant = options.template.overlayVariant;
        if (overlayVariant === 'professional-centered') variant = 'professional-centered';
        else if (overlayVariant === 'signature-complete') variant = 'signature-complete';
        else if (overlayVariant.startsWith('property')) variant = 'property-conversion';
        else variant = 'essential-watermark';
    }

    // Generar URL del Worker con parámetros
    const params = new URLSearchParams({
        image: directImageUrl,
        variant,
        data: JSON.stringify(overlayData),
        width: '1080',
        height: targetHeight.toString(),
    });

    const overlayUrl = `${workerUrl}/overlay?${params.toString()}`;

    console.log('[instagram] usando Cloudflare Worker:', {
        listingId: listing.id,
        imageIndex: index,
        workerUrl: overlayUrl.substring(0, 100) + '...',
    });

    return overlayUrl;
}

async function refreshInstagramAccountIfNeeded(account: InstagramAccountRecord): Promise<InstagramAccountRecord> {
    const needsRefresh = !account.tokenExpiresAt || account.tokenExpiresAt - Date.now() <= 1000 * 60 * 60 * 24 * 7;
    if (!needsRefresh) return account;

    const refreshed = await refreshInstagramAccessToken(account.accessToken);
    if (!refreshed?.accessToken) return account;

    return (await updateInstagramAccountSettings(account.userId, account.vertical, {
        accessToken: refreshed.accessToken,
        tokenExpiresAt: refreshed.expiresInSeconds ? Date.now() + refreshed.expiresInSeconds * 1000 : account.tokenExpiresAt,
        lastSyncedAt: Date.now(),
        lastError: null,
        status: 'connected',
    })) ?? account;
}

async function publishListingToInstagram(user: AppUser, listing: ListingRecord, options: {
    captionOverride?: string | null;
    auto?: boolean;
    template?: InstagramRenderTemplate | null;
} = {}) {
    const account = getInstagramAccount(user.id, listing.vertical);
    if (!account || account.status === 'disconnected') throw new Error('Primero conecta una cuenta de Instagram.');
    
    if (!userCanUseInstagram(user, listing.vertical)) {
        throw new Error('Instagram está disponible solo para planes Pro y Empresa.');
    }
    if (listing.status !== 'active') {
        throw new Error('Solo puedes publicar en Instagram avisos activos.');
    }

    const latest = getLatestInstagramPublicationForListing(user.id, listing.vertical, listing.id);
    if (options.auto && latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) {
        return instagramPublicationToResponse(latest);
    }

    const refreshedAccount = await refreshInstagramAccountIfNeeded(account);
    const publicUrl = buildListingPublicUrlForInstagram(listing);
    const mediaUrls = extractListingMediaUrls(listing).slice(0, 10);
    if (mediaUrls.length === 0) {
        logDebug(`[instagram] no media for listing ${listing.id}`);
        throw new Error('El aviso no tiene imágenes.');
    }

    logDebug(`[instagram] preparing ${mediaUrls.length} images for ${listing.id}`);
    const preparedImages: Array<{ url: string }> = [];
    const publishKey = randomUUID();

    try {
        const coverTemplate = options.template ?? null;
        const coverUrl = await prepareInstagramImageUrlCloudflare(listing, 0, {
            layoutVariant: coverTemplate?.layoutVariant ?? null,
            template: coverTemplate,
            publishKey,
            isCover: true,
        });
        if (coverUrl && coverUrl.startsWith('http')) {
            preparedImages.push({ url: coverUrl });
        }
        console.log('[instagram] cover image prepared:', {
            listingId: listing.id,
            templateId: coverTemplate?.id ?? null,
            url: coverUrl,
        });
    } catch (e) {
        console.error('[instagram] failed to prepare cover image:', {
            listingId: listing.id,
            templateId: options.template?.id ?? null,
            error: e instanceof Error ? e.message : String(e),
        });
        logDebug(`[instagram] failed to prepare cover image: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Template minimal para marca de agua en imágenes del carrusel (solo logo, sin overlay de texto)
    const watermarkTemplate: InstagramRenderTemplate | null = options.template
        ? {
            ...options.template,
            overlayVariant: 'essential-watermark',
            title: '',
            headline: '',
            subtitle: undefined,
            priceLabel: '',
            offerPriceLabel: undefined,
            discountLabel: undefined,
            locationLabel: undefined,
            highlights: [],
            badges: [],
            ctaLabel: '',
            eyebrow: '',
        }
        : null;

    for (let i = 1; i < mediaUrls.length; i++) {
        try {
            const url = await prepareInstagramImageUrlCloudflare(listing, i, {
                layoutVariant: options.template?.layoutVariant ?? null,
                template: watermarkTemplate,
                publishKey,
                isCover: false,
            });
            if (!url || !url.startsWith('http')) {
                logDebug(`[instagram] skipped image ${i}: invalid URL "${url}"`);
                continue;
            }
            
            // Validar cada imagen
            const check = await fetch(url, { method: 'HEAD' }).catch((e) => {
                logDebug(`[instagram] HEAD check failed for image ${i}: ${e.message}`);
                return null;
            });
            if (!check || !check.ok) {
                logDebug(`[instagram] image ${i} might not be accessible: ${url} (status: ${check?.status})`);
            }
            preparedImages.push({ url });
        } catch (e) {
            logDebug(`[instagram] failed to prepare image ${i}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    if (preparedImages.length === 0) {
        throw new Error('No se pudo preparar ninguna imagen válida para Instagram. Verifica que el aviso tenga fotos públicas y accesibles.');
    }

    const caption = buildInstagramCaption(listing, publicUrl, refreshedAccount.captionTemplate, options.captionOverride ?? null);
    logDebug(`[instagram] final caption for ${listing.id}: ${caption.slice(0, 50)}...`);
    logDebug(`[instagram] publishing to ${refreshedAccount.instagramUserId} as ${preparedImages.length > 1 ? 'CAROUSEL' : 'IMAGE'}`);

    try {
        let published: { mediaId: string; permalink: string | null };
        
        if (preparedImages.length > 1) {
            published = await publishInstagramCarousel({
                instagramUserId: refreshedAccount.instagramUserId,
                accessToken: refreshedAccount.accessToken,
                images: preparedImages,
                caption,
            });
        } else {
            published = await publishInstagramImage({
                instagramUserId: refreshedAccount.instagramUserId,
                accessToken: refreshedAccount.accessToken,
                imageUrl: preparedImages[0].url,
                caption,
            });
        }
        logDebug(`[instagram] publish success: ${published.mediaId}`);

        const publication = await createInstagramPublicationRecord({
            userId: user.id,
            instagramAccountId: refreshedAccount.id,
            vertical: listing.vertical,
            listingId: listing.id,
            listingTitle: listing.title,
            instagramMediaId: published.mediaId,
            instagramPermalink: published.permalink,
            caption,
            imageUrl: preparedImages[0].url,
            status: 'published',
            errorMessage: null,
            sourceUpdatedAt: listing.updatedAt,
            publishedAt: Date.now(),
        });

        await updateInstagramAccountSettings(user.id, listing.vertical, {
            lastPublishedAt: publication.publishedAt,
            lastSyncedAt: Date.now(),
            lastError: null,
            status: 'connected',
        });

        return instagramPublicationToResponse(publication);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo publicar en Instagram.';
        await createInstagramPublicationRecord({
            userId: user.id,
            instagramAccountId: refreshedAccount.id,
            vertical: listing.vertical,
            listingId: listing.id,
            listingTitle: listing.title,
            instagramMediaId: null,
            instagramPermalink: null,
            caption,
            imageUrl: preparedImages.length > 0 ? preparedImages[0].url : '',
            status: 'failed',
            errorMessage: message,
            sourceUpdatedAt: listing.updatedAt,
            publishedAt: null,
        });
        await updateInstagramAccountSettings(user.id, listing.vertical, {
            lastSyncedAt: Date.now(),
            lastError: message,
            status: 'error',
        });
        throw error;
    }
}

async function maybeAutoPublishListing(user: AppUser, listing: ListingRecord): Promise<void> {
    const account = getInstagramAccount(user.id, listing.vertical);
    if (!account?.autoPublishEnabled) return;
    if (!userCanUseInstagram(user, listing.vertical)) return;
    if (listing.status !== 'active') return;

    const latest = getLatestInstagramPublicationForListing(user.id, listing.vertical, listing.id);
    if (latest?.status === 'published' && latest.sourceUpdatedAt === listing.updatedAt) return;

    await publishListingToInstagram(user, listing, { auto: true }).catch(() => null);
}

function parseMercadoPagoPaymentStatus(status: string): PaymentOrderStatus {
    if (status === 'approved') return 'approved';
    if (status === 'authorized') return 'authorized';
    if (status === 'cancelled' || status === 'cancelled_by_user') return 'cancelled';
    if (status === 'rejected' || status === 'refunded' || status === 'charged_back') return 'rejected';
    return 'pending';
}

function parseMercadoPagoPreapprovalStatus(status: string): PaymentOrderStatus {
    if (status === 'authorized') return 'authorized';
    if (status === 'paused') return 'pending';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

function appendCheckoutParams(url: string, params: Record<string, string>): string {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        target.searchParams.set(key, value);
    }
    return target.toString();
}

function isLocalHostname(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    return normalized === 'localhost'
        || normalized === '127.0.0.1'
        || normalized === '0.0.0.0'
        || normalized === '::1'
        || normalized.endsWith('.local');
}

function getMercadoPagoPublicOrigin(vertical: VerticalType): string {
    if (vertical === 'autos') {
        return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
    }
    return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
}

function resolveMercadoPagoReturnUrl(vertical: VerticalType, rawReturnUrl: string): string {
    const target = new URL(rawReturnUrl);
    const overrideOrigin = getMercadoPagoPublicOrigin(vertical);
    if (!overrideOrigin) return target.toString();

    const publicOrigin = new URL(overrideOrigin);
    target.protocol = publicOrigin.protocol;
    target.host = publicOrigin.host;
    return target.toString();
}

function ensureMercadoPagoSubscriptionReturnUrl(vertical: VerticalType, rawReturnUrl: string): string {
    const resolved = resolveMercadoPagoReturnUrl(vertical, rawReturnUrl);
    const target = new URL(resolved);

    if (target.protocol !== 'https:' || isLocalHostname(target.hostname)) {
        const envName = vertical === 'autos'
            ? 'MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS'
            : 'MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES';
        throw new Error(
            `Mercado Pago suscripciones requiere una URL publica HTTPS. ` +
            `Configura ${envName} en services/api/.env con tu URL publica (por ejemplo ngrok o Cloudflare Tunnel).`
        );
    }

    return resolved;
}

function getAvailablePortals(vertical: VerticalType): PortalKey[] {
    return vertical === 'autos'
        ? ['yapo', 'chileautos', 'mercadolibre', 'facebook']
        : ['yapo', 'mercadolibre', 'facebook'];
}

function isPortalAvailableForVertical(vertical: VerticalType, portal: PortalKey): boolean {
    return getAvailablePortals(vertical).includes(portal);
}

function getPortalLabel(vertical: VerticalType, portal: PortalKey): string {
    if (vertical === 'propiedades' && portal === 'mercadolibre') return 'Portal Inmobiliario';
    if (portal === 'yapo') return 'Yapo';
    if (portal === 'chileautos') return 'Chileautos';
    if (portal === 'mercadolibre') return 'MercadoLibre';
    return 'Facebook Marketplace';
}

function inferPortalFromLeadImportSource(source: ListingLeadSource, explicitPortal?: PortalKey | null): PortalKey | null {
    if (explicitPortal) return explicitPortal;
    if (source === 'yapo') return 'yapo';
    if (source === 'chileautos') return 'chileautos';
    if (source === 'mercadolibre') return 'mercadolibre';
    if (source === 'facebook') return 'facebook';
    return null;
}

function inferListingLeadChannel(source: ListingLeadSource, explicitChannel?: ListingLeadChannel): ListingLeadChannel {
    if (explicitChannel) return explicitChannel;
    if (source === 'direct_message') return 'message';
    if (source === 'instagram' || source === 'facebook') return 'social';
    if (source === 'mercadolibre' || source === 'yapo' || source === 'portal' || source === 'chileautos') return 'portal';
    return 'lead';
}

function getImportedLeadSourceLabel(vertical: VerticalType, source: ListingLeadSource, portal: PortalKey | null): string {
    if (source === 'portal' && portal) return getPortalLabel(vertical, portal);
    if (source === 'mercadolibre') return getPortalLabel(vertical, 'mercadolibre');
    return listingLeadSourceLabel(source, vertical);
}

function parseImportedLeadTimestamp(value: string | number | null | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now();
}

function sanitizeSyntheticLeadEmailToken(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'externo';
}

function normalizeImportedLeadName(
    source: ListingLeadSource,
    value: string | null | undefined,
    fallbackEmail: string | null,
    fallbackPhone: string | null,
    fallbackWhatsapp: string | null
): string {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
    if (fallbackPhone?.trim()) return `Lead ${fallbackPhone.trim()}`;
    if (fallbackWhatsapp?.trim()) return `Lead ${fallbackWhatsapp.trim()}`;
    if (fallbackEmail?.trim()) return fallbackEmail.trim().split('@')[0] || 'Lead externo';
    return `Lead ${listingLeadSourceLabel(source)}`;
}

function normalizeImportedLeadEmail(input: {
    source: ListingLeadSource;
    externalSourceId?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
}): string {
    const email = input.contactEmail?.trim().toLowerCase();
    if (email) return email;

    const token = [
        input.source,
        input.externalSourceId,
        input.contactPhone,
        input.contactWhatsapp,
        Date.now(),
    ].find((value) => Boolean(asString(value))) ?? randomUUID();

    return `${sanitizeSyntheticLeadEmailToken(String(token))}@lead.simpleplataforma.invalid`;
}

function isLeadIngestConfigured(): boolean {
    return Boolean(asString(process.env.LEAD_INGEST_SECRET));
}

function isLeadIngestAuthorized(c: Context): boolean {
    const configuredSecret = asString(process.env.LEAD_INGEST_SECRET);
    if (!configuredSecret) return false;

    const authHeader = asString(c.req.header('authorization'));
    const headerSecret = asString(c.req.header('x-simple-ingest-secret'));
    const providedSecret = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : headerSecret;

    if (!providedSecret) return false;

    try {
        return timingSafeEqual(Buffer.from(providedSecret), Buffer.from(configuredSecret));
    } catch {
        return false;
    }
}

function formatPlanLimit(value: number): string {
    return value < 0 ? 'Ilimitadas' : String(value);
}

async function listFeaturedBoosted(vertical: VerticalType, section: BoostSection, limit: number) {
    const boosted = getAllBoostOrdersNormalized()
        .filter((order) => order.vertical === vertical && order.section === section && order.status === 'active')
        .sort((a, b) => b.createdAt - a.createdAt);
    
    const items = (await Promise.all(
        boosted.map(async (order) => {
            const listing = getBoostListingById(order.vertical, order.listingId);
            if (!listing) return null;
            const owner = await getUserById(order.userId);
            const sourceListing = listingsById.get(listing.id);
            const listingImageUrls = sourceListing ? extractListingMediaUrls(sourceListing) : [];
            const imageUrl = listingImageUrls.length > 0 ? listingImageUrls[0] : listing.imageUrl;
            const location = sourceListing
                ? buildLocationPublicLabel(sourceListing.locationData) || humanizePublicLocationFallback(sourceListing.location) || humanizePublicLocationFallback(listing.location) || 'Chile'
                : humanizePublicLocationFallback(listing.location) || 'Chile';
            return {
                id: listing.id,
                href: listing.href,
                title: listing.title,
                subtitle: listing.subtitle,
                price: listing.price,
                location,
                imageUrl,
                imageUrls: listingImageUrls,
                section: listing.section,
                boosted: true,
                planName: order.planName,
                boostEndsAt: order.endAt,
                owner: owner ? sanitizeUser(owner) : null,
            };
        })
    )).filter((item): item is NonNullable<typeof item> => Boolean(item));

    const uniqueIds = new Set<string>();
    const uniqueBoosted = items.filter((item) => {
        if (uniqueIds.has(item.id)) return false;
        uniqueIds.add(item.id);
        return true;
    });

    if (uniqueBoosted.length >= limit) return uniqueBoosted.slice(0, limit);

    const fallback = boostListingsSeed
        .filter((item) => item.vertical === vertical && item.section === section)
        .filter((item) => !uniqueIds.has(item.id))
        .slice(0, Math.max(0, limit - uniqueBoosted.length))
        .map((listing) => {
            const owner = usersById.get(listing.ownerId);
            const sourceListing = listingsById.get(listing.id);
            const listingImageUrls = sourceListing ? extractListingMediaUrls(sourceListing) : (listing.imageUrls || []);
            const imageUrl = listingImageUrls.length > 0 ? listingImageUrls[0] : listing.imageUrl;
            const location = sourceListing
                ? buildLocationPublicLabel(sourceListing.locationData) || humanizePublicLocationFallback(sourceListing.location) || humanizePublicLocationFallback(listing.location) || 'Chile'
                : humanizePublicLocationFallback(listing.location) || 'Chile';
            return {
                id: listing.id,
                href: listing.href,
                title: listing.title,
                subtitle: listing.subtitle,
                price: listing.price,
                location,
                imageUrl,
                imageUrls: listingImageUrls,
                section: listing.section,
                boosted: false,
                planName: 'Orgánico',
                boostEndsAt: null,
                owner: owner ? sanitizeUser(owner) : null,
            };
        });

    return [...uniqueBoosted, ...fallback];
}

const PORTAL_LABELS: Record<PortalKey, string> = {
    yapo: 'Yapo',
    chileautos: 'Chileautos',
    mercadolibre: 'MercadoLibre',
    facebook: 'Facebook Marketplace',
};

const REQUIRED_SPECIFIC_FIELDS_BY_VEHICLE: Record<string, string[]> = {
    motorcycle: ['moto_type', 'engine_cc'],
    truck: ['truck_type', 'axle_config', 'load_capacity_kg'],
    bus: ['bus_type', 'seat_capacity'],
    machinery: ['machine_type', 'operating_hours'],
    nautical: ['vessel_type', 'length_ft'],
    aerial: ['aircraft_type', 'flight_hours', 'registration_code'],
};

const AUTOS_PORTAL_REQUIREMENTS: Record<PortalKey, { required: string[]; recommended: string[] }> = {
    yapo: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos'],
        recommended: ['mileage', 'fuel', 'bodyType', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    chileautos: {
        required: ['title', 'description', 'brand', 'model', 'year', 'mileage', 'fuel', 'transmission', 'bodyType', 'location', 'price', 'photos', 'specificRequired'],
        recommended: ['specificRequired', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    mercadolibre: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos', 'specificRequired'],
        recommended: ['mileage', 'fuel', 'transmission', 'bodyType', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
    facebook: {
        required: ['title', 'description', 'brand', 'model', 'year', 'price', 'location', 'photos'],
        recommended: ['mileage', 'fuel', 'transmission', 'condition', 'rentMinDays', 'rentAvailability', 'auctionIncrement'],
    },
};

const PROPERTIES_PORTAL_REQUIREMENTS: Record<PortalKey, { required: string[]; recommended: string[] }> = {
    yapo: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    chileautos: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    mercadolibre: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
    facebook: {
        required: ['title', 'description', 'price', 'location', 'photos'],
        recommended: ['rooms', 'bathrooms', 'surface'],
    },
};

// asObject imported from ./modules/shared/index.js

function normalizeListingPortalSyncRecord(
    portal: PortalKey,
    value: unknown
): ListingPortalSyncRecord | null {
    const source = asObject(value);
    const status = source.status;
    if (status !== 'missing' && status !== 'ready' && status !== 'published' && status !== 'failed') {
        return null;
    }

    const toTimestamp = (input: unknown): number | null => {
        if (typeof input === 'number' && Number.isFinite(input)) return input;
        if (typeof input === 'string' && input.trim()) {
            const parsed = Number(input);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    };

    return {
        portal,
        status,
        publishedAt: toTimestamp(source.publishedAt),
        externalId: typeof source.externalId === 'string' ? source.externalId : null,
        lastError: typeof source.lastError === 'string' ? source.lastError : null,
        lastAttemptAt: toTimestamp(source.lastAttemptAt),
    };
}

function extractStoredListingIntegrations(rawData: unknown): Partial<Record<PortalKey, ListingPortalSyncRecord>> {
    const source = asObject(asObject(rawData)[LISTING_INTEGRATIONS_STORAGE_KEY]);
    const integrations: Partial<Record<PortalKey, ListingPortalSyncRecord>> = {};

    for (const portal of ['yapo', 'chileautos', 'mercadolibre', 'facebook'] as const) {
        const normalized = normalizeListingPortalSyncRecord(portal, source[portal]);
        if (normalized) {
            integrations[portal] = normalized;
        }
    }

    return integrations;
}

function stripStoredListingMetadata(rawData: unknown): unknown {
    const source = asObject(rawData);
    if (!(LISTING_INTEGRATIONS_STORAGE_KEY in source)) return rawData ?? {};
    const clone = { ...source };
    delete clone[LISTING_INTEGRATIONS_STORAGE_KEY];
    return clone;
}

function embedStoredListingMetadata(
    rawData: unknown,
    integrations: Partial<Record<PortalKey, ListingPortalSyncRecord>>
): unknown {
    const base = { ...asObject(rawData) };
    delete base[LISTING_INTEGRATIONS_STORAGE_KEY];
    if (Object.keys(integrations).length === 0) return base;
    return {
        ...base,
        [LISTING_INTEGRATIONS_STORAGE_KEY]: integrations,
    };
}

function mapListingRowToRecord(listing: ListingRow): ListingRecord {
    const integrations = extractStoredListingIntegrations(listing.rawData);
    const leadCount = listingLeadCountsByListing.get(listing.id) ?? 0;
    return {
        id: listing.id,
        accountId: listing.accountId ?? null,
        ownerId: listing.ownerId,
        vertical: listing.vertical as VerticalType,
        section: listing.section as any,
        listingType: listing.section as any,
        title: listing.title,
        description: listing.description || '',
        price: listing.priceLabel || '',
        location: listing.location || '',
        locationData: listing.locationData as ListingLocation,
        href: listing.hrefSlug || listingDefaultHref(listing.vertical as VerticalType, listing.id),
        status: listing.status as any,
        views: 0,
        favs: 0,
        leads: leadCount,
        rawData: stripStoredListingMetadata(listing.rawData),
        integrations,
        createdAt: listing.createdAt.getTime(),
        updatedAt: listing.updatedAt.getTime(),
    };
}

function listingToDbWrite(record: ListingRecord) {
    return {
        accountId: record.accountId,
        ownerId: record.ownerId,
        vertical: record.vertical,
        section: record.section,
        title: record.title,
        description: record.description || null,
        priceLabel: record.price,
        location: record.location || null,
        locationData: record.locationData ?? null,
        hrefSlug: record.href || listingDefaultHref(record.vertical, record.id),
        status: record.status,
        rawData: embedStoredListingMetadata(record.rawData, record.integrations),
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
    };
}

function upsertListingCache(record: ListingRecord): ListingRecord {
    listingsById.set(record.id, record);
    return record;
}

function isListingSlugConflictError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('href_slug')
        || message.includes('listings_href_slug')
        || (message.includes('duplicate key') && message.includes('listings'));
}

async function insertListingRecord(record: ListingRecord): Promise<ListingRecord> {
    const accountId = record.accountId ?? await getPrimaryAccountIdForUser(record.ownerId);
    const [row] = await db.insert(listings).values({
        id: record.id,
        ...listingToDbWrite({
            ...record,
            accountId,
        }),
    }).returning();
    return upsertListingCache(mapListingRowToRecord(row));
}

async function saveListingRecord(record: ListingRecord): Promise<ListingRecord> {
    const [row] = await db.update(listings).set({
        section: record.section,
        title: record.title,
        description: record.description || null,
        priceLabel: record.price,
        location: record.location || null,
        locationData: record.locationData ?? null,
        hrefSlug: record.href || listingDefaultHref(record.vertical, record.id),
        status: record.status,
        rawData: embedStoredListingMetadata(record.rawData, record.integrations),
        updatedAt: new Date(record.updatedAt),
    }).where(eq(listings.id, record.id)).returning();

    if (!row) {
        throw new Error('Publicación no encontrada');
    }

    return upsertListingCache(mapListingRowToRecord(row));
}

function extractAllListingMediaUrls(record: ListingRecord): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const urls: string[] = [];

    const photos = Array.isArray(media.photos) ? media.photos : [];
    for (const photo of photos) {
        const url = toPublicMediaUrl(photo);
        if (url) urls.push(url);
    }

    const discoverVideo = media.discoverVideo;
    if (discoverVideo && typeof discoverVideo === 'object') {
        const url = toPublicMediaUrl(discoverVideo);
        if (url) urls.push(url);
    }

    return urls;
}

async function deleteListingRecord(listingId: string): Promise<void> {
    const record = listingsById.get(listingId) ?? await getListingById(listingId);

    await db.delete(listings).where(eq(listings.id, listingId));
    listingsById.delete(listingId);
    for (const [userId, ids] of listingIdsByUser.entries()) {
        listingIdsByUser.set(userId, ids.filter((id) => id !== listingId));
    }

    if (record) {
        const mediaUrls = extractAllListingMediaUrls(record);
        if (mediaUrls.length > 0) {
            try {
                const storage = getStorageProvider();
                await Promise.allSettled(
                    mediaUrls
                        .map((url) => extractBackblazeObjectKey(url))
                        .filter((key) => key.length > 0)
                        .map((key) => storage.delete(key))
                );
            } catch {
                // Media cleanup is best-effort — don't fail the delete
            }
        }
    }
}

function mapListingDraftRow(row: ListingDraftRow) {
    return {
        id: row.id,
        userId: row.userId,
        vertical: row.vertical as VerticalType,
        draft: row.draftData,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

async function getListingDraftRecord(userId: string, vertical: VerticalType) {
    const rows = await db
        .select()
        .from(listingDrafts)
        .where(and(eq(listingDrafts.userId, userId), eq(listingDrafts.vertical, vertical)))
        .limit(1);
    if (rows.length === 0) return null;
    return mapListingDraftRow(rows[0]);
}

async function upsertListingDraftRecord(userId: string, vertical: VerticalType, draft: unknown) {
    const existing = await getListingDraftRecord(userId, vertical);
    const now = new Date();

    if (existing) {
        const rows = await db
            .update(listingDrafts)
            .set({
                draftData: draft,
                updatedAt: now,
            })
            .where(eq(listingDrafts.id, existing.id))
            .returning();
        return mapListingDraftRow(rows[0]);
    }

    const rows = await db
        .insert(listingDrafts)
        .values({
            userId,
            vertical,
            draftData: draft,
            createdAt: now,
            updatedAt: now,
        })
        .returning();
    return mapListingDraftRow(rows[0]);
}

async function deleteListingDraftRecord(userId: string, vertical: VerticalType) {
    await db
        .delete(listingDrafts)
        .where(and(eq(listingDrafts.userId, userId), eq(listingDrafts.vertical, vertical)));
}

function parseNumberFromString(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\./g, '').replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function makeGeoPoint(
    latitude: number | null,
    longitude: number | null,
    precision: GeocodePrecision,
    provider: GeocodeProvider = 'none',
    accuracyMeters: number | null = null
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
    options: { includeNeighborhood?: boolean; includeAddressLine2?: boolean } = {}
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
        && point.provider !== 'catalog_seed'
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
                ? makeGeoPoint(internalGeoPoint.latitude, internalGeoPoint.longitude, 'exact', internalGeoPoint.provider ?? 'external', internalGeoPoint.accuracyMeters ?? 25)
                : makeGeoPoint(null, null, 'none');
        case 'approximate':
            if (hasTrustedGeoPoint(internalGeoPoint)) {
                return makeGeoPoint(
                    internalGeoPoint.latitude! + jitterFromHash(hashBase >> 2, 0.004),
                    internalGeoPoint.longitude! + jitterFromHash(hashBase >> 3, 0.005),
                    'approximate',
                    internalGeoPoint.provider ?? 'external',
                    350
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
                    700
                );
            }
            if (basePoint) {
                return makeGeoPoint(
                    basePoint.latitude + jitterFromHash(hashBase >> 4, 0.012),
                    basePoint.longitude + jitterFromHash(hashBase >> 5, 0.014),
                    'approximate',
                    'catalog_seed',
                    1200
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

function geocodeListingLocation(location: ListingLocation): ListingLocation {
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

async function geocodeLocationRemotely(location: ListingLocation): Promise<ListingLocation | null> {
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
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=cl&language=es&key=${encodeURIComponent(googleKey)}`
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
                }
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

function daysSince(timestamp: number | null | undefined): number | null {
    if (timestamp == null || !Number.isFinite(timestamp)) return null;
    return Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

function buildLocationPublicLabel(location: Partial<ListingLocation> | null | undefined): string {
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
    if (visibilityMode === 'approximate' || visibilityMode === 'sector_only') return [neighborhood, commune, region].filter(Boolean).join(', ');
    return [commune, region].filter(Boolean).join(', ');
}

function humanizePublicLocationFallback(value: string | null | undefined): string {
    const normalized = asString(value);
    if (!normalized) return '';
    if (normalized.includes(',')) return normalized;
    const compact = normalized.toLowerCase().trim();
    const withoutRegionPrefix = compact.replace(/^(rm|arica|tarapaca|antofagasta|atacama|coquimbo|valparaiso|ohiggins|maule|nuble|bio|araucania|rios|lagos|aysen|magallanes)-/, '');
    const label = withoutRegionPrefix.replace(/-/g, ' ').trim();
    if (!label) return normalized;
    return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeListingLocation(value: unknown): ListingLocation | undefined {
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

function makeAddressBookId(): string {
    return `addr-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

async function getAddressBookEntries(userId: string): Promise<AddressBookEntry[]> {
    const rows = await db
        .select()
        .from(addressBook)
        .where(eq(addressBook.userId, userId))
        .orderBy(desc(addressBook.isDefault), desc(addressBook.updatedAt));

    return rows.map((row) => ({
        id: row.id,
        kind: row.kind as AddressBookKind,
        label: row.label,
        countryCode: row.countryCode,
        regionId: row.regionId,
        regionName: row.regionName,
        communeId: row.communeId,
        communeName: row.communeName,
        neighborhood: row.neighborhood,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        postalCode: row.postalCode,
        arrivalInstructions: row.arrivalInstructions ?? null,
        isDefault: row.isDefault,
        geoPoint: (row.geoPoint as GeoPoint) || makeGeoPoint(null, null, 'none'),
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    }));
}

async function upsertAddressBookEntry(
    userId: string,
    input: z.infer<typeof addressBookWriteSchema>,
    existingId?: string
): Promise<AddressBookEntry[]> {
    const now = new Date();
    const nextId = existingId ?? randomUUID();
    const accountId = await getPrimaryAccountIdForUser(userId);

    const data: any = {
        accountId,
        kind: input.kind,
        label: input.label,
        countryCode: input.countryCode,
        regionId: input.regionId,
        regionName: input.regionName,
        communeId: input.communeId,
        communeName: input.communeName,
        neighborhood: input.neighborhood,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        postalCode: input.postalCode,
        arrivalInstructions: input.arrivalInstructions ?? null,
        isDefault: input.isDefault,
        geoPoint: input.geoPoint ?? makeGeoPoint(null, null, 'none'),
        updatedAt: now,
    };

    if (input.isDefault) {
        // Reset other defaults
        await db
            .update(addressBook)
            .set({ isDefault: false, updatedAt: now })
            .where(and(eq(addressBook.userId, userId), eq(addressBook.isDefault, true)));
    }

    if (existingId) {
        await db
            .update(addressBook)
            .set(data)
            .where(and(eq(addressBook.userId, userId), eq(addressBook.id, existingId)));
    } else {
        await db.insert(addressBook).values({
            ...data,
            id: nextId,
            userId,
            createdAt: now,
        });
    }

    return getAddressBookEntries(userId);
}

async function deleteAddressBookEntry(userId: string, addressId: string): Promise<AddressBookEntry[]> {
    const [target] = await db
        .select()
        .from(addressBook)
        .where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

    if (!target) return getAddressBookEntries(userId);

    await db.delete(addressBook).where(and(eq(addressBook.userId, userId), eq(addressBook.id, addressId)));

    if (target.isDefault) {
        const remaining = await db
            .select()
            .from(addressBook)
            .where(eq(addressBook.userId, userId))
            .limit(1);

        if (remaining.length > 0) {
            await db
                .update(addressBook)
                .set({ isDefault: true, updatedAt: new Date() })
                .where(eq(addressBook.id, remaining[0].id));
        }
    }

    return getAddressBookEntries(userId);
}


function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number | null {
    if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function listingAgeDays(createdAt: number): number {
    if (!createdAt) return 0;
    const delta = Date.now() - createdAt;
    return Math.max(0, Math.floor(delta / (1000 * 60 * 60 * 24)));
}

function parseListingStatus(raw: string | undefined): ListingStatus {
    if (raw === 'draft' || raw === 'paused' || raw === 'sold' || raw === 'archived') return raw;
    return 'active';
}

function parseListingSection(raw: string | undefined, vertical: VerticalType): BoostSection {
    const normalized = raw === 'rent' || raw === 'auction' || raw === 'project' ? raw : 'sale';
    if (isBoostSectionAllowed(vertical, normalized)) return normalized;
    return 'sale';
}

function makeListingId(): string {
    return randomUUID();
}

function listingDefaultHref(vertical: VerticalType, listingId: string): string {
    return vertical === 'autos' ? `/vehiculo/${listingId}` : `/propiedad/${listingId}`;
}

function listingFieldLabel(key: string): string {
    switch (key) {
        case 'title':
            return 'Título';
        case 'description':
            return 'Descripción';
        case 'brand':
            return 'Marca';
        case 'model':
            return 'Modelo';
        case 'year':
            return 'Año';
        case 'mileage':
            return 'Kilometraje';
        case 'fuel':
            return 'Combustible';
        case 'transmission':
            return 'Transmisión';
        case 'bodyType':
            return 'Carrocería / tipo';
        case 'condition':
            return 'Condición del vehículo';
        case 'location':
            return 'Región + comuna';
        case 'price':
            return 'Precio';
        case 'photos':
            return 'Fotos (mínimo 3)';
        case 'specificRequired':
            return 'Campos especiales por categoría';
        case 'rentMinDays':
            return 'Arriendo: días mínimos';
        case 'rentAvailability':
            return 'Arriendo: rango de disponibilidad';
        case 'auctionIncrement':
            return 'Subasta: incremento mínimo';
        case 'rooms':
            return 'Dormitorios';
        case 'bathrooms':
            return 'Baños';
        case 'surface':
            return 'Superficie';
        default:
            return key;
    }
}

function getAutosPortalCoverage(record: ListingRecord, portal: PortalKey): { missingRequired: string[]; missingRecommended: string[] } {
    const payload = asObject(record.rawData);
    const setup = asObject(payload.setup);
    const basic = asObject(payload.basic);
    const location = asObject(payload.location);
    const media = asObject(payload.media);
    const commercial = asObject(payload.commercial);
    const normalizedLocation = normalizeListingLocation(record.locationData ?? location);

    const vehicleType = asString(setup.vehicleType) || 'car';
    const listingType = asString(setup.listingType) || record.listingType;
    const brandId = asString(basic.brandId);
    const customBrand = asString(basic.customBrand);
    const modelId = asString(basic.modelId);
    const customModel = asString(basic.customModel);
    const year = parseNumberFromString(basic.year);
    const mileage = parseNumberFromString(basic.mileage);
    const fuelType = asString(basic.fuelType);
    const transmission = asString(basic.transmission);
    const bodyType = asString(basic.bodyType);
    const condition = asString(basic.condition);
    const regionId = normalizedLocation?.regionId ?? asString(location.regionId);
    const communeId = normalizedLocation?.communeId ?? asString(location.communeId);
    const photoCount = Array.isArray(media.photos) ? media.photos.length : 0;
    const specific = asObject(basic.specific);
    const rentMinDays = parseNumberFromString(commercial.rentMinDays);
    const rentAvailableFrom = asString(commercial.rentAvailableFrom);
    const rentAvailableTo = asString(commercial.rentAvailableTo);
    const auctionMinIncrement = parseNumberFromString(commercial.auctionMinIncrement);

    const requiredSpecific = REQUIRED_SPECIFIC_FIELDS_BY_VEHICLE[vehicleType] ?? [];
    const hasSpecificRequired = requiredSpecific.every((field) => asString(specific[field]).length > 0);

    const hasPrice = (() => {
        if (listingType === 'rent') {
            return (
                parseNumberFromString(commercial.rentDaily) != null ||
                parseNumberFromString(commercial.rentWeekly) != null ||
                parseNumberFromString(commercial.rentMonthly) != null
            );
        }
        if (listingType === 'auction') {
            return parseNumberFromString(commercial.auctionStartPrice) != null;
        }
        return parseNumberFromString(commercial.price) != null || asString(record.price).length > 0;
    })();

    const checks: Record<string, boolean> = {
        title: asString(record.title).length >= 10 || asString(basic.title).length >= 10,
        description: asString(record.description).length >= 100 || asString(basic.description).length >= 100,
        brand: brandId.length > 0 && (brandId !== '__custom__' || customBrand.length >= 2),
        model: modelId.length > 0 && (modelId !== '__custom__' || customModel.length >= 2),
        year: year != null && year >= 1900,
        mileage: mileage != null || vehicleType === 'nautical' || vehicleType === 'aerial',
        fuel: fuelType.length > 0 || vehicleType === 'aerial',
        transmission: transmission.length > 0 || vehicleType === 'nautical' || vehicleType === 'machinery',
        bodyType: vehicleType !== 'car' || bodyType.length > 0,
        condition: condition.length > 0,
        location: regionId.length > 0 && communeId.length > 0,
        price: hasPrice,
        photos: photoCount >= 3,
        specificRequired: hasSpecificRequired,
        rentMinDays: listingType !== 'rent' || (rentMinDays != null && rentMinDays >= 1),
        rentAvailability: listingType !== 'rent' || (rentAvailableFrom.length > 0 && rentAvailableTo.length > 0),
        auctionIncrement: listingType !== 'auction' || (auctionMinIncrement != null && auctionMinIncrement > 0),
    };

    const requirements = AUTOS_PORTAL_REQUIREMENTS[portal];
    const missingRequired = requirements.required
        .filter((key) => !checks[key])
        .map((key) => listingFieldLabel(key));
    const missingRecommended = requirements.recommended
        .filter((key) => !checks[key])
        .map((key) => listingFieldLabel(key));
    return { missingRequired, missingRecommended };
}

function getPropertiesPortalCoverage(record: ListingRecord, portal: PortalKey): { missingRequired: string[]; missingRecommended: string[] } {
    const payload = asObject(record.rawData);
    const basic = asObject(payload.basic);
    const media = asObject(payload.media);
    const location = asObject(payload.location);
    const normalizedLocation = normalizeListingLocation(record.locationData ?? location);

    const rooms = asString(basic.rooms);
    const bathrooms = asString(basic.bathrooms);
    const surface = asString(basic.totalArea || basic.surface);
    const photoCount = Array.isArray(media.photos) ? media.photos.length : 0;
    const hasLocation = (normalizedLocation?.regionId ?? asString(location.regionId)).length > 0
        && (normalizedLocation?.communeId ?? asString(location.communeId)).length > 0;

    const checks: Record<string, boolean> = {
        title: asString(record.title).length >= 10,
        description: asString(record.description).length >= 80,
        price: asString(record.price).length > 0,
        location: hasLocation || asString(record.location).length > 0,
        photos: photoCount >= 3,
        rooms: rooms.length > 0,
        bathrooms: bathrooms.length > 0,
        surface: surface.length > 0,
    };

    const requirements = PROPERTIES_PORTAL_REQUIREMENTS[portal];
    const missingRequired = requirements.required.filter((key) => !checks[key]).map((key) => listingFieldLabel(key));
    const missingRecommended = requirements.recommended.filter((key) => !checks[key]).map((key) => listingFieldLabel(key));
    return { missingRequired, missingRecommended };
}

function getPortalCoverage(record: ListingRecord, portal: PortalKey): { missingRequired: string[]; missingRecommended: string[] } {
    if (record.vertical === 'autos') return getAutosPortalCoverage(record, portal);
    return getPropertiesPortalCoverage(record, portal);
}

function parseMoneyAmount(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return null;
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatPublicMoneyLabel(value: unknown, currency: 'CLP' | 'USD' | 'UF' = 'CLP'): string {
    const amount = parseMoneyAmount(value);
    const fallback = asString(value).trim();
    if (amount == null || amount <= 0) return fallback;
    if (currency === 'UF') {
        return `UF ${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    }
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function detectPriceCurrency(value: unknown): 'UF' | 'CLP' {
    return typeof value === 'string' && value.trim().toUpperCase().startsWith('UF') ? 'UF' : 'CLP';
}

function detectVehiclePriceCurrency(value: unknown, fallback?: unknown): 'CLP' | 'USD' {
    const fallbackValue = asString(fallback).trim().toUpperCase();
    if (fallbackValue === 'USD') return 'USD';
    const raw = asString(value).trim().toUpperCase();
    if (raw.includes('USD') || raw.includes('US$')) return 'USD';
    return 'CLP';
}

function saleBaselineVehiclePrice(vehicleType: string): number {
    switch (vehicleType) {
        case 'motorcycle':
            return 6_200_000;
        case 'truck':
            return 78_000_000;
        case 'bus':
            return 69_000_000;
        case 'machinery':
            return 118_000_000;
        case 'nautical':
            return 24_000_000;
        case 'aerial':
            return 92_000_000;
        case 'car':
        default:
            return 14_500_000;
    }
}

function rentBaselineVehiclePrice(vehicleType: string): number {
    switch (vehicleType) {
        case 'motorcycle':
            return 28_000;
        case 'truck':
            return 180_000;
        case 'bus':
            return 250_000;
        case 'machinery':
            return 320_000;
        case 'nautical':
            return 160_000;
        case 'aerial':
            return 680_000;
        case 'car':
        default:
            return 38_000;
    }
}

function conditionAdjustmentFactor(raw: unknown): number {
    const value = asString(raw).toLowerCase();
    if (!value) return 1;
    if (value.includes('nuevo')) return 1.08;
    if (value.includes('demo')) return 1.05;
    if (value.includes('seminuevo') || value.includes('certific')) return 1.04;
    if (value.includes('usado')) return 1;
    if (value.includes('restaur')) return 0.97;
    if (value.includes('sinies')) return 0.82;
    if (value.includes('repar')) return 0.75;
    if (value.includes('repuesto')) return 0.65;
    if (value.includes('classic') || value.includes('clasico')) return 1.02;
    return 1;
}

function normalizePropertyType(raw: unknown): string {
    const value = asString(raw).toLowerCase();
    if (value.includes('depto') || value.includes('departamento')) return 'departamento';
    if (value.includes('casa')) return 'casa';
    if (value.includes('oficina')) return 'oficina';
    if (value.includes('local')) return 'local';
    if (value.includes('terreno')) return 'terreno';
    if (value.includes('bodega')) return 'bodega';
    return value || 'propiedad';
}

function saleBaselineUfPerM2(propertyType: string): number {
    switch (propertyType) {
        case 'departamento':
            return 73;
        case 'casa':
            return 58;
        case 'oficina':
            return 66;
        case 'local':
            return 70;
        case 'bodega':
            return 34;
        case 'terreno':
            return 18;
        default:
            return 52;
    }
}

function rentBaselineClpPerM2(propertyType: string): number {
    switch (propertyType) {
        case 'departamento':
            return 12500;
        case 'casa':
            return 9800;
        case 'oficina':
            return 14500;
        case 'local':
            return 17500;
        case 'bodega':
            return 6500;
        case 'terreno':
            return 2200;
        default:
            return 9000;
    }
}

function extractPropertyComparable(record: ListingRecord, operationType: 'sale' | 'rent', targetGeoPoint?: GeoPoint): ValuationComparable | null {
    if (record.vertical !== 'propiedades') return null;
    if (record.section !== operationType) return null;

    const payload = asObject(record.rawData);
    const basic = asObject(payload.basic);
    const location = normalizeListingLocation(record.locationData ?? payload.location);
    const areaM2 = parseNumberFromString(basic.totalArea) ?? parseNumberFromString(basic.surface);
    const price = parseMoneyAmount(record.price);
    if (price == null || areaM2 == null || areaM2 <= 0) return null;

    return {
        source: 'simple_internal',
        externalId: record.id,
        title: record.title,
        price,
        currency: detectPriceCurrency(record.price),
        operationType,
        propertyType: normalizePropertyType(basic.propertyType || basic.type || record.title),
        regionId: location?.regionId ?? null,
        communeId: location?.communeId ?? null,
        addressLabel: location?.publicLabel || record.location || null,
        distanceKm: targetGeoPoint && location ? haversineDistanceKm(targetGeoPoint, location.geoPoint) : null,
        bedrooms: parseNumberFromString(basic.rooms),
        bathrooms: parseNumberFromString(basic.bathrooms),
        areaM2,
        publishedAt: record.updatedAt,
        url: record.href,
    };
}

function extractVehicleComparable(record: ListingRecord, operationType: 'sale' | 'rent', targetGeoPoint?: GeoPoint): VehicleValuationComparable | null {
    if (record.vertical !== 'autos') return null;
    if (record.section !== operationType) return null;

    const payload = asObject(record.rawData);
    const setup = asObject(payload.setup);
    const basic = asObject(payload.basic);
    const commercial = asObject(payload.commercial);
    const location = normalizeListingLocation(record.locationData ?? payload.location);
    const vehicleType = normalizeVehicleType(setup.vehicleType ?? record.section);
    const brand = normalizeVehicleSlug(basic.brandId === '__custom__' ? basic.customBrand : basic.brandId ?? basic.customBrand);
    const model = normalizeVehicleSlug(basic.modelId === '__custom__' ? basic.customModel : basic.modelId ?? basic.customModel);
    const version = asString(basic.version).trim() || null;
    const year = parseNumberFromString(basic.year);
    const mileageKm = parseNumberFromString(basic.mileage);
    const commercialPrice = operationType === 'rent'
        ? commercial.rentDaily ?? commercial.rentWeekly ?? commercial.rentMonthly ?? record.price
        : commercial.price ?? record.price;
    const price = parseMoneyAmount(commercialPrice);

    if (!brand || !model || price == null) return null;

    return {
        source: 'simple_internal',
        externalId: record.id,
        title: record.title,
        price,
        currency: detectVehiclePriceCurrency(record.price, commercial.currency),
        operationType,
        vehicleType,
        brand,
        model,
        version,
        year,
        mileageKm,
        fuelType: asString(basic.fuelType) || null,
        transmission: asString(basic.transmission) || null,
        bodyType: asString(basic.bodyType) || null,
        regionId: location?.regionId ?? null,
        communeId: location?.communeId ?? null,
        addressLabel: location?.publicLabel || record.location || null,
        distanceKm: targetGeoPoint && location ? haversineDistanceKm(targetGeoPoint, location.geoPoint) : null,
        publishedAt: record.updatedAt,
        url: record.href,
    };
}

function estimatePropertyValuation(input: z.infer<typeof propertyValuationRequestSchema>) {
    const propertyType = normalizePropertyType(input.propertyType);
    const operationType = input.operationType;
    const targetCurrency = operationType === 'sale' ? 'UF' : 'CLP';
    const feedState = getValuationFeedState();
    const targetLocation = geocodeListingLocation({
        sourceMode: 'custom',
        sourceAddressId: null,
        countryCode: 'CL',
        regionId: input.regionId,
        regionName: null,
        communeId: input.communeId,
        communeName: null,
        neighborhood: input.neighborhood,
        addressLine1: input.addressLine1,
        addressLine2: null,
        postalCode: null,
        geoPoint: makeGeoPoint(null, null, 'none'),
        visibilityMode: 'exact',
        publicMapEnabled: true,
        publicGeoPoint: makeGeoPoint(null, null, 'none'),
        publicLabel: '',
    });

    const internalComparables = Array.from(listingsById.values())
        .map((record) => extractPropertyComparable(record, operationType, targetLocation.geoPoint))
        .filter((item): item is ValuationComparable => Boolean(item))
        .filter((item) => item.currency === targetCurrency)
        .filter((item) => item.propertyType === propertyType)
        .filter((item) => item.regionId === input.regionId)
        .filter((item) => item.communeId === input.communeId);

    const feedComparables = feedState.records
        .filter((record) => record.operationType === operationType)
        .filter((record) => record.currency === targetCurrency)
        .filter((record) => record.propertyType === propertyType)
        .filter((record) => record.regionId === input.regionId)
        .filter((record) => record.communeId === input.communeId)
        .map((record) => {
            const feedLocation = geocodeListingLocation({
                sourceMode: 'custom',
                sourceAddressId: null,
                countryCode: 'CL',
                regionId: record.regionId,
                regionName: null,
                communeId: record.communeId,
                communeName: null,
                neighborhood: record.neighborhood,
                addressLine1: record.addressLabel,
                addressLine2: null,
                postalCode: null,
                geoPoint: makeGeoPoint(null, null, 'none'),
                visibilityMode: 'exact',
                publicMapEnabled: true,
                publicGeoPoint: makeGeoPoint(null, null, 'none'),
                publicLabel: record.addressLabel || '',
            });

            return {
                source: record.source,
                externalId: record.id,
                title: record.title,
                price: record.price,
                currency: record.currency,
                operationType: record.operationType,
                propertyType: record.propertyType,
                regionId: record.regionId,
                communeId: record.communeId,
                addressLabel: record.addressLabel,
                distanceKm: haversineDistanceKm(targetLocation.geoPoint, feedLocation.geoPoint),
                bedrooms: record.bedrooms,
                bathrooms: record.bathrooms,
                areaM2: record.areaM2,
                publishedAt: record.publishedAt,
                url: record.url,
            } satisfies ValuationComparable;
        });

    const comparables = [...internalComparables, ...feedComparables]
        .sort((a, b) => {
            const areaA = a.areaM2 ?? input.areaM2;
            const areaB = b.areaM2 ?? input.areaM2;
            const distanceA = a.distanceKm ?? 999;
            const distanceB = b.distanceKm ?? 999;
            return (Math.abs(areaA - input.areaM2) + distanceA * 3) - (Math.abs(areaB - input.areaM2) + distanceB * 3);
        })
        .slice(0, 10);

    const comparablePricePerM2 = comparables
        .map((item) => (item.areaM2 && item.areaM2 > 0 ? item.price / item.areaM2 : null))
        .filter((value): value is number => value != null && Number.isFinite(value));

    const baselinePricePerM2 = operationType === 'sale'
        ? saleBaselineUfPerM2(propertyType)
        : rentBaselineClpPerM2(propertyType);

    const averageComparablePricePerM2 = comparablePricePerM2.length > 0
        ? comparablePricePerM2.reduce((sum, value) => sum + value, 0) / comparablePricePerM2.length
        : baselinePricePerM2;

    let adjustmentFactor = 1;
    if ((input.parkingSpaces ?? 0) > 0) adjustmentFactor += 0.03;
    if ((input.storageUnits ?? 0) > 0) adjustmentFactor += 0.015;
    if ((input.bathrooms ?? 0) >= 2) adjustmentFactor += 0.02;
    if ((input.bedrooms ?? 0) >= 3) adjustmentFactor += 0.02;
    if (input.yearBuilt != null && input.yearBuilt >= 2018) adjustmentFactor += 0.04;
    if (asString(input.condition).toLowerCase().includes('remodel')) adjustmentFactor += 0.03;

    const estimatedPricePerM2 = averageComparablePricePerM2 * adjustmentFactor;
    const estimatedPrice = estimatedPricePerM2 * input.areaM2;
    const variance = comparablePricePerM2.length >= 3 ? 0.09 : comparablePricePerM2.length >= 1 ? 0.14 : 0.2;
    const sourceCounts = new Map<string, number>();
    for (const comparable of comparables) {
        sourceCounts.set(comparable.source, (sourceCounts.get(comparable.source) ?? 0) + 1);
    }
    const totalComparables = comparables.length || 1;
    const sourceBreakdown: ValuationSourceBreakdown[] = Array.from(sourceCounts.entries()).map(([source, count]) => ({
        source,
        comparables: count,
        weight: Math.round((count / totalComparables) * 100) / 100,
        freshnessDays: Math.min(
            ...comparables
                .filter((item) => item.source === source)
                .map((item) => daysSince(item.publishedAt) ?? 999)
        ),
    }));
    const dataCoverageScore = Math.min(100, comparables.length * 12 + sourceBreakdown.length * 8);
    const locationAccuracyScore = targetLocation.geoPoint.precision === 'exact' ? 90 : targetLocation.geoPoint.precision === 'approximate' ? 70 : 45;
    const similarityScore = Math.min(100, 45 + comparablePricePerM2.length * 7 + ((input.bedrooms ?? 0) > 0 ? 8 : 0) + ((input.bathrooms ?? 0) > 0 ? 8 : 0));
    const recencyScore = Math.max(
        30,
        100 - Math.round(
            (comparables.reduce((sum, item) => sum + (daysSince(item.publishedAt) ?? 90), 0) / (comparables.length || 1)) * 0.7
        )
    );
    const confidenceBreakdown: ValuationConfidenceBreakdown = {
        dataCoverage: Math.min(100, dataCoverageScore),
        locationAccuracy: Math.min(100, locationAccuracyScore),
        similarity: Math.min(100, similarityScore),
        recency: Math.min(100, recencyScore),
    };
    const confidenceScore = Math.max(
        35,
        Math.min(
            92,
            Math.round((confidenceBreakdown.dataCoverage + confidenceBreakdown.locationAccuracy + confidenceBreakdown.similarity + confidenceBreakdown.recency) / 4)
        )
    );
    const historyKey = `${operationType}|${propertyType}|${input.regionId}|${input.communeId}`;
    const historicalSeries = feedState.historyBySegment[historyKey] ?? [];
    const marketTrendPct30d = historicalSeries.length >= 2
        ? Math.round((((historicalSeries[historicalSeries.length - 1].medianPricePerM2 ?? 0) - (historicalSeries[historicalSeries.length - 2].medianPricePerM2 ?? 0))
            / ((historicalSeries[historicalSeries.length - 2].medianPricePerM2 ?? 1) || 1)) * 10000) / 100
        : null;
    const estimatedLiquidityDays = operationType === 'sale'
        ? Math.max(28, 110 - comparables.length * 5 - Math.round((confidenceScore - 40) * 0.6))
        : Math.max(12, 48 - comparables.length * 3 - Math.round((confidenceScore - 40) * 0.35));

    const notes = [
        comparables.length > 0
            ? `Se consideraron ${comparables.length} comparables combinando publicaciones internas y feeds externos de la misma comuna.`
            : 'No hubo comparables suficientes; se aplicó una base tipológica ajustada.',
        operationType === 'sale'
            ? 'La estimación de venta se expresa en UF para mantener consistencia con publicaciones residenciales.'
            : 'La estimación de arriendo se expresa en CLP mensuales.',
        'La confianza mejora con geocodificación exacta, más fuentes integradas y comparables cerrados por sector.',
    ];

    return {
        engineVersion: 'v2',
        currency: targetCurrency,
        minPrice: Math.round(estimatedPrice * (1 - variance)),
        estimatedPrice: Math.round(estimatedPrice),
        maxPrice: Math.round(estimatedPrice * (1 + variance)),
        estimatedPricePerM2: Math.round(estimatedPricePerM2 * 100) / 100,
        confidenceScore,
        confidenceBreakdown,
        comparablesUsed: comparables.length,
        comparables,
        sourceBreakdown,
        historicalSeries,
        estimatedLiquidityDays,
        marketTrendPct30d,
        notes,
    };
}

function estimateVehicleValuation(input: z.infer<typeof vehicleValuationRequestSchema>) {
    const operationType = input.operationType;
    const vehicleType = normalizeVehicleType(input.vehicleType);
    const brand = normalizeVehicleSlug(input.brand);
    const model = normalizeVehicleSlug(input.model);
    const version = normalizeVehicleSlug(input.version);
    const targetCurrency = 'CLP';
    const feedState = getVehicleValuationFeedState();
    const targetLocation = geocodeListingLocation({
        sourceMode: 'custom',
        sourceAddressId: null,
        countryCode: 'CL',
        regionId: input.regionId,
        regionName: null,
        communeId: input.communeId,
        communeName: null,
        neighborhood: null,
        addressLine1: input.addressLine1,
        addressLine2: null,
        postalCode: null,
        geoPoint: makeGeoPoint(null, null, 'none'),
        visibilityMode: 'exact',
        publicMapEnabled: true,
        publicGeoPoint: makeGeoPoint(null, null, 'none'),
        publicLabel: '',
    });

    const internalComparables = Array.from(listingsById.values())
        .map((record) => extractVehicleComparable(record, operationType, targetLocation.geoPoint))
        .filter((item): item is VehicleValuationComparable => Boolean(item))
        .filter((item) => item.currency === targetCurrency)
        .filter((item) => item.vehicleType === vehicleType)
        .filter((item) => item.brand === brand && item.model === model);

    const feedComparables = feedState.records
        .filter((record) => record.operationType === operationType)
        .filter((record) => record.currency === targetCurrency)
        .filter((record) => record.vehicleType === vehicleType)
        .filter((record) => record.brand === brand && record.model === model)
        .map((record) => {
            const feedLocation = geocodeListingLocation({
                sourceMode: 'custom',
                sourceAddressId: null,
                countryCode: 'CL',
                regionId: record.regionId,
                regionName: null,
                communeId: record.communeId,
                communeName: null,
                neighborhood: null,
                addressLine1: record.addressLabel,
                addressLine2: null,
                postalCode: null,
                geoPoint: makeGeoPoint(null, null, 'none'),
                visibilityMode: 'exact',
                publicMapEnabled: true,
                publicGeoPoint: makeGeoPoint(null, null, 'none'),
                publicLabel: record.addressLabel || '',
            });

            return {
                source: record.source,
                externalId: record.id,
                title: record.title,
                price: record.price,
                currency: record.currency,
                operationType: record.operationType,
                vehicleType: record.vehicleType,
                brand: record.brand,
                model: record.model,
                version: record.version,
                year: record.year,
                mileageKm: record.mileageKm,
                fuelType: record.fuelType,
                transmission: record.transmission,
                bodyType: record.bodyType,
                regionId: record.regionId,
                communeId: record.communeId,
                addressLabel: record.addressLabel,
                distanceKm: haversineDistanceKm(targetLocation.geoPoint, feedLocation.geoPoint),
                publishedAt: record.publishedAt,
                url: record.url,
            } satisfies VehicleValuationComparable;
        });

    const comparables = [...internalComparables, ...feedComparables]
        .sort((a, b) => {
            const scoreA =
                Math.abs((a.year ?? input.year) - input.year) * 5
                + Math.abs((a.mileageKm ?? input.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 10_000
                + (a.distanceKm ?? 20) * 1.8
                + (a.regionId === input.regionId ? 0 : 6)
                + (a.communeId === input.communeId ? 0 : 4)
                - (normalizeVehicleSlug(a.version) === version && version ? 4 : 0)
                - (asString(a.fuelType).toLowerCase() === asString(input.fuelType).toLowerCase() && input.fuelType ? 2 : 0)
                - (asString(a.transmission).toLowerCase() === asString(input.transmission).toLowerCase() && input.transmission ? 2 : 0)
                - (asString(a.bodyType).toLowerCase() === asString(input.bodyType).toLowerCase() && input.bodyType ? 1 : 0);
            const scoreB =
                Math.abs((b.year ?? input.year) - input.year) * 5
                + Math.abs((b.mileageKm ?? input.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 10_000
                + (b.distanceKm ?? 20) * 1.8
                + (b.regionId === input.regionId ? 0 : 6)
                + (b.communeId === input.communeId ? 0 : 4)
                - (normalizeVehicleSlug(b.version) === version && version ? 4 : 0)
                - (asString(b.fuelType).toLowerCase() === asString(input.fuelType).toLowerCase() && input.fuelType ? 2 : 0)
                - (asString(b.transmission).toLowerCase() === asString(input.transmission).toLowerCase() && input.transmission ? 2 : 0)
                - (asString(b.bodyType).toLowerCase() === asString(input.bodyType).toLowerCase() && input.bodyType ? 1 : 0);
            return scoreA - scoreB;
        })
        .slice(0, 10);

    const weightedComparablePrice = comparables.length > 0
        ? comparables.reduce((sum, item) => {
            const yearPenalty = Math.abs((item.year ?? input.year) - input.year) * 0.035;
            const mileagePenalty = Math.abs((item.mileageKm ?? input.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 220_000;
            const distancePenalty = (item.distanceKm ?? 12) / 40;
            const weight = Math.max(0.15, 1.3 - yearPenalty - mileagePenalty - distancePenalty);
            return sum + item.price * weight;
        }, 0) / comparables.reduce((sum, item) => {
            const yearPenalty = Math.abs((item.year ?? input.year) - input.year) * 0.035;
            const mileagePenalty = Math.abs((item.mileageKm ?? input.mileageKm ?? 0) - (input.mileageKm ?? 0)) / 220_000;
            const distancePenalty = (item.distanceKm ?? 12) / 40;
            return sum + Math.max(0.15, 1.3 - yearPenalty - mileagePenalty - distancePenalty);
        }, 0)
        : null;

    const ageYears = Math.max(0, new Date().getFullYear() - input.year);
    const baseline = operationType === 'sale' ? saleBaselineVehiclePrice(vehicleType) : rentBaselineVehiclePrice(vehicleType);
    const yearFactor = operationType === 'sale'
        ? Math.max(0.35, 1 - ageYears * 0.055)
        : Math.max(0.45, 1 - ageYears * 0.03);
    const mileageFactor = input.mileageKm != null
        ? Math.max(0.72, 1 - Math.min(input.mileageKm, 280_000) / 520_000)
        : 1;
    const conditionFactor = conditionAdjustmentFactor(input.condition);
    const estimatedPrice = Math.round((weightedComparablePrice ?? baseline * yearFactor * mileageFactor * conditionFactor) * (weightedComparablePrice ? conditionFactor : 1));
    const variance = comparables.length >= 5 ? 0.08 : comparables.length >= 2 ? 0.13 : 0.2;
    const sourceCounts = new Map<string, number>();
    for (const comparable of comparables) {
        sourceCounts.set(comparable.source, (sourceCounts.get(comparable.source) ?? 0) + 1);
    }
    const totalComparables = comparables.length || 1;
    const sourceBreakdown: ValuationSourceBreakdown[] = Array.from(sourceCounts.entries()).map(([source, count]) => ({
        source,
        comparables: count,
        weight: Math.round((count / totalComparables) * 100) / 100,
        freshnessDays: Math.min(
            ...comparables
                .filter((item) => item.source === source)
                .map((item) => daysSince(item.publishedAt) ?? 999)
        ),
    }));
    const confidenceBreakdown: ValuationConfidenceBreakdown = {
        dataCoverage: Math.min(100, comparables.length * 10 + sourceBreakdown.length * 10),
        locationAccuracy: targetLocation.geoPoint.precision === 'exact' ? 90 : targetLocation.geoPoint.precision === 'approximate' ? 72 : 48,
        similarity: Math.min(100, 42 + comparables.length * 6 + (version ? 8 : 0) + (input.fuelType ? 6 : 0) + (input.transmission ? 6 : 0)),
        recency: Math.max(32, 100 - Math.round((comparables.reduce((sum, item) => sum + (daysSince(item.publishedAt) ?? 90), 0) / (comparables.length || 1)) * 0.8)),
    };
    const confidenceScore = Math.max(
        35,
        Math.min(
            93,
            Math.round((confidenceBreakdown.dataCoverage + confidenceBreakdown.locationAccuracy + confidenceBreakdown.similarity + confidenceBreakdown.recency) / 4)
        )
    );
    const historyKey = `${operationType}|${vehicleType}|${brand}|${model}|${input.regionId}|${input.communeId}`;
    const historicalSeries = feedState.historyBySegment[historyKey] ?? [];
    const marketTrendPct30d = historicalSeries.length >= 2
        ? Math.round((((historicalSeries[historicalSeries.length - 1].medianPrice) - (historicalSeries[historicalSeries.length - 2].medianPrice))
            / ((historicalSeries[historicalSeries.length - 2].medianPrice || 1))) * 10000) / 100
        : null;
    const estimatedLiquidityDays = operationType === 'sale'
        ? Math.max(18, 74 - comparables.length * 4 - Math.round((confidenceScore - 40) * 0.35))
        : Math.max(5, 28 - comparables.length * 2 - Math.round((confidenceScore - 40) * 0.18));
    const notes = [
        comparables.length > 0
            ? `Se consideraron ${comparables.length} comparables combinando avisos del marketplace y fuentes externas del segmento.`
            : 'No hubo comparables suficientes; se aplicó una referencia base ajustada por año, kilometraje y condición.',
        'La confianza mejora cuando coinciden versión, transmisión, combustible y ubicación del vehículo.',
        'Esta referencia orienta el precio de mercado, pero no reemplaza una tasación comercial ni garantiza el cierre.',
    ];

    return {
        engineVersion: 'v2',
        currency: targetCurrency,
        minPrice: Math.round(estimatedPrice * (1 - variance)),
        estimatedPrice,
        maxPrice: Math.round(estimatedPrice * (1 + variance)),
        confidenceScore,
        confidenceBreakdown,
        comparablesUsed: comparables.length,
        comparables,
        sourceBreakdown,
        historicalSeries,
        estimatedLiquidityDays,
        marketTrendPct30d,
        notes,
    };
}

function getPortalSyncView(record: ListingRecord, portal: PortalKey) {
    const existing = record.integrations[portal];
    const coverage = getPortalCoverage(record, portal);

    let status: PortalSyncStatus = coverage.missingRequired.length === 0 ? 'ready' : 'missing';
    let lastError: string | null = null;

    if (existing?.status === 'published') {
        status = 'published';
    } else if (existing?.status === 'failed') {
        status = 'failed';
        lastError = existing.lastError ?? null;
    }

    return {
        portal,
        label: getPortalLabel(record.vertical, portal),
        status,
        missingRequired: coverage.missingRequired,
        missingRecommended: coverage.missingRecommended,
        publishedAt: existing?.publishedAt ?? null,
        externalId: existing?.externalId ?? null,
        lastError,
    };
}

function listingToResponse(record: ListingRecord) {
    const integrations = getAvailablePortals(record.vertical).map((portal) => getPortalSyncView(record, portal));
    const publicationLifecycle = evaluatePublicationLifecycle(
        getPublicationLifecyclePolicy(record.vertical === 'autos' ? 'simpleautos' : 'simplepropiedades', record.section),
        record.status,
        record.updatedAt
    );
    return {
        id: record.id,
        accountId: record.accountId,
        vertical: record.vertical,
        section: record.section,
        title: record.title,
        description: record.description,
        price: record.price,
        status: record.status,
        views: record.views,
        favs: record.favs,
        leads: record.leads,
        days: listingAgeDays(record.createdAt),
        href: record.href,
        location: record.location,
        locationData: record.locationData,
        updatedAt: record.updatedAt,
        publicationLifecycle,
        integrations,
        rawData: normalizeListingRawDataForResponse(record.rawData ?? null),
    };
}

function listingToDetailResponse(record: ListingRecord) {
    return {
        ...listingToResponse(record),
        rawData: normalizeListingRawDataForResponse(record.rawData ?? null),
    };
}

function paymentOrderToResponse(order: PaymentOrderRecord) {
    return {
        id: order.id,
        accountId: order.accountId,
        vertical: order.vertical,
        kind: order.kind,
        title: order.title,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        providerStatus: order.providerStatus,
        providerReferenceId: order.providerReferenceId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        appliedAt: order.appliedAt,
        appliedResourceId: order.appliedResourceId,
        metadata: order.metadata,
    };
}

function activeSubscriptionToResponse(subscription: ActiveSubscription | null) {
    if (!subscription) return null;
    return {
        id: subscription.id,
        accountId: subscription.accountId,
        vertical: subscription.vertical,
        planId: subscription.planId,
        planName: subscription.planName,
        priceMonthly: subscription.priceMonthly,
        currency: subscription.currency,
        features: subscription.features,
        status: subscription.status,
        providerStatus: subscription.providerStatus,
        startedAt: subscription.startedAt,
        updatedAt: subscription.updatedAt,
    };
}

function upsertBoostListingFromListing(listing: ListingRecord): void {
    const summary = extractListingSummary(listing);
    const subtitle = summary.join(' • ');
    const imageUrls = extractListingMediaUrls(listing);
    const existing = boostListingsSeed.find((item) => item.id === listing.id && item.vertical === listing.vertical);
    if (existing) {
        existing.title = listing.title;
        existing.subtitle = subtitle;
        existing.price = listing.price;
        existing.location = listing.location || existing.location;
        existing.section = listing.section;
        existing.href = listing.href;
        existing.imageUrl = imageUrls[0] || existing.imageUrl;
        existing.imageUrls = imageUrls;
        return;
    }

    boostListingsSeed.unshift({
        id: listing.id,
        vertical: listing.vertical,
        section: listing.section,
        ownerId: listing.ownerId,
        href: listing.href,
        title: listing.title,
        subtitle,
        price: listing.price,
        location: listing.location || '',
        imageUrl: imageUrls[0],
        imageUrls,
    });
}

const listingIdsByUser = new Map<string, string[]>();
const authRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let passwordResetTransporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function sanitizeUser(user: AppUser): PublicUser {
    const runtimeUser = applyRuntimeRole(user);
    return {
        id: runtimeUser.id,
        email: runtimeUser.email,
        name: runtimeUser.name,
        phone: runtimeUser.phone ?? null,
        role: runtimeUser.role,
        status: runtimeUser.status,
        primaryVertical: runtimeUser.primaryVertical ?? null,
        avatar: runtimeUser.avatar,
        provider: runtimeUser.provider,
        lastLoginAt: runtimeUser.lastLoginAt ?? null,
        primaryAccountId: runtimeUser.primaryAccountId ?? defaultAccountIdByUserId.get(runtimeUser.id) ?? null,
    };
}

function localDevForcesSuperadmin(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_FORCE_SUPERADMIN !== 'false';
}

function applyRuntimeRole(user: AppUser): AppUser {
    if (!localDevForcesSuperadmin()) return user;
    if (user.role === 'superadmin') return user;
    return {
        ...user,
        role: 'superadmin',
    };
}

function mapAccountRow(account: typeof accounts.$inferSelect): AccountRecord {
    return {
        id: account.id,
        name: account.name,
        type: account.type as AccountType,
        ownerUserId: account.ownerUserId,
        isPersonal: Boolean(account.isPersonal),
        createdAt: account.createdAt.getTime(),
        updatedAt: account.updatedAt.getTime(),
    };
}

function mapAccountUserRow(membership: typeof accountUsers.$inferSelect): AccountUserRecord {
    return {
        id: membership.id,
        accountId: membership.accountId,
        userId: membership.userId,
        role: membership.role as AccountRole,
        isDefault: Boolean(membership.isDefault),
        createdAt: membership.createdAt.getTime(),
        updatedAt: membership.updatedAt.getTime(),
    };
}

function upsertAccountCache(account: AccountRecord): AccountRecord {
    accountsById.set(account.id, account);
    return account;
}

function upsertAccountUserCache(membership: AccountUserRecord): AccountUserRecord {
    const current = accountUsersByUserId.get(membership.userId) ?? [];
    const next = [membership, ...current.filter((item) => item.id !== membership.id)];
    accountUsersByUserId.set(membership.userId, next);
    if (membership.isDefault) {
        defaultAccountIdByUserId.set(membership.userId, membership.accountId);
        const existingUser = usersById.get(membership.userId);
        if (existingUser) {
            usersById.set(membership.userId, {
                ...existingUser,
                primaryAccountId: membership.accountId,
            });
        }
    }
    return membership;
}

function getAccountMembershipsForUser(userId: string): AccountUserRecord[] {
    return [...(accountUsersByUserId.get(userId) ?? [])];
}

function getPrimaryAccountIdForUserSync(userId: string): string | null {
    return defaultAccountIdByUserId.get(userId) ?? null;
}

async function getPrimaryAccountIdForUser(userId: string): Promise<string | null> {
    const cached = getPrimaryAccountIdForUserSync(userId);
    if (cached) return cached;

    const membershipRows = await db
        .select()
        .from(accountUsers)
        .where(eq(accountUsers.userId, userId))
        .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt))
        .limit(1);

    const membership = membershipRows[0] ? upsertAccountUserCache(mapAccountUserRow(membershipRows[0])) : null;
    return membership?.accountId ?? null;
}

function buildPersonalAccountName(user: Pick<AppUser, 'name' | 'email'>): string {
    return user.name.trim() || user.email.split('@')[0] || 'Cuenta personal';
}

async function ensurePrimaryAccountForUser(user: AppUser, accountType: AccountType = 'general'): Promise<AccountRecord> {
    const existingId = await getPrimaryAccountIdForUser(user.id);
    if (existingId) {
        const existing = accountsById.get(existingId);
        if (existing) return existing;

        const rows = await db.select().from(accounts).where(eq(accounts.id, existingId)).limit(1);
        if (rows[0]) {
            return upsertAccountCache(mapAccountRow(rows[0]));
        }
    }

    const now = new Date();
    const [accountRow] = await db.insert(accounts).values({
        name: buildPersonalAccountName(user),
        type: accountType,
        ownerUserId: user.id,
        isPersonal: true,
        createdAt: now,
        updatedAt: now,
    }).returning();
    const account = upsertAccountCache(mapAccountRow(accountRow));

    const [membershipRow] = await db.insert(accountUsers).values({
        accountId: account.id,
        userId: user.id,
        role: 'owner',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    }).returning();
    upsertAccountUserCache(mapAccountUserRow(membershipRow));

    return account;
}

function mapUserRowToAppUser(user: typeof users.$inferSelect): AppUser {
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash ?? undefined,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        primaryVertical: (user.primaryVertical as VerticalType | null | undefined) ?? null,
        avatar: user.avatarUrl ?? undefined,
        provider: user.provider ?? undefined,
        providerId: user.providerId ?? undefined,
        lastLoginAt: user.lastLoginAt ?? null,
        primaryAccountId: defaultAccountIdByUserId.get(user.id) ?? null,
    };
}

function mapInstagramAccountRow(account: typeof instagramAccounts.$inferSelect): InstagramAccountRecord {
    return {
        id: account.id,
        accountId: account.accountId ?? null,
        userId: account.userId,
        vertical: account.vertical as VerticalType,
        instagramUserId: account.instagramUserId,
        username: account.username,
        displayName: account.displayName ?? null,
        accountType: account.accountType ?? null,
        profilePictureUrl: account.profilePictureUrl ?? null,
        accessToken: account.accessToken,
        tokenExpiresAt: account.tokenExpiresAt?.getTime() ?? null,
        scopes: Array.isArray(account.scopes) ? account.scopes.map((item) => asString(item)).filter(Boolean) : [],
        autoPublishEnabled: Boolean(account.autoPublishEnabled),
        captionTemplate: account.captionTemplate ?? null,
        status: account.status as InstagramAccountStatus,
        lastSyncedAt: account.lastSyncedAt?.getTime() ?? null,
        lastPublishedAt: account.lastPublishedAt?.getTime() ?? null,
        lastError: account.lastError ?? null,
        createdAt: account.createdAt.getTime(),
        updatedAt: account.updatedAt.getTime(),
    };
}

function mapInstagramPublicationRow(publication: typeof instagramPublications.$inferSelect): InstagramPublicationRecord {
    return {
        id: publication.id,
        accountId: publication.accountId ?? null,
        userId: publication.userId,
        instagramAccountId: publication.instagramAccountId,
        vertical: publication.vertical as VerticalType,
        listingId: publication.listingId,
        listingTitle: publication.listingTitle,
        instagramMediaId: publication.instagramMediaId ?? null,
        instagramPermalink: publication.instagramPermalink ?? null,
        caption: publication.caption,
        imageUrl: publication.imageUrl,
        status: publication.status as InstagramPublicationStatus,
        errorMessage: publication.errorMessage ?? null,
        sourceUpdatedAt: publication.sourceUpdatedAt?.getTime() ?? null,
        publishedAt: publication.publishedAt?.getTime() ?? null,
        createdAt: publication.createdAt.getTime(),
        updatedAt: publication.updatedAt.getTime(),
    };
}

function mapPublicProfileRow(profile: typeof publicProfiles.$inferSelect): PublicProfileRecord {
    return {
        id: profile.id,
        accountId: profile.accountId ?? null,
        userId: profile.userId,
        vertical: profile.vertical as VerticalType,
        slug: profile.slug,
        isPublished: Boolean(profile.isPublished),
        accountKind: profile.accountKind as PublicProfileAccountKind,
        leadRoutingMode: (profile.leadRoutingMode as PublicProfileLeadRoutingMode) ?? 'round_robin',
        leadRoutingCursor: profile.leadRoutingCursor ?? 0,
        displayName: profile.displayName,
        headline: profile.headline ?? null,
        bio: profile.bio ?? null,
        companyName: profile.companyName ?? null,
        website: profile.website ?? null,
        publicEmail: profile.publicEmail ?? null,
        publicPhone: profile.publicPhone ?? null,
        publicWhatsapp: profile.publicWhatsapp ?? null,
        addressLine: profile.addressLine ?? null,
        city: profile.city ?? null,
        region: profile.region ?? null,
        coverImageUrl: profile.coverImageUrl ?? null,
        avatarImageUrl: profile.avatarImageUrl ?? null,
        socialLinks: normalizePublicProfileSocialLinks(profile.socialLinks),
        businessHours: normalizePublicProfileBusinessHours(profile.businessHours),
        specialties: Array.isArray(profile.specialties) ? profile.specialties.map((item) => asString(item)).filter(Boolean) : [],
        scheduleNote: profile.scheduleNote ?? null,
        alwaysOpen: Boolean(profile.alwaysOpen),
        createdAt: profile.createdAt.getTime(),
        updatedAt: profile.updatedAt.getTime(),
    };
}

function mapPublicProfileTeamMemberRow(member: typeof publicProfileTeamMembers.$inferSelect): PublicProfileTeamMemberRecord {
    return {
        id: member.id,
        userId: member.userId,
        vertical: member.vertical as VerticalType,
        name: member.name,
        roleTitle: member.roleTitle ?? null,
        bio: member.bio ?? null,
        email: member.email ?? null,
        phone: member.phone ?? null,
        whatsapp: member.whatsapp ?? null,
        avatarImageUrl: member.avatarImageUrl ?? null,
        socialLinks: normalizePublicProfileTeamSocialLinks(member.socialLinks),
        specialties: normalizePublicProfileTeamMemberSpecialties(member.specialties),
        isLeadContact: Boolean(member.isLeadContact),
        receivesLeads: Boolean(member.receivesLeads),
        isPublished: Boolean(member.isPublished),
        position: member.position,
        createdAt: member.createdAt.getTime(),
        updatedAt: member.updatedAt.getTime(),
    };
}

function upsertPublicProfileCache(record: PublicProfileRecord): PublicProfileRecord {
    publicProfilesByUserVertical.set(publicProfileUserVerticalKey(record.userId, record.vertical), record);
    publicProfilesByVerticalSlug.set(publicProfileVerticalSlugKey(record.vertical, record.slug), record);
    return record;
}

function upsertPublicProfileTeamMemberCache(record: PublicProfileTeamMemberRecord): PublicProfileTeamMemberRecord {
    const key = publicProfileUserVerticalKey(record.userId, record.vertical);
    const current = publicProfileTeamMembersByUserVertical.get(key) ?? [];
    const next = current.filter((item) => item.id !== record.id);
    next.push(record);
    next.sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
    publicProfileTeamMembersByUserVertical.set(key, next);
    return record;
}

function replacePublicProfileTeamMemberCache(userId: string, vertical: VerticalType, items: PublicProfileTeamMemberRecord[]) {
    const key = publicProfileUserVerticalKey(userId, vertical);
    publicProfileTeamMembersByUserVertical.set(
        key,
        [...items].sort((left, right) => left.position - right.position || left.createdAt - right.createdAt)
    );
}

function getPublicProfileRecord(userId: string, vertical: VerticalType): PublicProfileRecord | null {
    return publicProfilesByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? null;
}

function getPublicProfileTeamMembers(userId: string, vertical: VerticalType): PublicProfileTeamMemberRecord[] {
    return (publicProfileTeamMembersByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? [])
        .filter((item) => item.isPublished)
        .sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
}

function getEditablePublicProfileTeamMembers(userId: string, vertical: VerticalType): PublicProfileTeamMemberRecord[] {
    return (publicProfileTeamMembersByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? [])
        .slice()
        .sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
}

function getPublishedPublicProfileBySlug(vertical: VerticalType, slug: string): PublicProfileRecord | null {
    const record = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, slug)) ?? null;
    if (!record || !record.isPublished) return null;
    return record;
}

function mapAdCampaignRow(campaign: typeof adCampaigns.$inferSelect): AdCampaignRecord {
    return {
        id: campaign.id,
        accountId: campaign.accountId ?? null,
        userId: campaign.userId,
        vertical: campaign.vertical as VerticalType,
        name: campaign.name,
        format: campaign.format as AdFormat,
        status: campaign.status as AdStatus,
        paymentStatus: campaign.paymentStatus as AdPaymentStatus,
        destinationType: campaign.destinationType as AdDestinationType,
        destinationUrl: campaign.destinationUrl ?? null,
        listingHref: campaign.listingHref ?? null,
        profileSlug: campaign.profileSlug ?? null,
        desktopImageDataUrl: campaign.desktopImageDataUrl,
        mobileImageDataUrl: campaign.mobileImageDataUrl ?? null,
        overlayEnabled: campaign.overlayEnabled,
        overlayTitle: campaign.overlayTitle ?? null,
        overlaySubtitle: campaign.overlaySubtitle ?? null,
        overlayCta: campaign.overlayCta ?? null,
        overlayAlign: campaign.overlayAlign as AdOverlayAlign,
        placementSection: (campaign.placementSection as AdPlacementSection | null) ?? null,
        startAt: campaign.startAt.getTime(),
        endAt: campaign.endAt.getTime(),
        durationDays: campaign.durationDays as AdDurationDays,
        paidAt: campaign.paidAt?.getTime() ?? null,
        createdAt: campaign.createdAt.getTime(),
        updatedAt: campaign.updatedAt.getTime(),
    };
}

function mapPipelineColumnRow(column: typeof crmPipelineColumns.$inferSelect): PipelineColumnRecord {
    return {
        id: column.id,
        accountId: column.accountId ?? null,
        userId: column.userId,
        vertical: column.vertical as VerticalType,
        scope: column.scope as PipelineColumnScope,
        name: column.name,
        status: column.status as ListingLeadStatus,
        position: column.position,
        createdAt: column.createdAt.getTime(),
        updatedAt: column.updatedAt.getTime(),
    };
}

function mapServiceLeadRow(lead: typeof serviceLeads.$inferSelect): ServiceLeadRecord {
    return {
        id: lead.id,
        accountId: lead.accountId ?? null,
        userId: lead.userId ?? null,
        entityType: 'service',
        entityId: lead.id,
        vertical: lead.vertical as VerticalType,
        serviceType: lead.serviceType as ServiceLeadType,
        planId: lead.planId as ServiceLeadPlanId,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        contactWhatsapp: lead.contactWhatsapp ?? null,
        locationLabel: lead.locationLabel ?? null,
        assetType: lead.assetType ?? null,
        assetBrand: lead.assetBrand ?? null,
        assetModel: lead.assetModel ?? null,
        assetYear: lead.assetYear ?? null,
        assetMileage: lead.assetMileage ?? null,
        assetArea: lead.assetArea ?? null,
        expectedPrice: lead.expectedPrice ?? null,
        notes: lead.notes ?? null,
        status: lead.status as ServiceLeadStatus,
        priority: lead.priority as LeadPriority,
        closeReason: lead.closeReason ?? null,
        tags: Array.isArray(lead.tags) ? lead.tags.filter((item): item is string => typeof item === 'string') : [],
        assignedToUserId: lead.assignedToUserId ?? null,
        nextTaskTitle: lead.nextTaskTitle ?? null,
        nextTaskAt: lead.nextTaskAt?.getTime() ?? null,
        sourcePage: lead.sourcePage ?? null,
        lastActivityAt: lead.lastActivityAt?.getTime() ?? lead.updatedAt.getTime(),
        createdAt: lead.createdAt.getTime(),
        updatedAt: lead.updatedAt.getTime(),
    };
}

function mapServiceLeadActivityRow(activity: typeof serviceLeadActivities.$inferSelect): ServiceLeadActivityRecord {
    return {
        id: activity.id,
        leadId: activity.leadId,
        actorUserId: activity.actorUserId ?? null,
        type: activity.type as ServiceLeadActivityType,
        body: activity.body,
        meta: (activity.meta as Record<string, unknown> | null) ?? null,
        createdAt: activity.createdAt.getTime(),
    };
}

function mapListingLeadRow(lead: typeof listingLeads.$inferSelect): ListingLeadRecord {
    return {
        id: lead.id,
        accountId: lead.accountId ?? null,
        listingId: lead.listingId,
        entityType: 'listing',
        entityId: lead.listingId,
        ownerUserId: lead.ownerUserId,
        buyerUserId: lead.buyerUserId ?? null,
        vertical: lead.vertical as VerticalType,
        source: lead.source as ListingLeadSource,
        channel: lead.channel as ListingLeadChannel,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone ?? null,
        contactWhatsapp: lead.contactWhatsapp ?? null,
        message: lead.message ?? null,
        status: lead.status as ListingLeadStatus,
        priority: lead.priority as LeadPriority,
        closeReason: lead.closeReason ?? null,
        tags: Array.isArray(lead.tags) ? lead.tags.filter((item): item is string => typeof item === 'string') : [],
        assignedToUserId: lead.assignedToUserId ?? null,
        assignedToTeamMemberId: lead.assignedToTeamMemberId ?? null,
        pipelineColumnId: lead.pipelineColumnId ?? null,
        nextTaskTitle: lead.nextTaskTitle ?? null,
        nextTaskAt: lead.nextTaskAt?.getTime() ?? null,
        sourcePage: lead.sourcePage ?? null,
        externalSourceId: lead.externalSourceId ?? null,
        lastActivityAt: lead.lastActivityAt?.getTime() ?? lead.updatedAt.getTime(),
        createdAt: lead.createdAt.getTime(),
        updatedAt: lead.updatedAt.getTime(),
    };
}

function mapListingLeadActivityRow(activity: typeof listingLeadActivities.$inferSelect): ListingLeadActivityRecord {
    return {
        id: activity.id,
        leadId: activity.leadId,
        actorUserId: activity.actorUserId ?? null,
        type: activity.type as ListingLeadActivityType,
        body: activity.body,
        meta: (activity.meta as Record<string, unknown> | null) ?? null,
        createdAt: activity.createdAt.getTime(),
    };
}

function mapMessageThreadRow(thread: typeof messageThreads.$inferSelect): MessageThreadRecord {
    return {
        id: thread.id,
        accountId: thread.accountId ?? null,
        vertical: thread.vertical as VerticalType,
        listingId: thread.listingId,
        ownerUserId: thread.ownerUserId,
        buyerUserId: thread.buyerUserId,
        leadId: thread.leadId,
        ownerUnreadCount: thread.ownerUnreadCount,
        buyerUnreadCount: thread.buyerUnreadCount,
        ownerArchivedAt: thread.ownerArchivedAt?.getTime() ?? null,
        buyerArchivedAt: thread.buyerArchivedAt?.getTime() ?? null,
        ownerSpamAt: thread.ownerSpamAt?.getTime() ?? null,
        buyerSpamAt: thread.buyerSpamAt?.getTime() ?? null,
        lastMessageAt: thread.lastMessageAt.getTime(),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime(),
    };
}

function mapMessageEntryRow(entry: typeof messageEntries.$inferSelect): MessageEntryRecord {
    return {
        id: entry.id,
        threadId: entry.threadId,
        senderUserId: entry.senderUserId,
        senderRole: entry.senderRole as MessageSenderRole,
        body: entry.body,
        createdAt: entry.createdAt.getTime(),
    };
}

async function getUserByEmail(email: string): Promise<AppUser | undefined> {
    const normalized = email.trim().toLowerCase();
    const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (result.length === 0) return undefined;
    return mapUserRowToAppUser(result[0]);
}

function canAuthenticateUser(user: AppUser): boolean {
    return user.status !== 'suspended';
}

async function touchUserLastLoginAt(userId: string): Promise<void> {
    await db.update(users).set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(users.id, userId));
}

function getClientIdentifier(c: Context): string {
    const forwarded = asString(c.req.header('x-forwarded-for'));
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
    return asString(c.req.header('x-real-ip')) || 'unknown';
}

function consumeRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = authRateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
        authRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfterSeconds: 0 };
    }
    if (current.count >= limit) {
        return {
            ok: false,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
    }
    current.count += 1;
    authRateLimitBuckets.set(key, current);
    return { ok: true, retryAfterSeconds: 0 };
}

function clearRateLimit(key: string): void {
    authRateLimitBuckets.delete(key);
}

function safeEqualStrings(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
}

function hashOpaqueToken(token: string): string {
    return createHash('sha256').update(`${SESSION_SECRET}:${token}`).digest('hex');
}

function isLocalOrigin(origin: string): boolean {
    return /^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin);
}

function isAllowedBrowserOrigin(origin: string): boolean {
    if (!origin) return false;
    if (allowedOrigins.has(origin)) return true;
    return process.env.NODE_ENV !== 'production' && isLocalOrigin(origin);
}

function resolveBrowserOrigin(c: Context): string | null {
    const origin = asString(c.req.header('origin'));
    if (origin && isAllowedBrowserOrigin(origin)) return origin;

    const referer = asString(c.req.header('referer'));
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (isAllowedBrowserOrigin(refererOrigin)) return refererOrigin;
        } catch {
            // Ignore malformed referer headers.
        }
    }

    return process.env.NODE_ENV === 'production' ? null : defaultOrigin;
}

function sanitizeBrowserReturnUrl(rawReturnUrl: string, fallbackOrigin: string): string {
    try {
        const target = new URL(rawReturnUrl);
        if (!isAllowedBrowserOrigin(target.origin)) {
            return fallbackOrigin;
        }
        target.hash = target.hash || '#integraciones';
        return target.toString();
    } catch {
        return fallbackOrigin;
    }
}

function buildGoogleRedirectUri(origin: string): string {
    return `${origin}/auth/google/callback`;
}

function buildPasswordResetUrl(origin: string, token: string): string {
    return `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

function buildEmailVerificationUrl(origin: string, token: string): string {
    return `${origin}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

type AuthBrandProfile = {
    appName: string;
    productName: string;
    accent: string;
    accentSoft: string;
    surface: string;
    title: string;
    supportLabel: string;
    supportEmail: string;
};

function getAuthBrandProfile(origin: string): AuthBrandProfile {
    const host = new URL(origin).hostname.toLowerCase();
    if (host.includes('simpleautos')) {
        return {
            appName: 'SimpleAutos',
            productName: 'Simple',
            accent: '#ff5a2f',
            accentSoft: '#fff1eb',
            surface: '#10141d',
            title: 'SimpleAutos',
            supportLabel: 'equipo SimpleAutos',
            supportEmail: 'soporte@simpleautos.app',
        };
    }
    if (host.includes('simplepropiedades')) {
        return {
            appName: 'SimplePropiedades',
            productName: 'Simple',
            accent: '#2563eb',
            accentSoft: '#eff6ff',
            surface: '#0f172a',
            title: 'SimplePropiedades',
            supportLabel: 'equipo SimplePropiedades',
            supportEmail: 'soporte@simplepropiedades.app',
        };
    }
    if (host.includes('simpleagenda')) {
        return {
            appName: 'SimpleAgenda',
            productName: 'Simple',
            accent: '#0d9488',
            accentSoft: '#f0fdfa',
            surface: '#0f1a19',
            title: 'SimpleAgenda',
            supportLabel: 'equipo SimpleAgenda',
            supportEmail: 'soporte@simpleagenda.app',
        };
    }
    if (host.includes('admin.simpleplataforma.app')) {
        return {
            appName: 'SimpleAdmin',
            productName: 'Simple',
            accent: '#111827',
            accentSoft: '#f3f4f6',
            surface: '#111827',
            title: 'SimpleAdmin',
            supportLabel: 'equipo SimpleAdmin',
            supportEmail: 'soporte@simpleplataforma.app',
        };
    }
    return {
        appName: 'SimplePlataforma',
        productName: 'Simple',
        accent: '#0f172a',
        accentSoft: '#eff6ff',
        surface: '#0f172a',
        title: 'SimplePlataforma',
        supportLabel: 'equipo Simple',
        supportEmail: 'soporte@simpleplataforma.app',
    };
}

function isAuthEmailConfigured(): boolean {
    return Boolean(asString(process.env.SMTP_HOST) && asString(process.env.SMTP_FROM));
}

function getAuthMailerTransporter() {
    if (passwordResetTransporter !== undefined) return passwordResetTransporter;
    if (!isAuthEmailConfigured()) {
        passwordResetTransporter = null;
        return passwordResetTransporter;
    }
    passwordResetTransporter = nodemailer.createTransport({
        host: asString(process.env.SMTP_HOST),
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: asString(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: asString(process.env.SMTP_USER)
            ? {
                user: asString(process.env.SMTP_USER),
                pass: asString(process.env.SMTP_PASSWORD),
            }
            : undefined,
    });
    return passwordResetTransporter;
}

function buildAuthEmailHtml(input: {
    brand: AuthBrandProfile;
    eyebrow: string;
    heading: string;
    body: string;
    buttonLabel: string;
    actionUrl: string;
    footnote: string;
}) {
    return `
    <div style="margin:0;padding:32px 16px;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
        <tr>
          <td style="padding:0 0 16px 0;text-align:center;">
            <div style="display:inline-block;padding:10px 14px;border-radius:999px;background:${input.brand.accentSoft};color:${input.brand.accent};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${input.eyebrow}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:28px 32px;background:${input.brand.surface};color:#ffffff;">
              <div style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">${input.brand.title}</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.6;color:rgba(255,255,255,.78);">${input.heading}</div>
            </div>
            <div style="padding:32px;">
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">${input.body}</p>
              <div style="margin:0 0 24px 0;">
                <a href="${input.actionUrl}" style="display:inline-block;padding:14px 20px;border-radius:14px;background:${input.brand.accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${input.buttonLabel}</a>
              </div>
              <p style="margin:0 0 12px 0;font-size:13px;line-height:1.6;color:#64748b;">${input.footnote}</p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br /><a href="${input.actionUrl}" style="color:${input.brand.accent};word-break:break-all;">${input.actionUrl}</a></p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center;font-size:12px;color:#94a3b8;">
            Enviado por ${input.brand.supportLabel}. Respuestas en ${input.brand.supportEmail}.
          </td>
        </tr>
      </table>
    </div>`;
}

function buildAuthEmailText(input: {
    heading: string;
    body: string;
    buttonLabel: string;
    actionUrl: string;
    footnote: string;
    supportEmail: string;
}) {
    return `${input.heading}\n\n${input.body}\n\n${input.buttonLabel}: ${input.actionUrl}\n\n${input.footnote}\n\nSoporte: ${input.supportEmail}`;
}

function formatAuthFromAddress(brand: AuthBrandProfile): string {
    const smtpFrom = asString(process.env.SMTP_FROM);
    return `${brand.appName} <${smtpFrom}>`;
}

async function sendPasswordResetEmail(email: string, resetUrl: string, origin: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getAuthBrandProfile(origin);
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Password reset email delivery is not configured');
        }
        console.info(`Password reset link for ${email}: ${resetUrl}`);
        return;
    }
    const heading = `Restablece el acceso a tu cuenta de ${brand.appName}.`;
    const body = 'Recibimos una solicitud para cambiar tu contraseña. Si fuiste tú, usa el botón de abajo para definir una nueva contraseña segura.';
    const footnote = 'Si no solicitaste este cambio, puedes ignorar este correo. Tu cuenta seguirá protegida.';
    await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: restablece tu contraseña`,
        text: buildAuthEmailText({
            heading,
            body,
            buttonLabel: 'Restablecer contraseña',
            actionUrl: resetUrl,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: buildAuthEmailHtml({
            brand,
            eyebrow: 'Seguridad de cuenta',
            heading,
            body,
            buttonLabel: 'Restablecer contraseña',
            actionUrl: resetUrl,
            footnote,
        }),
    });
}

async function sendEmailVerificationEmail(email: string, verificationUrl: string, origin: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getAuthBrandProfile(origin);
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Email verification delivery is not configured');
        }
        console.info(`Email verification link for ${email}: ${verificationUrl}`);
        return;
    }
    const heading = `Confirma tu correo para activar tu cuenta de ${brand.appName}.`;
    const body = 'Queremos asegurarnos de que este correo te pertenece y mantener la comunicación de tu cuenta con el branding correcto de la vertical.';
    const footnote = 'Si no creaste esta cuenta, puedes ignorar este mensaje. No activaremos ninguna acción adicional.';
    await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: confirma tu correo`,
        text: buildAuthEmailText({
            heading,
            body,
            buttonLabel: 'Confirmar correo',
            actionUrl: verificationUrl,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: buildAuthEmailHtml({
            brand,
            eyebrow: 'Confirmación de cuenta',
            heading,
            body,
            buttonLabel: 'Confirmar correo',
            actionUrl: verificationUrl,
            footnote,
        }),
    });
}

async function sendPasswordChangedEmail(email: string, origin: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getAuthBrandProfile(origin);
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Password changed email delivery is not configured');
        }
        console.info(`Password changed notice for ${email} on ${brand.appName}`);
        return;
    }
    const heading = `Tu contrasena de ${brand.appName} fue actualizada.`;
    const body = 'Este correo confirma que el acceso a tu cuenta fue actualizado correctamente. Si no realizaste este cambio, contacta soporte de inmediato.';
    const footnote = 'Por seguridad, revisa tus dispositivos activos y cambia nuevamente la clave si detectas algo fuera de lo normal.';
    await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: cambio de contrasena confirmado`,
        text: buildAuthEmailText({
            heading,
            body,
            buttonLabel: 'Abrir plataforma',
            actionUrl: origin,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: buildAuthEmailHtml({
            brand,
            eyebrow: 'Seguridad de cuenta',
            heading,
            body,
            buttonLabel: 'Abrir plataforma',
            actionUrl: origin,
            footnote,
        }),
    });
}

async function sendWelcomeEmail(email: string, name: string, origin: string): Promise<void> {
    const transporter = getAuthMailerTransporter();
    const brand = getAuthBrandProfile(origin);
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Welcome email delivery is not configured');
        }
        console.info(`Welcome email for ${email} on ${brand.appName}`);
        return;
    }
    const heading = `Tu cuenta de ${brand.appName} ya esta lista.`;
    const body = `Hola ${name}. Tu correo quedo confirmado y ya puedes usar tu cuenta con la experiencia completa de ${brand.appName}.`;
    const footnote = 'Si necesitas ayuda con tu cuenta o con la publicacion de tus contenidos, nuestro equipo de soporte esta disponible.';
    await transporter.sendMail({
        from: formatAuthFromAddress(brand),
        to: email,
        subject: `${brand.appName}: bienvenida a tu cuenta`,
        text: buildAuthEmailText({
            heading,
            body,
            buttonLabel: 'Entrar ahora',
            actionUrl: origin,
            footnote,
            supportEmail: brand.supportEmail,
        }),
        html: buildAuthEmailHtml({
            brand,
            eyebrow: 'Cuenta activada',
            heading,
            body,
            buttonLabel: 'Entrar ahora',
            actionUrl: origin,
            footnote,
        }),
    });
}

// ── Booking confirmation emails ───────────────────────────────────────────────

type BookingEmailData = {
    appointmentId: string;
    clientName: string;
    professionalName: string;
    slug: string;
    serviceName: string | null;
    startsAt: Date;
    endsAt: Date;
    durationMinutes: number;
    modality: string;
    price: string | null;
    currency: string;
    meetingUrl?: string | null;
    location?: string | null;
    timezone: string;
    status: string;
    seriesDates?: Date[] | null;
    seriesFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
    paymentMethods?: {
        requiresAdvancePayment: boolean;
        mpConnected: boolean;
        paymentLinkUrl: string | null;
        bankTransferData: Record<string, string> | null;
        checkoutUrl?: string | null;
    } | null;
};

function fmtBookingDateTime(date: Date, timezone: string): string {
    return date.toLocaleString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
    });
}

function buildBookingEmailHtml(data: BookingEmailData & { cancelUrl: string; appUrl: string }): string {
    const isPending = data.status === 'pending';
    const accent = '#0d9488';
    const accentSoft = '#f0fdfa';
    const surface = '#0f1a19';

    const dateStr = fmtBookingDateTime(data.startsAt, data.timezone);
    const durationStr = data.durationMinutes >= 60
        ? `${Math.floor(data.durationMinutes / 60)}h${data.durationMinutes % 60 ? ` ${data.durationMinutes % 60}min` : ''}`
        : `${data.durationMinutes} min`;

    const modalityStr = data.modality === 'presencial' ? 'Presencial' : 'Online (videollamada)';

    const priceStr = data.price && parseFloat(data.price) > 0
        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: data.currency || 'CLP', maximumFractionDigits: 0 }).format(parseFloat(data.price))
        : null;

    // Payment section
    let paymentSection = '';
    if (data.paymentMethods?.requiresAdvancePayment && priceStr) {
        if (data.paymentMethods.checkoutUrl) {
            paymentSection = `
            <div style="margin:20px 0;padding:16px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;">
                <p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:#92400e;">Pago anticipado requerido</p>
                <p style="margin:0 0 12px 0;font-size:13px;color:#78350f;">Para confirmar tu cita debes realizar el pago de ${priceStr}.</p>
                <a href="${data.paymentMethods.checkoutUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0d9488;color:#fff;text-decoration:none;font-size:13px;font-weight:700;">Pagar ahora</a>
            </div>`;
        } else if (data.paymentMethods.bankTransferData) {
            const bt = data.paymentMethods.bankTransferData;
            paymentSection = `
            <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:#14532d;">Pago por transferencia</p>
                <p style="margin:0 0 8px 0;font-size:13px;color:#15803d;">Monto: <strong>${priceStr}</strong></p>
                <p style="margin:0;font-size:12px;color:#16a34a;line-height:1.7;">
                    Banco: ${bt.bank}<br/>
                    Tipo: ${bt.accountType}<br/>
                    N° cuenta: ${bt.accountNumber}<br/>
                    Titular: ${bt.holderName}<br/>
                    RUT: ${bt.holderRut}<br/>
                    ${bt.alias ? `Alias: ${bt.alias}` : ''}
                </p>
            </div>`;
        } else if (data.paymentMethods.paymentLinkUrl) {
            paymentSection = `
            <div style="margin:20px 0;padding:16px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;">
                <p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:#92400e;">Pago anticipado requerido</p>
                <p style="margin:0 0 12px 0;font-size:13px;color:#78350f;">Monto: <strong>${priceStr}</strong></p>
                <a href="${data.paymentMethods.paymentLinkUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#0d9488;color:#fff;text-decoration:none;font-size:13px;font-weight:700;">Ir al link de pago</a>
            </div>`;
        }
    }

    const statusLabel = isPending
        ? `<div style="display:inline-block;padding:6px 14px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;letter-spacing:.04em;">⏳ Pendiente de confirmación</div>`
        : `<div style="display:inline-block;padding:6px 14px;border-radius:999px;background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;letter-spacing:.04em;">✅ Confirmada</div>`;

    // Series section (if patient reserved multiple sessions)
    let seriesSection = '';
    const seriesDates = data.seriesDates ?? null;
    if (seriesDates && seriesDates.length > 1) {
        const freqLabel = data.seriesFrequency === 'weekly' ? 'semanal'
            : data.seriesFrequency === 'biweekly' ? 'quincenal'
            : data.seriesFrequency === 'monthly' ? 'mensual'
            : 'recurrente';
        const rows = seriesDates.map((d, i) => {
            const ds = fmtBookingDateTime(d, data.timezone);
            return `<tr><td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#334155;"><span style="display:inline-block;width:22px;height:22px;border-radius:999px;background:${accentSoft};color:${accent};font-size:11px;font-weight:700;text-align:center;line-height:22px;margin-right:8px;">${i + 1}</span>${ds}</td></tr>`;
        }).join('');
        seriesSection = `
        <div style="margin-top:20px;padding:16px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;">
            <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#6b21a8;">🔁 Reserva ${freqLabel} — ${seriesDates.length} sesiones</p>
            <p style="margin:0 0 10px 0;font-size:12px;color:#7c3aed;">Estas son todas las fechas reservadas:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #ede9fe;">
                ${rows}
            </table>
        </div>`;
    }

    return `
    <div style="margin:0;padding:32px 16px;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;">
        <tr>
          <td style="padding:0 0 16px 0;text-align:center;">
            <div style="display:inline-block;padding:10px 14px;border-radius:999px;background:${accentSoft};color:${accent};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">SimpleAgenda</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="padding:28px 32px;background:${surface};color:#ffffff;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;">📅 Tu cita con ${data.professionalName}</div>
              <div style="margin-top:8px;font-size:14px;color:rgba(255,255,255,.75);">${isPending ? 'Tu solicitud fue recibida y está en espera de confirmación.' : 'Tu cita está confirmada. Te esperamos.'}</div>
            </div>
            <div style="padding:28px 32px;">
              <div style="margin-bottom:20px;">${statusLabel}</div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Fecha y hora</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0f172a;">${dateStr}</p>
                  </td>
                </tr>
                ${data.serviceName ? `
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Servicio</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#0f172a;">${data.serviceName} · ${durationStr}</p>
                  </td>
                </tr>` : `
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Duración</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#0f172a;">${durationStr}</p>
                  </td>
                </tr>`}
                <tr>
                  <td style="padding:14px 18px;${priceStr ? 'border-bottom:1px solid #e5e7eb;' : ''}">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Modalidad</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#0f172a;">${modalityStr}${data.location ? ` · ${data.location}` : ''}</p>
                  </td>
                </tr>
                ${priceStr ? `
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Precio</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#0f172a;">${priceStr}</p>
                  </td>
                </tr>` : ''}
              </table>

              ${data.modality !== 'presencial' && data.meetingUrl ? `
              <div style="margin-top:20px;padding:14px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
                <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#1e40af;">🎥 Enlace de videollamada</p>
                <a href="${data.meetingUrl}" style="font-size:13px;color:#2563eb;word-break:break-all;">${data.meetingUrl}</a>
              </div>` : ''}

              ${seriesSection}

              ${paymentSection}

              <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:20px;">
                <p style="margin:0 0 14px 0;font-size:14px;color:#334155;">¿Necesitas cancelar? Puedes hacerlo desde el siguiente enlace:</p>
                <a href="${data.cancelUrl}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#f1f5f9;color:#475569;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #e2e8f0;">Cancelar cita</a>
              </div>

              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Si tienes dudas, contacta directamente a ${data.professionalName}. Este correo fue generado automáticamente por SimpleAgenda.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center;font-size:12px;color:#94a3b8;">
            Gestionado con <a href="${data.appUrl}" style="color:${accent};text-decoration:none;">SimpleAgenda</a>
          </td>
        </tr>
      </table>
    </div>`;
}

async function sendBookingConfirmationEmail(clientEmail: string, data: BookingEmailData & { cancelUrl: string; appUrl: string }): Promise<void> {
    const transporter = getAuthMailerTransporter();
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Booking confirmation email delivery is not configured');
        }
        console.info(`[agenda] Booking confirmation for ${clientEmail}: ${data.cancelUrl}`);
        return;
    }
    const isPending = data.status === 'pending';
    const seriesCount = data.seriesDates && data.seriesDates.length > 1 ? data.seriesDates.length : 0;
    const subject = seriesCount > 0
        ? (isPending
            ? `Tu solicitud de ${seriesCount} sesiones con ${data.professionalName} fue recibida`
            : `Tus ${seriesCount} sesiones con ${data.professionalName} están confirmadas`)
        : (isPending
            ? `Tu solicitud de cita con ${data.professionalName} fue recibida`
            : `Tu cita con ${data.professionalName} está confirmada`);

    const dateStr = fmtBookingDateTime(data.startsAt, data.timezone);
    const seriesLines = seriesCount > 0 && data.seriesDates
        ? ['', `Sesiones reservadas (${seriesCount}):`, ...data.seriesDates.map((d, i) => `  ${i + 1}. ${fmtBookingDateTime(d, data.timezone)}`)]
        : [];
    const textBody = [
        subject,
        '',
        `Fecha y hora: ${dateStr}`,
        data.serviceName ? `Servicio: ${data.serviceName}` : '',
        `Modalidad: ${data.modality === 'presencial' ? 'Presencial' : 'Online'}`,
        ...seriesLines,
        '',
        `Para cancelar: ${data.cancelUrl}`,
        '',
        'SimpleAgenda',
    ].filter(Boolean).join('\n');

    await transporter.sendMail({
        from: `SimpleAgenda <${asString(process.env.SMTP_FROM).replace(/.*<(.+)>/, '$1') || asString(process.env.SMTP_FROM)}>`,
        to: clientEmail,
        subject,
        text: textBody,
        html: buildBookingEmailHtml(data),
    });
}

async function sendAppointmentReminderEmail(clientEmail: string, data: {
    clientName: string;
    professionalName: string;
    dateLabel: string;
    modality: string;
    meetingUrl?: string | null;
    location?: string | null;
    cancelUrl: string;
}): Promise<void> {
    const transporter = getAuthMailerTransporter();
    if (!transporter) {
        if (process.env.NODE_ENV === 'production') return;
        console.info(`[agenda] Reminder for ${clientEmail}: ${data.dateLabel}`);
        return;
    }
    const subject = `Recordatorio: tu cita con ${data.professionalName} es mañana`;
    const locationLine = data.modality === 'online'
        ? (data.meetingUrl ? `Enlace: ${data.meetingUrl}` : 'Modalidad: Online')
        : (data.location ? `Lugar: ${data.location}` : 'Modalidad: Presencial');
    const text = [
        subject,
        '',
        `Hola ${data.clientName},`,
        `Te recordamos que tienes una cita mañana: ${data.dateLabel}.`,
        locationLine,
        '',
        `Para cancelar: ${data.cancelUrl}`,
        '',
        'SimpleAgenda',
    ].join('\n');
    await transporter.sendMail({
        from: `SimpleAgenda <${asString(process.env.SMTP_FROM).replace(/.*<(.+)>/, '$1') || asString(process.env.SMTP_FROM)}>`,
        to: clientEmail,
        subject,
        text,
    });
}

async function issueEmailVerification(userId: string, email: string, origin: string): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
    await db.insert(emailVerificationTokens).values({
        userId,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt,
    });
    await sendEmailVerificationEmail(email, buildEmailVerificationUrl(origin, rawToken), origin);
}

function usernameFromName(name: string): string {
    const normalized = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    return normalized || 'usuario';
}

function parseVertical(raw: string | undefined): VerticalType {
    if (raw === 'propiedades') return 'propiedades';
    if (raw === 'agenda') return 'agenda';
    if (raw === 'serenatas') return 'serenatas';
    return 'autos';
}

function getUrlPathSegment(url: string, fromEnd = 1): string {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments.at(-fromEnd) ?? '';
}

function formatAgo(timestamp: number): string {
    const deltaMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
    if (deltaMinutes < 60) return `${deltaMinutes}m`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours}h`;
    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays}d`;
}

function formatRelativeTimestamp(timestamp: number): string {
    const deltaMinutes = Math.floor((timestamp - Date.now()) / (1000 * 60));
    if (deltaMinutes > 0) {
        if (deltaMinutes < 60) return `en ${deltaMinutes}m`;
        const deltaHours = Math.floor(deltaMinutes / 60);
        if (deltaHours < 24) return `en ${deltaHours}h`;
        const deltaDays = Math.floor(deltaHours / 24);
        return `en ${deltaDays}d`;
    }
    return formatAgo(timestamp);
}

function accountKindLabel(kind: PublicProfileAccountKind, vertical: VerticalType): string {
    if (kind === 'company') return vertical === 'autos' ? 'Automotora o empresa' : 'Inmobiliaria o empresa';
    if (kind === 'independent') return vertical === 'autos' ? 'Vendedor independiente' : 'Corredor independiente';
    return vertical === 'autos' ? 'Vendedor particular' : 'Propietario o vendedor';
}

function publicProfileLeadRoutingModeLabel(mode: PublicProfileLeadRoutingMode): string {
    if (mode === 'owner') return 'Cuenta principal';
    if (mode === 'unassigned') return 'Sin asignar';
    return 'Round robin del equipo';
}

function getPublicProfileDefaultValues(user: AppUser, vertical: VerticalType): Omit<PublicProfileRecord, 'id' | 'createdAt' | 'updatedAt'> {
    const address = getDefaultPublicProfileAddress(user.id);
    const defaultSlug = normalizePublicProfileSlug(usernameFromName(user.name));
    return {
        userId: user.id,
        vertical,
        slug: defaultSlug || `cuenta-${user.id.slice(0, 8)}`,
        isPublished: false,
        accountKind: getDefaultPublicProfileAccountKind(user, vertical),
        leadRoutingMode: 'round_robin',
        leadRoutingCursor: 0,
        displayName: user.name,
        headline: vertical === 'autos'
            ? 'Atención directa y publicaciones activas verificadas.'
            : 'Atención inmobiliaria con publicaciones activas verificadas.',
        bio: null,
        companyName: null,
        website: null,
        publicEmail: user.email,
        publicPhone: user.phone ?? null,
        publicWhatsapp: user.phone ?? null,
        addressLine: address?.addressLine1 ?? null,
        city: address?.communeName ?? null,
        region: address?.regionName ?? null,
        coverImageUrl: null,
        avatarImageUrl: user.avatar ?? null,
        socialLinks: createDefaultPublicProfileSocialLinks(),
        businessHours: createDefaultPublicProfileBusinessHours(),
        specialties: [],
        scheduleNote: null,
        alwaysOpen: false,
    };
}

function buildEditablePublicProfile(user: AppUser, vertical: VerticalType) {
    const stored = getPublicProfileRecord(user.id, vertical);
    const teamMembers = getEditablePublicProfileTeamMembers(user.id, vertical);
    const defaults = getPublicProfileDefaultValues(user, vertical);
    const base = stored ? {
        ...defaults,
        ...stored,
        socialLinks: {
            ...defaults.socialLinks,
            ...stored.socialLinks,
        },
        businessHours: stored.businessHours.length > 0 ? stored.businessHours : defaults.businessHours,
        specialties: stored.specialties.length > 0 ? stored.specialties : defaults.specialties,
    } : {
        id: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...defaults,
    };
    return {
        id: stored?.id ?? null,
        userId: user.id,
        vertical,
        slug: base.slug,
        isPublished: base.isPublished,
        accountKind: base.accountKind,
        leadRoutingMode: base.leadRoutingMode,
        leadRoutingCursor: base.leadRoutingCursor,
        displayName: base.displayName,
        headline: base.headline,
        bio: base.bio,
        companyName: base.companyName,
        website: base.website,
        publicEmail: base.publicEmail,
        publicPhone: base.publicPhone,
        publicWhatsapp: base.publicWhatsapp,
        addressLine: base.addressLine,
        city: base.city,
        region: base.region,
        coverImageUrl: base.coverImageUrl,
        avatarImageUrl: base.avatarImageUrl,
        socialLinks: base.socialLinks,
        businessHours: base.businessHours,
        specialties: base.specialties,
        teamMembers: teamMembers.map((item) => ({
            id: item.id,
            name: item.name,
            roleTitle: item.roleTitle,
            bio: item.bio,
            email: item.email,
            phone: item.phone,
            whatsapp: item.whatsapp,
            avatarImageUrl: item.avatarImageUrl,
            socialLinks: item.socialLinks,
            specialties: item.specialties,
            isLeadContact: item.isLeadContact,
            receivesLeads: item.receivesLeads,
            isPublished: item.isPublished,
        })),
        scheduleNote: base.scheduleNote,
        alwaysOpen: base.alwaysOpen,
        publicUrl: stored?.isPublished ? `/perfil/${base.slug}` : null,
    };
}

function publicSectionLabel(section: BoostSection): string {
    if (section === 'rent') return 'Arriendo';
    if (section === 'auction') return 'Subasta';
    if (section === 'project') return 'Proyecto';
    return 'Venta';
}

function socialSectionFromListing(section: BoostSection): FeedClip['section'] | null {
    if (section === 'rent') return 'arriendos';
    if (section === 'auction') return 'subastas';
    if (section === 'project') return 'proyectos';
    if (section === 'sale') return 'ventas';
    return null;
}

function buildSocialPlaceholderMedia(record: ListingRecord): string {
    const autosPalettes = [
        ['#0f172a', '#1d4ed8'],
        ['#111827', '#374151'],
        ['#1f2937', '#475569'],
    ];
    const propiedadesPalettes = [
        ['#111827', '#1e3a8a'],
        ['#0f172a', '#334155'],
        ['#1e293b', '#475569'],
    ];
    const palettes = record.vertical === 'autos' ? autosPalettes : propiedadesPalettes;
    const seed = Array.from(record.title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const pair = palettes[seed % palettes.length];
    return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

function extractListingFeedMedia(record: ListingRecord): { mediaType: FeedClip['mediaType']; mediaUrl: string; posterUrl?: string } {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const discoverVideo = asObject(media.discoverVideo);
    const videoUrl = asString(discoverVideo.dataUrl) || asString(discoverVideo.url);
    const imageUrls = extractListingMediaUrls(record);
    const posterUrl = asString(discoverVideo.previewUrl) || imageUrls[0] || undefined;

    if (videoUrl) {
        return {
            mediaType: 'video',
            mediaUrl: videoUrl,
            posterUrl,
        };
    }

    return {
        mediaType: 'image',
        mediaUrl: imageUrls[0] || buildSocialPlaceholderMedia(record),
    };
}

function buildSocialFeedClips(vertical: VerticalType, section: string | null | undefined): FeedClip[] {
    const featuredListingIds = new Set(
        getAllBoostOrdersNormalized()
            .filter((order) => order.vertical === vertical && order.status === 'active')
            .map((order) => order.listingId)
    );

    return Array.from(listingsById.values())
        .filter((record) => record.vertical === vertical)
        .filter((record) => isPublicListingVisible(record))
        .flatMap((record) => {
            const socialSection = socialSectionFromListing(record.section);
            if (!socialSection) return [];
            if (section && section !== 'todos' && socialSection !== section) return [];

            const media = extractListingFeedMedia(record);
            return [{
                id: record.id,
                vertical: record.vertical,
                section: socialSection,
                href: record.href,
                title: record.title,
                price: record.price || publicSectionLabel(record.section),
                location: record.location || 'Chile',
                authorId: record.ownerId,
                mediaType: media.mediaType,
                mediaUrl: media.mediaUrl,
                posterUrl: media.posterUrl,
                views: record.views,
                saves: record.favs,
                publishedAt: record.updatedAt,
                featured: featuredListingIds.has(record.id),
            } satisfies FeedClip];
        });
}

function fixBrokenB2Url(url: string): string {
    if (!url || !url.startsWith('http')) return url;
    
    // If it's a B2 URL, ensure it uses the standard download format
    if (url.includes('backblazeb2.com')) {
        const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
        
        // Extract the key regardless of the current format
        let key = '';
        if (url.includes(`/file/${bucketName}/`)) {
            key = url.split(`/file/${bucketName}/`)[1];
        } else if (url.includes(`backblazeb2.com/${bucketName}/`)) {
             key = url.split(`backblazeb2.com/${bucketName}/`)[1];
        } else {
            // Try to find the key by splitting at backblazeb2.com/
            const parts = url.split('.backblazeb2.com/');
            if (parts.length === 2) {
                const pathParts = parts[1].split('/');
                if (pathParts[0] === 'file') pathParts.shift();
                if (pathParts[0] === bucketName) pathParts.shift();
                key = pathParts.join('/');
            }
        }

        if (key) {
            // ALWAYS use the most reliable format for public files
            const downloadOrigin = process.env.BACKBLAZE_DOWNLOAD_URL || 'https://f005.backblazeb2.com';
            return `${downloadOrigin}/file/${bucketName}/${key}`;
        }
    }
    
    return url;
}

function isBackblazeUrl(url: string): boolean {
    try {
        return new URL(url).hostname.endsWith('backblazeb2.com');
    } catch {
        return false;
    }
}

function isCloudflareR2Url(url: string): boolean {
    try {
        const hostname = new URL(url).hostname;
        return hostname.endsWith('.r2.cloudflarestorage.com') || hostname.endsWith('.r2.dev');
    } catch {
        return false;
    }
}

function isStorageUrl(url: string): boolean {
    return isBackblazeUrl(url) || isCloudflareR2Url(url);
}

function extractBackblazeObjectKey(url: string): string {
    if (!isBackblazeUrl(url)) return '';
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
    const normalized = fixBrokenB2Url(url);
    try {
        const parsed = new URL(normalized);
        const prefix = `/file/${bucketName}/`;
        if (parsed.pathname.startsWith(prefix)) {
            return decodeURIComponent(parsed.pathname.slice(prefix.length));
        }
    } catch {
        return '';
    }
    return '';
}

function extractR2ObjectKey(url: string): string {
    if (!isCloudflareR2Url(url)) return '';
    try {
        const parsed = new URL(url);
        // R2 public URL format: https://pub-xxx.r2.dev/key
        // R2 S3 URL format: https://accountId.r2.cloudflarestorage.com/bucket/key
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';
        
        // Try public URL format first (pub-xxx.r2.dev/key)
        if (parsed.hostname.endsWith('.r2.dev')) {
            // Path is just /key
            return decodeURIComponent(parsed.pathname.slice(1));
        }
        
        // Try S3 endpoint format (accountId.r2.cloudflarestorage.com/bucket/key)
        const prefix = `/${bucketName}/`;
        if (parsed.pathname.startsWith(prefix)) {
            return decodeURIComponent(parsed.pathname.slice(prefix.length));
        }
    } catch {
        return '';
    }
    return '';
}

function extractStorageObjectKey(url: string): string {
    if (isBackblazeUrl(url)) {
        return extractBackblazeObjectKey(url);
    }
    if (isCloudflareR2Url(url)) {
        return extractR2ObjectKey(url);
    }
    return '';
}

function buildMediaProxyUrl(url: string): string {
    const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
    return `${apiBaseUrl}/api/media/proxy?src=${encodeURIComponent(fixBrokenB2Url(url))}`;
}

function toDeliveredMediaUrl(url: string): string {
    const normalized = fixBrokenB2Url(url);
    const apiBaseUrl = process.env.API_BASE_URL;
    const isProd = process.env.NODE_ENV === 'production';
    
    if (isBackblazeUrl(normalized)) {
        // En producción, si la URL base es localhost, usamos directo para evitar el popup PNA
        if (isProd && (!apiBaseUrl || apiBaseUrl.includes('localhost'))) {
            return normalized;
        }
        
        // En desarrollo local o producción bien configurada, el proxy es la mejor opción
        // ya que evita problemas de CORS y centraliza la entrega.
        return buildMediaProxyUrl(normalized);
    }
    
    return normalized;
}

function normalizeMediaValueForResponse(value: unknown): unknown {
    if (typeof value === 'string') {
        return toDeliveredMediaUrl(value);
    }
    if (!value || typeof value !== 'object') {
        return value;
    }

    const item = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...item };

    if (typeof item.url === 'string') {
        next.url = toDeliveredMediaUrl(item.url);
    }
    if (typeof item.previewUrl === 'string') {
        next.previewUrl = toDeliveredMediaUrl(item.previewUrl);
    }
    if (typeof item.dataUrl === 'string' && /^https?:\/\//i.test(item.dataUrl)) {
        next.dataUrl = toDeliveredMediaUrl(item.dataUrl);
    }

    return next;
}

function normalizeListingRawDataForResponse(rawData: unknown): unknown {
    if (!rawData || typeof rawData !== 'object') return rawData ?? null;

    const payload = asObject(rawData);
    const media = asObject(payload.media);
    if (Object.keys(media).length === 0) return rawData;

    return {
        ...payload,
        media: {
            ...media,
            photos: Array.isArray(media.photos)
                ? media.photos.map((photo) => normalizeMediaValueForResponse(photo))
                : media.photos,
            discoverVideo: normalizeMediaValueForResponse(media.discoverVideo),
            video: normalizeMediaValueForResponse(media.video),
        },
    };
}

function toPublicMediaUrl(value: unknown): string {
    if (typeof value === 'string') return toDeliveredMediaUrl(value.trim());
    if (!value || typeof value !== 'object') return '';
    const item = value as Record<string, unknown>;
    const rawUrl = asString(item.url) || asString(item.previewUrl) || asString(item.dataUrl);
    return toDeliveredMediaUrl(rawUrl);
}

function extractListingMediaUrls(record: ListingRecord): string[] {
    const payload = asObject(record.rawData);
    const media = asObject(payload.media);
    const photos = Array.isArray(media.photos) ? media.photos : [];
    const urls = photos
        .map((photo) => toPublicMediaUrl(photo))
        .filter((url) => url.length > 0)
        .slice(0, 8);
    const remoteUrls = urls.filter((url) => !url.startsWith('data:'));
    return remoteUrls.length > 0 ? remoteUrls : urls;
}

function appendUniqueSummary(summary: string[], value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    if (summary.includes(normalized)) return;
    summary.push(normalized);
}

function extractAutosSummary(record: ListingRecord): string[] {
    const payload = asObject(record.rawData);
    const basic = asObject(payload.basic);
    const summary: string[] = [];

    appendUniqueSummary(summary, asString(basic.year));
    appendUniqueSummary(summary, asString(basic.bodyType));

    const mileage = parseNumberFromString(basic.mileage);
    if (mileage != null) appendUniqueSummary(summary, `${mileage.toLocaleString('es-CL')} km`);

    appendUniqueSummary(summary, asString(basic.fuelType));
    appendUniqueSummary(summary, asString(basic.transmission));
    appendUniqueSummary(summary, asString(basic.condition));

    return summary.slice(0, 5);
}

function extractPropertiesSummary(record: ListingRecord): string[] {
    const payload = asObject(record.rawData);
    const setup = asObject(payload.setup);
    const basic = asObject(payload.basic);
    const project = asObject(payload.project);
    const summary: string[] = [];
    const isProject = record.section === 'project' || asString(setup.operationType) === 'project';

    if (isProject) {
        appendUniqueSummary(summary, asString(project.projectName));
        const availableUnits = parseNumberFromString(project.availableUnits);
        if (availableUnits != null) appendUniqueSummary(summary, `${availableUnits.toLocaleString('es-CL')} unidades`);

        const usableAreaFrom = parseNumberFromString(project.usableAreaFrom);
        const usableAreaTo = parseNumberFromString(project.usableAreaTo);
        if (usableAreaFrom != null && usableAreaTo != null && usableAreaTo > usableAreaFrom) {
            appendUniqueSummary(summary, `${usableAreaFrom.toLocaleString('es-CL')}-${usableAreaTo.toLocaleString('es-CL')} m²`);
        } else if (usableAreaFrom != null) {
            appendUniqueSummary(summary, `Desde ${usableAreaFrom.toLocaleString('es-CL')} m²`);
        }

        appendUniqueSummary(summary, asString(project.deliveryStatus));
        appendUniqueSummary(summary, asString(project.salesStage));
        return summary.slice(0, 5);
    }

    const rooms = parseNumberFromString(basic.rooms);
    if (rooms != null) appendUniqueSummary(summary, `${rooms.toLocaleString('es-CL')}D`);

    const bathrooms = parseNumberFromString(basic.bathrooms);
    if (bathrooms != null) appendUniqueSummary(summary, `${bathrooms.toLocaleString('es-CL')}B`);

    const totalArea = parseNumberFromString(basic.totalArea ?? basic.surface);
    if (totalArea != null) appendUniqueSummary(summary, `${totalArea.toLocaleString('es-CL')} m²`);

    const parkingSpaces = parseNumberFromString(basic.parkingSpaces);
    if (parkingSpaces != null) appendUniqueSummary(summary, `${parkingSpaces.toLocaleString('es-CL')} est.`);

    const storageUnits = parseNumberFromString(basic.storageUnits);
    if (storageUnits != null) appendUniqueSummary(summary, `${storageUnits.toLocaleString('es-CL')} bod.`);

    appendUniqueSummary(summary, asString(basic.propertyType));
    return summary.slice(0, 5);
}

function extractListingSummary(record: ListingRecord): string[] {
    const summary = record.vertical === 'autos'
        ? extractAutosSummary(record)
        : extractPropertiesSummary(record);
    return summary.length > 0 ? summary : [publicSectionLabel(record.section)];
}

function isPublicListingVisible(record: ListingRecord): boolean {
    return record.status === 'active';
}

function matchesListingSlug(record: ListingRecord, slug: string): boolean {
    if (record.id === slug) return true;
    const hrefSlug = record.href.split('/').filter(Boolean).at(-1) ?? '';
    return hrefSlug === slug;
}

function getPublishedSellerProfile(userId: string, vertical: VerticalType): PublicProfileRecord | null {
    const record = getPublicProfileRecord(userId, vertical);
    if (!record || !record.isPublished) return null;
    return record;
}

function listingToPublicResponse(record: ListingRecord) {
    const owner = usersById.get(record.ownerId);
    const sellerProfile = owner ? getPublishedSellerProfile(owner.id, record.vertical) : null;
    const sellerName = sellerProfile?.displayName ?? owner?.name ?? 'Cuenta verificada';
    const username = sellerProfile?.slug ?? usernameFromName(sellerName);

    return {
        id: record.id,
        vertical: record.vertical,
        section: record.section,
        sectionLabel: publicSectionLabel(record.section),
        title: record.title,
        description: record.description,
        price: record.price,
        href: record.href,
        location: buildLocationPublicLabel(record.locationData) || humanizePublicLocationFallback(record.location) || '',
        views: record.views,
        favs: record.favs,
        leads: record.leads,
        days: listingAgeDays(record.createdAt),
        publishedAgo: formatAgo(record.updatedAt),
        updatedAt: record.updatedAt,
        images: extractListingMediaUrls(record),
        summary: extractListingSummary(record),
        seller: owner ? {
            id: owner.id,
            name: sellerName,
            username,
            profileHref: sellerProfile ? `/perfil/${username}` : null,
            email: owner.email,
            phone: owner.phone ?? null,
        } : null,
    };
}

function buildPublicProfileResponse(user: AppUser, vertical: VerticalType, profile: PublicProfileRecord) {
    const teamMembers = getPublicProfileTeamMembers(user.id, vertical);
    const listings = Array.from(listingsById.values())
        .filter((listing) => listing.ownerId === user.id)
        .filter((listing) => listing.vertical === vertical)
        .filter((listing) => isPublicListingVisible(listing))
        .sort((a, b) => b.updatedAt - a.updatedAt);

    const displayName = profile.displayName || user.name;
    const firstListing = listings[0] ?? null;
    const coverImageUrl = profile.coverImageUrl || (firstListing ? extractListingMediaUrls(firstListing)[0] ?? null : null);
    const avatarImageUrl = profile.avatarImageUrl || user.avatar || null;
    const locationParts = [profile.city, profile.region].filter(Boolean);

    return {
        profile: {
            id: profile.id,
            ownerUserId: user.id,
            name: displayName,
            username: profile.slug,
            vertical,
            accountKind: profile.accountKind,
            accountKindLabel: accountKindLabel(profile.accountKind, vertical),
            leadRoutingMode: profile.leadRoutingMode,
            leadRoutingModeLabel: publicProfileLeadRoutingModeLabel(profile.leadRoutingMode),
            subscriptionPlanId: getEffectivePlanId(user, vertical),
            subscriptionPlanName: getCurrentPlanLabel(user, vertical),
            headline: profile.headline,
            bio: profile.bio,
            companyName: profile.companyName,
            website: profile.website,
            email: profile.publicEmail || user.email,
            phone: profile.publicPhone || user.phone || null,
            whatsapp: profile.publicWhatsapp || profile.publicPhone || user.phone || null,
            addressLine: profile.addressLine,
            city: profile.city,
            region: profile.region,
            locationLabel: locationParts.join(', ') || null,
            coverImageUrl,
            avatarImageUrl,
            socialLinks: profile.socialLinks,
            businessHours: profile.businessHours,
            scheduleNote: profile.scheduleNote,
            alwaysOpen: profile.alwaysOpen,
            specialties: profile.specialties,
            teamMembers: teamMembers.map((item) => ({
                id: item.id,
                name: item.name,
                roleTitle: item.roleTitle,
                bio: item.bio,
                email: item.email,
                phone: item.phone,
                whatsapp: item.whatsapp,
                avatarImageUrl: item.avatarImageUrl,
                socialLinks: item.socialLinks,
                specialties: item.specialties,
                isLeadContact: item.isLeadContact,
            })),
            teamCount: teamMembers.length,
            activeListings: listings.length,
            totalViews: listings.reduce((sum, listing) => sum + listing.views, 0),
            totalFavorites: listings.reduce((sum, listing) => sum + listing.favs, 0),
            followers: countFollowers(user.id, vertical),
        },
        listings: listings.map((listing) => listingToPublicResponse(listing)),
    };
}

function getFollowRecords(userId: string): FollowRecord[] {
    return followsByUser.get(userId) ?? [];
}

function getFollowSetByVertical(userId: string, vertical: VerticalType): Set<string> {
    const records = getFollowRecords(userId);
    return new Set(records.filter((item) => item.vertical === vertical).map((item) => item.followeeUserId));
}

function countFollowers(followeeUserId: string, vertical: VerticalType): number {
    let count = 0;
    for (const entries of followsByUser.values()) {
        if (entries.some((entry) => entry.followeeUserId === followeeUserId && entry.vertical === vertical)) {
            count += 1;
        }
    }
    return count;
}

function buildAccountPublicProfileResponse(user: AppUser, vertical: VerticalType) {
    return {
        ok: true,
        featureEnabled: userCanUsePublicProfile(user, vertical),
        currentPlanId: getEffectivePlanId(user, vertical),
        currentPlanName: getCurrentPlanLabel(user, vertical),
        profile: buildEditablePublicProfile(user, vertical),
    };
}

function isAdminRole(role: UserRole): boolean {
    return role === 'admin' || role === 'superadmin';
}

// Returns true if the user is authorized to administer the given vertical.
// - superadmin: always true (platform-wide)
// - admin with matching primaryVertical: true for that vertical only
// - admin without primaryVertical (legacy): true for any vertical (backwards compat; migration sets it)
// - everyone else: false
function isAdminForVertical(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin') return true;
    if (user.role !== 'admin') return false;
    if (!user.primaryVertical) return true; // legacy admins without vertical scope
    return user.primaryVertical === vertical;
}

function isAdminBootstrapEnabled(): boolean {
    return asString(process.env.ENABLE_ADMIN_BOOTSTRAP).toLowerCase() === 'true';
}

async function requireAdminUser(c: Context): Promise<AppUser | null> {
    const user = await authUser(c);
    if (!user) {
        c.status(401);
        return null;
    }
    if (!isAdminRole(user.role)) {
        c.status(403);
        return null;
    }
    return user;
}

async function countActiveSuperadminUsers(): Promise<number> {
    const items = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.role, 'superadmin'),
                or(eq(users.status, 'active'), eq(users.status, 'verified'))
            )
        );
    return items.length;
}

function isActiveAdminStatus(status: UserStatus): boolean {
    return status === 'active' || status === 'verified';
}

async function permanentlyDeleteUser(userId: string): Promise<void> {
    let instagramAccountRows: Array<{ id: string; vertical: string }> = [];

    let listingMediaUrlsToDelete: string[] = [];

    await db.transaction(async (tx) => {
        const ownedListings = await tx
            .select({ id: listings.id, rawData: listings.rawData })
            .from(listings)
            .where(eq(listings.ownerId, userId));
        const ownedListingIds = ownedListings.map((item) => item.id);
        listingMediaUrlsToDelete = ownedListings.flatMap((item) =>
            extractAllListingMediaUrls(item as unknown as ListingRecord)
        );

        const listingLeadRows = await tx
            .select({ id: listingLeads.id })
            .from(listingLeads)
            .where(
                or(
                    eq(listingLeads.ownerUserId, userId),
                    eq(listingLeads.buyerUserId, userId),
                    eq(listingLeads.assignedToUserId, userId),
                    ownedListingIds.length > 0 ? sql`${listingLeads.listingId} = ANY(${ownedListingIds})` : sql`false`
                )
            );
        const listingLeadIds = listingLeadRows.map((item) => item.id);

        const threadRows = await tx
            .select({ id: messageThreads.id })
            .from(messageThreads)
            .where(
                or(
                    eq(messageThreads.ownerUserId, userId),
                    eq(messageThreads.buyerUserId, userId),
                    listingLeadIds.length > 0 ? sql`${messageThreads.leadId} = ANY(${listingLeadIds})` : sql`false`
                )
            );
        const threadIds = threadRows.map((item) => item.id);

        const serviceLeadRows = await tx
            .select({ id: serviceLeads.id })
            .from(serviceLeads)
            .where(or(eq(serviceLeads.userId, userId), eq(serviceLeads.assignedToUserId, userId)));
        const serviceLeadIds = serviceLeadRows.map((item) => item.id);

        instagramAccountRows = await tx
            .select({ id: instagramAccounts.id, vertical: instagramAccounts.vertical })
            .from(instagramAccounts)
            .where(eq(instagramAccounts.userId, userId));
        const instagramAccountIds = instagramAccountRows.map((item) => item.id);

        if (threadIds.length > 0) {
            await tx.delete(messageEntries).where(sql`${messageEntries.threadId} = ANY(${threadIds})`);
        }
        await tx.delete(messageEntries).where(eq(messageEntries.senderUserId, userId));
        if (threadIds.length > 0) {
            await tx.delete(messageThreads).where(sql`${messageThreads.id} = ANY(${threadIds})`);
        }

        if (listingLeadIds.length > 0) {
            await tx.delete(listingLeadActivities).where(sql`${listingLeadActivities.leadId} = ANY(${listingLeadIds})`);
        }
        await tx.delete(listingLeadActivities).where(eq(listingLeadActivities.actorUserId, userId));
        if (listingLeadIds.length > 0) {
            await tx.delete(listingLeads).where(sql`${listingLeads.id} = ANY(${listingLeadIds})`);
        }

        if (serviceLeadIds.length > 0) {
            await tx.delete(serviceLeadActivities).where(sql`${serviceLeadActivities.leadId} = ANY(${serviceLeadIds})`);
        }
        await tx.delete(serviceLeadActivities).where(eq(serviceLeadActivities.actorUserId, userId));
        if (serviceLeadIds.length > 0) {
            await tx.delete(serviceLeads).where(sql`${serviceLeads.id} = ANY(${serviceLeadIds})`);
        }

        if (instagramAccountIds.length > 0) {
            await tx.delete(instagramPublications).where(sql`${instagramPublications.instagramAccountId} = ANY(${instagramAccountIds})`);
        }
        await tx.delete(instagramPublications).where(eq(instagramPublications.userId, userId));

        if (ownedListingIds.length > 0) {
            await tx.delete(savedListings).where(sql`${savedListings.listingId} = ANY(${ownedListingIds})`);
        }
        await tx.delete(savedListings).where(eq(savedListings.userId, userId));

        if (ownedListingIds.length > 0) {
            await tx.delete(boostOrders).where(sql`${boostOrders.listingId} = ANY(${ownedListingIds})`);
        }
        await tx.delete(boostOrders).where(eq(boostOrders.userId, userId));

        await tx.delete(adCampaigns).where(eq(adCampaigns.userId, userId));
        await tx.delete(listingDrafts).where(eq(listingDrafts.userId, userId));
        await tx.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)));
        await tx.delete(crmPipelineColumns).where(eq(crmPipelineColumns.userId, userId));
        await tx.delete(publicProfileTeamMembers).where(eq(publicProfileTeamMembers.userId, userId));
        await tx.delete(publicProfiles).where(eq(publicProfiles.userId, userId));
        await tx.delete(instagramAccounts).where(eq(instagramAccounts.userId, userId));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

        if (ownedListingIds.length > 0) {
            await tx.delete(listings).where(sql`${listings.id} = ANY(${ownedListingIds})`);
        }
        await tx.delete(users).where(eq(users.id, userId));
    });

    usersById.delete(userId);
    savedByUser.delete(userId);
    followsByUser.delete(userId);
    boostOrdersByUser.delete(userId);
    addressBookByUser.delete(userId);
    paymentOrdersByUser.delete(userId);
    activeSubscriptionsByUser.delete(userId);
    instagramPublicationsByUser.delete(userId);
    publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'autos'));
    publicProfilesByUserVertical.delete(publicProfileUserVerticalKey(userId, 'propiedades'));
    publicProfileTeamMembersByUserVertical.delete(publicProfileUserVerticalKey(userId, 'autos'));
    publicProfileTeamMembersByUserVertical.delete(publicProfileUserVerticalKey(userId, 'propiedades'));

    for (const account of instagramAccountRows) {
        instagramAccountByUserVertical.delete(instagramAccountKey(userId, account.vertical as VerticalType));
    }

    for (const [listingId, listing] of listingsById.entries()) {
        if (listing.ownerId === userId) {
            listingsById.delete(listingId);
            listingLeadCountsByListing.delete(listingId);
        }
    }

    for (const [key, profile] of publicProfilesByVerticalSlug.entries()) {
        if (profile.userId === userId) {
            publicProfilesByVerticalSlug.delete(key);
        }
    }

    if (listingMediaUrlsToDelete.length > 0) {
        try {
            const storage = getStorageProvider();
            await Promise.allSettled(
                listingMediaUrlsToDelete
                    .map((url) => extractBackblazeObjectKey(url))
                    .filter((key) => key.length > 0)
                    .map((key) => storage.delete(key))
            );
        } catch {
            // Media cleanup is best-effort — don't fail the user delete
        }
    }
}

function adCampaignToResponse(record: AdCampaignRecord) {
    return {
        id: record.id,
        accountId: record.accountId,
        userId: record.userId,
        vertical: record.vertical,
        name: record.name,
        format: record.format,
        status: record.status,
        paymentStatus: record.paymentStatus,
        destinationType: record.destinationType,
        destinationUrl: record.destinationUrl,
        listingHref: record.listingHref,
        profileSlug: record.profileSlug,
        desktopImageDataUrl: record.desktopImageDataUrl,
        mobileImageDataUrl: record.mobileImageDataUrl,
        overlayEnabled: record.overlayEnabled,
        overlayTitle: record.overlayTitle,
        overlaySubtitle: record.overlaySubtitle,
        overlayCta: record.overlayCta,
        overlayAlign: record.overlayAlign,
        placementSection: record.placementSection,
        startAt: new Date(record.startAt).toISOString(),
        endAt: new Date(record.endAt).toISOString(),
        durationDays: record.durationDays,
        paidAt: record.paidAt ? new Date(record.paidAt).toISOString() : null,
        createdAt: new Date(record.createdAt).toISOString(),
        updatedAt: new Date(record.updatedAt).toISOString(),
    };
}

async function listAdCampaignRecords(options: {
    userId?: string;
    vertical?: VerticalType;
    paymentStatus?: AdPaymentStatus;
    onlyPublicActive?: boolean;
} = {}): Promise<AdCampaignRecord[]> {
    const conditions: any[] = [];
    if (options.userId) conditions.push(eq(adCampaigns.userId, options.userId));
    if (options.vertical) conditions.push(eq(adCampaigns.vertical, options.vertical));
    if (options.paymentStatus) conditions.push(eq(adCampaigns.paymentStatus, options.paymentStatus));

    let query = db.select().from(adCampaigns).$dynamic();
    if (conditions.length === 1) {
        query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
        query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(adCampaigns.createdAt));
    const rows = await query;
    const normalized = normalizeAdCampaigns(rows.map(mapAdCampaignRow));
    if (!options.onlyPublicActive) return normalized;
    return normalized.filter((item) => item.paymentStatus === 'paid' && item.status === 'active');
}

async function getAdCampaignRecordById(id: string): Promise<AdCampaignRecord | null> {
    const rows = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id)).limit(1);
    if (rows.length === 0) return null;
    return normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0] ?? null;
}

async function getAdCampaignRecordForUser(userId: string, id: string): Promise<AdCampaignRecord | null> {
    const rows = await db
        .select()
        .from(adCampaigns)
        .where(and(eq(adCampaigns.id, id), eq(adCampaigns.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    return normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0] ?? null;
}

function sanitizeAdCampaignWriteInput(
    input: {
        name: string;
        destinationType: AdDestinationType;
        destinationUrl?: string | null;
        listingHref?: string | null;
        profileSlug?: string | null;
        desktopImageDataUrl: string;
        mobileImageDataUrl?: string | null;
        overlayEnabled: boolean;
        overlayTitle?: string | null;
        overlaySubtitle?: string | null;
        overlayCta?: string | null;
        overlayAlign: AdOverlayAlign;
    },
    options: {
        vertical: VerticalType;
        format: AdFormat;
        placementSection?: AdPlacementSection | null;
    }
) {
    const destinationType = input.destinationType;
    const destinationUrl = destinationType === 'custom_url' ? (input.destinationUrl?.trim() || null) : null;
    const listingHref = destinationType === 'listing' ? (input.listingHref?.trim() || null) : null;
    const profileSlug = destinationType === 'profile' ? (input.profileSlug?.trim() || null) : null;
    const placementSection = options.format === 'inline'
        ? (options.placementSection ?? null)
        : null;

    if (destinationType === 'custom_url') {
        if (!destinationUrl || !isValidHttpDestinationUrl(destinationUrl)) {
            throw new Error('La URL de destino no es válida.');
        }
    }
    if (destinationType === 'listing' && !listingHref) {
        throw new Error('Debes elegir una publicación como destino.');
    }
    if (destinationType === 'profile' && !profileSlug) {
        throw new Error('Debes ingresar el slug del perfil.');
    }

    if (options.format === 'inline') {
        if (!placementSection || !isAdPlacementSectionAllowed(options.vertical, placementSection)) {
            throw new Error('La sección objetivo de la campaña inline no es válida.');
        }
    }

    return {
        name: input.name.trim(),
        destinationType,
        destinationUrl,
        listingHref,
        profileSlug,
        desktopImageDataUrl: input.desktopImageDataUrl.trim(),
        mobileImageDataUrl: input.mobileImageDataUrl?.trim() || null,
        overlayEnabled: input.overlayEnabled,
        overlayTitle: input.overlayEnabled ? (input.overlayTitle?.trim() || null) : null,
        overlaySubtitle: input.overlayEnabled ? (input.overlaySubtitle?.trim() || null) : null,
        overlayCta: input.overlayEnabled ? (input.overlayCta?.trim() || null) : null,
        overlayAlign: input.overlayAlign,
        placementSection,
    };
}

function serviceLeadStatusLabel(status: ServiceLeadStatus): string {
    if (status === 'contacted') return 'Contactado';
    if (status === 'qualified') return 'Calificado';
    if (status === 'closed') return 'Cerrado';
    return 'Nuevo';
}

function leadPriorityLabel(priority: LeadPriority): string {
    if (priority === 'high') return 'Alta';
    if (priority === 'low') return 'Baja';
    return 'Media';
}

function normalizeLeadTags(tags: string[] | undefined): string[] {
    if (!tags) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const rawTag of tags) {
        const tag = rawTag.trim().toLowerCase();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        result.push(tag);
        if (result.length >= 8) break;
    }
    return result;
}

function getLeadQuickActionLabel(action: LeadQuickAction): string {
    if (action === 'call') return 'Llamada';
    if (action === 'whatsapp') return 'WhatsApp';
    if (action === 'email') return 'Correo';
    return 'Seguimiento';
}

function leadSignalSeverity(signal: LeadSlaSignal): number {
    return signal.tone === 'urgent' ? 2 : 1;
}

function isSameCalendarDay(timestamp: number, reference = Date.now()): boolean {
    const left = new Date(timestamp);
    const right = new Date(reference);
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function buildLeadSlaSignals(input: {
    status: ServiceLeadStatus | ListingLeadStatus;
    priority: LeadPriority;
    nextTaskAt: number | null;
    lastActivityAt: number;
}): LeadSlaSignal[] {
    if (input.status === 'closed') return [];

    const now = Date.now();
    const idleHours = Math.max(0, Math.floor((now - input.lastActivityAt) / (1000 * 60 * 60)));
    const signals: LeadSlaSignal[] = [];

    if (input.nextTaskAt != null) {
        if (input.nextTaskAt <= now) {
            signals.push({
                key: 'task_overdue',
                label: `Tarea vencida ${formatAgo(input.nextTaskAt)}`,
                tone: 'urgent',
            });
        } else if (isSameCalendarDay(input.nextTaskAt, now)) {
            signals.push({
                key: 'task_due_today',
                label: `Tarea ${formatRelativeTimestamp(input.nextTaskAt)}`,
                tone: 'attention',
            });
        }
    }

    if (input.status === 'new' && idleHours >= 2) {
        signals.push({
            key: 'response_overdue',
            label: `Sin respuesta ${formatAgo(input.lastActivityAt)}`,
            tone: idleHours >= 12 ? 'urgent' : 'attention',
        });
    }

    if (input.priority === 'high') {
        signals.push({
            key: 'hot_lead',
            label: 'Lead caliente',
            tone: idleHours >= 4 ? 'urgent' : 'attention',
        });
    }

    if (signals.length === 0 && idleHours >= 24) {
        signals.push({
            key: 'idle_follow_up',
            label: `Sin gestión ${formatAgo(input.lastActivityAt)}`,
            tone: idleHours >= 72 ? 'urgent' : 'attention',
        });
    }

    return signals.sort((left, right) => leadSignalSeverity(right) - leadSignalSeverity(left));
}

function getLeadAttentionLevel(input: {
    status: ServiceLeadStatus | ListingLeadStatus;
    priority: LeadPriority;
    nextTaskAt: number | null;
    lastActivityAt: number;
}): LeadAttentionLevel {
    if (input.status === 'closed') return 'fresh';
    const signals = buildLeadSlaSignals(input);
    if (signals.some((signal) => signal.tone === 'urgent')) return 'urgent';
    if (signals.some((signal) => signal.tone === 'attention')) return 'attention';
    return 'fresh';
}

function leadAttentionLabel(level: LeadAttentionLevel, signals: LeadSlaSignal[]): string | null {
    if (level === 'fresh') return null;
    return signals[0]?.label ?? null;
}

function buildLeadQuickFollowUpAt(now = Date.now()): number {
    const target = new Date(now);
    if (target.getHours() >= 18) {
        target.setDate(target.getDate() + 1);
        target.setHours(10, 0, 0, 0);
        return target.getTime();
    }

    target.setHours(18, 0, 0, 0);
    if (target.getTime() <= now) {
        target.setHours(target.getHours() + 2);
    }
    return target.getTime();
}

function serviceLeadServiceLabel(type: ServiceLeadType): string {
    return type === 'gestion_inmobiliaria' ? 'Gestion inmobiliaria' : 'Venta asistida';
}

function serviceLeadActivityLabel(type: ServiceLeadActivityType): string {
    if (type === 'assignment') return 'Asignacion';
    if (type === 'status') return 'Estado';
    if (type === 'task') return 'Proxima tarea';
    if (type === 'contact') return 'Contacto';
    if (type === 'note') return 'Nota interna';
    return 'Creacion';
}

function crmAssigneeValue(input: { kind: 'user' | 'team_member'; id: string }): string {
    return `${input.kind}:${input.id}`;
}

function serviceLeadAssigneeToResponse(user: AppUser | null | undefined): CrmAssigneeResponse | null {
    if (!user) return null;
    return {
        id: user.id,
        kind: 'user',
        value: crmAssigneeValue({ kind: 'user', id: user.id }),
        name: user.name,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
        roleTitle: user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Admin' : 'Cuenta principal',
        isLeadContact: true,
    };
}

function teamMemberAssigneeToResponse(member: PublicProfileTeamMemberRecord): CrmAssigneeResponse {
    return {
        id: member.id,
        kind: 'team_member',
        value: crmAssigneeValue({ kind: 'team_member', id: member.id }),
        name: member.name,
        email: member.email,
        phone: member.whatsapp || member.phone,
        role: null,
        roleTitle: member.roleTitle,
        isLeadContact: member.isLeadContact,
    };
}

function getLeadRoutingCandidates(ownerUserId: string, vertical: VerticalType) {
    return getEditablePublicProfileTeamMembers(ownerUserId, vertical)
        .filter((item) => item.receivesLeads);
}

function listingLeadAssigneeToResponse(record: ListingLeadRecord): CrmAssigneeResponse | null {
    if (record.assignedToTeamMemberId) {
        const teamMember = getEditablePublicProfileTeamMembers(record.ownerUserId, record.vertical)
            .find((item) => item.id === record.assignedToTeamMemberId) ?? null;
        if (teamMember) return teamMemberAssigneeToResponse(teamMember);
    }
    if (record.assignedToUserId) {
        return serviceLeadAssigneeToResponse(usersById.get(record.assignedToUserId) ?? null);
    }
    return null;
}

async function resolveInitialListingLeadAssignment(ownerUserId: string, vertical: VerticalType): Promise<{
    assignedToUserId: string | null;
    assignedToTeamMemberId: string | null;
}> {
    const profile = getPublicProfileRecord(ownerUserId, vertical);
    const routingMode = profile?.leadRoutingMode ?? 'round_robin';
    if (routingMode === 'unassigned') {
        return {
            assignedToUserId: null,
            assignedToTeamMemberId: null,
        };
    }
    if (routingMode === 'owner') {
        return {
            assignedToUserId: ownerUserId,
            assignedToTeamMemberId: null,
        };
    }

    const candidateTeam = getLeadRoutingCandidates(ownerUserId, vertical);

    if (candidateTeam.length === 0) {
        return {
            assignedToUserId: ownerUserId,
            assignedToTeamMemberId: null,
        };
    }

    const cursor = profile?.leadRoutingCursor ?? 0;
    const nextMember = candidateTeam[cursor % candidateTeam.length] ?? candidateTeam[0]!;
    if (profile?.id) {
        const rows = await db
            .update(publicProfiles)
            .set({ leadRoutingCursor: cursor + 1 })
            .where(eq(publicProfiles.id, profile.id))
            .returning();
        const savedProfile = rows[0] ?? null;
        if (savedProfile) {
            upsertPublicProfileCache(mapPublicProfileRow(savedProfile));
        }
    }
    return {
        assignedToUserId: null,
        assignedToTeamMemberId: nextMember.id,
    };
}

function listListingLeadAssignees(ownerUserId: string, vertical: VerticalType): CrmAssigneeResponse[] {
    const owner = usersById.get(ownerUserId) ?? null;
    const ownerAssignee = owner ? serviceLeadAssigneeToResponse(owner) : null;
    const team = getEditablePublicProfileTeamMembers(ownerUserId, vertical).map(teamMemberAssigneeToResponse);
    const items = ownerAssignee ? [ownerAssignee, ...team] : team;
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
    });
}

function serviceLeadToResponse(record: ServiceLeadRecord) {
    const assignedTo = record.assignedToUserId ? usersById.get(record.assignedToUserId) ?? null : null;
    const slaSignals = buildLeadSlaSignals({
        status: record.status,
        priority: record.priority,
        nextTaskAt: record.nextTaskAt,
        lastActivityAt: record.lastActivityAt,
    });
    const attentionLevel = getLeadAttentionLevel({
        status: record.status,
        priority: record.priority,
        nextTaskAt: record.nextTaskAt,
        lastActivityAt: record.lastActivityAt,
    });
    return {
        id: record.id,
        userId: record.userId,
        vertical: record.vertical,
        serviceType: record.serviceType,
        serviceLabel: serviceLeadServiceLabel(record.serviceType),
        planId: record.planId,
        contactName: record.contactName,
        contactEmail: record.contactEmail,
        contactPhone: record.contactPhone,
        contactWhatsapp: record.contactWhatsapp,
        locationLabel: record.locationLabel,
        assetType: record.assetType,
        assetBrand: record.assetBrand,
        assetModel: record.assetModel,
        assetYear: record.assetYear,
        assetMileage: record.assetMileage,
        assetArea: record.assetArea,
        expectedPrice: record.expectedPrice,
        notes: record.notes,
        status: record.status,
        statusLabel: serviceLeadStatusLabel(record.status),
        priority: record.priority,
        priorityLabel: leadPriorityLabel(record.priority),
        closeReason: record.closeReason,
        tags: record.tags,
        assignedToUserId: record.assignedToUserId,
        assignedToValue: assignedTo ? crmAssigneeValue({ kind: 'user', id: assignedTo.id }) : null,
        assignedTo: serviceLeadAssigneeToResponse(assignedTo),
        nextTaskTitle: record.nextTaskTitle,
        nextTaskAt: record.nextTaskAt,
        nextTaskAgo: record.nextTaskAt ? formatRelativeTimestamp(record.nextTaskAt) : null,
        sourcePage: record.sourcePage,
        lastActivityAt: record.lastActivityAt,
        lastActivityAgo: formatAgo(record.lastActivityAt),
        attentionLevel,
        attentionLabel: leadAttentionLabel(attentionLevel, slaSignals),
        slaSignals,
        createdAt: record.createdAt,
        createdAgo: formatAgo(record.createdAt),
        updatedAt: record.updatedAt,
    };
}

function serviceLeadActivityToResponse(record: ServiceLeadActivityRecord) {
    const actor = record.actorUserId ? usersById.get(record.actorUserId) ?? null : null;
    return {
        id: record.id,
        type: record.type,
        label: serviceLeadActivityLabel(record.type),
        body: record.body,
        meta: record.meta,
        createdAt: record.createdAt,
        createdAgo: formatAgo(record.createdAt),
        actor: actor ? {
            id: actor.id,
            name: actor.name,
            email: actor.email,
        } : null,
    };
}

function listingLeadStatusLabel(status: ListingLeadStatus): string {
    if (status === 'contacted') return 'Contactado';
    if (status === 'qualified') return 'Calificado';
    if (status === 'closed') return 'Cerrado';
    return 'Nuevo';
}

function listingLeadSourceLabel(source: ListingLeadSource, vertical?: VerticalType): string {
    if (source === 'direct_message') return 'Mensaje directo';
    if (source === 'whatsapp') return 'WhatsApp';
    if (source === 'phone_call') return 'Llamada';
    if (source === 'email') return 'Correo';
    if (source === 'instagram') return 'Instagram';
    if (source === 'facebook') return 'Facebook';
    if (source === 'mercadolibre') return vertical === 'propiedades' ? 'Portal Inmobiliario' : 'MercadoLibre';
    if (source === 'yapo') return 'Yapo';
    if (source === 'chileautos') return 'Chileautos';
    if (source === 'portal') return 'Portal externo';
    return 'Formulario interno';
}

function listingLeadChannelLabel(channel: ListingLeadChannel): string {
    if (channel === 'message') return 'Mensaje';
    if (channel === 'social') return 'Red social';
    if (channel === 'portal') return 'Portal';
    return 'Lead';
}

function listingLeadActivityLabel(type: ListingLeadActivityType): string {
    if (type === 'assignment') return 'Asignacion';
    if (type === 'status') return 'Estado';
    if (type === 'task') return 'Proxima tarea';
    if (type === 'contact') return 'Contacto';
    if (type === 'note') return 'Nota interna';
    if (type === 'message') return 'Mensaje';
    return 'Creacion';
}

function listingLeadToResponse(record: ListingLeadRecord, options?: { threadId?: string | null; pipelineColumns?: PipelineColumnRecord[] }) {
    const listing = listingsById.get(record.listingId) ?? null;
    const owner = usersById.get(record.ownerUserId) ?? null;
    const buyer = record.buyerUserId ? usersById.get(record.buyerUserId) ?? null : null;
    const pipelineColumn = resolveListingLeadPipelineColumn(record, options?.pipelineColumns ?? []);
    const assignedTo = listingLeadAssigneeToResponse(record);
    const slaSignals = buildLeadSlaSignals({
        status: record.status,
        priority: record.priority,
        nextTaskAt: record.nextTaskAt,
        lastActivityAt: record.lastActivityAt,
    });
    const attentionLevel = getLeadAttentionLevel({
        status: record.status,
        priority: record.priority,
        nextTaskAt: record.nextTaskAt,
        lastActivityAt: record.lastActivityAt,
    });

    return {
        id: record.id,
        accountId: record.accountId,
        listingId: record.listingId,
        entityType: record.entityType,
        entityId: record.entityId,
        vertical: record.vertical,
        source: record.source,
        sourceLabel: listingLeadSourceLabel(record.source, record.vertical),
        channel: record.channel,
        channelLabel: listingLeadChannelLabel(record.channel),
        contactName: record.contactName,
        contactEmail: record.contactEmail,
        contactPhone: record.contactPhone,
        contactWhatsapp: record.contactWhatsapp,
        message: record.message,
        status: record.status,
        statusLabel: listingLeadStatusLabel(record.status),
        priority: record.priority,
        priorityLabel: leadPriorityLabel(record.priority),
        closeReason: record.closeReason,
        tags: record.tags,
        assignedToUserId: record.assignedToUserId,
        assignedToTeamMemberId: record.assignedToTeamMemberId,
        assignedToValue: assignedTo?.value ?? null,
        assignedTo,
        pipelineColumnId: pipelineColumn?.id ?? record.pipelineColumnId ?? null,
        pipelineColumnName: pipelineColumn?.name ?? null,
        nextTaskTitle: record.nextTaskTitle,
        nextTaskAt: record.nextTaskAt,
        nextTaskAgo: record.nextTaskAt ? formatRelativeTimestamp(record.nextTaskAt) : null,
        sourcePage: record.sourcePage,
        externalSourceId: record.externalSourceId,
        lastActivityAt: record.lastActivityAt,
        lastActivityAgo: formatAgo(record.lastActivityAt),
        attentionLevel,
        attentionLabel: leadAttentionLabel(attentionLevel, slaSignals),
        slaSignals,
        createdAt: record.createdAt,
        createdAgo: formatAgo(record.createdAt),
        updatedAt: record.updatedAt,
        listing: listing ? {
            id: listing.id,
            title: listing.title,
            href: listing.href,
            section: listing.section,
            sectionLabel: publicSectionLabel(listing.section),
            price: listing.price,
            location: listing.location ?? '',
        } : null,
        owner: owner ? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
        } : null,
        buyer: buyer ? {
            id: buyer.id,
            name: buyer.name,
            email: buyer.email,
        } : null,
        threadId: options?.threadId ?? null,
    };
}

function listingLeadActivityToResponse(record: ListingLeadActivityRecord) {
    const actor = record.actorUserId ? usersById.get(record.actorUserId) ?? null : null;
    return {
        id: record.id,
        type: record.type,
        label: listingLeadActivityLabel(record.type),
        body: record.body,
        meta: record.meta,
        createdAt: record.createdAt,
        createdAgo: formatAgo(record.createdAt),
        actor: actor ? {
            id: actor.id,
            name: actor.name,
            email: actor.email,
        } : null,
    };
}

function getMessageThreadViewerRole(thread: MessageThreadRecord, viewerUserId: string): 'seller' | 'buyer' {
    return viewerUserId === thread.ownerUserId ? 'seller' : 'buyer';
}

function getMessageThreadUnreadCount(thread: MessageThreadRecord, viewerUserId: string): number {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerUnreadCount
        : thread.buyerUnreadCount;
}

function isMessageThreadArchived(thread: MessageThreadRecord, viewerUserId: string): boolean {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerArchivedAt != null
        : thread.buyerArchivedAt != null;
}

function isMessageThreadSpam(thread: MessageThreadRecord, viewerUserId: string): boolean {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerSpamAt != null
        : thread.buyerSpamAt != null;
}

function getMessageThreadFolder(thread: MessageThreadRecord, viewerUserId: string): MessageFolder {
    if (isMessageThreadSpam(thread, viewerUserId)) return 'spam';
    if (isMessageThreadArchived(thread, viewerUserId)) return 'archived';
    return 'inbox';
}

function messageThreadToResponse(thread: MessageThreadRecord, viewerUserId: string, entries: MessageEntryRecord[] = []) {
    const listing = listingsById.get(thread.listingId) ?? null;
    const owner = usersById.get(thread.ownerUserId) ?? null;
    const buyer = usersById.get(thread.buyerUserId) ?? null;
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const counterpart = viewerRole === 'seller' ? buyer : owner;
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    const unreadCount = getMessageThreadUnreadCount(thread, viewerUserId);
    const archived = isMessageThreadArchived(thread, viewerUserId);
    const spam = isMessageThreadSpam(thread, viewerUserId);
    const folder = getMessageThreadFolder(thread, viewerUserId);

    return {
        id: thread.id,
        vertical: thread.vertical,
        viewerRole,
        listing: listing ? {
            id: listing.id,
            title: listing.title,
            href: listing.href,
            section: listing.section,
            sectionLabel: publicSectionLabel(listing.section),
            price: listing.price,
            location: listing.location ?? '',
        } : null,
        counterpart: counterpart ? {
            id: counterpart.id,
            name: counterpart.name,
            email: counterpart.email,
        } : null,
        leadId: thread.leadId,
        unreadCount,
        archived,
        spam,
        folder,
        lastMessageAt: thread.lastMessageAt,
        lastMessageAgo: formatAgo(thread.lastMessageAt),
        lastMessagePreview: lastEntry?.body ?? null,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
    };
}

function messageEntryToResponse(entry: MessageEntryRecord, viewerUserId: string) {
    const sender = usersById.get(entry.senderUserId) ?? null;
    return {
        id: entry.id,
        threadId: entry.threadId,
        senderRole: entry.senderRole,
        body: entry.body,
        createdAt: entry.createdAt,
        createdAgo: formatAgo(entry.createdAt),
        isMine: entry.senderUserId === viewerUserId,
        sender: sender ? {
            id: sender.id,
            name: sender.name,
            email: sender.email,
        } : null,
    };
}

function buildListingLeadNotification(record: ListingLeadRecord) {
    const listing = listingsById.get(record.listingId) ?? null;
    return {
        id: `listing-lead:${record.id}`,
        type: 'listing_lead' as const,
        title: `${record.contactName} consulto por ${listing?.title ?? 'tu publicación'}.`,
        time: formatAgo(record.createdAt),
        href: '/panel/crm',
        createdAt: record.createdAt,
    };
}

async function buildMessageThreadNotification(thread: MessageThreadRecord, viewerUserId: string) {
    if (getMessageThreadFolder(thread, viewerUserId) !== 'inbox' || getMessageThreadUnreadCount(thread, viewerUserId) <= 0) {
        return null;
    }
    const entries = await listMessageEntries(thread.id);
    const lastEntry = entries[entries.length - 1] ?? null;
    const listing = listingsById.get(thread.listingId) ?? null;
    const counterpartId = viewerUserId === thread.ownerUserId ? thread.buyerUserId : thread.ownerUserId;
    const counterpart = usersById.get(counterpartId) ?? null;
    return {
        id: `message-thread:${thread.id}`,
        type: 'message_thread' as const,
        title: lastEntry
            ? `${counterpart?.name ?? 'Contacto'} escribió por ${listing?.title ?? 'tu publicación'}.`
            : `Conversación activa por ${listing?.title ?? 'tu publicación'}.`,
        time: formatAgo(thread.lastMessageAt),
        href: `/panel/mensajes?thread=${encodeURIComponent(thread.id)}`,
        createdAt: thread.lastMessageAt,
    };
}

function incrementListingLeadCount(listingId: string, amount = 1): void {
    const nextCount = Math.max(0, (listingLeadCountsByListing.get(listingId) ?? 0) + amount);
    listingLeadCountsByListing.set(listingId, nextCount);
    const listing = listingsById.get(listingId);
    if (listing) {
        listing.leads = nextCount;
        listingsById.set(listingId, listing);
    }
}

function buildServiceLeadNotification(record: ServiceLeadRecord) {
    const subject = [
        record.assetType,
        record.assetBrand,
        record.assetModel,
        record.assetYear,
    ].filter(Boolean).join(' ');

    const title = record.vertical === 'propiedades'
        ? `${record.contactName} solicito gestion inmobiliaria${subject ? ` para ${subject}` : ''}.`
        : `${record.contactName} solicito venta asistida${subject ? ` para ${subject}` : ''}.`;

    return {
        id: record.id,
        type: 'service_lead' as const,
        title,
        time: formatAgo(record.createdAt),
        href: '/panel/crm',
        createdAt: record.createdAt,
    };
}

function getEnvStatus() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM),
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        instagramConfigured: isInstagramConfigured(),
        leadIngestConfigured: isLeadIngestConfigured(),
        googleOAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        sessionConfigured: Boolean(process.env.SESSION_SECRET),
    };
}

export async function authUser(c: Context): Promise<AppUser | null> {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return null;
    let userId: string | null = null;
    try {
        const payload = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload;
        userId = typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
        userId = null;
    }
    if (!userId) return null;
    const user = await getUserById(userId);
    if (!user || !canAuthenticateUser(user)) return null;
    const account = await ensurePrimaryAccountForUser(user);
    return applyRuntimeRole({
        ...user,
        primaryAccountId: account.id,
    });
}

function isVerifiedUser(user: AppUser): boolean {
    return user.status === 'verified';
}

function emailVerificationRequiredResponse(c: Context) {
    return c.json(
        {
            ok: false,
            error: 'Debes verificar tu correo para acceder a esta seccion del panel.',
            code: 'EMAIL_VERIFICATION_REQUIRED',
        },
        403
    );
}

async function requireVerifiedSession(c: Context, next: () => Promise<void>) {
    const user = await authUser(c);
    if (!user) {
        return c.json({ ok: false, error: 'No autenticado' }, 401);
    }
    if (!isVerifiedUser(user)) {
        return emailVerificationRequiredResponse(c);
    }
    await next();
}

function setSession(c: Context, userId: string): void {
    const sessionToken = jwt.sign({ sub: userId }, SESSION_SECRET, { expiresIn: '14d' });

    // En desarrollo local, permitir cookies cross-origin
    const origin = c.req.header('origin');
    const isLocalDev = !origin || isLocalOrigin(origin);

    setCookie(c, SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: isLocalDev ? 'none' as const : authCookieSameSite,
        secure: isLocalDev ? true : authCookieSecure,
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
    });
}

function clearSession(c: Context): void {
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

function setOAuthState(c: Context, state: string): void {
    setCookie(c, OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        sameSite: authCookieSameSite,
        secure: authCookieSecure,
        path: '/',
        maxAge: 60 * 10,
    });
}

function consumeOAuthState(c: Context): string {
    const cookieState = asString(getCookie(c, OAUTH_STATE_COOKIE));
    deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });
    return cookieState;
}

function setInstagramState(c: Context, payload: string): void {
    setCookie(c, INSTAGRAM_STATE_COOKIE, payload, {
        httpOnly: true,
        sameSite: authCookieSameSite,
        secure: authCookieSecure,
        path: '/',
        maxAge: 60 * 10,
    });
}

function consumeInstagramState(c: Context): string {
    const cookieState = asString(getCookie(c, INSTAGRAM_STATE_COOKIE));
    deleteCookie(c, INSTAGRAM_STATE_COOKIE, { path: '/' });
    return cookieState;
}

function getAllowedOrigins(): Set<string> {
    const raw = process.env.CORS_ORIGINS;
    if (!raw) {
        return new Set([
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:3004',
            'http://localhost:3005',
            'https://simpleautos.app',
            'https://simplepropiedades.app',
            'https://simpleagenda.app',
            'https://simpleadmin.app',
            'https://simpleplataforma.app',
            'https://www.simpleautos.app',
            'https://www.simplepropiedades.app',
            'https://www.simpleagenda.app',
            'https://www.simpleadmin.app',
            'https://www.simpleplataforma.app',
        ]);
    }

    return new Set(
        raw
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    );
}

const allowedOrigins = getAllowedOrigins();
const defaultOrigin = Array.from(allowedOrigins)[0] ?? 'http://localhost:3000';

async function listServiceLeadRecords(options: {
    vertical?: VerticalType;
    status?: ServiceLeadStatus;
    limit?: number;
} = {}): Promise<ServiceLeadRecord[]> {
    const conditions: any[] = [];
    if (options.vertical) conditions.push(eq(serviceLeads.vertical, options.vertical));
    if (options.status) conditions.push(eq(serviceLeads.status, options.status));

    let query = db.select().from(serviceLeads).$dynamic();
    if (conditions.length === 1) {
        query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
        query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(serviceLeads.createdAt));
    if (options.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map(mapServiceLeadRow);
}

async function getServiceLeadById(id: string): Promise<ServiceLeadRecord | null> {
    const rows = await db.select().from(serviceLeads).where(eq(serviceLeads.id, id)).limit(1);
    if (rows.length === 0) return null;
    return mapServiceLeadRow(rows[0]);
}

async function listServiceLeadActivities(leadId: string): Promise<ServiceLeadActivityRecord[]> {
    const rows = await db
        .select()
        .from(serviceLeadActivities)
        .where(eq(serviceLeadActivities.leadId, leadId))
        .orderBy(desc(serviceLeadActivities.createdAt));
    return rows.map(mapServiceLeadActivityRow);
}

async function createServiceLeadActivity(input: {
    leadId: string;
    actorUserId?: string | null;
    type: ServiceLeadActivityType;
    body: string;
    meta?: Record<string, unknown> | null;
    createdAt?: number;
}) {
    const activityTime = new Date(input.createdAt ?? Date.now());
    const rows = await db.insert(serviceLeadActivities).values({
        leadId: input.leadId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        body: input.body,
        meta: input.meta ?? null,
        createdAt: activityTime,
    }).returning();
    await db.update(serviceLeads).set({
        lastActivityAt: activityTime,
        updatedAt: activityTime,
    }).where(eq(serviceLeads.id, input.leadId));
    return mapServiceLeadActivityRow(rows[0]);
}

async function listCrmAssignableUsers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: Extract<UserRole, 'admin' | 'superadmin'>;
}>> {
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
        })
        .from(users)
        .where(or(eq(users.role, 'admin'), eq(users.role, 'superadmin')))
        .orderBy(asc(users.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as Extract<UserRole, 'admin' | 'superadmin'>,
    }));
}

function parseServiceLeadTaskAt(value: string | null | undefined): number | null {
    if (value == null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function formatServiceLeadTimestamp(timestamp: number): string {
    return new Intl.DateTimeFormat('es-CL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(timestamp));
}

const DEFAULT_LISTING_PIPELINE_COLUMNS: Array<{ name: string; status: ListingLeadStatus }> = [
    { name: 'Nuevos', status: 'new' },
    { name: 'Contactados', status: 'contacted' },
    { name: 'Calificados', status: 'qualified' },
    { name: 'Cerrados', status: 'closed' },
];

function pipelineColumnToResponse(column: PipelineColumnRecord) {
    return {
        id: column.id,
        accountId: column.accountId,
        userId: column.userId,
        vertical: column.vertical,
        scope: column.scope,
        name: column.name,
        status: column.status,
        statusLabel: listingLeadStatusLabel(column.status),
        position: column.position,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
    };
}

async function listPipelineColumns(userId: string, vertical: VerticalType, scope: PipelineColumnScope = 'listing'): Promise<PipelineColumnRecord[]> {
    const rows = await db
        .select()
        .from(crmPipelineColumns)
        .where(and(
            eq(crmPipelineColumns.userId, userId),
            eq(crmPipelineColumns.vertical, vertical),
            eq(crmPipelineColumns.scope, scope),
        ))
        .orderBy(asc(crmPipelineColumns.position), asc(crmPipelineColumns.createdAt));
    return rows.map(mapPipelineColumnRow);
}

async function ensureListingPipelineColumns(userId: string, vertical: VerticalType): Promise<PipelineColumnRecord[]> {
    const existing = await listPipelineColumns(userId, vertical, 'listing');
    if (existing.length > 0) return existing;

    const accountId = await getPrimaryAccountIdForUser(userId);
    const rows = await db.insert(crmPipelineColumns).values(
        DEFAULT_LISTING_PIPELINE_COLUMNS.map((column, index) => ({
            accountId,
            userId,
            vertical,
            scope: 'listing',
            name: column.name,
            status: column.status,
            position: index,
        }))
    ).returning();

    return rows.map(mapPipelineColumnRow).sort((left, right) => left.position - right.position);
}

function resolveListingLeadPipelineColumn(lead: ListingLeadRecord, columns: PipelineColumnRecord[]): PipelineColumnRecord | null {
    if (columns.length === 0) return null;
    const explicit = lead.pipelineColumnId ? columns.find((column) => column.id === lead.pipelineColumnId) ?? null : null;
    if (explicit) return explicit;
    return columns.find((column) => column.status === lead.status) ?? columns[0] ?? null;
}

async function getListingPipelineColumnById(id: string): Promise<PipelineColumnRecord | null> {
    const rows = await db.select().from(crmPipelineColumns).where(eq(crmPipelineColumns.id, id)).limit(1);
    if (rows.length === 0) return null;
    return mapPipelineColumnRow(rows[0]);
}

async function reorderPipelineColumns(userId: string, vertical: VerticalType, columnIds: string[]) {
    const columns = await ensureListingPipelineColumns(userId, vertical);
    if (columns.length !== columnIds.length) {
        return { ok: false as const, error: 'El orden de columnas es inválido.' };
    }

    const knownIds = new Set(columns.map((column) => column.id));
    if (columnIds.some((id) => !knownIds.has(id))) {
        return { ok: false as const, error: 'El orden de columnas es inválido.' };
    }

    for (let index = 0; index < columnIds.length; index += 1) {
        await db.update(crmPipelineColumns).set({
            position: index,
            updatedAt: new Date(),
        }).where(eq(crmPipelineColumns.id, columnIds[index]!));
    }

    return {
        ok: true as const,
        items: await listPipelineColumns(userId, vertical, 'listing'),
    };
}

async function buildServiceLeadDetailPayload(record: ServiceLeadRecord) {
    const [activities, assignees] = await Promise.all([
        listServiceLeadActivities(record.id),
        listCrmAssignableUsers(),
    ]);

    return {
        item: serviceLeadToResponse(record),
        activities: activities.map(serviceLeadActivityToResponse),
        assignees,
    };
}

async function updateServiceLeadRecord(input: {
    actor: AppUser;
    lead: ServiceLeadRecord;
    changes: z.infer<typeof serviceLeadUpdateSchema>;
}) {
    const updates: Record<string, unknown> = {
        updatedAt: new Date(),
    };
    const activities: Array<{ type: ServiceLeadActivityType; body: string; meta?: Record<string, unknown> | null }> = [];

    if (input.changes.status && input.changes.status !== input.lead.status) {
        updates.status = input.changes.status;
        activities.push({
            type: 'status',
            body: `Estado cambiado de ${serviceLeadStatusLabel(input.lead.status)} a ${serviceLeadStatusLabel(input.changes.status)}.`,
            meta: { from: input.lead.status, to: input.changes.status },
        });
    }

    if (input.changes.priority && input.changes.priority !== input.lead.priority) {
        updates.priority = input.changes.priority;
        activities.push({
            type: 'note',
            body: `Prioridad cambiada de ${leadPriorityLabel(input.lead.priority)} a ${leadPriorityLabel(input.changes.priority)}.`,
            meta: { kind: 'priority', from: input.lead.priority, to: input.changes.priority },
        });
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'closeReason')) {
        const closeReason = input.changes.closeReason?.trim() || null;
        if (closeReason !== input.lead.closeReason) {
            updates.closeReason = closeReason;
            activities.push({
                type: 'note',
                body: closeReason ? `Motivo de cierre actualizado: ${closeReason}.` : 'Motivo de cierre eliminado.',
                meta: { kind: 'close_reason', value: closeReason },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'tags')) {
        const nextTags = normalizeLeadTags(input.changes.tags);
        if (JSON.stringify(nextTags) !== JSON.stringify(input.lead.tags)) {
            updates.tags = nextTags;
            activities.push({
                type: 'note',
                body: nextTags.length > 0 ? `Etiquetas actualizadas: ${nextTags.join(', ')}.` : 'Etiquetas eliminadas.',
                meta: { kind: 'tags', value: nextTags },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'assignedToUserId')) {
        let nextAssignedId: string | null = input.changes.assignedToUserId ?? null;
        if (nextAssignedId) {
            const nextAssignedUser = usersById.get(nextAssignedId);
            if (!nextAssignedUser || !isAdminRole(nextAssignedUser.role)) {
                return { ok: false as const, error: 'El usuario asignado no es válido.' };
            }
        }

        if (nextAssignedId !== input.lead.assignedToUserId) {
            updates.assignedToUserId = nextAssignedId;
            const previous = input.lead.assignedToUserId ? usersById.get(input.lead.assignedToUserId) ?? null : null;
            const next = nextAssignedId ? usersById.get(nextAssignedId) ?? null : null;
            const body = next
                ? previous
                    ? `Lead reasignado de ${previous.name} a ${next.name}.`
                    : `Lead asignado a ${next.name}.`
                : 'Asignación eliminada.';
            activities.push({
                type: 'assignment',
                body,
                meta: {
                    from: previous?.id ?? null,
                    to: next?.id ?? null,
                },
            });
        }
    }

    const hasNextTaskChange =
        Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
        || Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt');

    if (hasNextTaskChange) {
        const nextTaskTitle = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
            ? input.changes.nextTaskTitle?.trim() || null
            : input.lead.nextTaskTitle;
        const nextTaskAt = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt')
            ? parseServiceLeadTaskAt(input.changes.nextTaskAt ?? null)
            : input.lead.nextTaskAt;

        if (Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt') && input.changes.nextTaskAt && nextTaskAt == null) {
            return { ok: false as const, error: 'La fecha de la próxima tarea no es válida.' };
        }

        const changed = nextTaskTitle !== input.lead.nextTaskTitle || nextTaskAt !== input.lead.nextTaskAt;
        if (changed) {
            updates.nextTaskTitle = nextTaskTitle;
            updates.nextTaskAt = nextTaskAt != null ? new Date(nextTaskAt) : null;
            activities.push({
                type: 'task',
                body: nextTaskTitle || nextTaskAt
                    ? `Próxima tarea actualizada${nextTaskTitle ? `: ${nextTaskTitle}` : ''}${nextTaskAt ? ` · ${formatServiceLeadTimestamp(nextTaskAt)}` : ''}.`
                    : 'Próxima tarea eliminada.',
                meta: {
                    title: nextTaskTitle,
                    at: nextTaskAt,
                },
            });
        }
    }

    if (activities.length === 0) {
        return { ok: true as const, item: input.lead };
    }

    const rows = await db.update(serviceLeads).set(updates).where(eq(serviceLeads.id, input.lead.id)).returning();
    const updated = mapServiceLeadRow(rows[0]);

    for (const activity of activities) {
        await createServiceLeadActivity({
            leadId: updated.id,
            actorUserId: input.actor.id,
            type: activity.type,
            body: activity.body,
            meta: activity.meta ?? null,
        });
    }

    return { ok: true as const, item: updated };
}

async function runServiceLeadQuickAction(input: {
    actor: AppUser;
    lead: ServiceLeadRecord;
    action: LeadQuickAction;
}) {
    const updates: Record<string, unknown> = {
        updatedAt: new Date(),
    };
    let activityType: ServiceLeadActivityType = 'contact';
    let activityBody = '';
    const meta: Record<string, unknown> = {
        action: input.action,
    };

    if (input.action === 'call') {
        if (!input.lead.contactPhone?.trim()) {
            return { ok: false as const, error: 'Este lead no tiene teléfono disponible.' };
        }
        activityBody = 'Llamada iniciada desde el CRM.';
        meta.target = input.lead.contactPhone.trim();
    } else if (input.action === 'whatsapp') {
        const target = input.lead.contactWhatsapp?.trim() || input.lead.contactPhone?.trim() || null;
        if (!target) {
            return { ok: false as const, error: 'Este lead no tiene WhatsApp disponible.' };
        }
        activityBody = 'WhatsApp iniciado desde el CRM.';
        meta.target = target;
    } else if (input.action === 'email') {
        if (!input.lead.contactEmail?.trim()) {
            return { ok: false as const, error: 'Este lead no tiene correo disponible.' };
        }
        activityBody = 'Correo iniciado desde el CRM.';
        meta.target = input.lead.contactEmail.trim();
    } else {
        activityType = 'task';
        const nextTaskAt = buildLeadQuickFollowUpAt();
        const nextTaskTitle = input.lead.nextTaskTitle?.trim() || 'Seguimiento comercial';
        updates.nextTaskTitle = nextTaskTitle;
        updates.nextTaskAt = new Date(nextTaskAt);
        activityBody = `Seguimiento rápido programado: ${nextTaskTitle} · ${formatServiceLeadTimestamp(nextTaskAt)}.`;
        meta.title = nextTaskTitle;
        meta.at = nextTaskAt;
    }

    if (input.action !== 'follow_up' && input.lead.status === 'new') {
        updates.status = 'contacted';
        meta.status = 'contacted';
        activityBody += ' Lead movido a Contactado.';
    }

    await db.update(serviceLeads).set(updates).where(eq(serviceLeads.id, input.lead.id));
    const activity = await createServiceLeadActivity({
        leadId: input.lead.id,
        actorUserId: input.actor.id,
        type: activityType,
        body: activityBody,
        meta,
    });
    const refreshed = await getServiceLeadById(input.lead.id);
    if (!refreshed) {
        return { ok: false as const, error: 'No pudimos recargar el lead.' };
    }
    return {
        ok: true as const,
        item: refreshed,
        activity,
    };
}

async function listListingLeadRecords(options: {
    vertical?: VerticalType;
    ownerUserId?: string;
    status?: ListingLeadStatus;
    limit?: number;
} = {}): Promise<ListingLeadRecord[]> {
    const conditions = [];
    if (options.vertical) conditions.push(eq(listingLeads.vertical, options.vertical));
    if (options.ownerUserId) conditions.push(eq(listingLeads.ownerUserId, options.ownerUserId));
    if (options.status) conditions.push(eq(listingLeads.status, options.status));

    let query = db.select().from(listingLeads).$dynamic();
    if (conditions.length === 1) {
        query = query.where(conditions[0]!);
    } else if (conditions.length > 1) {
        query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(listingLeads.createdAt));
    if (options.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map(mapListingLeadRow);
}

async function getListingLeadById(id: string): Promise<ListingLeadRecord | null> {
    const rows = await db.select().from(listingLeads).where(eq(listingLeads.id, id)).limit(1);
    if (rows.length === 0) return null;
    return mapListingLeadRow(rows[0]);
}

async function getListingLeadByExternalReference(input: {
    listingId: string;
    source: ListingLeadSource;
    externalSourceId: string;
}): Promise<ListingLeadRecord | null> {
    const rows = await db
        .select()
        .from(listingLeads)
        .where(and(
            eq(listingLeads.listingId, input.listingId),
            eq(listingLeads.source, input.source),
            eq(listingLeads.externalSourceId, input.externalSourceId),
        ))
        .limit(1);
    if (rows.length === 0) return null;
    return mapListingLeadRow(rows[0]);
}

async function resolveListingForImportedLead(input: {
    vertical: VerticalType;
    portal: PortalKey | null;
    listingId?: string | null;
    listingSlug?: string | null;
    listingHref?: string | null;
    externalListingId?: string | null;
}): Promise<ListingRecord | null> {
    if (input.listingId?.trim()) {
        const byId = await getListingById(input.listingId.trim());
        if (byId) return byId;
    }

    const slugCandidate = input.listingSlug?.trim() || input.listingHref?.trim() || null;
    if (slugCandidate) {
        const bySlug = await getListingBySlug(slugCandidate);
        if (bySlug) return bySlug;
    }

    if (input.portal && input.externalListingId?.trim()) {
        return getListingByPortalExternalId(input.vertical, input.portal, input.externalListingId.trim());
    }

    return null;
}

async function getMessageThreadById(id: string): Promise<MessageThreadRecord | null> {
    const rows = await db.select().from(messageThreads).where(eq(messageThreads.id, id)).limit(1);
    if (rows.length === 0) return null;
    return mapMessageThreadRow(rows[0]);
}

async function getMessageThreadByLeadId(leadId: string): Promise<MessageThreadRecord | null> {
    const rows = await db.select().from(messageThreads).where(eq(messageThreads.leadId, leadId)).limit(1);
    if (rows.length === 0) return null;
    return mapMessageThreadRow(rows[0]);
}

async function getMessageThreadByListingAndBuyer(listingId: string, buyerUserId: string): Promise<MessageThreadRecord | null> {
    const rows = await db
        .select()
        .from(messageThreads)
        .where(and(eq(messageThreads.listingId, listingId), eq(messageThreads.buyerUserId, buyerUserId)))
        .limit(1);
    if (rows.length === 0) return null;
    return mapMessageThreadRow(rows[0]);
}

async function listListingLeadActivities(leadId: string): Promise<ListingLeadActivityRecord[]> {
    const rows = await db
        .select()
        .from(listingLeadActivities)
        .where(eq(listingLeadActivities.leadId, leadId))
        .orderBy(desc(listingLeadActivities.createdAt));
    return rows.map(mapListingLeadActivityRow);
}

async function createListingLeadActivity(input: {
    leadId: string;
    actorUserId?: string | null;
    type: ListingLeadActivityType;
    body: string;
    meta?: Record<string, unknown> | null;
    createdAt?: number;
}) {
    const activityTime = new Date(input.createdAt ?? Date.now());
    const rows = await db.insert(listingLeadActivities).values({
        leadId: input.leadId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        body: input.body,
        meta: input.meta ?? null,
        createdAt: activityTime,
    }).returning();
    await db.update(listingLeads).set({
        lastActivityAt: activityTime,
        updatedAt: activityTime,
    }).where(eq(listingLeads.id, input.leadId));
    return mapListingLeadActivityRow(rows[0]);
}

async function listMessageThreadsForUser(userId: string, vertical?: VerticalType, folder: MessageFolder = 'inbox'): Promise<MessageThreadRecord[]> {
    const conditions = [or(eq(messageThreads.ownerUserId, userId), eq(messageThreads.buyerUserId, userId))];
    if (vertical) {
        conditions.push(eq(messageThreads.vertical, vertical));
    }
    const rows = await db
        .select()
        .from(messageThreads)
        .where(and(...conditions))
        .orderBy(desc(messageThreads.lastMessageAt));
    return rows
        .map(mapMessageThreadRow)
        .filter((thread) => getMessageThreadFolder(thread, userId) === folder);
}

async function listMessageEntries(threadId: string): Promise<MessageEntryRecord[]> {
    const rows = await db
        .select()
        .from(messageEntries)
        .where(eq(messageEntries.threadId, threadId))
        .orderBy(asc(messageEntries.createdAt));
    return rows.map(mapMessageEntryRow);
}

async function createMessageThread(input: {
    vertical: VerticalType;
    listingId: string;
    ownerUserId: string;
    buyerUserId: string;
    leadId: string;
    lastMessageAt?: number;
    ownerUnreadCount?: number;
    buyerUnreadCount?: number;
}): Promise<MessageThreadRecord> {
    const now = new Date(input.lastMessageAt ?? Date.now());
    const rows = await db.insert(messageThreads).values({
        vertical: input.vertical,
        listingId: input.listingId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        leadId: input.leadId,
        ownerUnreadCount: input.ownerUnreadCount ?? 0,
        buyerUnreadCount: input.buyerUnreadCount ?? 0,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
    }).returning();
    return mapMessageThreadRow(rows[0]);
}

async function createMessageEntry(input: {
    threadId: string;
    senderUserId: string;
    senderRole: MessageSenderRole;
    body: string;
    createdAt?: number;
}): Promise<MessageEntryRecord> {
    const createdAt = new Date(input.createdAt ?? Date.now());
    const rows = await db.insert(messageEntries).values({
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        body: input.body,
        createdAt,
    }).returning();
    return mapMessageEntryRow(rows[0]);
}

async function touchMessageThread(threadId: string, timestamp = Date.now()): Promise<MessageThreadRecord> {
    const rows = await db.update(messageThreads).set({
        lastMessageAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
    }).where(eq(messageThreads.id, threadId)).returning();
    return mapMessageThreadRow(rows[0]);
}

async function updateMessageThreadRecord(threadId: string, updates: Partial<typeof messageThreads.$inferInsert>): Promise<MessageThreadRecord> {
    const rows = await db.update(messageThreads).set(updates).where(eq(messageThreads.id, threadId)).returning();
    return mapMessageThreadRow(rows[0]);
}

async function touchMessageThreadAfterIncomingMessage(
    thread: MessageThreadRecord,
    senderRole: MessageSenderRole,
    timestamp = Date.now()
): Promise<MessageThreadRecord> {
    const updates: Partial<typeof messageThreads.$inferInsert> = {
        lastMessageAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
    };

    if (senderRole === 'seller') {
        updates.ownerUnreadCount = 0;
        updates.buyerUnreadCount = thread.buyerUnreadCount + 1;
        updates.ownerArchivedAt = null;
        updates.buyerArchivedAt = null;
        updates.ownerSpamAt = null;
    } else {
        updates.ownerUnreadCount = thread.ownerUnreadCount + 1;
        updates.buyerUnreadCount = 0;
        updates.ownerArchivedAt = null;
        updates.buyerArchivedAt = null;
        updates.buyerSpamAt = null;
    }

    return updateMessageThreadRecord(thread.id, updates);
}

async function markMessageThreadRead(thread: MessageThreadRecord, viewerUserId: string): Promise<MessageThreadRecord> {
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const unreadCount = getMessageThreadUnreadCount(thread, viewerUserId);
    if (unreadCount <= 0) return thread;
    return updateMessageThreadRecord(thread.id, viewerRole === 'seller'
        ? { ownerUnreadCount: 0, updatedAt: new Date() }
        : { buyerUnreadCount: 0, updatedAt: new Date() });
}

async function updateMessageThreadViewerState(
    thread: MessageThreadRecord,
    viewerUserId: string,
    action: z.infer<typeof messageThreadUpdateSchema>['action']
): Promise<MessageThreadRecord> {
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const now = new Date();
    const updates: Partial<typeof messageThreads.$inferInsert> = {
        updatedAt: now,
    };

    if (viewerRole === 'seller') {
        if (action === 'read') updates.ownerUnreadCount = 0;
        if (action === 'archive') {
            updates.ownerArchivedAt = now;
            updates.ownerSpamAt = null;
        }
        if (action === 'unarchive') updates.ownerArchivedAt = null;
        if (action === 'spam') {
            updates.ownerSpamAt = now;
            updates.ownerArchivedAt = null;
        }
        if (action === 'unspam') updates.ownerSpamAt = null;
    } else {
        if (action === 'read') updates.buyerUnreadCount = 0;
        if (action === 'archive') {
            updates.buyerArchivedAt = now;
            updates.buyerSpamAt = null;
        }
        if (action === 'unarchive') updates.buyerArchivedAt = null;
        if (action === 'spam') {
            updates.buyerSpamAt = now;
            updates.buyerArchivedAt = null;
        }
        if (action === 'unspam') updates.buyerSpamAt = null;
    }

    return updateMessageThreadRecord(thread.id, updates);
}

function canUserAccessListingLead(user: AppUser, lead: ListingLeadRecord): boolean {
    if (user.role === 'superadmin') return true;
    return lead.ownerUserId === user.id;
}

function isThreadParticipant(userId: string, thread: MessageThreadRecord): boolean {
    return thread.ownerUserId === userId || thread.buyerUserId === userId;
}

async function buildListingLeadDetailPayload(record: ListingLeadRecord, viewerUserId?: string | null) {
    const pipelineColumns = await ensureListingPipelineColumns(record.ownerUserId, record.vertical);
    const [activities, assignees, thread] = await Promise.all([
        listListingLeadActivities(record.id),
        Promise.resolve(listListingLeadAssignees(record.ownerUserId, record.vertical)),
        getMessageThreadByLeadId(record.id),
    ]);

    let threadPayload: ReturnType<typeof messageThreadToResponse> | null = null;
    if (thread && viewerUserId) {
        const entries = await listMessageEntries(thread.id);
        threadPayload = messageThreadToResponse(thread, viewerUserId, entries);
    }

    return {
        item: listingLeadToResponse(record, { threadId: thread?.id ?? null, pipelineColumns }),
        activities: activities.map(listingLeadActivityToResponse),
        assignees,
        thread: threadPayload,
    };
}

async function updateListingLeadRecord(input: {
    actor: AppUser;
    lead: ListingLeadRecord;
    changes: z.infer<typeof listingLeadUpdateSchema>;
}) {
    const pipelineColumns = await ensureListingPipelineColumns(input.lead.ownerUserId, input.lead.vertical);
    const updates: Record<string, unknown> = {
        updatedAt: new Date(),
    };
    const activities: Array<{ type: ListingLeadActivityType; body: string; meta?: Record<string, unknown> | null }> = [];

    const hasPipelineColumnChange = Object.prototype.hasOwnProperty.call(input.changes, 'pipelineColumnId');
    let nextPipelineColumn = resolveListingLeadPipelineColumn(input.lead, pipelineColumns);

    if (hasPipelineColumnChange) {
        const nextPipelineColumnId = input.changes.pipelineColumnId ?? null;
        if (nextPipelineColumnId) {
            nextPipelineColumn = pipelineColumns.find((column) => column.id === nextPipelineColumnId) ?? null;
            if (!nextPipelineColumn) {
                return { ok: false as const, error: 'La columna del pipeline no es válida.' };
            }
        } else {
            nextPipelineColumn = pipelineColumns.find((column) => column.status === input.lead.status) ?? pipelineColumns[0] ?? null;
        }
    } else if (input.changes.status) {
        nextPipelineColumn = pipelineColumns.find((column) => column.status === input.changes.status) ?? pipelineColumns[0] ?? null;
    }

    if (nextPipelineColumn && nextPipelineColumn.id !== (input.lead.pipelineColumnId ?? null)) {
        updates.pipelineColumnId = nextPipelineColumn.id;
        activities.push({
            type: 'status',
            body: `Lead movido a ${nextPipelineColumn.name}.`,
            meta: {
                kind: 'pipeline_column',
                from: input.lead.pipelineColumnId,
                to: nextPipelineColumn.id,
                status: nextPipelineColumn.status,
            },
        });
    }

    const nextStatus = input.changes.status ?? nextPipelineColumn?.status ?? input.lead.status;
    if (nextStatus !== input.lead.status) {
        updates.status = nextStatus;
        activities.push({
            type: 'status',
            body: `Estado cambiado de ${listingLeadStatusLabel(input.lead.status)} a ${listingLeadStatusLabel(nextStatus)}.`,
            meta: { from: input.lead.status, to: nextStatus },
        });
    }

    if (input.changes.priority && input.changes.priority !== input.lead.priority) {
        updates.priority = input.changes.priority;
        activities.push({
            type: 'note',
            body: `Prioridad cambiada de ${leadPriorityLabel(input.lead.priority)} a ${leadPriorityLabel(input.changes.priority)}.`,
            meta: { kind: 'priority', from: input.lead.priority, to: input.changes.priority },
        });
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'closeReason')) {
        const closeReason = input.changes.closeReason?.trim() || null;
        if (closeReason !== input.lead.closeReason) {
            updates.closeReason = closeReason;
            activities.push({
                type: 'note',
                body: closeReason ? `Motivo de cierre actualizado: ${closeReason}.` : 'Motivo de cierre eliminado.',
                meta: { kind: 'close_reason', value: closeReason },
            });
        }
    }

    if (Object.prototype.hasOwnProperty.call(input.changes, 'tags')) {
        const nextTags = normalizeLeadTags(input.changes.tags);
        if (JSON.stringify(nextTags) !== JSON.stringify(input.lead.tags)) {
            updates.tags = nextTags;
            activities.push({
                type: 'note',
                body: nextTags.length > 0 ? `Etiquetas actualizadas: ${nextTags.join(', ')}.` : 'Etiquetas eliminadas.',
                meta: { kind: 'tags', value: nextTags },
            });
        }
    }

    const hasAssignedUserChange = Object.prototype.hasOwnProperty.call(input.changes, 'assignedToUserId');
    const hasAssignedTeamMemberChange = Object.prototype.hasOwnProperty.call(input.changes, 'assignedToTeamMemberId');

    if (hasAssignedUserChange || hasAssignedTeamMemberChange) {
        let nextAssignedUserId = hasAssignedUserChange
            ? input.changes.assignedToUserId ?? null
            : input.lead.assignedToUserId;
        let nextAssignedTeamMemberId = hasAssignedTeamMemberChange
            ? input.changes.assignedToTeamMemberId ?? null
            : input.lead.assignedToTeamMemberId;

        if (nextAssignedUserId && nextAssignedTeamMemberId) {
            return { ok: false as const, error: 'El lead no puede quedar asignado a una cuenta y a un asesor al mismo tiempo.' };
        }

        const validAssignees = listListingLeadAssignees(input.lead.ownerUserId, input.lead.vertical);

        if (nextAssignedUserId) {
            const expectedValue = crmAssigneeValue({ kind: 'user', id: nextAssignedUserId });
            const matched = validAssignees.find((item) => item.value === expectedValue) ?? null;
            if (!matched || matched.kind !== 'user') {
                return { ok: false as const, error: 'La cuenta asignada no es válida para este lead.' };
            }
        }

        if (nextAssignedTeamMemberId) {
            const expectedValue = crmAssigneeValue({ kind: 'team_member', id: nextAssignedTeamMemberId });
            const matched = validAssignees.find((item) => item.value === expectedValue) ?? null;
            if (!matched || matched.kind !== 'team_member') {
                return { ok: false as const, error: 'El asesor asignado no es válido para este lead.' };
            }
        }

        if (
            nextAssignedUserId !== input.lead.assignedToUserId
            || nextAssignedTeamMemberId !== input.lead.assignedToTeamMemberId
        ) {
            updates.assignedToUserId = nextAssignedUserId;
            updates.assignedToTeamMemberId = nextAssignedTeamMemberId;

            const previous = listingLeadAssigneeToResponse(input.lead);
            const next = nextAssignedTeamMemberId
                ? validAssignees.find((item) => item.value === crmAssigneeValue({ kind: 'team_member', id: nextAssignedTeamMemberId })) ?? null
                : nextAssignedUserId
                    ? validAssignees.find((item) => item.value === crmAssigneeValue({ kind: 'user', id: nextAssignedUserId })) ?? null
                    : null;

            const body = next
                ? previous
                    ? `Lead reasignado de ${previous.name} a ${next.name}.`
                    : `Lead asignado a ${next.name}.`
                : 'Asignación eliminada.';

            activities.push({
                type: 'assignment',
                body,
                meta: {
                    from: previous?.value ?? null,
                    to: next?.value ?? null,
                    fromKind: previous?.kind ?? null,
                    toKind: next?.kind ?? null,
                },
            });
        }
    }

    const hasNextTaskChange =
        Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
        || Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt');

    if (hasNextTaskChange) {
        const nextTaskTitle = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskTitle')
            ? input.changes.nextTaskTitle?.trim() || null
            : input.lead.nextTaskTitle;
        const nextTaskAt = Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt')
            ? parseServiceLeadTaskAt(input.changes.nextTaskAt ?? null)
            : input.lead.nextTaskAt;

        if (Object.prototype.hasOwnProperty.call(input.changes, 'nextTaskAt') && input.changes.nextTaskAt && nextTaskAt == null) {
            return { ok: false as const, error: 'La fecha de la próxima tarea no es válida.' };
        }

        const changed = nextTaskTitle !== input.lead.nextTaskTitle || nextTaskAt !== input.lead.nextTaskAt;
        if (changed) {
            updates.nextTaskTitle = nextTaskTitle;
            updates.nextTaskAt = nextTaskAt != null ? new Date(nextTaskAt) : null;
            activities.push({
                type: 'task',
                body: nextTaskTitle || nextTaskAt
                    ? `Próxima tarea actualizada${nextTaskTitle ? `: ${nextTaskTitle}` : ''}${nextTaskAt ? ` · ${formatServiceLeadTimestamp(nextTaskAt)}` : ''}.`
                    : 'Próxima tarea eliminada.',
                meta: { title: nextTaskTitle, at: nextTaskAt },
            });
        }
    }

    if (activities.length === 0) {
        return { ok: true as const, item: input.lead };
    }

    const rows = await db.update(listingLeads).set(updates).where(eq(listingLeads.id, input.lead.id)).returning();
    const updated = mapListingLeadRow(rows[0]);

    for (const activity of activities) {
        await createListingLeadActivity({
            leadId: updated.id,
            actorUserId: input.actor.id,
            type: activity.type,
            body: activity.body,
            meta: activity.meta ?? null,
        });
    }

    return { ok: true as const, item: updated };
}

async function runListingLeadQuickAction(input: {
    actor: AppUser;
    lead: ListingLeadRecord;
    action: LeadQuickAction;
}) {
    const pipelineColumns = await ensureListingPipelineColumns(input.lead.ownerUserId, input.lead.vertical);
    const updates: Record<string, unknown> = {
        updatedAt: new Date(),
    };
    let activityType: ListingLeadActivityType = 'contact';
    let activityBody = '';
    const meta: Record<string, unknown> = {
        action: input.action,
    };

    if (input.action === 'call') {
        if (!input.lead.contactPhone?.trim()) {
            return { ok: false as const, error: 'Este lead no tiene teléfono disponible.' };
        }
        activityBody = 'Llamada iniciada desde el CRM.';
        meta.target = input.lead.contactPhone.trim();
    } else if (input.action === 'whatsapp') {
        const target = input.lead.contactWhatsapp?.trim() || input.lead.contactPhone?.trim() || null;
        if (!target) {
            return { ok: false as const, error: 'Este lead no tiene WhatsApp disponible.' };
        }
        activityBody = 'WhatsApp iniciado desde el CRM.';
        meta.target = target;
    } else if (input.action === 'email') {
        if (!input.lead.contactEmail?.trim()) {
            return { ok: false as const, error: 'Este lead no tiene correo disponible.' };
        }
        activityBody = 'Correo iniciado desde el CRM.';
        meta.target = input.lead.contactEmail.trim();
    } else {
        activityType = 'task';
        const nextTaskAt = buildLeadQuickFollowUpAt();
        const nextTaskTitle = input.lead.nextTaskTitle?.trim() || 'Seguimiento comercial';
        updates.nextTaskTitle = nextTaskTitle;
        updates.nextTaskAt = new Date(nextTaskAt);
        activityBody = `Seguimiento rápido programado: ${nextTaskTitle} · ${formatServiceLeadTimestamp(nextTaskAt)}.`;
        meta.title = nextTaskTitle;
        meta.at = nextTaskAt;
    }

    if (input.action !== 'follow_up' && input.lead.status === 'new') {
        updates.status = 'contacted';
        const nextColumn = pipelineColumns.find((column) => column.status === 'contacted') ?? null;
        if (nextColumn) updates.pipelineColumnId = nextColumn.id;
        meta.status = 'contacted';
        activityBody += ' Lead movido a Contactado.';
    }

    await db.update(listingLeads).set(updates).where(eq(listingLeads.id, input.lead.id));
    const activity = await createListingLeadActivity({
        leadId: input.lead.id,
        actorUserId: input.actor.id,
        type: activityType,
        body: activityBody,
        meta,
    });
    const refreshed = await getListingLeadById(input.lead.id);
    if (!refreshed) {
        return { ok: false as const, error: 'No pudimos recargar el lead.' };
    }
    return {
        ok: true as const,
        item: refreshed,
        activity,
    };
}

async function createListingLeadRecord(input: {
    listingId: string;
    ownerUserId: string;
    buyerUserId?: string | null;
    vertical: VerticalType;
    source: ListingLeadSource;
    channel: ListingLeadChannel;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message?: string | null;
    sourcePage?: string | null;
    externalSourceId?: string | null;
    createdAt?: number;
}): Promise<ListingLeadRecord> {
    const createdAt = new Date(input.createdAt ?? Date.now());
    const assignment = await resolveInitialListingLeadAssignment(input.ownerUserId, input.vertical);
    const accountId = await getPrimaryAccountIdForUser(input.ownerUserId);
    const rows = await db.insert(listingLeads).values({
        accountId,
        listingId: input.listingId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId ?? null,
        vertical: input.vertical,
        source: input.source,
        channel: input.channel,
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone?.trim() || null,
        contactWhatsapp: input.contactWhatsapp?.trim() || null,
        message: input.message?.trim() || null,
        status: 'new',
        assignedToUserId: assignment.assignedToUserId,
        assignedToTeamMemberId: assignment.assignedToTeamMemberId,
        sourcePage: input.sourcePage?.trim() || null,
        externalSourceId: input.externalSourceId?.trim() || null,
        createdAt,
        updatedAt: createdAt,
    }).returning();
    const lead = mapListingLeadRow(rows[0]);
    incrementListingLeadCount(lead.listingId, 1);
    return lead;
}

function buildListingLeadActionExternalSourceId(input: {
    listingId: string;
    source: z.infer<typeof listingLeadActionSourceSchema>;
    buyerUserId?: string | null;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
}) {
    const identity = [
        input.buyerUserId?.trim(),
        input.contactEmail.trim().toLowerCase(),
        input.contactWhatsapp?.trim(),
        input.contactPhone?.trim(),
    ].find((value) => Boolean(value)) ?? 'anon';

    return `contact-action:${input.source}:${createHash('sha1')
        .update(`${input.listingId}:${identity}`)
        .digest('hex')}`;
}

async function createOrRefreshListingLeadAction(input: {
    listing: ListingRecord;
    buyer?: AppUser | null;
    source: z.infer<typeof listingLeadActionSourceSchema>;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message?: string | null;
    sourcePage?: string | null;
}): Promise<{ lead: ListingLeadRecord; created: boolean }> {
    const now = Date.now();
    const externalSourceId = buildListingLeadActionExternalSourceId({
        listingId: input.listing.id,
        source: input.source,
        buyerUserId: input.buyer?.id ?? null,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWhatsapp: input.contactWhatsapp,
    });

    const existingLead = await getListingLeadByExternalReference({
        listingId: input.listing.id,
        source: input.source,
        externalSourceId,
    });

    if (existingLead) {
        const rows = await db.update(listingLeads).set({
            buyerUserId: input.buyer?.id ?? existingLead.buyerUserId,
            contactName: input.contactName.trim(),
            contactEmail: input.contactEmail.trim().toLowerCase(),
            contactPhone: input.contactPhone?.trim() || null,
            contactWhatsapp: input.contactWhatsapp?.trim() || null,
            message: input.message?.trim() || existingLead.message,
            sourcePage: input.sourcePage?.trim() || existingLead.sourcePage,
            updatedAt: new Date(now),
        }).where(eq(listingLeads.id, existingLead.id)).returning();

        const updatedLead = mapListingLeadRow(rows[0]);
        await createListingLeadActivity({
            leadId: updatedLead.id,
            actorUserId: input.buyer?.id ?? null,
            type: 'note',
            body: `Accion de contacto registrada nuevamente por ${listingLeadSourceLabel(input.source)}.`,
            meta: {
                source: input.source,
                channel: 'lead',
                repeated: true,
            },
            createdAt: now,
        });

        return { lead: updatedLead, created: false };
    }

    const lead = await createListingLeadRecord({
        listingId: input.listing.id,
        ownerUserId: input.listing.ownerId,
        buyerUserId: input.buyer?.id ?? null,
        vertical: input.listing.vertical,
        source: input.source,
        channel: 'lead',
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWhatsapp: input.contactWhatsapp,
        message: input.message,
        sourcePage: input.sourcePage,
        externalSourceId,
        createdAt: now,
    });

    await createListingLeadActivity({
        leadId: lead.id,
        actorUserId: input.buyer?.id ?? null,
        type: 'created',
        body: `Lead creado por clic en ${listingLeadSourceLabel(input.source)}.`,
        meta: {
            source: input.source,
            channel: 'lead',
        },
        createdAt: now,
    });

    return { lead, created: true };
}

async function upsertImportedListingLead(input: {
    listing: ListingRecord;
    source: ListingLeadSource;
    channel: ListingLeadChannel;
    portal: PortalKey | null;
    externalListingId?: string | null;
    externalSourceId?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message?: string | null;
    sourcePage?: string | null;
    receivedAt?: string | number | null;
    meta?: Record<string, unknown> | null;
}): Promise<{ lead: ListingLeadRecord; created: boolean }> {
    const receivedAt = parseImportedLeadTimestamp(input.receivedAt);
    const normalizedEmail = normalizeImportedLeadEmail({
        source: input.source,
        externalSourceId: input.externalSourceId,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWhatsapp: input.contactWhatsapp,
    });
    const normalizedName = normalizeImportedLeadName(
        input.source,
        input.contactName,
        normalizedEmail,
        input.contactPhone ?? null,
        input.contactWhatsapp ?? null,
    );
    const normalizedMessage = input.message?.trim() || null;
    const normalizedSourcePage = input.sourcePage?.trim() || null;
    const normalizedExternalSourceId = input.externalSourceId?.trim() || null;
    const sourceLabel = getImportedLeadSourceLabel(input.listing.vertical, input.source, input.portal);
    const activityMeta = {
        imported: true,
        source: input.source,
        channel: input.channel,
        portal: input.portal,
        externalSourceId: normalizedExternalSourceId,
        externalListingId: input.externalListingId?.trim() || null,
        sourcePage: normalizedSourcePage,
        payloadMeta: input.meta ?? null,
    };

    const existingLead = normalizedExternalSourceId
        ? await getListingLeadByExternalReference({
            listingId: input.listing.id,
            source: input.source,
            externalSourceId: normalizedExternalSourceId,
        })
        : null;

    if (!existingLead) {
        const lead = await createListingLeadRecord({
            listingId: input.listing.id,
            ownerUserId: input.listing.ownerId,
            vertical: input.listing.vertical,
            source: input.source,
            channel: input.channel,
            contactName: normalizedName,
            contactEmail: normalizedEmail,
            contactPhone: input.contactPhone,
            contactWhatsapp: input.contactWhatsapp,
            message: normalizedMessage,
            sourcePage: normalizedSourcePage,
            externalSourceId: normalizedExternalSourceId,
            createdAt: receivedAt,
        });
        await createListingLeadActivity({
            leadId: lead.id,
            type: 'created',
            body: `Lead importado desde ${sourceLabel}.`,
            meta: activityMeta,
            createdAt: receivedAt,
        });
        return { lead, created: true };
    }

    const updates: Record<string, unknown> = {
        updatedAt: new Date(Math.max(existingLead.updatedAt, receivedAt)),
    };
    const changedFields: string[] = [];

    if (normalizedName && normalizedName !== existingLead.contactName) {
        updates.contactName = normalizedName;
        changedFields.push('contactName');
    }
    if (normalizedEmail && normalizedEmail !== existingLead.contactEmail) {
        updates.contactEmail = normalizedEmail;
        changedFields.push('contactEmail');
    }

    const normalizedPhone = input.contactPhone?.trim() || null;
    if (normalizedPhone && normalizedPhone !== existingLead.contactPhone) {
        updates.contactPhone = normalizedPhone;
        changedFields.push('contactPhone');
    }

    const normalizedWhatsapp = input.contactWhatsapp?.trim() || null;
    if (normalizedWhatsapp && normalizedWhatsapp !== existingLead.contactWhatsapp) {
        updates.contactWhatsapp = normalizedWhatsapp;
        changedFields.push('contactWhatsapp');
    }

    if (normalizedMessage && normalizedMessage !== existingLead.message) {
        updates.message = normalizedMessage;
        changedFields.push('message');
    }

    if (normalizedSourcePage && normalizedSourcePage !== existingLead.sourcePage) {
        updates.sourcePage = normalizedSourcePage;
        changedFields.push('sourcePage');
    }

    const rows = await db.update(listingLeads).set(updates).where(eq(listingLeads.id, existingLead.id)).returning();
    const lead = mapListingLeadRow(rows[0]);

    await createListingLeadActivity({
        leadId: lead.id,
        type: normalizedMessage && normalizedMessage !== existingLead.message ? 'message' : 'note',
        body: changedFields.length > 0
            ? `Lead sincronizado desde ${sourceLabel} (${changedFields.join(', ')}).`
            : `Lead sincronizado nuevamente desde ${sourceLabel}.`,
        meta: {
            ...activityMeta,
            changedFields,
        },
        createdAt: receivedAt,
    });

    return { lead, created: false };
}

async function createOrAppendListingConversation(input: {
    listing: ListingRecord;
    buyer: AppUser;
    contactName: string;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
    message: string;
    sourcePage?: string | null;
}): Promise<{
    lead: ListingLeadRecord;
    thread: MessageThreadRecord;
    entry: MessageEntryRecord;
    createdLead: boolean;
}> {
    const existingThread = await getMessageThreadByListingAndBuyer(input.listing.id, input.buyer.id);
    if (existingThread) {
        const lead = await getListingLeadById(existingThread.leadId);
        if (!lead) {
            throw new Error('El hilo no tiene un lead asociado válido.');
        }

        const now = Date.now();
        const entry = await createMessageEntry({
            threadId: existingThread.id,
            senderUserId: input.buyer.id,
            senderRole: 'buyer',
            body: input.message.trim(),
            createdAt: now,
        });
        const thread = await touchMessageThreadAfterIncomingMessage(existingThread, 'buyer', now);
        await db.update(listingLeads).set({
            contactName: input.contactName.trim(),
            contactEmail: input.contactEmail.trim().toLowerCase(),
            contactPhone: input.contactPhone?.trim() || null,
            contactWhatsapp: input.contactWhatsapp?.trim() || null,
            message: input.message.trim(),
            updatedAt: new Date(now),
        }).where(eq(listingLeads.id, lead.id));
        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: input.buyer.id,
            type: 'message',
            body: `Nuevo mensaje del comprador: ${input.message.trim()}`,
        });

        const refreshedLead = await getListingLeadById(lead.id);
        if (!refreshedLead) {
            throw new Error('No se pudo refrescar el lead del hilo.');
        }
        return { lead: refreshedLead, thread, entry, createdLead: false };
    }

    const now = Date.now();
    const lead = await createListingLeadRecord({
        listingId: input.listing.id,
        ownerUserId: input.listing.ownerId,
        buyerUserId: input.buyer.id,
        vertical: input.listing.vertical,
        source: 'direct_message',
        channel: 'message',
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        contactWhatsapp: input.contactWhatsapp,
        message: input.message,
        sourcePage: input.sourcePage,
        createdAt: now,
    });
    await createListingLeadActivity({
        leadId: lead.id,
        actorUserId: input.buyer.id,
        type: 'created',
        body: `Lead creado desde conversación en ${input.sourcePage || 'publicación pública'}.`,
        meta: {
            source: 'direct_message',
            channel: 'message',
        },
    });

    const thread = await createMessageThread({
        vertical: input.listing.vertical,
        listingId: input.listing.id,
        ownerUserId: input.listing.ownerId,
        buyerUserId: input.buyer.id,
        leadId: lead.id,
        ownerUnreadCount: 1,
        buyerUnreadCount: 0,
        lastMessageAt: now,
    });
    const entry = await createMessageEntry({
        threadId: thread.id,
        senderUserId: input.buyer.id,
        senderRole: 'buyer',
        body: input.message.trim(),
        createdAt: now,
    });
    await createListingLeadActivity({
        leadId: lead.id,
        actorUserId: input.buyer.id,
        type: 'message',
        body: `Mensaje inicial del comprador: ${input.message.trim()}`,
    });

    return { lead, thread, entry, createdLead: true };
}

async function listAdminUsersSnapshot(vertical?: VerticalType | null): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    primaryVertical: VerticalType | null;
    provider: string | null;
    createdAt: number;
    lastLoginAt: number | null;
    totalListings: number;
    autosListings: number;
    propiedadesListings: number;
}>> {
    const [userRows, listingRows] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select({
            ownerId: listings.ownerId,
            vertical: listings.vertical,
        }).from(listings),
    ]);

    const listingCounters = new Map<string, { total: number; autos: number; propiedades: number }>();
    for (const listing of listingRows) {
        const current = listingCounters.get(listing.ownerId) ?? { total: 0, autos: 0, propiedades: 0 };
        current.total += 1;
        if (listing.vertical === 'autos') current.autos += 1;
        if (listing.vertical === 'propiedades') current.propiedades += 1;
        listingCounters.set(listing.ownerId, current);
    }

    // Vertical scoping: only include users whose primary_vertical matches,
    // OR who own listings in that vertical (so vertical admins can view all relevant users).
    const ownersWithVerticalListings = new Set(
        vertical ? listingRows.filter((l) => l.vertical === vertical).map((l) => l.ownerId) : [],
    );

    return userRows
        .filter((user) => {
            if (!vertical) return true;
            const userVertical = user.primaryVertical ?? null;
            if (userVertical === vertical) return true;
            if (ownersWithVerticalListings.has(user.id)) return true;
            return false;
        })
        .map((user) => {
            const counters = listingCounters.get(user.id) ?? { total: 0, autos: 0, propiedades: 0 };
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role as UserRole,
                status: user.status as UserStatus,
                primaryVertical: (user.primaryVertical as VerticalType | null) ?? null,
                provider: user.provider ?? null,
                createdAt: user.createdAt.getTime(),
                lastLoginAt: user.lastLoginAt?.getTime() ?? null,
                totalListings: counters.total,
                autosListings: counters.autos,
                propiedadesListings: counters.propiedades,
            };
        });
}

async function listAdminListingsSnapshot(vertical?: VerticalType | null): Promise<Array<{
    id: string;
    title: string;
    vertical: VerticalType;
    section: BoostSection;
    status: ListingStatus;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    price: string | null;
    href: string | null;
    createdAt: number;
    updatedAt: number;
}>> {
    const [listingRows, userRows] = await Promise.all([
        db.select().from(listings).orderBy(desc(listings.updatedAt)),
        db.select({
            id: users.id,
            name: users.name,
            email: users.email,
        }).from(users),
    ]);
    const userMap = new Map(userRows.map((user) => [user.id, user]));

    return listingRows
        .filter((listing) => !vertical || listing.vertical === vertical)
        .map((listing) => {
        const owner = userMap.get(listing.ownerId);
        return {
            id: listing.id,
            title: listing.title,
            vertical: listing.vertical as VerticalType,
            section: listing.section as BoostSection,
            status: listing.status as ListingStatus,
            ownerId: listing.ownerId,
            ownerName: owner?.name ?? 'Cuenta desconocida',
            ownerEmail: owner?.email ?? '',
            price: listing.priceLabel ?? null,
            href: listing.hrefSlug ?? null,
            createdAt: listing.createdAt.getTime(),
            updatedAt: listing.updatedAt.getTime(),
        };
    });
}

const app = new Hono();

// CORS middleware - MUST be applied FIRST before any other middleware or routes
app.use(
    '*',
    cors({
        origin: (origin) => {
            if (!origin) return defaultOrigin;
            return allowedOrigins.has(origin) ? origin : defaultOrigin;
        },
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
        exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
        maxAge: 86400,
        credentials: true,
    })
);

// Global request error logger for debugging 500s
app.use('*', async (c, next) => {
    try {
        await next();
    } catch (err) {
        console.error(`[API ERROR] ${c.req.method} ${c.req.path} -`, err);
        throw err; // Re-throw to be caught by app.onError
    }
});

app.onError((error, c) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    logDebug(`[GLOBAL ERROR] ${c.req.method} ${c.req.path} - ${errMsg}\nStack: ${stack}`);
    console.error('[simple-api] unhandled request error', error);
    return c.json(
        {
            ok: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV !== 'production' ? errMsg : undefined,
        },
        500
    );
});

app.route('/', createSystemRouter({
    serviceName: 'simple-v2-api',
    apiRootDir: API_ROOT_DIR,
    env: {
        NODE_ENV: process.env.NODE_ENV,
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        LOCAL_STORAGE_URL: process.env.LOCAL_STORAGE_URL,
        BACKBLAZE_DOWNLOAD_URL: process.env.BACKBLAZE_DOWNLOAD_URL,
        BACKBLAZE_BUCKET_NAME: process.env.BACKBLAZE_BUCKET_NAME,
    },
}));

let backblazeS3Client: S3Client | null = null;
let r2S3Client: S3Client | null = null;

function getBackblazeS3Client(): S3Client | null {
    if (backblazeS3Client) return backblazeS3Client;

    const endpoint = process.env.BACKBLAZE_S3_ENDPOINT;
    const region = process.env.BACKBLAZE_S3_REGION;
    const accessKeyId = process.env.BACKBLAZE_S3_ACCESS_KEY;
    const secretAccessKey = process.env.BACKBLAZE_S3_SECRET_KEY;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
        console.warn('[MediaProxy] Backblaze S3 credentials not configured');
        return null;
    }

    backblazeS3Client = new S3Client({
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: false,
    });

    return backblazeS3Client;
}

function getR2S3Client(): S3Client | null {
    if (r2S3Client) return r2S3Client;

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        console.warn('[MediaProxy] R2 credentials not configured');
        return null;
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    r2S3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: false,
    });

    return r2S3Client;
}

function getS3ClientForUrl(url: string): { client: S3Client | null; bucketName: string } {
    if (isCloudflareR2Url(url)) {
        return {
            client: getR2S3Client(),
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media',
        };
    }
    if (isBackblazeUrl(url)) {
        return {
            client: getBackblazeS3Client(),
            bucketName: process.env.BACKBLAZE_BUCKET_NAME || 'simple-media',
        };
    }
    return { client: null, bucketName: '' };
}

// Legacy function for backward compatibility
function getMediaProxyS3Client(): S3Client | null {
    // Try to return any available client
    return getR2S3Client() || getBackblazeS3Client();
}

app.route('/api/auth', createAuthRouter({
    db,
    eq,
    and,
    gt,
    isNull,
    sql,
    tables: {
        users,
        passwordResetTokens,
        emailVerificationTokens,
    },
    bcrypt,
    getUserByEmail,
    getUserById,
    sanitizeUser,
    mapUserRowToAppUser,
    canAuthenticateUser,
    ensurePrimaryAccountForUser,
    touchUserLastLoginAt,
    setSession,
    clearSession,
    authUser,
    getClientIdentifier,
    consumeRateLimit,
    clearRateLimit,
    resolveBrowserOrigin,
    isAuthEmailConfigured,
    issueEmailVerification,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendWelcomeEmail,
    buildPasswordResetUrl,
    hashOpaqueToken,
    buildGoogleRedirectUri,
    asString,
    asObject,
    safeEqualStrings,
    SESSION_SECRET,
    AUTH_RATE_LIMIT_WINDOW_MS,
    PASSWORD_RESET_TOKEN_TTL_MS,
    loginSchema,
    registerSchema,
    passwordResetRequestSchema,
    passwordResetConfirmSchema,
    emailVerificationRequestSchema,
    emailVerificationConfirmSchema,
}));

app.use('/api/account/*', requireVerifiedSession);
app.use('/api/accounts/*', requireVerifiedSession);
app.use('/api/crm/*', requireVerifiedSession);
app.use('/api/panel/*', requireVerifiedSession);
app.use('/api/messages/*', requireVerifiedSession);
app.use('/api/listing-draft', requireVerifiedSession);
app.use('/api/listings', requireVerifiedSession);
app.use('/api/listings/*', requireVerifiedSession);

const listingsDeps = {
    authUser,
    parseVertical,
    parseListingSection,
    parseListingStatus,
    normalizeListingLocation,
    listingDefaultHref,
    stripStoredListingMetadata,
    makeListingId,
    listingsById,
    listingIdsByUser,
    getListingById,
    insertListingRecord,
    saveListingRecord,
    deleteListingRecord,
    isListingSlugConflictError,
    listingToResponse,
    listingToDetailResponse,
    upsertBoostListingFromListing,
    maybeAutoPublishListing,
    isPortalAvailableForVertical,
    getPortalCoverage,
    getPortalSyncView,
    getListingDraftRecord,
    upsertListingDraftRecord,
    deleteListingDraftRecord,
    schemas: {
        createListingSchema,
        updateListingSchema,
        updateListingStatusSchema,
        publishListingPortalSchema,
        listingDraftWriteSchema,
    },
};
app.route('/api/listings', createListingsRouter(listingsDeps));
app.route('/api/listing-draft', createListingDraftRouter(listingsDeps));

app.route('/api/boost', createBoostRouter({
    authUser,
    parseVertical,
    parseBoostSection,
    getSectionsForVertical,
    isBoostSectionAllowed,
    getBoostPlans,
    getBoostListingById,
    getBoostListingsByOwner,
    getBoostOrdersForUser,
    createBoostOrderRecord,
    normalizeBoostOrder,
    countReservedSlots,
    getFreeBoostQuota,
    sectionLabel,
    listFeaturedBoosted,
    boostListingsSeed,
    boostOrdersByUser,
    MAX_BOOST_SLOTS_PER_SECTION,
    schemas: {
        createBoostOrderSchema,
        updateBoostOrderSchema,
    },
}));

app.use('/api/address-book', requireVerifiedSession);
app.use('/api/address-book/*', requireVerifiedSession);
app.use('/api/boost/*', requireVerifiedSession);

const addressBookDeps = {
    authUser,
    getAddressBookEntries,
    upsertAddressBookEntry,
    deleteAddressBookEntry,
    schemas: { addressBookWriteSchema },
};
app.route('/api/address-book', createAddressBookRouter(addressBookDeps));
app.route('/api/account/address-book', createAddressBookRouter(addressBookDeps));

app.route('/api', createPaymentsRouter({
    authUser,
    parseVertical,
    isAdminRole,
    isMercadoPagoConfigured,
    getSubscriptionPlans,
    getPaidSubscriptionPlan,
    getCurrentSubscription,
    activeSubscriptionToResponse,
    upsertActiveSubscription,
    makeSubscriptionId,
    activeSubscriptionsByUser,
    getPaymentOrdersForUser,
    upsertPaymentOrder,
    updatePaymentOrder,
    paymentOrderToResponse,
    makePaymentOrderId,
    paymentOrdersByUser,
    createCheckoutPreference,
    createPreapproval,
    getPaymentById,
    getPreapprovalById,
    parseMercadoPagoPaymentStatus,
    parseMercadoPagoPreapprovalStatus,
    resolveMercadoPagoReturnUrl,
    ensureMercadoPagoSubscriptionReturnUrl,
    appendCheckoutParams,
    getBoostListingById,
    getBoostOrdersForUser,
    getBoostPlans,
    parseBoostSection,
    isBoostSectionAllowed,
    createBoostOrderRecord,
    countReservedSlots,
    sectionLabel,
    MAX_BOOST_SLOTS_PER_SECTION,
    getAdCampaignRecordForUser,
    getAdvertisingPrice,
    getAdPaymentStatusFromOrderStatus,
    normalizeAdCampaigns,
    mapAdCampaignRow,
    adCampaignToResponse,
    AD_FORMAT_LABELS,
    db,
    tables: { adCampaigns },
    dbHelpers: { eq, and },
    listAdminUsersSnapshot,
    dbQuery: db.query,
    dbSql: sql,
    tables2: { agendaProfessionalProfiles },
    schemas: {
        createCheckoutSchema,
        confirmCheckoutSchema,
    },
}));
app.use('/api/advertising/campaigns', requireVerifiedSession);
app.use('/api/advertising/campaigns/*', requireVerifiedSession);
app.use('/api/integrations/instagram', requireVerifiedSession);
app.use('/api/integrations/instagram/*', requireVerifiedSession);

app.route('/api/admin', createAdminRouter({
    authUser,
    db,
    eq,
    and,
    or,
    desc,
    asc,
    sql,
    usersById,
    listingsById,
    isAdminRole,
    isAdminForVertical,
    parseVertical,
    getPrimaryAccountIdForUser,
    ensurePrimaryAccountForUser,
    getEditablePublicProfileTeamMembers,
    formatAgo,
    formatRelativeTimestamp,
    publicSectionLabel,
    getUserById,
    sanitizeUser,
    mapUserRowToAppUser,
    permanentlyDeleteUser,
    countActiveSuperadminUsers,
    isActiveAdminStatus,
    getEnvStatus,
    listAdminUsersSnapshot,
    listAdminListingsSnapshot,
    getPaidSubscriptionPlan,
    makeSubscriptionId,
    upsertActiveSubscription,
    activeSubscriptionsByUser,
    isAdminBootstrapEnabled,
    handleBootstrap: async (c: any) => {
        if (!isAdminBootstrapEnabled()) return c.json({ ok: false, error: 'No encontrado' }, 404);
        const existingAdmins = await db.select({ id: users.id }).from(users)
            .where(or(eq(users.role, 'admin'), eq(users.role, 'superadmin'))).limit(1);
        if (existingAdmins.length > 0) return c.json({ ok: false, error: 'Ya existe un administrador en el sistema' }, 403);
        const payload = await c.req.json().catch(() => null);
        const parsed = registerSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const existing = await getUserByEmail(normalizedEmail);
        if (existing) return c.json({ ok: false, error: 'Email ya registrado' }, 409);
        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        const [insertedUser] = await db.insert(users).values({
            email: normalizedEmail,
            passwordHash: hashedPassword,
            name: parsed.data.name.trim(),
            role: 'superadmin',
            status: 'verified',
            provider: 'local',
        }).returning({ id: users.id });
        const newUser: AppUser = {
            id: insertedUser.id,
            email: normalizedEmail,
            passwordHash: hashedPassword,
            name: parsed.data.name.trim(),
            role: 'superadmin',
            status: 'verified',
            provider: 'local',
            lastLoginAt: new Date(),
        };
        const personalAccount = await ensurePrimaryAccountForUser(newUser);
        newUser.primaryAccountId = personalAccount.id;
        await touchUserLastLoginAt(newUser.id);
        setSession(c, newUser.id);
        return c.json({ ok: true, user: sanitizeUser(newUser) }, 201);
    },
    tables: {
        crmPipelineColumns,
        serviceLeads,
        serviceLeadActivities,
        listingLeads,
        listingLeadActivities,
        users,
        agendaProfessionalProfiles,
    },
}));

app.route('/api/crm', createCrmRouter({
    authUser,
    db,
    eq,
    and,
    or,
    desc,
    asc,
    usersById,
    listingsById,
    isAdminRole,
    isAdminForVertical,
    userCanUseCrm,
    parseVertical,
    getPrimaryAccountIdForUser,
    getEditablePublicProfileTeamMembers,
    formatAgo,
    formatRelativeTimestamp,
    publicSectionLabel,
    tables: {
        crmPipelineColumns,
        serviceLeads,
        serviceLeadActivities,
        listingLeads,
        listingLeadActivities,
        users,
    },
}));

app.route('/api/accounts', createAccountsRouter({
    accountsById,
    authUser,
    db,
    ensurePrimaryAccountForUser,
    eq,
    getAccountMembershipsForUser,
    mapAccountRow,
    tables: {
        accounts,
    },
    upsertAccountCache,
}));

app.route('/api/account', createAccountRouter({
    authUser,
    parseVertical,
    updateProfileSchema,
    publicProfileWriteSchema,
    db,
    tables: { users, publicProfiles, publicProfileTeamMembers },
    dbHelpers: { eq, and },
    mapUserRowToAppUser,
    usersById,
    sanitizeUser,
    buildAccountPublicProfileResponse,
    normalizePublicProfileSlug,
    isValidPublicProfileSlug,
    publicProfilesByVerticalSlug,
    publicProfileVerticalSlugKey,
    userCanUsePublicProfile,
    getPublicProfileRecord,
    PUBLIC_PROFILE_DAYS,
    normalizePublicProfileSocialLinks,
    normalizePublicProfileTeamSocialLinks,
    normalizeExternalUrlInput,
    toNullIfEmpty,
    upsertPublicProfileCache,
    replacePublicProfileTeamMemberCache,
    mapPublicProfileRow,
    getPrimaryAccountIdForUser,
    randomUUID,
}));


app.route('/api/advertising', createAdvertisingRouter({
    authUser,
    parseVertical,
    db,
    tables: { adCampaigns },
    dbHelpers: { eq, and },
    listAdCampaignRecords,
    adCampaignToResponse,
    adCampaignCreateSchema,
    adCampaignUpdateSchema,
    getAdCampaignRecordForUser,
    sanitizeAdCampaignWriteInput,
    normalizeAdCampaigns,
    mapAdCampaignRow,
    getPrimaryAccountIdForUser,
    MAX_CAMPAIGNS_TOTAL,
    AdStatus: null as any,
}));

app.route('/', createLeadsRouter({
    authUser,
    parseVertical,
    db,
    tables: { serviceLeads },
    serviceLeadCreateSchema,
    listingLeadCreateSchema,
    listingLeadActionCreateSchema,
    externalListingLeadImportSchema,
    portalKeySchema,
    mapServiceLeadRow,
    serviceLeadToResponse,
    listingLeadToResponse,
    messageThreadToResponse,
    messageEntryToResponse,
    createServiceLeadActivity,
    isLeadIngestConfigured,
    isLeadIngestAuthorized,
    inferPortalFromLeadImportSource,
    isPortalAvailableForVertical,
    resolveListingForImportedLead,
    upsertImportedListingLead,
    inferListingLeadChannel,
    getMessageThreadByLeadId,
    listingsById,
    getListingById,
    isPublicListingVisible,
    createOrAppendListingConversation,
    createListingLeadRecord,
    createListingLeadActivity,
    createOrRefreshListingLeadAction,
}));

app.route('/api/messages', createMessagesRouter({
    authUser,
    parseVertical,
    db,
    tables: { listingLeads },
    dbHelpers: { eq },
    messageFolderSchema,
    messageThreadUpdateSchema,
    messageEntryCreateSchema,
    listMessageThreadsForUser,
    listMessageEntries,
    messageThreadToResponse,
    messageEntryToResponse,
    getMessageThreadById,
    isThreadParticipant,
    markMessageThreadRead,
    getListingLeadById,
    listingLeadToResponse,
    updateMessageThreadViewerState,
    createMessageEntry,
    touchMessageThreadAfterIncomingMessage,
    mapListingLeadRow,
    createListingLeadActivity,
    listingLeadStatusLabel,
    listListingLeadRecords,
    listServiceLeadRecords,
    userCanUseCrm,
    isAdminRole,
    buildMessageThreadNotification,
    buildListingLeadNotification,
    buildServiceLeadNotification,
}));

app.route('/api/panel', createPanelNotificationsRouter({
    authUser,
    parseVertical,
    listMessageThreadsForUser,
    listListingLeadRecords,
    listServiceLeadRecords,
    userCanUseCrm,
    isAdminRole,
    buildMessageThreadNotification,
    buildListingLeadNotification,
    buildServiceLeadNotification,
}));

app.route('/api/integrations/instagram', createInstagramRouter({
    authUser,
    parseVertical,
    asString,
    asObject,
    asNumber,
    logDebug,
    listingsById,
    getListingById,
    getInstagramAccount,
    getInstagramAccountByVertical: async (vertical: any) => {
        return await db.query.instagramAccounts.findFirst({ where: eq(instagramAccounts.vertical, vertical) });
    },
    resolveBrowserOrigin,
    isInstagramConfigured,
    userCanUseInstagram,
    getEffectivePlanId,
    getInstagramRequiredPlanIds,
    instagramAccountToResponse,
    getInstagramPublicationsForUser,
    instagramPublicationToResponse,
    sanitizeBrowserReturnUrl,
    randomBytes,
    setInstagramState,
    makeInstagramStatePayload,
    buildInstagramAuthorizationUrl,
    consumeInstagramState,
    parseInstagramStatePayload,
    defaultOrigin,
    safeEqualStrings,
    getUserById,
    canAuthenticateUser,
    exchangeInstagramCode,
    exchangeToLongLivedToken,
    getInstagramBusinessAccounts,
    upsertInstagramAccountRecord,
    instagramSettingsSchema,
    updateInstagramAccountSettings,
    disconnectInstagramAccount,
    instagramPublishSchema,
    publishListingToInstagram,
    extractListingMediaUrls,
    getInstagramBasePublicOrigin,
    instagramEnhancedPublishSchema,
    buildInstagramListingData,
    generateSmartTemplates,
    // Analytics
    getInstagramInsights,
    createABTestCampaign,
    analyzeABTestResults,
    scheduleInstagramPost,
    getSchedulingInsights,
    optimizeInstagramContent,
    InstagramSchedulerService,
    tables: { instagramAccounts, instagramPublications, listings },
    db: { query: { listings: db.query.listings } },
    dbHelpers: { eq },
}));

app.route('/api/public', createInstagramPublicImageRouter({
    listingsById,
    getListingById,
    extractListingMediaUrls,
    getInstagramBasePublicOrigin,
}));

app.route('/api/media', createMediaRouter({
    authUser,
    requireVerifiedSession,
    asString,
    logDebug,
    getStorageProvider,
    getMediaProxyS3Client,
    getS3ClientForUrl,
    isBackblazeUrl,
    isCloudflareR2Url,
    isStorageUrl,
    extractBackblazeObjectKey,
    extractR2ObjectKey,
    extractStorageObjectKey,
    env: {
        BACKBLAZE_BUCKET_NAME: process.env.BACKBLAZE_BUCKET_NAME,
        CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        BACKBLAZE_APP_KEY_ID: process.env.BACKBLAZE_APP_KEY_ID,
        BACKBLAZE_APP_KEY: process.env.BACKBLAZE_APP_KEY,
        BACKBLAZE_BUCKET_ID: process.env.BACKBLAZE_BUCKET_ID,
        BACKBLAZE_DOWNLOAD_URL: process.env.BACKBLAZE_DOWNLOAD_URL,
    },
}));

app.route('/api/storage', createStorageRouter({
    getStorageProvider,
    env: {
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        BACKBLAZE_APP_KEY_ID: process.env.BACKBLAZE_APP_KEY_ID,
        BACKBLAZE_APP_KEY: process.env.BACKBLAZE_APP_KEY,
        BACKBLAZE_BUCKET_ID: process.env.BACKBLAZE_BUCKET_ID,
        BACKBLAZE_BUCKET_NAME: process.env.BACKBLAZE_BUCKET_NAME,
        BACKBLAZE_DOWNLOAD_URL: process.env.BACKBLAZE_DOWNLOAD_URL,
    },
}));

app.route('/api', createSocialRouter({
    authUser,
    parseVertical,
    db,
    tables: { savedListings },
    dbHelpers: { eq, and },
    savedRecordSchema,
    followToggleSchema,
    getSavedListingsByUser,
    savedByUser,
    getListingById,
    getFollowSetByVertical,
    getFollowRecords,
    followsByUser,
    countFollowers,
    usersById,
    buildSocialFeedClips,
    getPublishedSellerProfile,
    usernameFromName,
    formatAgo,
}));

app.route('/api/public', createPublicRouter({
    parseVertical,
    asString,
    asObject,
    parseNumberFromString,
    parseBoostSection,
    listingsById,
    isPublicListingVisible,
    matchesListingSlug,
    listingToPublicResponse,
    usersById,
    getPublishedPublicProfileBySlug,
    userCanUsePublicProfile,
    buildPublicProfileResponse,
    geocodeLocationRequestSchema,
    normalizeListingLocation,
    geocodeLocationRemotely,
    propertyValuationRequestSchema,
    vehicleValuationRequestSchema,
    getValuationFeedState,
    refreshValuationFeeds,
    estimatePropertyValuation,
    getVehicleValuationFeedState,
    refreshVehicleValuationFeeds,
    estimateVehicleValuation,
    db,
    tables: { mortgageRates },
}));

const RESERVED_SLUGS = new Set([
    'panel', 'auth', 'api', 'admin', 'login', 'register', 'logout',
    'settings', 'configuracion', 'perfil', 'profile', 'cuenta', 'account',
    'help', 'soporte', 'support', 'terms', 'privacy', 'legal',
    'blog', 'pricing', 'planes', 'home', 'about', 'nosotros',
    'app', 'dashboard', 'agenda', 'citas', 'reservas', 'booking',
    'www', 'mail', 'email', 'ftp', 'cdn', 'static', 'assets',
]);

function isValidSlug(slug: string): { ok: true } | { ok: false; error: string } {
    if (!slug || slug.length < 3) return { ok: false, error: 'El link debe tener al menos 3 caracteres.' };
    if (slug.length > 60) return { ok: false, error: 'El link no puede tener más de 60 caracteres.' };
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
        return { ok: false, error: 'Solo letras minúsculas, números y guiones. No puede empezar ni terminar con guion.' };
    }
    if (/--/.test(slug)) return { ok: false, error: 'No puede contener guiones consecutivos.' };
    if (RESERVED_SLUGS.has(slug)) return { ok: false, error: 'Este link no está disponible.' };
    return { ok: true };
}

function getGoogleOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/google-calendar/callback`,
    );
}

async function syncToGoogleCalendar(
    profile: { googleAccessToken: string | null; googleRefreshToken: string | null; googleTokenExpiry: Date | null; googleCalendarId: string | null; displayName: string | null },
    appointment: { id: string; startsAt: Date; endsAt: Date; clientName: string | null; clientEmail: string | null; internalNotes: string | null; googleEventId: string | null; modality: string | null },
    action: 'create' | 'update' | 'delete',
): Promise<{ eventId: string | null; meetingUrl: string | null } | null> {
    if (!profile.googleAccessToken || !profile.googleCalendarId) return null;
    try {
        const oauth2Client = getGoogleOAuth2Client();
        oauth2Client.setCredentials({
            access_token: profile.googleAccessToken,
            refresh_token: profile.googleRefreshToken ?? undefined,
            expiry_date: profile.googleTokenExpiry?.getTime(),
        });
        const calApi = google.calendar({ version: 'v3', auth: oauth2Client });

        if (action === 'delete') {
            if (!appointment.googleEventId) return null;
            await calApi.events.delete({ calendarId: profile.googleCalendarId, eventId: appointment.googleEventId }).catch(() => null);
            return { eventId: null, meetingUrl: null };
        }

        const isOnline = appointment.modality === 'online';
        const resource: any = {
            summary: appointment.clientName ? `Sesión con ${appointment.clientName}` : 'Sesión',
            description: appointment.internalNotes ?? undefined,
            start: { dateTime: appointment.startsAt.toISOString() },
            end: { dateTime: appointment.endsAt.toISOString() },
            attendees: appointment.clientEmail ? [{ email: appointment.clientEmail }] : undefined,
        };

        if (isOnline) {
            resource.conferenceData = {
                createRequest: {
                    requestId: appointment.id,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            };
        }

        let eventId: string | null = null;
        let meetingUrl: string | null = null;

        if (!appointment.googleEventId) {
            const res = await calApi.events.insert({ calendarId: profile.googleCalendarId, requestBody: resource, conferenceDataVersion: 1, sendUpdates: 'none' });
            eventId = res.data.id ?? null;
            meetingUrl = res.data.conferenceData?.entryPoints?.[0]?.uri ?? null;
        } else {
            const res = await calApi.events.update({ calendarId: profile.googleCalendarId, eventId: appointment.googleEventId, requestBody: resource, conferenceDataVersion: 1, sendUpdates: 'none' });
            eventId = appointment.googleEventId;
            meetingUrl = res.data.conferenceData?.entryPoints?.[0]?.uri ?? null;
        }

        if (isOnline && meetingUrl) {
            await db.update(agendaAppointments).set({ meetingUrl }).where(eq(agendaAppointments.id, appointment.id));
        }

        return { eventId, meetingUrl };
    } catch {
        return null;
    }
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await Promise.allSettled(subs.map(async (sub) => {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload),
            );
        } catch (e: unknown) {
            if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 410) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
        }
    }));
}

async function ensureNpsForAppointment(professionalId: string, appointmentId: string, clientId: string | null): Promise<{ token: string } | null> {
    const existing = await db.query.agendaNpsResponses.findFirst({
        where: eq(agendaNpsResponses.appointmentId, appointmentId),
    });
    if (existing) return { token: existing.token };
    const token = randomBytes(24).toString('hex');
    const [created] = await db.insert(agendaNpsResponses).values({
        professionalId, appointmentId, clientId, token,
    }).returning();
    return created ? { token: created.token } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAgendaProfile(userId: string) {
    return db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.userId, userId),
    });
}

const FREE_TIER_LIMITS = { maxClientsTotal: 5, maxAppointmentsPerMonth: 10 };

function isFreePlan(profile: { plan: string; planExpiresAt: Date | null }, userRole?: string): boolean {
    if (userRole === 'superadmin') return false;
    if (profile.plan === 'free') return true;
    if (profile.plan === 'pro' && profile.planExpiresAt && profile.planExpiresAt < new Date()) return true;
    return false;
}

async function checkClientLimit(profileId: string): Promise<string | null> {
    const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(agendaClients).where(eq(agendaClients.professionalId, profileId));
    if ((row?.total ?? 0) >= FREE_TIER_LIMITS.maxClientsTotal) return `Has alcanzado el límite de ${FREE_TIER_LIMITS.maxClientsTotal} pacientes del plan gratuito. Actualiza a Pro para pacientes ilimitados.`;
    return null;
}

async function checkAppointmentLimit(profileId: string): Promise<string | null> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(agendaAppointments).where(and(eq(agendaAppointments.professionalId, profileId), gte(agendaAppointments.startsAt, monthStart)));
    if ((row?.total ?? 0) >= FREE_TIER_LIMITS.maxAppointmentsPerMonth) return `Has alcanzado el límite de ${FREE_TIER_LIMITS.maxAppointmentsPerMonth} citas mensuales del plan gratuito. Actualiza a Pro para citas ilimitadas.`;
    return null;
}

/** Generate time slots for a given date based on availability rules and existing appointments.
 *  dateMidnight must be the UTC epoch that represents 00:00:00 in the professional's timezone.
 *  Time strings (startTime, endTime, breakStart, breakEnd) are in "HH:MM" local time. */
function generateSlots(
    rules: { startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null }[],
    durationMinutes: number,
    dateMidnight: Date,
    existingAppts: { startsAt: Date; endsAt: Date }[],
    blockedSlots: { startsAt: Date; endsAt: Date }[],
    _timezone: string,
): { startsAt: string; endsAt: string }[] {
    const slots: { startsAt: string; endsAt: string }[] = [];
    const toMs = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h * 60 + m) * 60_000;
    };

    for (const rule of rules) {
        let cursor = new Date(dateMidnight.getTime() + toMs(rule.startTime));
        const end  = new Date(dateMidnight.getTime() + toMs(rule.endTime));

        const bStart = rule.breakStart ? new Date(dateMidnight.getTime() + toMs(rule.breakStart)) : null;
        const bEnd   = rule.breakEnd   ? new Date(dateMidnight.getTime() + toMs(rule.breakEnd))   : null;

        while (cursor < end) {
            const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
            if (slotEnd > end) break;

            const inBreak = bStart && bEnd && cursor < bEnd && slotEnd > bStart;
            const clash = existingAppts.some(
                (a) => cursor < a.endsAt && slotEnd > a.startsAt,
            );
            const blocked = blockedSlots.some((b) => cursor < b.endsAt && slotEnd > b.startsAt);
            const inPast = cursor <= new Date();

            if (!inBreak && !clash && !blocked && !inPast) {
                slots.push({ startsAt: cursor.toISOString(), endsAt: slotEnd.toISOString() });
            }
            cursor = new Date(cursor.getTime() + durationMinutes * 60_000);
        }
    }
    return slots;
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — mount modular routers
// ─────────────────────────────────────────────────────────────────────────────

{
    const agendaDeps = {
        authUser,
        requireVerifiedSession,
        asString,
        randomUUID,
        randomBytes,
        db,
        sql,
        tables: {
            agendaProfessionalProfiles,
            agendaServices,
            agendaAvailabilityRules,
            agendaBlockedSlots,
            agendaLocations,
            agendaClients,
            agendaClientTags,
            agendaClientTagAssignments,
            agendaClientAttachments,
            agendaAppointments,
            agendaSessionNotes,
            agendaPayments,
            agendaPromotions,
            agendaPacks,
            agendaClientPacks,
            agendaGroupSessions,
            agendaGroupAttendees,
            agendaNpsResponses,
            agendaReferrals,
            agendaNotificationEvents,
            pushSubscriptions,
            users,
        },
        dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        getAgendaProfile,
        isFreePlan,
        checkClientLimit,
        checkAppointmentLimit,
        generateSlots,
        isValidSlug,
        RESERVED_SLUGS,
        logAudit,
        logNotification,
        syncToGoogleCalendar,
        sendPushToUser,
        sendBookingConfirmationEmail,
        sendAppointmentReminderEmail,
        notifyConfirmation,
        notifyProfessionalNewBooking,
        notifyCancellation,
        notifyReminder24h,
        sendTestMessage,
        ensureNpsForAppointment,
        createCheckoutPreference,
        google,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
        webpush,
        rateLimit,
    };
    app.route('/api/agenda', createAgendaRouter(agendaDeps));
    app.route('/api/public/agenda', createPublicAgendaRouter(agendaDeps));
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — WhatsApp reminder cron jobs
// ─────────────────────────────────────────────────────────────────────────────

function registerAgendaCronJobs() {
    // Solo activar cron jobs de SimpleAgenda en producción o cuando esté configurado
    const isProduction = process.env.NODE_ENV === 'production';
    const agendaEnabled = process.env.AGENDA_CRON_ENABLED === 'true';
    
    if (!isProduction && !agendaEnabled) {
        console.log('[agenda] cron jobs desactivados (no es producción y AGENDA_CRON_ENABLED != true)');
        return;
    }
    
    console.log('[agenda] registering reminder cron jobs...');
    // Every 5 minutes: check for appointments that need 24h reminder
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

            const appts = await db.select({
                appt: agendaAppointments,
                prof: agendaProfessionalProfiles,
            })
                .from(agendaAppointments)
                .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
                .where(and(
                    gte(agendaAppointments.startsAt, windowStart),
                    lte(agendaAppointments.startsAt, windowEnd),
                    sql`${agendaAppointments.status} IN ('confirmed', 'pending')`,
                    isNull(agendaAppointments.reminderSentAt),
                    sql`${agendaProfessionalProfiles.waNotificationsEnabled} = true`,
                ));

            for (const { appt, prof } of appts) {
                if (!appt.clientPhone) continue;
                try {
                    await notifyReminder24h(
                        { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                        { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                    );
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_24h',
                        recipient: appt.clientPhone,
                        status: 'sent',
                    });
                } catch (err) {
                    console.error('[agenda] 24h reminder failed for', appt.id, ':', err);
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_24h',
                        recipient: appt.clientPhone,
                        status: 'failed',
                        errorMessage: err instanceof Error ? err.message : String(err),
                    });
                }
                await db.update(agendaAppointments)
                    .set({ reminderSentAt: now })
                    .where(eq(agendaAppointments.id, appt.id));
            }
        } catch (e) {
            console.error('[agenda] 24h reminder cron error:', e);
        }
    });

    // Every 5 minutes: check for appointments that need 30min reminder
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

            const appts = await db.select({
                appt: agendaAppointments,
                prof: agendaProfessionalProfiles,
            })
                .from(agendaAppointments)
                .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
                .where(and(
                    gte(agendaAppointments.startsAt, windowStart),
                    lte(agendaAppointments.startsAt, windowEnd),
                    sql`${agendaAppointments.status} IN ('confirmed', 'pending')`,
                    isNull(agendaAppointments.reminder30minSentAt),
                    sql`${agendaProfessionalProfiles.waNotificationsEnabled} = true`,
                ));

            for (const { appt, prof } of appts) {
                if (!appt.clientPhone) continue;
                try {
                    await notifyReminder30min(
                        { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                        { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                    );
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_30min',
                        recipient: appt.clientPhone,
                        status: 'sent',
                    });
                } catch (err) {
                    console.error('[agenda] 30min reminder failed for', appt.id, ':', err);
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_30min',
                        recipient: appt.clientPhone,
                        status: 'failed',
                        errorMessage: err instanceof Error ? err.message : String(err),
                    });
                }
                await db.update(agendaAppointments)
                    .set({ reminder30minSentAt: now })
                    .where(eq(agendaAppointments.id, appt.id));
            }
        } catch (e) {
            console.error('[agenda] 30min reminder cron error:', e);
        }
    });
}

const port = Number(process.env.PORT ?? 4000);
const hostname = process.env.API_HOST ?? '0.0.0.0';
primeValuationFeedState();
void refreshValuationFeeds();

// Ensure critical tables exist regardless of migration system state.
// Uses IF NOT EXISTS so it's safe to run on every startup.
async function bootstrapMissingTables() {
    console.log('[simple-api] bootstrap starting...');
    // instagram_accounts (migration 0003)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS instagram_accounts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id),
            vertical varchar(20) NOT NULL,
            instagram_user_id varchar(255) NOT NULL,
            username varchar(255) NOT NULL,
            display_name varchar(255),
            account_type varchar(50),
            profile_picture_url varchar(500),
            access_token text NOT NULL,
            token_expires_at timestamp,
            scopes jsonb,
            auto_publish_enabled boolean NOT NULL DEFAULT false,
            caption_template text,
            status varchar(20) NOT NULL DEFAULT 'connected',
            last_synced_at timestamp,
            last_published_at timestamp,
            last_error text,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS instagram_accounts_user_vertical_idx
        ON instagram_accounts(user_id, vertical)
    `);
    // profile_picture_url era varchar(500) pero URLs de CDN de Instagram superan ese límite
    try {
        await db.execute(sql`
            ALTER TABLE instagram_accounts
                ALTER COLUMN profile_picture_url TYPE text
        `);
    } catch { /* already text */ }
    // instagram_publications (migration 0003)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS instagram_publications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id),
            instagram_account_id uuid NOT NULL REFERENCES instagram_accounts(id),
            vertical varchar(20) NOT NULL,
            listing_id varchar(255) NOT NULL,
            listing_title varchar(255) NOT NULL,
            instagram_media_id varchar(255),
            instagram_permalink varchar(500),
            caption text NOT NULL,
            image_url text NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'published',
            error_message text,
            source_updated_at timestamp,
            published_at timestamp,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    // instagram_permalink puede superar varchar(500)
    try {
        await db.execute(sql`
            ALTER TABLE instagram_publications
                ALTER COLUMN instagram_permalink TYPE text
        `);
    } catch { /* already text */ }
    // address_book (migration 0024)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS address_book (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind varchar(20) NOT NULL DEFAULT 'personal',
            label varchar(100) NOT NULL DEFAULT '',
            country_code varchar(3) NOT NULL DEFAULT 'CL',
            region_id varchar(50),
            region_name varchar(120),
            commune_id varchar(50),
            commune_name varchar(120),
            neighborhood varchar(120),
            address_line_1 varchar(255),
            address_line_2 varchar(255),
            postal_code varchar(20),
            contact_name varchar(160),
            contact_phone varchar(40),
            is_default boolean NOT NULL DEFAULT false,
            geo_point jsonb,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS address_book_user_id_idx ON address_book(user_id)
    `);

    // --- Agenda tables (migration 0019) ---
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_professional_profiles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            slug varchar(255) NOT NULL,
            is_published boolean DEFAULT false NOT NULL,
            profession varchar(100),
            display_name varchar(160),
            headline varchar(255),
            bio text,
            avatar_url varchar(500),
            cover_url varchar(500),
            public_email varchar(255),
            public_phone varchar(30),
            public_whatsapp varchar(30),
            city varchar(100),
            region varchar(100),
            address varchar(255),
            currency varchar(10) DEFAULT 'CLP' NOT NULL,
            timezone varchar(50) DEFAULT 'America/Santiago' NOT NULL,
            booking_window_days integer DEFAULT 30 NOT NULL,
            cancellation_hours integer DEFAULT 24 NOT NULL,
            confirmation_mode varchar(20) DEFAULT 'auto' NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS agenda_profiles_slug_idx ON agenda_professional_profiles(slug)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS agenda_profiles_user_id_idx ON agenda_professional_profiles(user_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_services (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            name varchar(160) NOT NULL,
            description text,
            duration_minutes integer DEFAULT 50 NOT NULL,
            price numeric(10, 2),
            currency varchar(10) DEFAULT 'CLP' NOT NULL,
            is_online boolean DEFAULT true NOT NULL,
            is_presential boolean DEFAULT false NOT NULL,
            color varchar(20),
            is_active boolean DEFAULT true NOT NULL,
            position integer DEFAULT 0 NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_services_professional_idx ON agenda_services(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_availability_rules (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            day_of_week integer NOT NULL,
            start_time varchar(5) NOT NULL,
            end_time varchar(5) NOT NULL,
            break_start varchar(5),
            break_end varchar(5),
            is_active boolean DEFAULT true NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_availability_professional_idx ON agenda_availability_rules(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_blocked_slots (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            starts_at timestamp NOT NULL,
            ends_at timestamp NOT NULL,
            reason varchar(255),
            created_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_blocked_slots_professional_idx ON agenda_blocked_slots(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_locations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            name varchar(160) NOT NULL,
            address_line varchar(255) NOT NULL,
            city varchar(100),
            region varchar(100),
            notes text,
            google_maps_url varchar(500),
            is_default boolean NOT NULL DEFAULT false,
            is_active boolean NOT NULL DEFAULT true,
            position integer NOT NULL DEFAULT 0,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_locations_professional_idx ON agenda_locations(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_clients (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            first_name varchar(100) NOT NULL,
            last_name varchar(100),
            email varchar(255),
            phone varchar(30),
            whatsapp varchar(30),
            rut varchar(20),
            date_of_birth varchar(10),
            gender varchar(20),
            occupation varchar(100),
            address varchar(255),
            city varchar(100),
            emergency_contact_name varchar(160),
            emergency_contact_phone varchar(30),
            referred_by varchar(160),
            internal_notes text,
            tags jsonb DEFAULT '[]'::jsonb,
            status varchar(20) DEFAULT 'active' NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_clients_professional_idx ON agenda_clients(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_client_attachments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            client_id uuid NOT NULL REFERENCES agenda_clients(id) ON DELETE CASCADE,
            name varchar(255) NOT NULL,
            url text NOT NULL,
            mime_type varchar(120),
            size_bytes integer,
            kind varchar(20) NOT NULL DEFAULT 'document',
            uploaded_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_client_attachments_client_idx ON agenda_client_attachments(client_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_client_attachments_professional_idx ON agenda_client_attachments(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_appointments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            service_id uuid REFERENCES agenda_services(id),
            client_id uuid REFERENCES agenda_clients(id),
            client_name varchar(160),
            client_email varchar(255),
            client_phone varchar(30),
            starts_at timestamp NOT NULL,
            ends_at timestamp NOT NULL,
            duration_minutes integer NOT NULL,
            modality varchar(20) DEFAULT 'online' NOT NULL,
            meeting_url varchar(500),
            location varchar(255),
            status varchar(20) DEFAULT 'confirmed' NOT NULL,
            price numeric(10, 2),
            currency varchar(10) DEFAULT 'CLP' NOT NULL,
            internal_notes text,
            client_notes text,
            cancelled_at timestamp,
            cancelled_by varchar(20),
            cancellation_reason text,
            reminder_sent_at timestamp,
            reminder_30min_sent_at timestamp,
            policy_agreed boolean NOT NULL DEFAULT false,
            policy_agreed_at timestamp,
            google_event_id varchar(255),
            payment_status varchar(20) NOT NULL DEFAULT 'not_required',
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_appointments_professional_idx ON agenda_appointments(professional_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_appointments_starts_at_idx ON agenda_appointments(starts_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_appointments_client_idx ON agenda_appointments(client_id)`);
    console.log('[simple-api] bootstrap: agenda_appointments OK');

    // Ensure all columns exist in agenda_appointments (for upgrades)
    try {
        await db.execute(sql`
            ALTER TABLE agenda_appointments
                ADD COLUMN IF NOT EXISTS reminder_30min_sent_at timestamp,
                ADD COLUMN IF NOT EXISTS policy_agreed boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS policy_agreed_at timestamp,
                ADD COLUMN IF NOT EXISTS google_event_id varchar(255),
                ADD COLUMN IF NOT EXISTS payment_status varchar(20) NOT NULL DEFAULT 'not_required',
                ADD COLUMN IF NOT EXISTS series_id uuid,
                ADD COLUMN IF NOT EXISTS recurrence_frequency varchar(20)
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_appointments_series_idx ON agenda_appointments(series_id)`);
        console.log('[simple-api] bootstrap: agenda_appointments columns upgraded');
    } catch (e) {
        console.error('[simple-api] bootstrap: failed to upgrade agenda_appointments columns', e);
    }

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_session_notes (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id uuid NOT NULL REFERENCES agenda_appointments(id) ON DELETE CASCADE,
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            client_id uuid REFERENCES agenda_clients(id),
            content text NOT NULL,
            raw_data jsonb,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS agenda_notes_appointment_idx ON agenda_session_notes(appointment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_notes_professional_idx ON agenda_session_notes(professional_id)`);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS agenda_payments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            professional_id uuid NOT NULL REFERENCES agenda_professional_profiles(id) ON DELETE CASCADE,
            appointment_id uuid REFERENCES agenda_appointments(id),
            client_id uuid REFERENCES agenda_clients(id),
            amount numeric(10, 2) NOT NULL,
            currency varchar(10) DEFAULT 'CLP' NOT NULL,
            method varchar(30),
            status varchar(20) DEFAULT 'pending' NOT NULL,
            external_id varchar(255),
            paid_at timestamp,
            notes text,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_payments_professional_idx ON agenda_payments(professional_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agenda_payments_appointment_idx ON agenda_payments(appointment_id)`);

    // Existing column upgrades
    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS google_calendar_id varchar(255),
                ADD COLUMN IF NOT EXISTS google_access_token text,
                ADD COLUMN IF NOT EXISTS google_refresh_token text,
                ADD COLUMN IF NOT EXISTS google_token_expiry timestamp
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS mp_access_token text,
                ADD COLUMN IF NOT EXISTS mp_public_key varchar(255),
                ADD COLUMN IF NOT EXISTS mp_user_id varchar(100),
                ADD COLUMN IF NOT EXISTS mp_refresh_token text,
                ADD COLUMN IF NOT EXISTS payment_link_url varchar(500),
                ADD COLUMN IF NOT EXISTS bank_transfer_data jsonb
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS notifications_last_seen_at timestamp
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS encuadre text,
                ADD COLUMN IF NOT EXISTS requires_advance_payment boolean DEFAULT false,
                ADD COLUMN IF NOT EXISTS advance_payment_instructions text,
                ADD COLUMN IF NOT EXISTS wa_notifications_enabled boolean DEFAULT true,
                ADD COLUMN IF NOT EXISTS wa_notify_professional boolean DEFAULT false,
                ADD COLUMN IF NOT EXISTS wa_professional_phone varchar(30)
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS plan varchar(20) NOT NULL DEFAULT 'free',
                ADD COLUMN IF NOT EXISTS plan_expires_at timestamp
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS allows_recurrent_booking boolean NOT NULL DEFAULT true
        `);
    } catch { /* ignore */ }

    try {
        await db.execute(sql`
            ALTER TABLE agenda_professional_profiles
                ADD COLUMN IF NOT EXISTS accepts_transfer boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS accepts_mp boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS accepts_payment_link boolean NOT NULL DEFAULT false
        `);
    } catch { /* ignore */ }

    // subscription_plans table
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            vertical varchar(20) NOT NULL,
            plan_id varchar(50) NOT NULL,
            name varchar(255) NOT NULL,
            description text NOT NULL DEFAULT '',
            price_monthly decimal(10,2) NOT NULL DEFAULT 0,
            price_yearly decimal(10,2) NOT NULL DEFAULT 0,
            currency varchar(10) NOT NULL DEFAULT 'CLP',
            max_listings integer NOT NULL DEFAULT 0,
            max_featured_listings integer NOT NULL DEFAULT 0,
            max_images_per_listing integer NOT NULL DEFAULT 0,
            analytics_enabled boolean NOT NULL DEFAULT false,
            crm_enabled boolean NOT NULL DEFAULT false,
            priority_support boolean NOT NULL DEFAULT false,
            custom_branding boolean NOT NULL DEFAULT false,
            api_access boolean NOT NULL DEFAULT false,
            is_active boolean NOT NULL DEFAULT true,
            is_default boolean NOT NULL DEFAULT false,
            features jsonb NOT NULL DEFAULT '[]',
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);

    // subscriptions table (user subscriptions) - drop and recreate to ensure correct types
    // Note: This is safe for development. For production, use proper migrations.
    try {
        await db.execute(sql`DROP TABLE IF EXISTS subscriptions`);
    } catch { /* ignore */ }
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id),
            plan_id varchar(50),
            vertical varchar(20) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            provider varchar(30) NOT NULL DEFAULT 'mercadopago',
            provider_subscription_id varchar(255),
            provider_status varchar(50),
            started_at timestamp NOT NULL DEFAULT now(),
            expires_at timestamp,
            cancelled_at timestamp,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_vertical_idx ON subscriptions(user_id, vertical)
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id)
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS subscriptions_vertical_idx ON subscriptions(vertical)
    `);

    // Migration: Convert 'basic' plan subscriptions to 'pro'
    try {
        await db.execute(sql`
            UPDATE subscriptions SET plan_id = 'pro' WHERE plan_id = 'basic'
        `);
        console.log('[simple-api] Migrated basic subscriptions to pro');
    } catch { /* ignore if no basic subscriptions */ }

    // push subscriptions table (migration 0025)
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint text NOT NULL,
            p256dh text NOT NULL,
            auth text NOT NULL,
            user_agent varchar(500),
            created_at timestamp NOT NULL DEFAULT now()
        )
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id)
    `);
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint)
    `);
}

// SimpleSerenatas routes
// ─────────────────────────────────────────────────────────────────────────────
const serenatasService = new SerenatasService(db);
const serenatasDeps = {
    db,
    authUser,
    service: serenatasService,
    requireAuth: async (c: any, next: any) => {
        const user = await authUser(c);
        if (!user) {
            return c.json({ ok: false, error: 'No autenticado' }, 401);
        }
        c.set('user', user);
        await next();
    },
    tables: {
        serenataGroups,
        serenataGroupMembers,
        serenataMusicians,
        serenataRequests,
        serenataAssignments,
        serenataRoutes,
        serenataNotifications,
        serenataCaptainProfiles,
        serenataMusicianProfiles,
        serenatas,
        serenataSubscriptions,
        serenataSubscriptionPayments,
        serenataPayments,
        serenataReviews,
        serenataAvailability,
        serenataMessages,
        users,
    },
};
app.route('/api/serenatas', createSerenatasRouter(serenatasDeps));

// Run DB migrations, preload data, then start the HTTP server
(async () => {
    try {
        await bootstrapMissingTables();
        console.log('[simple-api] bootstrap tables OK');

        // Register cron jobs after bootstrap is done
        registerAgendaCronJobs();
    } catch (error) {
        console.error('[simple-api] bootstrap tables failed', error);
    }
    try {
        const migrationsFolder = path.resolve(__dirname, '../drizzle');
        await migrate(db, { migrationsFolder });
        console.log('[simple-api] DB migrations applied');
    } catch (error) {
        console.error('[simple-api] DB migration failed', error);
    }
    try {
        await loadDataFromDB();
    } catch (error) {
        console.error('[simple-api] failed to preload DB data', error);
    }
    serve(
        {
            fetch: app.fetch,
            hostname,
            port,
        },
        (info) => {
            console.log(`[simple-api] listening on http://${hostname}:${info.port}`);
        }
    );
})();
