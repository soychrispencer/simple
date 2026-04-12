import { existsSync, appendFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

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
} from './instagram-templates';
import {
    createCheckoutPreference,
    createPreapproval,
    getPaymentById,
    getPreapprovalById,
    isMercadoPagoConfigured,
} from './mercadopago.js';
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
} from './instagram.js';
import { db } from './db/index.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq, and, or, desc, asc, gt, lt, gte, lte, isNull, sql } from 'drizzle-orm';
import {
    users,
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
    agendaAppointments,
    agendaSessionNotes,
    agendaPayments,
    pushSubscriptions,
    subscriptionPlans,
    subscriptions,
    paymentOrders,
} from './db/schema.js';
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
} from './whatsapp.js';
import { getStorageProvider } from './storage-providers/index.js';

type UserRole = 'user' | 'admin' | 'superadmin';
type UserStatus = 'active' | 'verified' | 'suspended';
type VerticalType = 'autos' | 'propiedades' | 'agenda';
type AddressBookKind = 'personal' | 'shipping' | 'billing' | 'company' | 'branch' | 'warehouse' | 'pickup' | 'other';
type ListingLocationSourceMode = 'saved_address' | 'custom' | 'area_only';

const DEBUG_LOG_FILE = path.resolve(process.cwd(), 'api_debug.log');
function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    try {
        appendFileSync(DEBUG_LOG_FILE, `[${timestamp}] ${message}\n`);
    } catch {
        // ignore
    }
}

logDebug('--- API RESTARTED ---');
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

type ValuationComparable = {
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

type VehicleValuationComparable = {
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

type ValuationHistoricalPoint = {
    ts: number;
    medianPrice: number;
    medianPricePerM2: number | null;
    sampleSize: number;
};

type ValuationSourceBreakdown = {
    source: string;
    comparables: number;
    weight: number;
    freshnessDays: number | null;
};

type ValuationConfidenceBreakdown = {
    dataCoverage: number;
    locationAccuracy: number;
    similarity: number;
    recency: number;
};

type ValuationFeedLicense = 'internal' | 'partner_feed' | 'commercial_feed' | 'public_open_data';
type ValuationFeedTransport = 'snapshot' | 'remote_json';
type ValuationFeedHealth = 'ready' | 'degraded' | 'disabled';

type ValuationFeedSourceStatus = {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    status: ValuationFeedHealth;
    sourceUrl: string | null;
    itemCount: number;
    lastSyncAt: number | null;
    lastError: string | null;
    supportsHistory: boolean;
};

type ValuationFeedConnectorLoadResult = {
    records: ValuationFeedRecord[];
    historyBySegment?: Record<string, ValuationHistoricalPoint[]>;
    sourceUrl: string | null;
};

type ValuationFeedConnector = {
    id: string;
    label: string;
    license: ValuationFeedLicense;
    transport: ValuationFeedTransport;
    supportsHistory: boolean;
    envUrlKey?: string;
    load: () => Promise<ValuationFeedConnectorLoadResult>;
};

type VehicleValuationFeedConnectorLoadResult = {
    records: VehicleValuationFeedRecord[];
    historyBySegment?: Record<string, ValuationHistoricalPoint[]>;
    sourceUrl: string | null;
};

type VehicleValuationFeedConnector = Omit<ValuationFeedConnector, 'load'> & {
    load: () => Promise<VehicleValuationFeedConnectorLoadResult>;
};

type AppUser = {
    id: string;
    email: string;
    passwordHash?: string; // Optional for OAuth users
    name: string;
    phone?: string | null;
    role: UserRole;
    status: UserStatus;
    avatar?: string;
    provider?: string; // 'local' | 'google' | etc.
    providerId?: string; // ID from OAuth provider
    lastLoginAt?: Date | null;
};

type PublicUser = {
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
type SubscriptionPlanId = 'free' | 'basic' | 'pro' | 'enterprise';
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
    features: string[];
};

type PaidSubscriptionPlanRecord = SubscriptionPlanRecord & {
    id: Exclude<SubscriptionPlanId, 'free'>;
};

type ActiveSubscription = {
    id: string;
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
    userId: string | null;
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
    listingId: string;
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
const subscriptionPlanIdSchema = z.enum(['free', 'basic', 'pro', 'enterprise']);
const paidSubscriptionPlanIdSchema = z.enum(['basic', 'pro', 'enterprise']);
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
    for (const user of userResults) {
        usersById.set(user.id, mapUserRowToAppUser(user));
    }
    console.log(`Loaded ${userResults.length} users`);

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

type ValuationFeedRecord = {
    id: string;
    source: string;
    operationType: 'sale' | 'rent';
    propertyType: string;
    regionId: string;
    communeId: string;
    neighborhood: string | null;
    title: string;
    price: number;
    currency: string;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    publishedAt: number;
    addressLabel: string | null;
    url: string | null;
};

const valuationFeedRecords: ValuationFeedRecord[] = [
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

async function loadPartnerFeed(sourceId: string, envUrlKey: string | undefined, fallbackRecords: ValuationFeedRecord[]): Promise<ValuationFeedConnectorLoadResult> {
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

type VehicleValuationFeedRecord = {
    id: string;
    source: string;
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
    regionId: string;
    communeId: string;
    title: string;
    price: number;
    currency: string;
    publishedAt: number;
    addressLabel: string | null;
    url: string | null;
};

const vehicleValuationFeedRecords: VehicleValuationFeedRecord[] = [
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
            features: ['3 publicaciones activas', '5 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'basic',
            name: 'Básico',
            description: 'Para vendedores y corredoras pequeñas.',
            priceMonthly: 14990,
            currency: 'CLP',
            maxListings: 10,
            maxFeaturedListings: 1,
            maxImagesPerListing: 10,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            features: ['10 publicaciones activas', '1 aviso destacado', '10 fotos por aviso', 'Estadísticas base'],
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
            features: ['50 publicaciones activas', '5 avisos destacados', 'CRM completo', 'Estadísticas avanzadas'],
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
            features: ['Publicaciones ilimitadas', 'Destacados ilimitados', 'API y branding propio', 'Soporte prioritario 24/7'],
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
            features: ['3 publicaciones activas', '12 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'basic',
            name: 'Básico',
            description: 'Para brokers y corredores independientes.',
            priceMonthly: 14990,
            currency: 'CLP',
            maxListings: 10,
            maxFeaturedListings: 1,
            maxImagesPerListing: 20,
            analyticsEnabled: false,
            crmEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            features: ['10 propiedades activas', '1 destacada', '20 fotos por aviso', 'Estadísticas base'],
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
            features: ['50 propiedades activas', '5 destacadas', 'CRM con pipeline', 'Estadísticas avanzadas'],
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
            features: ['Publicaciones ilimitadas', 'Destacados ilimitados', 'API y branding propio', 'Soporte prioritario 24/7'],
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
            features: ['Hasta 10 citas al mes', 'Hasta 5 pacientes', 'Página de reserva pública', 'Recordatorios por email'],
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
            features: ['Citas y pacientes ilimitados', 'Notas clínicas por sesión', 'Control de pagos y cobros', 'Recordatorios email + WhatsApp', 'Estadísticas de consulta', 'Soporte prioritario'],
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
    if (planId === 'pro' || planId === 'basic') return 'independent';
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

function getInstagramRequiredPlanIds(): Array<Exclude<SubscriptionPlanId, 'free' | 'basic'>> {
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
    const [row] = await db.insert(instagramPublications).values({
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
        const fullPrice = escapeSvgText(clampTemplateText(template.offerPriceLabel || template.priceLabel || 'Consultar', 20));
        const origPrice = template.offerPriceLabel ? escapeSvgText(clampTemplateText(template.priceLabel || '', 20)) : '';
        const proTitle = template.title ? escapeSvgText(clampTemplateText(template.title.toUpperCase(), 48)) : '';
        const locText = template.locationLabel ? escapeSvgText(clampTemplateText(template.locationLabel, 24)) : '';

        // Dynamic card height
        let ch = 72; // top padding (logo overlap space)
        ch += 80; // price
        if (origPrice) ch += 28;
        if (proTitle) ch += 46;
        if (highlights.length > 0) ch += 46;
        if (locText) ch += 56;
        ch += 28; // bottom padding
        const cardH = Math.max(ch, 260);
        const cardY = height - margin - cardH;

        // Content positions
        let y = cardY + 72;
        const priceBaseline = y + 62;
        y += 78;
        let strikeSvg = '';
        if (origPrice) {
            strikeSvg = `<text x="${cx}" y="${y + 14}" fill="rgba(255,255,255,0.5)" font-size="22" font-weight="500" text-anchor="middle" text-decoration="line-through">${origPrice}</text>`;
            y += 28;
        }
        let titleSvg = '';
        if (proTitle) {
            y += 6;
            titleSvg = `<text x="${cx}" y="${y + 30}" fill="#FFFFFF" font-size="38" font-weight="900" text-anchor="middle">${proTitle}</text>`;
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
                hlSvg += `<text x="${hx}" y="${hlY + 20}" fill="rgba(255,255,255,0.8)" font-size="24" font-weight="600">${escapeSvgText(h.toUpperCase())}</text>`;
                hx += h.length * 16 + 10 + 16;
            }
            y += 36;
        }
        // Location pill with icon — bigger
        let locSvg = '';
        if (locText) {
            y += 14;
            const pillW = Math.min(locText.length * 16 + 80, cardW - 60);
            const pillX = cx - pillW / 2;
            locSvg = `
                <rect x="${pillX}" y="${y}" rx="24" ry="24" width="${pillW}" height="48" fill="#FFFFFF" />
                ${svgIcon('ubicacion', pillX + 14, y + 12, 24, brandAccent, 2)}
                <text x="${cx + 12}" y="${y + 33}" fill="${brandAccent}" font-size="24" font-weight="700" text-anchor="middle">${locText}</text>
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
            <text x="${cx}" y="${priceBaseline}" fill="#FFFFFF" font-size="80" font-weight="900" text-anchor="middle" letter-spacing="-2">${fullPrice}</text>
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
        const locText = template.locationLabel ? escapeSvgText(clampTemplateText(template.locationLabel, 24)) : '';

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
            <rect x="0" y="${gradY}" width="${width}" height="${gradH}" fill="url(#premiumGrad)" />
            ${badgesSvg}
            <text x="${cx}" y="${priceBaseline}" fill="#FFFFFF" font-size="80" font-weight="900" text-anchor="middle" letter-spacing="-2">${fullPrice}</text>
            ${strikeSvg}
            ${titleSvg}
            ${hlSvg}
            ${locSvg}
        `;
    } else {
        detailsBand = '';
    }

    const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="'Inter', 'Arial', sans-serif">
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

    return Buffer.from(svg);
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
        const coverUrl = await prepareInstagramImageUrl(listing, 0, {
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
            const url = await prepareInstagramImageUrl(listing, i, {
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
            const listingImageUrl = sourceListing ? extractListingMediaUrls(sourceListing)[0] ?? listing.imageUrl : listing.imageUrl;
            return {
                id: listing.id,
                href: listing.href,
                title: listing.title,
                subtitle: listing.subtitle,
                price: listing.price,
                location: listing.location || 'Chile',
                imageUrl: listingImageUrl,
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
            const listingImageUrl = sourceListing ? extractListingMediaUrls(sourceListing)[0] ?? listing.imageUrl : listing.imageUrl;
            return {
                id: listing.id,
                href: listing.href,
                title: listing.title,
                subtitle: listing.subtitle,
                price: listing.price,
                location: listing.location || 'Chile',
                imageUrl: listingImageUrl,
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

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

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
    const [row] = await db.insert(listings).values({
        id: record.id,
        ...listingToDbWrite(record),
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

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
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

    const visibilityMode = location.visibilityMode ?? 'commune_only';
    const address = asString(location.addressLine1);
    const neighborhood = asString(location.neighborhood);
    const commune = asString(location.communeName);
    const region = asString(location.regionName);

    if (visibilityMode === 'hidden') return '';
    if (visibilityMode === 'exact') return [address, neighborhood, commune, region].filter(Boolean).join(', ');
    if (visibilityMode === 'approximate' || visibilityMode === 'sector_only') return [neighborhood, commune, region].filter(Boolean).join(', ');
    return [commune, region].filter(Boolean).join(', ');
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

    const data: any = {
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
    const subtitle = listing.vertical === 'autos' ? 'Publicación SimpleAutos' : 'Publicación SimplePropiedades';
    const imageUrl = extractListingMediaUrls(listing)[0] ?? '';
    const existing = boostListingsSeed.find((item) => item.id === listing.id && item.vertical === listing.vertical);
    if (existing) {
        existing.title = listing.title;
        existing.subtitle = subtitle;
        existing.price = listing.price;
        existing.location = listing.location || existing.location;
        existing.section = listing.section;
        existing.href = listing.href;
        existing.imageUrl = imageUrl || existing.imageUrl;
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
        imageUrl,
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
        avatar: runtimeUser.avatar,
        provider: runtimeUser.provider,
        lastLoginAt: runtimeUser.lastLoginAt ?? null,
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

function mapUserRowToAppUser(user: typeof users.$inferSelect): AppUser {
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash ?? undefined,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        avatar: user.avatarUrl ?? undefined,
        provider: user.provider ?? undefined,
        providerId: user.providerId ?? undefined,
        lastLoginAt: user.lastLoginAt ?? null,
    };
}

function mapInstagramAccountRow(account: typeof instagramAccounts.$inferSelect): InstagramAccountRecord {
    return {
        id: account.id,
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
        userId: lead.userId ?? null,
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
        listingId: lead.listingId,
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
    const subject = isPending
        ? `Tu solicitud de cita con ${data.professionalName} fue recibida`
        : `Tu cita con ${data.professionalName} está confirmada`;

    const dateStr = fmtBookingDateTime(data.startsAt, data.timezone);
    const textBody = [
        subject,
        '',
        `Fecha y hora: ${dateStr}`,
        data.serviceName ? `Servicio: ${data.serviceName}` : '',
        `Modalidad: ${data.modality === 'presencial' ? 'Presencial' : 'Online'}`,
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
    return photos
        .map((photo) => toPublicMediaUrl(photo))
        .filter((url) => url.length > 0)
        .slice(0, 8);
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
        location: record.location ?? '',
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
        listingId: record.listingId,
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
    return applyRuntimeRole(user);
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

    setCookie(c, SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: authCookieSameSite,
        secure: authCookieSecure,
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

    const rows = await db.insert(crmPipelineColumns).values(
        DEFAULT_LISTING_PIPELINE_COLUMNS.map((column, index) => ({
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
    const rows = await db.insert(listingLeads).values({
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

async function listAdminUsersSnapshot(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
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

    return userRows.map((user) => {
        const counters = listingCounters.get(user.id) ?? { total: 0, autos: 0, propiedades: 0 };
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            status: user.status as UserStatus,
            provider: user.provider ?? null,
            createdAt: user.createdAt.getTime(),
            lastLoginAt: user.lastLoginAt?.getTime() ?? null,
            totalListings: counters.total,
            autosListings: counters.autos,
            propiedadesListings: counters.propiedades,
        };
    });
}

async function listAdminListingsSnapshot(): Promise<Array<{
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

    return listingRows.map((listing) => {
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

app.use(
    '*',
    cors({
        origin: (origin) => {
            if (!origin) return defaultOrigin;
            return allowedOrigins.has(origin) ? origin : defaultOrigin;
        },
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

app.get('/', (c) =>
    c.json({
        ok: true,
        service: 'simple-v2-api',
        status: 'running',
    })
);

const handleHealthcheck = (c: Context) =>
    c.json({
        ok: true,
        service: 'simple-v2-api',
        timestamp: new Date().toISOString(),
    });

app.get('/api/debug/env', (c) => {
    return c.json({
        cwd: process.cwd(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
            LOCAL_STORAGE_URL: process.env.LOCAL_STORAGE_URL,
            BACKBLAZE_DOWNLOAD_URL: process.env.BACKBLAZE_DOWNLOAD_URL,
            BACKBLAZE_BUCKET_NAME: process.env.BACKBLAZE_BUCKET_NAME,
        },
        api_root: API_ROOT_DIR,
    });
});

app.get('/health', handleHealthcheck);
app.get('/api/health', handleHealthcheck);

// Development-only file server for local uploads (only when STORAGE_PROVIDER=local)
app.get('/uploads/*', async (c) => {
    if (process.env.STORAGE_PROVIDER !== 'local' && process.env.NODE_ENV !== 'development') {
        return c.text('Not found', 404);
    }

    const pathname = new URL(c.req.url).pathname;
    const relativePath = pathname.replace(/^\/uploads\//, '');
    if (!relativePath) {
        return c.text('Not found', 404);
    }

    const diskPath = path.join(process.cwd(), 'uploads', ...relativePath.split('/'));
    try {
        const stat = await fs.stat(diskPath);
        if (!stat.isFile()) {
            return c.text('Not found', 404);
        }

        const blob = await fs.readFile(diskPath);
        let contentType = 'application/octet-stream';
        if (diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (diskPath.endsWith('.png')) contentType = 'image/png';
        else if (diskPath.endsWith('.webp')) contentType = 'image/webp';
        else if (diskPath.endsWith('.gif')) contentType = 'image/gif';

        return c.body(blob, 200, { 'Content-Type': contentType });
    } catch {
        return c.text('Not found', 404);
    }
});

let mediaProxyS3Client: S3Client | null = null;

function getMediaProxyS3Client(): S3Client | null {
    if (process.env.STORAGE_PROVIDER !== 'backblaze-s3') return null;
    if (mediaProxyS3Client) return mediaProxyS3Client;

    const endpoint = process.env.BACKBLAZE_S3_ENDPOINT;
    const region = process.env.BACKBLAZE_S3_REGION;
    const accessKeyId = process.env.BACKBLAZE_S3_ACCESS_KEY;
    const secretAccessKey = process.env.BACKBLAZE_S3_SECRET_KEY;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) return null;

    mediaProxyS3Client = new S3Client({
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: false,
    });

    return mediaProxyS3Client;
}

app.get('/api/media/proxy', async (c) => {
    const src = asString(c.req.query('src'));
    if (!src) {
        return c.json({ ok: false, error: 'Falta src.' }, 400);
    }

    if (!isBackblazeUrl(src)) {
        return c.json({ ok: false, error: 'Origen no soportado.' }, 400);
    }

    const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
    const key = extractBackblazeObjectKey(src);
    if (!key) {
        return c.json({ ok: false, error: 'No pudimos resolver el archivo.' }, 404);
    }

    const client = getMediaProxyS3Client();
    if (!client) {
        return c.json({ ok: false, error: 'El proxy de medios no está configurado.' }, 503);
    }

    try {
        const object = await client.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        const body = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : Buffer.alloc(0);
        return c.body(body, 200, {
            'Content-Type': object.ContentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo descargar el archivo.';
        return c.json({ ok: false, error: message }, 404);
    }
});

app.post('/api/auth/login', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const clientId = getClientIdentifier(c);
    const ipRateLimit = consumeRateLimit(`auth:login:ip:${clientId}`, 10, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!ipRateLimit.ok) {
        c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
        return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, 429);
    }

    const emailRateLimit = consumeRateLimit(`auth:login:email:${normalizedEmail}`, 10, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!emailRateLimit.ok) {
        c.header('Retry-After', String(emailRateLimit.retryAfterSeconds));
        return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, 429);
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
        console.warn(`[AUTH LOGIN] Usuario no encontrado: ${normalizedEmail}`);
        return c.json({ ok: false, error: 'Email o contraseña incorrectos. Si no tienes cuenta, crea una.' }, 401);
    }

    if (!canAuthenticateUser(user)) {
        console.warn(`[AUTH LOGIN] Cuenta suspendida: ${normalizedEmail}`);
        return c.json({ ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.' }, 403);
    }

    if (!user.passwordHash) {
        console.warn(`[AUTH LOGIN] Sin passwordHash (Google auth): ${normalizedEmail}`);
        return c.json({ ok: false, error: 'Esta cuenta requiere autenticación con Google. Usar "Continuar con Google".' }, 401);
    }

    const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatch) {
        console.warn(`[AUTH LOGIN] Contraseña incorrecta: ${normalizedEmail}`);
        return c.json({ ok: false, error: 'Email o contraseña incorrectos.' }, 401);
    }

    await touchUserLastLoginAt(user.id);
    clearRateLimit(`auth:login:ip:${clientId}`);
    clearRateLimit(`auth:login:email:${normalizedEmail}`);
    setSession(c, user.id);
    console.info(`[AUTH LOGIN] Login exitoso: ${normalizedEmail}`);
    return c.json({
        ok: true,
        user: sanitizeUser({
            ...user,
            lastLoginAt: new Date(),
        }),
    });
});

app.post('/api/auth/register', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const clientId = getClientIdentifier(c);
    const ipRateLimit = consumeRateLimit(`auth:register:ip:${clientId}`, 5, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!ipRateLimit.ok) {
        c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
        return c.json({ ok: false, error: 'Demasiados intentos de registro. Intenta nuevamente más tarde.' }, 429);
    }

    if (process.env.NODE_ENV === 'production' && !isAuthEmailConfigured()) {
        return c.json({ ok: false, error: 'El registro no está disponible porque el correo de verificación no está configurado.' }, 503);
    }

    const origin = resolveBrowserOrigin(c);
    if (!origin) {
        return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
        return c.json({ ok: false, error: 'Email ya registrado' }, 409);
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    const [insertedUser] = await db.insert(users).values({
        email: normalizedEmail,
        passwordHash: hashedPassword,
        name: parsed.data.name.trim(),
        role: 'user',
        status: 'active',
        provider: 'local',
    }).returning({ id: users.id });

    const newUser: AppUser = {
        id: insertedUser.id,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        name: parsed.data.name.trim(),
        role: 'user',
        status: 'active',
        provider: 'local',
        lastLoginAt: new Date(),
    };

    try {
        await issueEmailVerification(newUser.id, normalizedEmail, origin);
    } catch (error) {
        console.error('Email verification delivery error:', error);
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, newUser.id));
        await db.delete(users).where(eq(users.id, newUser.id));
        return c.json({ ok: false, error: 'No pudimos enviar el correo de verificación. Inténtalo nuevamente en unos minutos.' }, 502);
    }

    await touchUserLastLoginAt(newUser.id);
    clearRateLimit(`auth:register:ip:${clientId}`);
    setSession(c, newUser.id);

    return c.json({ ok: true, user: sanitizeUser(newUser) }, 201);
});

// Endpoint especial: Bootstrap inicial de superadmin (solo si no existe ningún admin)
app.post('/api/admin/bootstrap', async (c) => {
    if (!isAdminBootstrapEnabled()) {
        return c.json({ ok: false, error: 'No encontrado' }, 404);
    }

    // Verificar si ya hay admins en el sistema
    const existingAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.role, 'admin'), eq(users.role, 'superadmin')))
        .limit(1);

    if (existingAdmins.length > 0) {
        return c.json({ ok: false, error: 'Ya existe un administrador en el sistema' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
        return c.json({ ok: false, error: 'Email ya registrado' }, 409);
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    // Crear el superadmin ya verificado
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

    await touchUserLastLoginAt(newUser.id);
    setSession(c, newUser.id);

    return c.json({ ok: true, user: sanitizeUser(newUser) }, 201);
});

app.use('/api/account/*', requireVerifiedSession);
app.use('/api/crm/*', requireVerifiedSession);
app.use('/api/panel/*', requireVerifiedSession);
app.use('/api/messages/*', requireVerifiedSession);
app.use('/api/listing-draft', requireVerifiedSession);
app.use('/api/listings', requireVerifiedSession);
app.use('/api/listings/*', requireVerifiedSession);
app.use('/api/address-book', requireVerifiedSession);
app.use('/api/address-book/*', requireVerifiedSession);
app.use('/api/boost/*', requireVerifiedSession);
app.use('/api/advertising/campaigns', requireVerifiedSession);
app.use('/api/advertising/campaigns/*', requireVerifiedSession);
app.use('/api/integrations/instagram', requireVerifiedSession);
app.use('/api/integrations/instagram/*', requireVerifiedSession);

app.get('/api/auth/me', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    return c.json({ ok: true, user: sanitizeUser(user) });
});

app.patch('/api/account/profile', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const normalizedPhone = parsed.data.phone && parsed.data.phone.trim() ? parsed.data.phone.trim() : null;
    const rows = await db
        .update(users)
        .set({
            name: parsed.data.name.trim(),
            phone: normalizedPhone,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

    if (rows.length === 0) {
        return c.json({ ok: false, error: 'No encontramos tu cuenta.' }, 404);
    }

    const updatedUser = mapUserRowToAppUser(rows[0]);
    usersById.set(updatedUser.id, updatedUser);
    return c.json({ ok: true, user: sanitizeUser(updatedUser) });
});

app.get('/api/account/public-profile', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    return c.json(buildAccountPublicProfileResponse(user, vertical));
});

app.get('/api/account/public-profile/slug-check', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const candidate = normalizePublicProfileSlug(asString(c.req.query('slug')));
    if (!isValidPublicProfileSlug(candidate)) {
        return c.json({ ok: false, error: 'Slug inválido' }, 400);
    }

    const existing = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, candidate));
    return c.json({
        ok: true,
        slug: candidate,
        available: !existing || existing.userId === user.id,
    });
});

app.patch('/api/account/public-profile', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUsePublicProfile(user, vertical)) {
        return c.json({ ok: false, error: 'El perfil público está disponible solo para suscripciones de pago.' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = publicProfileWriteSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const current = getPublicProfileRecord(user.id, vertical);
    const normalizedSlug = normalizePublicProfileSlug(parsed.data.slug || parsed.data.displayName);
    if (!isValidPublicProfileSlug(normalizedSlug)) {
        return c.json({ ok: false, error: 'Usa un slug válido de 3 a 80 caracteres.' }, 400);
    }

    const existingBySlug = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, normalizedSlug));
    if (existingBySlug && existingBySlug.userId !== user.id) {
        return c.json({ ok: false, error: 'Ese enlace público ya está en uso.' }, 409);
    }

    const nextBusinessHours = parsed.data.alwaysOpen
        ? PUBLIC_PROFILE_DAYS.map((day) => ({ day, open: '00:00', close: '23:59', closed: false }))
        : parsed.data.businessHours.map((item) => ({
            day: item.day,
            open: item.closed ? null : item.open,
            close: item.closed ? null : item.close,
            closed: item.closed,
        }));

    for (const item of nextBusinessHours) {
        if (item.closed) continue;
        if (!item.open || !item.close || item.open >= item.close) {
            return c.json({ ok: false, error: 'Revisa el horario de atención antes de guardar.' }, 400);
        }
    }

    const nextSocialLinks = normalizePublicProfileSocialLinks(parsed.data.socialLinks);
    const now = new Date();
    const rowPayload = {
        slug: normalizedSlug,
        isPublished: parsed.data.isPublished,
        accountKind: parsed.data.accountKind,
        leadRoutingMode: parsed.data.leadRoutingMode,
        leadRoutingCursor: current?.leadRoutingCursor ?? 0,
        displayName: parsed.data.displayName.trim(),
        headline: toNullIfEmpty(parsed.data.headline),
        bio: toNullIfEmpty(parsed.data.bio),
        companyName: parsed.data.accountKind === 'company'
            ? (toNullIfEmpty(parsed.data.companyName) ?? parsed.data.displayName.trim())
            : toNullIfEmpty(parsed.data.companyName),
        website: normalizeExternalUrlInput(parsed.data.website),
        publicEmail: toNullIfEmpty(parsed.data.publicEmail)?.toLowerCase() ?? null,
        publicPhone: toNullIfEmpty(parsed.data.publicPhone),
        publicWhatsapp: toNullIfEmpty(parsed.data.publicWhatsapp),
        addressLine: toNullIfEmpty(parsed.data.addressLine),
        city: toNullIfEmpty(parsed.data.city),
        region: toNullIfEmpty(parsed.data.region),
        coverImageUrl: normalizeExternalUrlInput(parsed.data.coverImageUrl),
        avatarImageUrl: normalizeExternalUrlInput(parsed.data.avatarImageUrl),
        socialLinks: nextSocialLinks,
        businessHours: nextBusinessHours,
        specialties: parsed.data.specialties.map((item) => item.trim()).filter(Boolean),
        scheduleNote: toNullIfEmpty(parsed.data.scheduleNote),
        alwaysOpen: parsed.data.alwaysOpen,
        updatedAt: now,
    } as const;
    const nextTeamRows = parsed.data.teamMembers.map((member, index) => ({
        id: member.id ?? randomUUID(),
        userId: user.id,
        vertical,
        name: member.name.trim(),
        roleTitle: toNullIfEmpty(member.roleTitle),
        bio: toNullIfEmpty(member.bio),
        email: toNullIfEmpty(member.email)?.toLowerCase() ?? null,
        phone: toNullIfEmpty(member.phone),
        whatsapp: toNullIfEmpty(member.whatsapp),
        avatarImageUrl: normalizeExternalUrlInput(member.avatarImageUrl),
        socialLinks: normalizePublicProfileTeamSocialLinks(member.socialLinks),
        specialties: member.specialties.map((item) => item.trim()).filter(Boolean),
        isLeadContact: member.isLeadContact,
        receivesLeads: member.receivesLeads,
        isPublished: member.isPublished,
        position: index,
        createdAt: now,
        updatedAt: now,
    }));

    let savedRow: typeof publicProfiles.$inferSelect | null = null;
    if (current) {
        const rows = await db
            .update(publicProfiles)
            .set(rowPayload)
            .where(eq(publicProfiles.id, current.id))
            .returning();
        savedRow = rows[0] ?? null;
        publicProfilesByVerticalSlug.delete(publicProfileVerticalSlugKey(current.vertical, current.slug));
    } else {
        const rows = await db
            .insert(publicProfiles)
            .values({
                userId: user.id,
                vertical,
                createdAt: now,
                ...rowPayload,
            })
            .returning();
        savedRow = rows[0] ?? null;
    }

    if (!savedRow) {
        return c.json({ ok: false, error: 'No pudimos guardar tu perfil público.' }, 500);
    }

    await db.delete(publicProfileTeamMembers).where(and(
        eq(publicProfileTeamMembers.userId, user.id),
        eq(publicProfileTeamMembers.vertical, vertical)
    ));
    if (nextTeamRows.length > 0) {
        await db.insert(publicProfileTeamMembers).values(nextTeamRows);
    }

    upsertPublicProfileCache(mapPublicProfileRow(savedRow));
    replacePublicProfileTeamMemberCache(
        user.id,
        vertical,
        nextTeamRows.map((item) => ({
            id: item.id,
            userId: item.userId,
            vertical: item.vertical,
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
            position: item.position,
            createdAt: item.createdAt.getTime(),
            updatedAt: item.updatedAt.getTime(),
        }))
    );
    return c.json(buildAccountPublicProfileResponse(user, vertical));
});

app.post('/api/auth/logout', (c) => {
    clearSession(c);
    return c.json({ ok: true });
});

app.post('/api/auth/password-reset/request', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = passwordResetRequestSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const clientId = getClientIdentifier(c);
    const ipRateLimit = consumeRateLimit(`auth:reset-request:ip:${clientId}`, 5, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!ipRateLimit.ok) {
        c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
        return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);
    }

    if (process.env.NODE_ENV === 'production' && !isAuthEmailConfigured()) {
        return c.json({ ok: false, error: 'La recuperación de contraseña no está configurada en este entorno.' }, 503);
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user || !canAuthenticateUser(user)) {
        return c.json({ ok: true });
    }

    const origin = resolveBrowserOrigin(c);
    if (!origin) {
        return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
    }

    const rawToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

    await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt,
    });

    try {
        await sendPasswordResetEmail(normalizedEmail, buildPasswordResetUrl(origin, rawToken), origin);
    } catch (error) {
        console.error('Password reset email error:', error);
        return c.json({ ok: false, error: 'No pudimos enviar el correo de recuperación. Inténtalo nuevamente.' }, 502);
    }
    return c.json({ ok: true });
});

app.post('/api/auth/email-verification/request', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = emailVerificationRequestSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    if (process.env.NODE_ENV === 'production' && !isAuthEmailConfigured()) {
        return c.json({ ok: false, error: 'La confirmación de correo no está configurada en este entorno.' }, 503);
    }

    const origin = resolveBrowserOrigin(c);
    if (!origin) {
        return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
    }

    const sessionUser = await authUser(c);
    const normalizedEmail = parsed.data.email?.trim().toLowerCase() ?? sessionUser?.email ?? null;
    if (!normalizedEmail) {
        return c.json({ ok: false, error: 'Debes indicar un correo válido.' }, 400);
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user || !canAuthenticateUser(user)) {
        return c.json({ ok: true });
    }
    if (user.status === 'verified') {
        return c.json({ ok: true, alreadyVerified: true });
    }

    try {
        await issueEmailVerification(user.id, normalizedEmail, origin);
    } catch (error) {
        console.error('Email verification request error:', error);
        return c.json({ ok: false, error: 'No pudimos enviar el correo de confirmación. Inténtalo nuevamente.' }, 502);
    }

    return c.json({ ok: true });
});

app.post('/api/auth/email-verification/confirm', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = emailVerificationConfirmSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const now = new Date();
    const tokenHash = hashOpaqueToken(parsed.data.token);
    const result = await db.select().from(emailVerificationTokens).where(and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, now),
    )).limit(1);

    if (result.length === 0) {
        return c.json({ ok: false, error: 'El enlace de confirmación es inválido o expiró.' }, 400);
    }

    const verificationToken = result[0];
    const user = await getUserById(verificationToken.userId);
    if (!user || !canAuthenticateUser(user)) {
        return c.json({ ok: false, error: 'No se pudo confirmar esta cuenta.' }, 400);
    }

    await db.update(users).set({
        status: 'verified',
        updatedAt: now,
    }).where(eq(users.id, user.id));

    await db.update(emailVerificationTokens).set({ usedAt: now }).where(and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt),
    ));

    const origin = resolveBrowserOrigin(c);
    if (origin) {
        try {
            await sendWelcomeEmail(user.email, user.name, origin);
        } catch (error) {
            console.error('Welcome email delivery error:', error);
        }
    }

    setSession(c, user.id);
    return c.json({
        ok: true,
        user: sanitizeUser({
            ...user,
            status: 'verified',
        }),
    });
});

app.post('/api/auth/password-reset/confirm', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = passwordResetConfirmSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const clientId = getClientIdentifier(c);
    const ipRateLimit = consumeRateLimit(`auth:reset-confirm:ip:${clientId}`, 10, AUTH_RATE_LIMIT_WINDOW_MS);
    if (!ipRateLimit.ok) {
        c.header('Retry-After', String(ipRateLimit.retryAfterSeconds));
        return c.json({ ok: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);
    }

    const now = new Date();
    const tokenHash = hashOpaqueToken(parsed.data.token);
    const result = await db.select().from(passwordResetTokens).where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
    )).limit(1);

    if (result.length === 0) {
        return c.json({ ok: false, error: 'El enlace de recuperación es inválido o expiró.' }, 400);
    }

    const resetToken = result[0];
    const user = await getUserById(resetToken.userId);
    if (!user || !canAuthenticateUser(user)) {
        return c.json({ ok: false, error: 'No se pudo restablecer la contraseña para esta cuenta.' }, 400);
    }

    const nextPasswordHash = await bcrypt.hash(parsed.data.password, 10);
    await db.update(users).set({
        passwordHash: nextPasswordHash,
        updatedAt: now,
        lastLoginAt: now,
    }).where(eq(users.id, user.id));
    await db.update(passwordResetTokens).set({ usedAt: now }).where(and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
    ));

    clearRateLimit(`auth:reset-confirm:ip:${clientId}`);

    const origin = resolveBrowserOrigin(c);
    if (origin) {
        try {
            await sendPasswordChangedEmail(user.email, origin);
        } catch (error) {
            console.error('Password changed email error:', error);
        }
    }

    setSession(c, user.id);
    return c.json({
        ok: true,
        user: sanitizeUser({
            ...user,
            passwordHash: nextPasswordHash,
            lastLoginAt: now,
        }),
    });
});

// One-time OAuth callback tokens (TTL: 90s, cleared on use)
const pendingOAuthSessions = new Map<string, { userId: string; expiresAt: number }>();
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of pendingOAuthSessions) {
        if (v.expiresAt < now) pendingOAuthSessions.delete(k);
    }
}, 30_000);

function buildOAuthState(nonce: string, origin: string): string {
    const ts = Math.floor(Date.now() / 1000);
    // Use ~ as separator — safe since nonce/ts are hex/digits and origin is a URL (no ~)
    const payload = `${nonce}~${ts}~${origin}`;
    const sig = createHash('sha256').update(`${SESSION_SECRET}:${payload}`).digest('hex').slice(0, 32);
    return Buffer.from(`${payload}~${sig}`).toString('base64url');
}

function verifyOAuthState(state: string): { nonce: string; origin: string } | null {
    try {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        // Split on first 3 occurrences of ~ only (origin may theoretically be last)
        const firstTilde = decoded.indexOf('~');
        const secondTilde = decoded.indexOf('~', firstTilde + 1);
        const lastTilde = decoded.lastIndexOf('~');
        if (firstTilde === -1 || secondTilde === -1 || lastTilde === secondTilde) return null;
        const nonce = decoded.slice(0, firstTilde);
        const tsStr = decoded.slice(firstTilde + 1, secondTilde);
        const origin = decoded.slice(secondTilde + 1, lastTilde);
        const sig = decoded.slice(lastTilde + 1);
        const ts = parseInt(tsStr, 10);
        if (isNaN(ts) || Date.now() / 1000 - ts > 600) return null; // 10 min TTL
        const payload = `${nonce}~${ts}~${origin}`;
        const expected = createHash('sha256').update(`${SESSION_SECRET}:${payload}`).digest('hex').slice(0, 32);
        if (!safeEqualStrings(sig, expected)) return null;
        return { nonce, origin };
    } catch {
        return null;
    }
}

app.get('/api/auth/google', async (c) => {
    const clientId = asString(process.env.GOOGLE_CLIENT_ID);
    const origin = resolveBrowserOrigin(c);
    if (!origin) {
        return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
    }
    if (!clientId) {
        return c.json({ ok: false, error: 'Google OAuth no configurado' }, 500);
    }

    const nonce = randomBytes(16).toString('hex');
    const state = buildOAuthState(nonce, origin);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(buildGoogleRedirectUri(origin))}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${encodeURIComponent(state)}`;

    return c.json({ ok: true, authUrl });
});

async function exchangeGoogleCode(code: string, state: string, c: Context): Promise<
    | { ok: true; user: AppUser; origin: string; isNewUser: boolean }
    | { ok: false; error: string; status: number }
> {
    if (!code || !state) {
        return { ok: false, error: 'Código de autorización inválido', status: 400 };
    }

    const stateData = verifyOAuthState(state);
    if (!stateData) {
        return { ok: false, error: 'La sesión de autenticación con Google expiró. Intenta nuevamente.', status: 400 };
    }

    const origin = stateData.origin;
    const googleClientId = asString(process.env.GOOGLE_CLIENT_ID);
    const googleClientSecret = asString(process.env.GOOGLE_CLIENT_SECRET);
    if (!googleClientId || !googleClientSecret) {
        return { ok: false, error: 'Google OAuth no configurado', status: 500 };
    }

    const redirectUri = buildGoogleRedirectUri(origin);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: googleClientId, client_secret: googleClientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
        console.error('Google token error:', tokens);
        return { ok: false, error: 'Error obteniendo tokens de Google', status: 400 };
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userResponse.json();
    if (!userResponse.ok) {
        return { ok: false, error: 'Error obteniendo información del usuario', status: 400 };
    }

    const normalizedEmail = asString(googleUser.email).toLowerCase();
    if (!normalizedEmail) {
        return { ok: false, error: 'Google no devolvió un correo válido.', status: 400 };
    }

    let user = await getUserByEmail(normalizedEmail);
    if (user && !canAuthenticateUser(user)) {
        return { ok: false, error: 'Tu cuenta está suspendida. Contacta al soporte.', status: 403 };
    }

    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        const [insertedUser] = await db.insert(users).values({
            email: normalizedEmail,
            name: asString(googleUser.name) || 'Usuario Simple',
            avatarUrl: asString(googleUser.picture) || null,
            provider: 'google',
            providerId: asString(googleUser.id) || null,
            role: 'user',
            status: googleUser.verified_email ? 'verified' : 'active',
            lastLoginAt: new Date(),
        }).returning({ id: users.id });

        user = {
            id: insertedUser.id,
            email: normalizedEmail,
            name: asString(googleUser.name) || 'Usuario Simple',
            role: 'user',
            status: googleUser.verified_email ? 'verified' : 'active',
            avatar: asString(googleUser.picture) || undefined,
            provider: 'google',
            providerId: asString(googleUser.id) || undefined,
            lastLoginAt: new Date(),
        };
        if (!googleUser.verified_email) {
            try { await issueEmailVerification(user.id, normalizedEmail, origin); } catch (e) { console.error('Email verification delivery error:', e); }
        }
    } else {
        const nextLoginAt = new Date();
        await db.update(users).set({
            name: asString(googleUser.name) || user.name,
            avatarUrl: asString(googleUser.picture) || user.avatar || null,
            provider: 'google',
            providerId: asString(googleUser.id) || user.providerId || null,
            status: googleUser.verified_email ? 'verified' : user.status,
            updatedAt: nextLoginAt,
            lastLoginAt: nextLoginAt,
        }).where(eq(users.id, user.id));
        user = { ...user, name: asString(googleUser.name) || user.name, avatar: asString(googleUser.picture) || user.avatar, provider: 'google', providerId: asString(googleUser.id) || user.providerId, status: googleUser.verified_email ? 'verified' : user.status, lastLoginAt: nextLoginAt };
    }

    if (!user.lastLoginAt) {
        await touchUserLastLoginAt(user.id);
        user = { ...user, lastLoginAt: new Date() };
    }

    return { ok: true, user, origin, isNewUser };
}

// GET /api/auth/google/finalize — navigation-based flow (avoids cross-origin fetch cookie restrictions)
app.get('/api/auth/google/finalize', async (c) => {
    const code = asString(c.req.query('code'));
    const state = asString(c.req.query('state'));
    const rawReturnTo = asString(c.req.query('returnTo'));

    try {
        const result = await exchangeGoogleCode(code, state, c);
        const fallbackOrigin = verifyOAuthState(state)?.origin ?? '';

        if (!result.ok) {
            const dest = fallbackOrigin
                ? `${fallbackOrigin}/?google_error=${encodeURIComponent(result.error)}`
                : '/';
            return c.html(`<!DOCTYPE html><html><head><meta charset="utf-8">
<script>window.location.replace(${JSON.stringify(dest)});</script></head><body></body></html>`);
        }

        // Store userId in a one-time token — session cookie will be set via a subsequent
        // fetch with credentials:include from the app (same pattern as email/password login).
        const oauthToken = randomBytes(20).toString('hex');
        pendingOAuthSessions.set(oauthToken, { userId: result.user.id, expiresAt: Date.now() + 90_000 });

        // Always redirect to the callback page — it handles the token exchange
        // and then navigates to the final destination stored in sessionStorage.
        const dest = `${result.origin}/auth/google/callback?_oauth=${oauthToken}`;
        return c.redirect(dest);
    } catch (error) {
        console.error('Google OAuth finalize error:', error);
        return c.redirect('/');
    }
});

// Called by the app with credentials:include — sets the session cookie in a fetch response
app.get('/api/auth/google/exchange', async (c) => {
    const token = asString(c.req.query('token'));
    if (!token) return c.json({ ok: false, error: 'Token requerido' }, 400);

    const entry = pendingOAuthSessions.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
        return c.json({ ok: false, error: 'Token expirado o inválido' }, 401);
    }
    pendingOAuthSessions.delete(token);

    const user = await getUserById(entry.userId);
    if (!user || !canAuthenticateUser(user)) {
        return c.json({ ok: false, error: 'Usuario no encontrado' }, 401);
    }

    setSession(c, user.id);
    return c.json({ ok: true, user: sanitizeUser(user) });
});

// POST /api/auth/google/callback — kept for backwards compatibility (fetch-based flow)
app.post('/api/auth/google/callback', async (c) => {
    try {
        const payload = asObject(await c.req.json().catch(() => null));
        const code = asString(payload.code);
        const state = asString(payload.state);

        const result = await exchangeGoogleCode(code, state, c);
        if (!result.ok) {
            return c.json({ ok: false, error: result.error }, result.status as 400 | 403 | 500);
        }
        setSession(c, result.user.id);
        return c.json({ ok: true, user: sanitizeUser(result.user), isNewUser: result.isNewUser });
    } catch (error) {
        console.error('Google OAuth error:', error);
        return c.json({ ok: false, error: 'Error interno del servidor' }, 500);
    }
});

app.get('/api/advertising/public', async (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const items = await listAdCampaignRecords({ vertical, paymentStatus: 'paid', onlyPublicActive: true });
    return c.json({ ok: true, items: items.map(adCampaignToResponse) });
});

app.get('/api/advertising/campaigns', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const vertical = parseVertical(c.req.query('vertical'));
    const items = await listAdCampaignRecords({ userId: user.id, vertical });
    return c.json({ ok: true, items: items.map(adCampaignToResponse) });
});

app.post('/api/advertising/campaigns', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = adCampaignCreateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const input = parsed.data;
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
        return c.json({ ok: false, error: 'La fecha de inicio no es válida.' }, 400);
    }

    try {
        const existing = await listAdCampaignRecords({ userId: user.id, vertical: input.vertical });
        if (existing.filter((item) => item.status !== 'ended').length >= MAX_CAMPAIGNS_TOTAL) {
            return c.json({ ok: false, error: `Máximo ${MAX_CAMPAIGNS_TOTAL} campañas vigentes.` }, 409);
        }

        const sanitized = sanitizeAdCampaignWriteInput(input, {
            vertical: input.vertical,
            format: input.format,
            placementSection: input.placementSection,
        });
        const now = new Date();
        const endAt = new Date(startAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
        const baseStatus: AdStatus = startAt.getTime() <= Date.now() ? 'active' : 'scheduled';

        const rows = await db.insert(adCampaigns).values({
            userId: user.id,
            vertical: input.vertical,
            name: sanitized.name,
            format: input.format,
            status: baseStatus,
            paymentStatus: 'pending',
            destinationType: sanitized.destinationType,
            destinationUrl: sanitized.destinationUrl,
            listingHref: sanitized.listingHref,
            profileSlug: sanitized.profileSlug,
            desktopImageDataUrl: sanitized.desktopImageDataUrl,
            mobileImageDataUrl: sanitized.mobileImageDataUrl,
            overlayEnabled: sanitized.overlayEnabled,
            overlayTitle: sanitized.overlayTitle,
            overlaySubtitle: sanitized.overlaySubtitle,
            overlayCta: sanitized.overlayCta,
            overlayAlign: sanitized.overlayAlign,
            placementSection: sanitized.placementSection,
            startAt,
            endAt,
            durationDays: input.durationDays,
            paidAt: null,
            createdAt: now,
            updatedAt: now,
        }).returning();

        const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
        return c.json({ ok: true, item: adCampaignToResponse(item) }, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No pudimos crear la campaña.';
        return c.json({ ok: false, error: message }, 400);
    }
});

app.patch('/api/advertising/campaigns/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const campaignId = c.req.param('id') ?? '';
    const existing = await getAdCampaignRecordForUser(user.id, campaignId);
    if (!existing) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);

    const payload = await c.req.json().catch(() => null);
    const parsed = adCampaignUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    if (parsed.data.action === 'content') {
        if (existing.status === 'ended') {
            return c.json({ ok: false, error: 'La campaña finalizada no se puede editar.' }, 409);
        }

        try {
            const sanitized = sanitizeAdCampaignWriteInput(parsed.data, {
                vertical: existing.vertical,
                format: existing.format,
                placementSection: existing.placementSection,
            });
            const rows = await db.update(adCampaigns).set({
                name: sanitized.name,
                destinationType: sanitized.destinationType,
                destinationUrl: sanitized.destinationUrl,
                listingHref: sanitized.listingHref,
                profileSlug: sanitized.profileSlug,
                desktopImageDataUrl: sanitized.desktopImageDataUrl,
                mobileImageDataUrl: sanitized.mobileImageDataUrl,
                overlayEnabled: sanitized.overlayEnabled,
                overlayTitle: sanitized.overlayTitle,
                overlaySubtitle: sanitized.overlaySubtitle,
                overlayCta: sanitized.overlayCta,
                overlayAlign: sanitized.overlayAlign,
                updatedAt: new Date(),
            }).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id))).returning();

            const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
            return c.json({ ok: true, item: adCampaignToResponse(item) });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos guardar la campaña.';
            return c.json({ ok: false, error: message }, 400);
        }
    }

    if (existing.status === 'ended') {
        return c.json({ ok: false, error: 'La campaña finalizada no se puede reactivar ni pausar.' }, 409);
    }

    const nextStatus: AdStatus =
        parsed.data.status === 'paused'
            ? 'paused'
            : existing.startAt <= Date.now()
                ? 'active'
                : 'scheduled';

    const rows = await db.update(adCampaigns).set({
        status: nextStatus,
        updatedAt: new Date(),
    }).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id))).returning();

    const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
    return c.json({ ok: true, item: adCampaignToResponse(item) });
});

app.delete('/api/advertising/campaigns/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const campaignId = c.req.param('id') ?? '';
    const existing = await getAdCampaignRecordForUser(user.id, campaignId);
    if (!existing) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
    await db.delete(adCampaigns).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id)));
    return c.json({ ok: true });
});

app.post('/api/service-leads', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = serviceLeadCreateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    if (parsed.data.vertical === 'autos' && parsed.data.serviceType !== 'venta_asistida') {
        return c.json({ ok: false, error: 'Tipo de servicio inválido para la vertical autos.' }, 400);
    }
    if (parsed.data.vertical === 'propiedades' && parsed.data.serviceType !== 'gestion_inmobiliaria') {
        return c.json({ ok: false, error: 'Tipo de servicio inválido para la vertical propiedades.' }, 400);
    }

    const currentUser = await authUser(c);
    const now = new Date();
    const rows = await db.insert(serviceLeads).values({
        userId: currentUser?.id ?? null,
        vertical: parsed.data.vertical,
        serviceType: parsed.data.serviceType,
        planId: parsed.data.planId,
        contactName: parsed.data.contactName.trim(),
        contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
        contactPhone: parsed.data.contactPhone.trim(),
        contactWhatsapp: parsed.data.contactWhatsapp?.trim() || null,
        locationLabel: parsed.data.locationLabel?.trim() || null,
        assetType: parsed.data.assetType?.trim() || null,
        assetBrand: parsed.data.assetBrand?.trim() || null,
        assetModel: parsed.data.assetModel?.trim() || null,
        assetYear: parsed.data.assetYear?.trim() || null,
        assetMileage: parsed.data.assetMileage?.trim() || null,
        assetArea: parsed.data.assetArea?.trim() || null,
        expectedPrice: parsed.data.expectedPrice?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: 'new',
        sourcePage: parsed.data.sourcePage?.trim() || null,
        createdAt: now,
        updatedAt: now,
    }).returning();

    const lead = mapServiceLeadRow(rows[0]);
    await createServiceLeadActivity({
        leadId: lead.id,
        actorUserId: currentUser?.id ?? null,
        type: 'created',
        body: `Lead creado desde ${lead.sourcePage || 'formulario web'}.`,
        meta: {
            vertical: lead.vertical,
            serviceType: lead.serviceType,
            planId: lead.planId,
        },
    });

    return c.json({ ok: true, item: serviceLeadToResponse(lead) }, 201);
});

async function handleImportedListingLeadRequest(c: Context, forcedPortal?: PortalKey) {
    if (!isLeadIngestConfigured()) {
        return c.json({ ok: false, error: 'La ingesta externa de leads no está configurada.' }, 503);
    }
    if (!isLeadIngestAuthorized(c)) {
        return c.json({ ok: false, error: 'No autorizado' }, 401);
    }

    const payload = await c.req.json().catch(() => null);
    const rawPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? {
            ...(payload as Record<string, unknown>),
            ...(forcedPortal ? {
                portal: forcedPortal,
                source: (payload as Record<string, unknown>).source ?? forcedPortal,
            } : {}),
        }
        : payload;
    const parsed = externalListingLeadImportSchema.safeParse(rawPayload);
    if (!parsed.success) {
        return c.json({
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Payload inválido',
        }, 400);
    }

    const portal = inferPortalFromLeadImportSource(parsed.data.source, parsed.data.portal);
    if (portal && !isPortalAvailableForVertical(parsed.data.vertical, portal)) {
        return c.json({ ok: false, error: 'Ese portal no está disponible para esta vertical.' }, 400);
    }

    const listing = await resolveListingForImportedLead({
        vertical: parsed.data.vertical,
        portal,
        listingId: parsed.data.listingId,
        listingSlug: parsed.data.listingSlug,
        listingHref: parsed.data.listingHref,
        externalListingId: parsed.data.externalListingId,
    });

    if (!listing || listing.vertical !== parsed.data.vertical) {
        return c.json({ ok: false, error: 'No se encontró la publicación asociada al lead.' }, 404);
    }

    const result = await upsertImportedListingLead({
        listing,
        source: parsed.data.source,
        channel: inferListingLeadChannel(parsed.data.source, parsed.data.channel),
        portal,
        externalListingId: parsed.data.externalListingId,
        externalSourceId: parsed.data.externalSourceId,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        contactWhatsapp: parsed.data.contactWhatsapp,
        message: parsed.data.message,
        sourcePage: parsed.data.sourcePage,
        receivedAt: parsed.data.receivedAt,
        meta: parsed.data.meta,
    });

    const thread = await getMessageThreadByLeadId(result.lead.id);
    return c.json({
        ok: true,
        imported: true,
        created: result.created,
        item: listingLeadToResponse(result.lead, { threadId: thread?.id ?? null }),
    }, result.created ? 201 : 200);
}

app.post('/api/integrations/leads/import', async (c) => {
    return handleImportedListingLeadRequest(c);
});

app.post('/api/integrations/portals/:portal/leads', async (c) => {
    const portal = portalKeySchema.safeParse(c.req.param('portal'));
    if (!portal.success) {
        return c.json({ ok: false, error: 'Portal inválido.' }, 400);
    }

    return handleImportedListingLeadRequest(c, portal.data);
});

app.post('/api/listing-leads', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadCreateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
    if (!listing || listing.vertical !== parsed.data.vertical || !isPublicListingVisible(listing)) {
        return c.json({ ok: false, error: 'Publicación no encontrada o no disponible.' }, 404);
    }

    const currentUser = await authUser(c);
    if (currentUser && currentUser.id === listing.ownerId) {
        return c.json({ ok: false, error: 'No puedes consultar tu propia publicación.' }, 400);
    }

    if (currentUser && parsed.data.createThread) {
        const conversation = await createOrAppendListingConversation({
            listing,
            buyer: currentUser,
            contactName: parsed.data.contactName,
            contactEmail: parsed.data.contactEmail,
            contactPhone: parsed.data.contactPhone,
            contactWhatsapp: parsed.data.contactWhatsapp,
            message: parsed.data.message,
            sourcePage: parsed.data.sourcePage,
        });

        return c.json({
            ok: true,
            item: listingLeadToResponse(conversation.lead, { threadId: conversation.thread.id }),
            thread: messageThreadToResponse(conversation.thread, currentUser.id, [conversation.entry]),
            entry: messageEntryToResponse(conversation.entry, currentUser.id),
        }, conversation.createdLead ? 201 : 200);
    }

    const lead = await createListingLeadRecord({
        listingId: listing.id,
        ownerUserId: listing.ownerId,
        buyerUserId: currentUser?.id ?? null,
        vertical: listing.vertical,
        source: 'internal_form',
        channel: 'lead',
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        contactWhatsapp: parsed.data.contactWhatsapp,
        message: parsed.data.message,
        sourcePage: parsed.data.sourcePage,
    });
    await createListingLeadActivity({
        leadId: lead.id,
        actorUserId: currentUser?.id ?? null,
        type: 'created',
        body: `Lead creado desde ${parsed.data.sourcePage || 'publicación pública'}.`,
        meta: {
            source: 'internal_form',
            channel: 'lead',
        },
    });

    return c.json({ ok: true, item: listingLeadToResponse(lead) }, 201);
});

app.post('/api/listing-leads/actions', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadActionCreateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
    if (!listing || listing.vertical !== parsed.data.vertical || !isPublicListingVisible(listing)) {
        return c.json({ ok: false, error: 'Publicación no encontrada o no disponible.' }, 404);
    }

    const currentUser = await authUser(c);
    if (currentUser && currentUser.id === listing.ownerId) {
        return c.json({ ok: false, error: 'No puedes contactar tu propia publicación.' }, 400);
    }

    const result = await createOrRefreshListingLeadAction({
        listing,
        buyer: currentUser,
        source: parsed.data.source,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        contactWhatsapp: parsed.data.contactWhatsapp,
        message: parsed.data.message,
        sourcePage: parsed.data.sourcePage,
    });

    const thread = await getMessageThreadByLeadId(result.lead.id);
    return c.json({
        ok: true,
        created: result.created,
        item: listingLeadToResponse(result.lead, { threadId: thread?.id ?? null }),
    }, result.created ? 201 : 200);
});

app.get('/api/messages/threads', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const folderParsed = messageFolderSchema.safeParse(c.req.query('folder'));
    const folder = folderParsed.success ? folderParsed.data : 'inbox';
    const threads = await listMessageThreadsForUser(user.id, vertical, folder);
    const items = await Promise.all(threads.map(async (thread) => {
        const entries = await listMessageEntries(thread.id);
        return messageThreadToResponse(thread, user.id, entries);
    }));

    return c.json({ ok: true, items });
});

app.get('/api/messages/threads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const thread = await getMessageThreadById(c.req.param('id'));
    if (!thread || thread.vertical !== vertical) {
        return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
    }
    if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const hydratedThread = await markMessageThreadRead(thread, user.id);
    const [entries, lead] = await Promise.all([
        listMessageEntries(hydratedThread.id),
        getListingLeadById(hydratedThread.leadId),
    ]);

    return c.json({
        ok: true,
        item: messageThreadToResponse(hydratedThread, user.id, entries),
        entries: entries.map((entry) => messageEntryToResponse(entry, user.id)),
        lead: lead ? listingLeadToResponse(lead, { threadId: hydratedThread.id }) : null,
    });
});

app.patch('/api/messages/threads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = messageThreadUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const thread = await getMessageThreadById(c.req.param('id'));
    if (!thread || thread.vertical !== vertical) {
        return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
    }
    if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const updatedThread = await updateMessageThreadViewerState(thread, user.id, parsed.data.action);
    const entries = await listMessageEntries(updatedThread.id);

    return c.json({
        ok: true,
        item: messageThreadToResponse(updatedThread, user.id, entries),
    });
});

app.post('/api/messages/threads/:id/messages', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = messageEntryCreateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const thread = await getMessageThreadById(c.req.param('id'));
    if (!thread || thread.vertical !== vertical) {
        return c.json({ ok: false, error: 'Conversación no encontrada.' }, 404);
    }
    if (!isThreadParticipant(user.id, thread) && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const senderRole: MessageSenderRole = user.id === thread.ownerUserId ? 'seller' : 'buyer';
    const now = Date.now();
    const entry = await createMessageEntry({
        threadId: thread.id,
        senderUserId: user.id,
        senderRole,
        body: parsed.data.body,
        createdAt: now,
    });
    const updatedThread = await touchMessageThreadAfterIncomingMessage(thread, senderRole, now);

    const lead = await getListingLeadById(thread.leadId);
    let updatedLead: ListingLeadRecord | null = lead;
    if (lead) {
        const updatePayload: Record<string, unknown> = {
            updatedAt: new Date(now),
        };
        if (senderRole === 'seller' && lead.status === 'new') {
            updatePayload.status = 'contacted';
        }
        const rows = await db.update(listingLeads).set(updatePayload).where(eq(listingLeads.id, lead.id)).returning();
        updatedLead = rows.length > 0 ? mapListingLeadRow(rows[0]) : lead;

        if (senderRole === 'seller' && lead.status === 'new') {
            await createListingLeadActivity({
                leadId: lead.id,
                actorUserId: user.id,
                type: 'status',
                body: `Estado cambiado de ${listingLeadStatusLabel(lead.status)} a ${listingLeadStatusLabel('contacted')}.`,
                meta: { from: lead.status, to: 'contacted' },
            });
        }
        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: user.id,
            type: 'message',
            body: senderRole === 'seller'
                ? `Respuesta del vendedor: ${parsed.data.body.trim()}`
                : `Nuevo mensaje del comprador: ${parsed.data.body.trim()}`,
        });
    }

    const entries = await listMessageEntries(updatedThread.id);
    return c.json({
        ok: true,
        item: messageThreadToResponse(updatedThread, user.id, entries),
        entry: messageEntryToResponse(entry, user.id),
        lead: updatedLead ? listingLeadToResponse(updatedLead, { threadId: updatedThread.id }) : null,
    }, 201);
});

app.get('/api/crm/listing-leads', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) {
        return c.json({ ok: false, error: 'Tu plan actual no incluye CRM.' }, 403);
    }
    const statusRaw = c.req.query('status');
    const status = listingLeadStatusSchema.safeParse(statusRaw).success
        ? (statusRaw as ListingLeadStatus)
        : undefined;

    const items = await listListingLeadRecords({
        vertical,
        status,
        ownerUserId: user.role === 'superadmin' ? undefined : user.id,
    });
    return c.json({ ok: true, items: items.map((item) => listingLeadToResponse(item)) });
});

app.get('/api/crm/listing-leads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead || lead.vertical !== vertical) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }
    if (!canUserAccessListingLead(user, lead)) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    return c.json({ ok: true, ...(await buildListingLeadDetailPayload(lead, user.id)) });
});

app.patch('/api/crm/listing-leads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead || lead.vertical !== vertical) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }
    if (!canUserAccessListingLead(user, lead)) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const result = await updateListingLeadRecord({
        actor: user,
        lead,
        changes: parsed.data,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({ ok: true, item: listingLeadToResponse(result.item) });
});

app.post('/api/crm/listing-leads/:id/notes', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadNoteSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead || lead.vertical !== vertical) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }
    if (!canUserAccessListingLead(user, lead)) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const rows = await db.update(listingLeads).set({
        updatedAt: new Date(),
    }).where(eq(listingLeads.id, lead.id)).returning();
    const updated = mapListingLeadRow(rows[0]);
    const activity = await createListingLeadActivity({
        leadId: updated.id,
        actorUserId: user.id,
        type: 'note',
        body: parsed.data.body.trim(),
    });

    return c.json({ ok: true, item: listingLeadToResponse(updated), activity: listingLeadActivityToResponse(activity) }, 201);
});

app.post('/api/crm/listing-leads/:id/actions', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const payload = await c.req.json().catch(() => null);
    const parsed = leadQuickActionSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead || lead.vertical !== vertical) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }
    if (!canUserAccessListingLead(user, lead)) {
        return c.json({ ok: false, error: 'No autorizado' }, 403);
    }

    const result = await runListingLeadQuickAction({
        actor: user,
        lead,
        action: parsed.data.action,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
        ok: true,
        item: listingLeadToResponse(result.item),
        activity: listingLeadActivityToResponse(result.activity),
        actionLabel: getLeadQuickActionLabel(parsed.data.action),
    }, 201);
});

app.get('/api/crm/pipeline-columns', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const items = await ensureListingPipelineColumns(user.id, vertical);
    return c.json({ ok: true, items: items.map(pipelineColumnToResponse) });
});

app.post('/api/crm/pipeline-columns', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = pipelineColumnCreateSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const columns = await ensureListingPipelineColumns(user.id, vertical);
    const rows = await db.insert(crmPipelineColumns).values({
        userId: user.id,
        vertical,
        scope: 'listing',
        name: parsed.data.name.trim(),
        status: parsed.data.status,
        position: columns.length,
    }).returning();

    const created = mapPipelineColumnRow(rows[0]);
    const items = await listPipelineColumns(user.id, vertical, 'listing');
    return c.json({ ok: true, item: pipelineColumnToResponse(created), items: items.map(pipelineColumnToResponse) }, 201);
});

app.post('/api/crm/pipeline-columns/reorder', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = pipelineColumnReorderSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const result = await reorderPipelineColumns(user.id, vertical, parsed.data.columnIds);
    if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
    return c.json({ ok: true, items: result.items.map(pipelineColumnToResponse) });
});

app.patch('/api/crm/pipeline-columns/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = pipelineColumnUpdateSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const column = await getListingPipelineColumnById(c.req.param('id'));
    if (!column || column.userId !== user.id || column.vertical !== vertical || column.scope !== 'listing') {
        return c.json({ ok: false, error: 'Columna no encontrada' }, 404);
    }

    const columns = await ensureListingPipelineColumns(user.id, vertical);
    const nextStatus = parsed.data.status ?? column.status;
    if (nextStatus !== column.status && columns.filter((item) => item.status === column.status).length <= 1) {
        return c.json({ ok: false, error: 'Debe quedar al menos una columna para esa etapa base.' }, 400);
    }

    const rows = await db.update(crmPipelineColumns).set({
        name: parsed.data.name?.trim() ?? column.name,
        status: nextStatus,
        updatedAt: new Date(),
    }).where(eq(crmPipelineColumns.id, column.id)).returning();
    const updated = mapPipelineColumnRow(rows[0]);

    if (nextStatus !== column.status) {
        await db.update(listingLeads).set({
            status: nextStatus,
            updatedAt: new Date(),
        }).where(eq(listingLeads.pipelineColumnId, column.id));
    }

    const items = await listPipelineColumns(user.id, vertical, 'listing');
    return c.json({ ok: true, item: pipelineColumnToResponse(updated), items: items.map(pipelineColumnToResponse) });
});

app.delete('/api/crm/pipeline-columns/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const column = await getListingPipelineColumnById(c.req.param('id'));
    if (!column || column.userId !== user.id || column.vertical !== vertical || column.scope !== 'listing') {
        return c.json({ ok: false, error: 'Columna no encontrada' }, 404);
    }

    const columns = await ensureListingPipelineColumns(user.id, vertical);
    const sameStatus = columns.filter((item) => item.status === column.status);
    if (sameStatus.length <= 1) {
        return c.json({ ok: false, error: 'Debe quedar al menos una columna para esa etapa base.' }, 400);
    }

    const fallback = sameStatus.find((item) => item.id !== column.id) ?? null;
    if (!fallback) {
        return c.json({ ok: false, error: 'No pudimos reasignar los leads de esta columna.' }, 400);
    }

    await db.update(listingLeads).set({
        pipelineColumnId: fallback.id,
        status: fallback.status,
        updatedAt: new Date(),
    }).where(eq(listingLeads.pipelineColumnId, column.id));

    await db.delete(crmPipelineColumns).where(eq(crmPipelineColumns.id, column.id));

    const remaining = (await listPipelineColumns(user.id, vertical, 'listing'))
        .filter((item) => item.id !== column.id)
        .sort((left, right) => left.position - right.position);
    await reorderPipelineColumns(user.id, vertical, remaining.map((item) => item.id));
    const items = await listPipelineColumns(user.id, vertical, 'listing');
    return c.json({ ok: true, items: items.map(pipelineColumnToResponse) });
});

app.get('/api/crm/leads', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: true, items: [] });

    const vertical = parseVertical(c.req.query('vertical'));
    const statusRaw = c.req.query('status');
    const status = serviceLeadStatusSchema.safeParse(statusRaw).success
        ? (statusRaw as ServiceLeadStatus)
        : undefined;

    const items = await listServiceLeadRecords({ vertical, status });
    return c.json({ ok: true, items: items.map(serviceLeadToResponse) });
});

app.get('/api/crm/leads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const leadId = getUrlPathSegment(c.req.url, 1);
    const vertical = parseVertical(c.req.query('vertical'));
    const lead = await getServiceLeadById(leadId);
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

    return c.json({ ok: true, ...(await buildServiceLeadDetailPayload(lead)) });
});

app.patch('/api/crm/leads/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const leadId = getUrlPathSegment(c.req.url, 1);
    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = serviceLeadUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getServiceLeadById(leadId);
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

    const result = await updateServiceLeadRecord({
        actor: user,
        lead,
        changes: parsed.data,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({ ok: true, item: serviceLeadToResponse(result.item) });
});

app.post('/api/crm/leads/:id/notes', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const leadId = getUrlPathSegment(c.req.url, 2);
    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = serviceLeadNoteSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getServiceLeadById(leadId);
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

    const now = new Date();
    const rows = await db.update(serviceLeads).set({
        updatedAt: now,
    }).where(eq(serviceLeads.id, lead.id)).returning();
    const updated = mapServiceLeadRow(rows[0]);
    const activity = await createServiceLeadActivity({
        leadId: updated.id,
        actorUserId: user.id,
        type: 'note',
        body: parsed.data.body.trim(),
    });

    return c.json({ ok: true, item: serviceLeadToResponse(updated), activity: serviceLeadActivityToResponse(activity) }, 201);
});

app.post('/api/crm/leads/:id/actions', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const leadId = getUrlPathSegment(c.req.url, 2);
    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = leadQuickActionSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getServiceLeadById(leadId);
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

    const result = await runServiceLeadQuickAction({
        actor: user,
        lead,
        action: parsed.data.action,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
        ok: true,
        item: serviceLeadToResponse(result.item),
        activity: serviceLeadActivityToResponse(result.activity),
        actionLabel: getLeadQuickActionLabel(parsed.data.action),
    }, 201);
});

app.get('/api/panel/notifications', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const [threads, listingLeadItems, serviceLeadItems] = await Promise.all([
        listMessageThreadsForUser(user.id, vertical, 'inbox'),
        userCanUseCrm(user, vertical)
            ? listListingLeadRecords({
                vertical,
                ownerUserId: user.role === 'superadmin' ? undefined : user.id,
                limit: 8,
            })
            : Promise.resolve([] as ListingLeadRecord[]),
        isAdminRole(user.role) ? listServiceLeadRecords({ vertical, limit: 8 }) : Promise.resolve([] as ServiceLeadRecord[]),
    ]);

    const messageNotifications = (await Promise.all(threads.slice(0, 8).map((thread) => buildMessageThreadNotification(thread, user.id))))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const items = [
        ...messageNotifications,
        ...listingLeadItems.map(buildListingLeadNotification),
        ...serviceLeadItems.map(buildServiceLeadNotification),
    ]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8);

    return c.json({ ok: true, items });
});

app.get('/api/admin/overview', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const [adminUsers, adminListings, recentLeads] = await Promise.all([
        listAdminUsersSnapshot(),
        listAdminListingsSnapshot(),
        listServiceLeadRecords({ limit: 6 }),
    ]);

    const autosListings = adminListings.filter((item) => item.vertical === 'autos');
    const propiedadesListings = adminListings.filter((item) => item.vertical === 'propiedades');
    const newLeads = recentLeads.filter((lead) => lead.status === 'new').length;

    return c.json({
        ok: true,
        stats: {
            usersTotal: adminUsers.length,
            autosListingsTotal: autosListings.length,
            propiedadesListingsTotal: propiedadesListings.length,
            newServiceLeads: newLeads,
        },
        recentUsers: adminUsers.slice(0, 6),
        recentListings: adminListings.slice(0, 6),
        recentLeads: recentLeads.map(serviceLeadToResponse),
        systemStatus: getEnvStatus(),
    });
});

app.get('/api/admin/users', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const items = await listAdminUsersSnapshot();
    return c.json({ ok: true, items });
});

// Cambiar rol de un usuario
app.patch('/api/admin/users/:id/role', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const role = payload?.role;
    
    if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
        return c.json({ ok: false, error: 'Rol inválido' }, 400);
    }

    const userId = c.req.param('id') ?? '';
    const targetUser = await getUserById(userId);
    if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

    const updated = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

    const appUser = mapUserRowToAppUser(updated[0]);
    return c.json({ ok: true, item: sanitizeUser(appUser) }, 200);
});

// Cambiar status de un usuario
app.patch('/api/admin/users/:id/status', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const status = payload?.status;
    
    if (!status || !['active', 'verified', 'suspended'].includes(status)) {
        return c.json({ ok: false, error: 'Status inválido' }, 400);
    }

    const userId = c.req.param('id') ?? '';
    const targetUser = await getUserById(userId);
    if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

    const updated = await db.update(users).set({ status }).where(eq(users.id, userId)).returning();
    if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

    const appUser = mapUserRowToAppUser(updated[0]);
    return c.json({ ok: true, item: sanitizeUser(appUser) }, 200);
});

// Eliminar un usuario
app.delete('/api/admin/users/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const userId = c.req.param('id') ?? '';
    
    // No permitir eliminar el usuario actual
    if (adminUser.id === userId) {
        return c.json({ ok: false, error: 'No puedes eliminar tu propia cuenta' }, 400);
    }

    const targetUser = await getUserById(userId);
    if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

    if (targetUser.role === 'superadmin' && isActiveAdminStatus(targetUser.status)) {
        const remainingSuperadmins = await countActiveSuperadminUsers();
        if (remainingSuperadmins <= 1) {
            return c.json({ ok: false, error: 'No puedes eliminar al último superadmin activo' }, 400);
        }
    }

    await permanentlyDeleteUser(userId);

    return c.json({ ok: true, message: 'Usuario eliminado permanentemente' }, 200);
});

// Editar datos de un usuario
app.put('/api/admin/users/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const userId = c.req.param('id') ?? '';
    
    const targetUser = await getUserById(userId);
    if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

    // Validar y preparar actualización
    const updates: Record<string, any> = {};
    
    if (payload?.name && typeof payload.name === 'string' && payload.name.trim().length > 0) {
        updates.name = payload.name.trim();
    }
    
    if (payload?.phone && typeof payload.phone === 'string') {
        updates.phone = payload.phone.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
        return c.json({ ok: false, error: 'No hay datos para actualizar' }, 400);
    }

    const updated = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

    const appUser = mapUserRowToAppUser(updated[0]);
    return c.json({ ok: true, item: sanitizeUser(appUser) }, 200);
});

app.get('/api/admin/listings', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const items = await listAdminListingsSnapshot();
    return c.json({ ok: true, items });
});

app.get('/api/admin/service-leads', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const vertical = c.req.query('vertical');
    const status = c.req.query('status');
    const items = await listServiceLeadRecords({
        vertical: vertical === 'autos' || vertical === 'propiedades' ? vertical : undefined,
        status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? status : undefined,
    });
    return c.json({ ok: true, items: items.map(serviceLeadToResponse) });
});

app.get('/api/admin/service-leads/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const lead = await getServiceLeadById(getUrlPathSegment(c.req.url, 1));
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    return c.json({ ok: true, ...(await buildServiceLeadDetailPayload(lead)) });
});

app.patch('/api/admin/service-leads/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const payload = await c.req.json().catch(() => null);
    const parsed = serviceLeadUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const leadId = getUrlPathSegment(c.req.url, 1);
    const existing = await getServiceLeadById(leadId);
    if (!existing) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    const result = await updateServiceLeadRecord({
        actor: adminUser,
        lead: existing,
        changes: parsed.data,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({ ok: true, item: serviceLeadToResponse(result.item) });
});

app.post('/api/admin/service-leads/:id/notes', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = serviceLeadNoteSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getServiceLeadById(getUrlPathSegment(c.req.url, 2));
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    const now = new Date();
    const rows = await db.update(serviceLeads).set({
        updatedAt: now,
    }).where(eq(serviceLeads.id, lead.id)).returning();
    const updated = mapServiceLeadRow(rows[0]);
    const activity = await createServiceLeadActivity({
        leadId: updated.id,
        actorUserId: adminUser.id,
        type: 'note',
        body: parsed.data.body.trim(),
    });

    return c.json({ ok: true, item: serviceLeadToResponse(updated), activity: serviceLeadActivityToResponse(activity) }, 201);
});

app.post('/api/admin/service-leads/:id/actions', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = leadQuickActionSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getServiceLeadById(c.req.param('id'));
    if (!lead) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }

    const result = await runServiceLeadQuickAction({
        actor: adminUser,
        lead,
        action: parsed.data.action,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
        ok: true,
        item: serviceLeadToResponse(result.item),
        activity: serviceLeadActivityToResponse(result.activity),
        actionLabel: getLeadQuickActionLabel(parsed.data.action),
    }, 201);
});

app.get('/api/admin/listing-leads', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const vertical = c.req.query('vertical');
    const status = c.req.query('status');
    const items = await listListingLeadRecords({
        vertical: vertical === 'autos' || vertical === 'propiedades' ? vertical : undefined,
        status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? status : undefined,
    });
    return c.json({ ok: true, items: items.map((item) => listingLeadToResponse(item)) });
});

app.get('/api/admin/listing-leads/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    return c.json({ ok: true, ...(await buildListingLeadDetailPayload(lead, adminUser.id)) });
});

app.patch('/api/admin/listing-leads/:id', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadUpdateSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    const result = await updateListingLeadRecord({
        actor: adminUser,
        lead,
        changes: parsed.data,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({ ok: true, item: listingLeadToResponse(result.item) });
});

app.post('/api/admin/listing-leads/:id/notes', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = listingLeadNoteSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

    const rows = await db.update(listingLeads).set({
        updatedAt: new Date(),
    }).where(eq(listingLeads.id, lead.id)).returning();
    const updated = mapListingLeadRow(rows[0]);
    const activity = await createListingLeadActivity({
        leadId: updated.id,
        actorUserId: adminUser.id,
        type: 'note',
        body: parsed.data.body.trim(),
    });

    return c.json({ ok: true, item: listingLeadToResponse(updated), activity: listingLeadActivityToResponse(activity) }, 201);
});

app.post('/api/admin/listing-leads/:id/actions', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const payload = await c.req.json().catch(() => null);
    const parsed = leadQuickActionSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const lead = await getListingLeadById(c.req.param('id'));
    if (!lead) {
        return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
    }

    const result = await runListingLeadQuickAction({
        actor: adminUser,
        lead,
        action: parsed.data.action,
    });
    if (!result.ok) {
        return c.json({ ok: false, error: result.error }, 400);
    }

    return c.json({
        ok: true,
        item: listingLeadToResponse(result.item),
        activity: listingLeadActivityToResponse(result.activity),
        actionLabel: getLeadQuickActionLabel(parsed.data.action),
    }, 201);
});

app.get('/api/admin/system-status', async (c) => {
    const adminUser = await authUser(c);
    if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
    return c.json({ ok: true, status: getEnvStatus() });
});

app.get('/api/integrations/instagram', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const account = getInstagramAccount(user.id, vertical);
    const origin = resolveBrowserOrigin(c);
    const fallbackReturn = origin ? `${origin}/panel/configuracion#integraciones` : null;

    return c.json({
        ok: true,
        vertical,
        configured: isInstagramConfigured(),
        eligible: userCanUseInstagram(user, vertical),
        currentPlanId: getEffectivePlanId(user, vertical),
        requiredPlanIds: getInstagramRequiredPlanIds(),
        connectUrl: fallbackReturn
            ? `/api/integrations/instagram/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(fallbackReturn)}`
            : null,
        account: instagramAccountToResponse(account),
        recentPublications: getInstagramPublicationsForUser(user.id, vertical)
            .slice(0, 8)
            .map((item) => instagramPublicationToResponse(item)),
    });
});

app.get('/api/integrations/instagram/connect', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    if (!userCanUseInstagram(user, vertical)) {
        return c.json({ ok: false, error: 'Instagram está disponible solo para planes Pro y Empresa.' }, 403);
    }
    if (!isInstagramConfigured()) {
        return c.json({ ok: false, error: 'Instagram no está configurado en este entorno.' }, 503);
    }

    const origin = resolveBrowserOrigin(c);
    if (!origin) {
        return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
    }

    const fallbackReturn = `${origin}/panel/configuracion#integraciones`;
    const returnTo = sanitizeBrowserReturnUrl(asString(c.req.query('returnTo')) || fallbackReturn, fallbackReturn);
    const nonce = randomBytes(24).toString('hex');
    setInstagramState(c, makeInstagramStatePayload({
        nonce,
        userId: user.id,
        vertical,
        returnTo,
    }));

    return c.redirect(buildInstagramAuthorizationUrl({ state: nonce }));
});

app.get('/api/integrations/instagram/callback', async (c) => {
    const rawStatePayload = consumeInstagramState(c);
    const statePayload = parseInstagramStatePayload(rawStatePayload);
    const fallbackOrigin = defaultOrigin;
    const fallbackReturn = `${fallbackOrigin}/panel/configuracion#integraciones`;
    const returnTo = statePayload?.returnTo || fallbackReturn;

    const redirectWithStatus = (status: 'connected' | 'error', message?: string) => {
        const target = new URL(sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
        target.searchParams.set('instagram', status);
        if (message) {
            target.searchParams.set('instagramMessage', message);
        }
        if (!target.hash) {
            target.hash = '#integraciones';
        }
        return c.redirect(target.toString());
    };

    const code = asString(c.req.query('code'));
    const state = asString(c.req.query('state'));
    const errorReason = asString(c.req.query('error_reason')) || asString(c.req.query('error_description')) || asString(c.req.query('error'));

    if (errorReason) {
        return redirectWithStatus('error', errorReason);
    }
    if (!statePayload || !state || !safeEqualStrings(statePayload.nonce, state)) {
        return redirectWithStatus('error', 'La sesión de conexión con Instagram expiró. Intenta nuevamente.');
    }
    if (!code) {
        return redirectWithStatus('error', 'Instagram no devolvió un código de autorización válido.');
    }

    const user = await getUserById(statePayload.userId);
    if (!user || !canAuthenticateUser(user)) {
        return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar Instagram.');
    }
    if (!userCanUseInstagram(user, statePayload.vertical)) {
        return redirectWithStatus('error', 'Instagram está disponible solo para planes Pro y Empresa.');
    }
    if (!isInstagramConfigured()) {
        return redirectWithStatus('error', 'Instagram no está configurado en este entorno.');
    }

    try {
        const exchanged = await exchangeInstagramCode(code);
        let accessToken = exchanged.accessToken;
        let tokenExpiresAt = exchanged.expiresInSeconds ? Date.now() + exchanged.expiresInSeconds * 1000 : null;

        // Convertir short-lived token (1h) → long-lived token (60 días)
        const longLived = await exchangeToLongLivedToken(accessToken);
        if (longLived?.accessToken) {
            accessToken = longLived.accessToken;
            tokenExpiresAt = longLived.expiresInSeconds ? Date.now() + longLived.expiresInSeconds * 1000 : tokenExpiresAt;
        }

        // Buscar cuentas de Instagram Business vinculadas a las páginas de Facebook
        const accounts = await getInstagramBusinessAccounts(accessToken);
        if (accounts.length === 0) {
            return redirectWithStatus('error', 'No encontramos ninguna cuenta de Instagram Business vinculada a tus páginas de Facebook. Asegúrate de tener una cuenta Profesional (Business/Creator) vinculada a una Página.');
        }

        // Por ahora tomamos la primera cuenta. En el futuro podríamos dejar al usuario elegir.
        const profile = accounts[0];
        
        await upsertInstagramAccountRecord({
            userId: user.id,
            vertical: statePayload.vertical,
            instagramUserId: profile.instagramUserId,
            username: profile.username,
            displayName: profile.displayName,
            accountType: profile.accountType,
            profilePictureUrl: profile.profilePictureUrl,
            accessToken,
            tokenExpiresAt,
            scopes: exchanged.scopes,
            status: 'connected',
            lastSyncedAt: Date.now(),
            lastError: null,
        });

        return redirectWithStatus('connected', `Cuenta @${profile.username} conectada correctamente.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo conectar con Instagram.';
        return redirectWithStatus('error', message);
    }
});

app.post('/api/integrations/instagram/settings', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = instagramSettingsSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const vertical = parsed.data.vertical;
    if (!userCanUseInstagram(user, vertical)) {
        return c.json({ ok: false, error: 'Instagram está disponible solo para planes Pro y Empresa.' }, 403);
    }

    const updated = await updateInstagramAccountSettings(user.id, vertical, {
        autoPublishEnabled: parsed.data.autoPublishEnabled,
        captionTemplate: parsed.data.captionTemplate === undefined ? undefined : (parsed.data.captionTemplate || null),
        lastSyncedAt: Date.now(),
    });

    if (!updated) {
        return c.json({ ok: false, error: 'Primero conecta una cuenta de Instagram.' }, 404);
    }

    return c.json({
        ok: true,
        account: instagramAccountToResponse(updated),
    });
});

app.post('/api/integrations/instagram/disconnect', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(asString(asObject(await c.req.json().catch(() => null)).vertical) || c.req.query('vertical'));
    await disconnectInstagramAccount(user.id, vertical);
    return c.json({ ok: true });
});

app.post('/api/integrations/instagram/publish', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    logDebug(`[instagram] publish request: ${JSON.stringify(payload)}`);
    
    const parsed = instagramPublishSchema.safeParse(payload);
    if (!parsed.success) {
        logDebug(`[instagram] validation failed: ${JSON.stringify(parsed.error.format())}`);
        return c.json({ ok: false, error: 'Payload inválido', details: parsed.error.format() }, 400);
    }

    const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
    if (!listing) {
        logDebug(`[instagram] listing not found: ${parsed.data.listingId}`);
        return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    }
    if (listing.vertical !== parsed.data.vertical) {
        logDebug(`[instagram] vertical mismatch: ${listing.vertical} vs ${parsed.data.vertical}`);
        return c.json({ ok: false, error: 'La publicación no corresponde a esta vertical.' }, 409);
    }
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    try {
        const publication = await publishListingToInstagram(user, listing, {
            captionOverride: parsed.data.captionOverride ?? null,
        });
        return c.json({ ok: true, publication });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo publicar en Instagram.';
        logDebug(`[instagram] publish error: ${message}`);
        const status = message.includes('Pro y Empresa')
            ? 403
            : message.includes('conecta una cuenta')
                ? 409
                : message.includes('API público HTTPS')
                    ? 503
                    : 400;
        return c.json({ ok: false, error: message }, status as any);
    }
});

app.get('/api/public/instagram-image/:id', async (c) => {
    // Sin query params — la URL debe ser simple para que Meta la parsee correctamente
    const listingId = c.req.param('id') ?? '';
    const listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing || listing.status !== 'active') {
        return c.json({ ok: false, error: 'Imagen no disponible.' }, 404);
    }

    const [image] = extractListingMediaUrls(listing);
    if (!image) {
        return c.json({ ok: false, error: 'La publicación no tiene imágenes.' }, 404);
    }

    if (image.startsWith('data:')) {
        const match = image.match(/^data:([^;,]+)(;base64)?,(.*)$/);
        if (!match) {
            return c.json({ ok: false, error: 'Formato de imagen inválido.' }, 400);
        }
        const contentType = match[1] || 'image/png';
        const isBase64 = Boolean(match[2]);
        const rawBody = match[3] || '';
        const body = isBase64 ? Buffer.from(rawBody, 'base64') : Buffer.from(decodeURIComponent(rawBody));
        return new Response(body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    }

    // Resolvemos la URL absoluta de la imagen
    let resolvedUrl: string;
    if (/^https?:\/\//i.test(image)) {
        resolvedUrl = image;
    } else {
        try {
            resolvedUrl = new URL(image, getInstagramBasePublicOrigin()).toString();
        } catch {
            return c.json({ ok: false, error: 'No pudimos resolver la imagen pública.' }, 404);
        }
    }

    // Proxy de la imagen — Instagram no sigue redirects, necesita bytes directos.
    // Instagram solo acepta JPEG y PNG — convertimos WebP y otros formatos a JPEG.
    try {
        const upstream = await fetch(resolvedUrl);
        if (!upstream.ok) {
            return c.json({ ok: false, error: 'No se pudo obtener la imagen.' }, 502);
        }
        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        const rawArrayBuffer = await upstream.arrayBuffer();

        const needsConversion = contentType.includes('webp') || contentType.includes('avif') || contentType.includes('gif');
        if (needsConversion) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const sharp = require('sharp') as typeof import('sharp');
            const jpegBuffer = await sharp(Buffer.from(rawArrayBuffer)).jpeg({ quality: 90 }).toBuffer();
            return new Response(new Uint8Array(jpegBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }

        return new Response(rawArrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch {
        return c.json({ ok: false, error: 'Error al descargar la imagen.' }, 502);
    }
});

app.get('/api/saved', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const items = await getSavedListingsByUser(user.id);
    savedByUser.set(user.id, items);
    return c.json({ ok: true, items });
});

app.post('/api/saved/toggle', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = savedRecordSchema.safeParse(payload);

    if (!parsed.success) {
        return c.json({ ok: false, error: 'Payload inválido' }, 400);
    }

    const listingId = parsed.data.id;
    const targetListing = await getListingById(listingId);
    if (!targetListing) {
        return c.json({ ok: false, error: 'La publicación no existe.' }, 404);
    }

    const existing = await db
        .select()
        .from(savedListings)
        .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)))
        .limit(1);

    let saved = false;
    if (existing.length > 0) {
        await db
            .delete(savedListings)
            .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, listingId)));
    } else {
        saved = true;
        await db.insert(savedListings).values({
            userId: user.id,
            listingId,
            savedAt: new Date(),
        });
    }

    const items = await getSavedListingsByUser(user.id);
    savedByUser.set(user.id, items);
    return c.json({ ok: true, saved, items });
});

app.delete('/api/saved/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const id = c.req.param('id') ?? '';
    await db
        .delete(savedListings)
        .where(and(eq(savedListings.userId, user.id), eq(savedListings.listingId, id)));

    const items = await getSavedListingsByUser(user.id);
    savedByUser.set(user.id, items);

    return c.json({ ok: true, items });
});

app.get('/api/address-book', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    return c.json({ ok: true, items: await getAddressBookEntries(user.id) });
});

app.get('/api/account/address-book', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    return c.json({ ok: true, items: await getAddressBookEntries(user.id) });
});

app.post('/api/address-book', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = addressBookWriteSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    if (!parsed.data.regionId || !parsed.data.communeId) {
        return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
    }

    const items = await upsertAddressBookEntry(user.id, parsed.data);
    return c.json({ ok: true, items }, 201);
});

app.post('/api/account/address-book', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = addressBookWriteSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    if (!parsed.data.regionId || !parsed.data.communeId) {
        return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
    }

    const items = await upsertAddressBookEntry(user.id, parsed.data);
    return c.json({ ok: true, items }, 201);
});

app.patch('/api/address-book/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const addressId = c.req.param('id') ?? '';
    const current = await getAddressBookEntries(user.id);
    if (!current.some((item) => item.id === addressId)) {
        return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = addressBookWriteSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
    if (!parsed.data.regionId || !parsed.data.communeId) {
        return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
    }

    const items = await upsertAddressBookEntry(user.id, parsed.data, addressId);
    return c.json({ ok: true, items });
});

app.patch('/api/account/address-book/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const addressId = c.req.param('id') ?? '';
    const current = await getAddressBookEntries(user.id);
    if (!current.some((item) => item.id === addressId)) {
        return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = addressBookWriteSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
    if (!parsed.data.regionId || !parsed.data.communeId) {
        return c.json({ ok: false, error: 'Región y comuna son obligatorias.' }, 400);
    }

    const items = await upsertAddressBookEntry(user.id, parsed.data, addressId);
    return c.json({ ok: true, items });
});

app.delete('/api/address-book/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const addressId = c.req.param('id') ?? '';
    const current = await getAddressBookEntries(user.id);
    if (!current.some((item) => item.id === addressId)) {
        return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
    }

    const items = await deleteAddressBookEntry(user.id, addressId);
    return c.json({ ok: true, items });
});

app.delete('/api/account/address-book/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const addressId = c.req.param('id') ?? '';
    const current = await getAddressBookEntries(user.id);
    if (!current.some((item) => item.id === addressId)) {
        return c.json({ ok: false, error: 'Dirección no encontrada' }, 404);
    }

    const items = await deleteAddressBookEntry(user.id, addressId);
    return c.json({ ok: true, items });
});


app.post('/api/locations/geocode', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = geocodeLocationRequestSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, provider: 'none', error: 'Payload inválido' }, 400);

    const normalized = normalizeListingLocation(parsed.data.location);
    if (!normalized) return c.json({ ok: false, provider: 'none', error: 'No pudimos procesar la ubicación.' }, 400);
    const location = await geocodeLocationRemotely(normalized);
    if (!location) {
        return c.json({
            ok: true,
            provider: normalized.geoPoint.provider ?? 'none',
            location: normalized,
            error: 'No pudimos confirmar automáticamente el punto exacto. Revisa la dirección en Google Maps antes de guardar.',
        });
    }

    return c.json({
        ok: true,
        provider: location.geoPoint.provider ?? 'none',
        location,
    });
});

app.get('/api/valuations/properties/sources', (c) => {
    const state = getValuationFeedState();
    return c.json({ ok: true, sources: state.sources });
});

app.post('/api/valuations/properties/sources/refresh', async (c) => {
    const state = await refreshValuationFeeds();
    return c.json({ ok: true, sources: state.sources, totalRecords: state.records.length });
});

app.post('/api/valuations/properties/estimate', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = propertyValuationRequestSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const estimate = estimatePropertyValuation(parsed.data);
    return c.json({ ok: true, estimate });
});

app.get('/api/valuations/vehicles/sources', (c) => {
    const state = getVehicleValuationFeedState();
    return c.json({ ok: true, sources: state.sources });
});

app.post('/api/valuations/vehicles/sources/refresh', async (c) => {
    const state = await refreshVehicleValuationFeeds();
    return c.json({ ok: true, sources: state.sources, totalRecords: state.records.length });
});

app.post('/api/valuations/vehicles/estimate', async (c) => {
    const payload = await c.req.json().catch(() => null);
    const parsed = vehicleValuationRequestSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const estimate = estimateVehicleValuation(parsed.data);
    return c.json({ ok: true, estimate });
});

app.get('/api/public/listings', (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const section = c.req.query('section');
    const limitRaw = Number(c.req.query('limit') ?? '60');
    const limit = Number.isFinite(limitRaw) ? Math.min(120, Math.max(1, limitRaw)) : 60;

    const items = Array.from(listingsById.values())
        .filter((listing) => listing.vertical === vertical)
        .filter((listing) => isPublicListingVisible(listing))
        .filter((listing) => {
            if (!section) return true;
            const normalized = parseBoostSection(section, vertical);
            return listing.section === normalized;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit)
        .map((listing) => listingToPublicResponse(listing));

    return c.json({ ok: true, items });
});

app.get('/api/public/listings/:slug', (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const slug = c.req.param('slug') ?? '';
    const listing = Array.from(listingsById.values())
        .find((item) => item.vertical === vertical && isPublicListingVisible(item) && matchesListingSlug(item, slug));

    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    return c.json({ ok: true, item: listingToPublicResponse(listing) });
});

app.get('/api/public/profiles/:slug', (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const slug = c.req.param('slug') ?? '';
    const profile = getPublishedPublicProfileBySlug(vertical, slug);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

    const user = usersById.get(profile.userId) ?? null;
    if (!user || !userCanUsePublicProfile(user, vertical)) {
        return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    }

    const payload = buildPublicProfileResponse(user, vertical, profile);
    return c.json({ ok: true, ...payload });
});

app.get('/api/listing-draft', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const item = await getListingDraftRecord(user.id, vertical);
    return c.json({ ok: true, item });
});

app.put('/api/listing-draft', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const payload = await c.req.json().catch(() => null);
    const parsed = listingDraftWriteSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const item = await upsertListingDraftRecord(user.id, vertical, parsed.data.draft);
    return c.json({ ok: true, item });
});

app.delete('/api/listing-draft', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    await deleteListingDraftRecord(user.id, vertical);
    return c.json({ ok: true });
});

// -----------------------------------------------------------------------------
// File Upload Endpoint
// -----------------------------------------------------------------------------

app.post('/api/media/upload', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) {
        logDebug(`[AUTH FAIL] /api/media/upload - user not found`);
        return c.json({ ok: false, error: 'No autenticado' }, 401);
    }

    logDebug(`[UPLOAD START] User: ${user.email} (${user.id})`);

    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as any;
        const fileType = formData.get('fileType') as string | null;
        const listingId = formData.get('listingId') as string | null;

        logDebug(`[UPLOAD META] file: ${file ? (file.name || 'blob') : 'null'}, type: ${fileType}, listingId: ${listingId}`);

        if (!file) return c.json({ ok: false, error: 'No file provided' }, 400);
        if (!fileType || !['image', 'video', 'document'].includes(fileType)) {
            return c.json({ ok: false, error: 'Invalid file type' }, 400);
        }

        logDebug(`[UPLOAD STORAGE START] Provider initialization...`);
        const storage = getStorageProvider();
        
        logDebug(`[UPLOAD CALL] Calling storage.upload...`);
        const result = await storage.upload({
            file,
            fileName: file.name || 'unnamed-file',
            mimeType: file.type || 'application/octet-stream',
            fileType: fileType as 'image' | 'video' | 'document',
            userId: user.id,
            listingId: listingId || undefined,
        });

        logDebug(`[UPLOAD SUCCESS] Result: ${JSON.stringify(result)}`);
        return c.json({ ok: true, result }, 200);
    } catch (error: any) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';
        logDebug(`[UPLOAD ERROR] ${errMsg}\nStack: ${stack}`);
        console.error('[API] Upload error:', error);
        return c.json(
            { ok: false, error: error instanceof Error ? error.message : 'Upload failed' },
            500
        );
    }
});
// -----------------------------------------------------------------------------
// Storage Health Check (Temporary for testing)
// -----------------------------------------------------------------------------

app.get('/api/storage/health', async (c) => {
    try {
        const storage = getStorageProvider();
        const isHealthy = await storage.health();
        
        // Debug info
        console.log('[STORAGE HEALTH] Provider type:', process.env.STORAGE_PROVIDER);
        console.log('[STORAGE HEALTH] B2 App Key ID:', process.env.BACKBLAZE_APP_KEY_ID ? 'Set' : 'Not set');
        console.log('[STORAGE HEALTH] B2 App Key:', process.env.BACKBLAZE_APP_KEY ? 'Set' : 'Not set');
        console.log('[STORAGE HEALTH] B2 Bucket ID:', process.env.BACKBLAZE_BUCKET_ID ? 'Set' : 'Not set');
        console.log('[STORAGE HEALTH] B2 Bucket Name:', process.env.BACKBLAZE_BUCKET_NAME ? 'Set' : 'Not set');
        console.log('[STORAGE HEALTH] B2 Download URL:', process.env.BACKBLAZE_DOWNLOAD_URL ? 'Set' : 'Not set');
        
        return c.json({ ok: true, healthy: isHealthy }, 200);
    } catch (error) {
        console.error('[API] Storage health check error:', error);
        return c.json(
            { ok: false, error: error instanceof Error ? error.message : 'Storage health check failed' },
            500
        );
    }
});

app.get('/api/listings', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const mine = c.req.query('mine') !== 'false';

    const items = Array.from(listingsById.values())
        .filter((listing) => listing.vertical === vertical)
        .filter((listing) => {
            if (!mine) return user.role === 'superadmin' ? true : listing.ownerId === user.id;
            return listing.ownerId === user.id;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((listing) => listingToResponse(listing));

    return c.json({ ok: true, items });
});

app.post('/api/listings', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = createListingSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const vertical = parsed.data.vertical;
    const section = parseListingSection(parsed.data.listingType, vertical);
    const now = Date.now();
    const listingId = makeListingId();
    const locationData = normalizeListingLocation(parsed.data.locationData);
    const locationLabel = locationData?.publicLabel || parsed.data.location?.trim() || undefined;

    const record: ListingRecord = {
        id: listingId,
        ownerId: user.id,
        vertical,
        section,
        listingType: section,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        price: parsed.data.priceLabel.trim(),
        location: locationLabel,
        locationData,
        href: parsed.data.href?.trim() || listingDefaultHref(vertical, listingId),
        status: parseListingStatus(parsed.data.status),
        views: 0,
        favs: 0,
        leads: 0,
        createdAt: now,
        updatedAt: now,
        rawData: stripStoredListingMetadata(parsed.data.rawData),
        integrations: {},
    };

    try {
        const persisted = await insertListingRecord(record);
        const current = listingIdsByUser.get(user.id) ?? [];
        listingIdsByUser.set(user.id, [persisted.id, ...current]);
        upsertBoostListingFromListing(persisted);
        void maybeAutoPublishListing(user, persisted);

        return c.json({ ok: true, item: listingToResponse(persisted) }, 201);
    } catch (error) {
        if (isListingSlugConflictError(error)) {
            return c.json({ ok: false, error: 'Ya existe una publicación con ese enlace.' }, 409);
        }
        throw error;
    }
});

app.get('/api/listings/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    let listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    return c.json({ ok: true, item: listingToDetailResponse(listing) });
});

app.put('/api/listings/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    let listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = updateListingSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const locationData = normalizeListingLocation(parsed.data.locationData);
    const locationLabel = locationData?.publicLabel || parsed.data.location?.trim() || undefined;
    const nextSection = parseListingSection(parsed.data.listingType, listing.vertical);
    listing.section = nextSection;
    listing.listingType = nextSection;
    listing.title = parsed.data.title;
    listing.description = parsed.data.description;
    listing.price = parsed.data.priceLabel;
    listing.location = locationLabel;
    listing.locationData = locationData;
    listing.href = parsed.data.href?.trim() || listingDefaultHref(listing.vertical, listing.id);
    listing.rawData = stripStoredListingMetadata(parsed.data.rawData);
    if (parsed.data.status) {
        listing.status = parsed.data.status;
    }
    listing.updatedAt = Date.now();

    try {
        listing = await saveListingRecord(listing);
        upsertBoostListingFromListing(listing);
        void maybeAutoPublishListing(user, listing);

        return c.json({ ok: true, item: listingToDetailResponse(listing) });
    } catch (error) {
        if (isListingSlugConflictError(error)) {
            return c.json({ ok: false, error: 'Ya existe una publicación con ese enlace.' }, 409);
        }
        throw error;
    }
});

app.post('/api/listings/:id/integrations/publish', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    let listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = publishListingPortalSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const portal = parsed.data.portal;
    if (!isPortalAvailableForVertical(listing.vertical, portal)) {
        return c.json({ ok: false, error: 'Este portal no está disponible para esta vertical.' }, 400);
    }
    const coverage = getPortalCoverage(listing, portal);
    const now = Date.now();

    if (coverage.missingRequired.length > 0) {
        listing.integrations[portal] = {
            portal,
            status: 'failed',
            lastAttemptAt: now,
            publishedAt: null,
            externalId: null,
            lastError: 'Faltan campos requeridos para este portal.',
        };
        listing.updatedAt = now;
        listing = await saveListingRecord(listing);
        return c.json(
            {
                ok: false,
                error: 'Faltan campos requeridos para este portal.',
                portal,
                missingRequired: coverage.missingRequired,
                missingRecommended: coverage.missingRecommended,
                integration: getPortalSyncView(listing, portal),
            },
            422
        );
    }

    listing.integrations[portal] = {
        portal,
        status: 'published',
        lastAttemptAt: now,
        publishedAt: now,
        externalId: `${portal}-${listing.id}-${now}`,
        lastError: null,
    };
    listing.updatedAt = now;
    listing = await saveListingRecord(listing);

    return c.json({
        ok: true,
        portal,
        integration: getPortalSyncView(listing, portal),
    });
});

app.patch('/api/listings/:id/status', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    let listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = updateListingStatusSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const nextStatus = parsed.data.status;
    const currentStatus = listing.status;
    const invalid = currentStatus === 'archived' && nextStatus !== currentStatus;

    if (invalid) {
        return c.json({ ok: false, error: 'Este aviso ya está cerrado y no puede cambiar de estado desde el panel.' }, 409);
    }

    if (currentStatus === nextStatus) {
        return c.json({ ok: true, item: listingToResponse(listing) });
    }

    listing.status = nextStatus;
    listing.updatedAt = Date.now();
    listing = await saveListingRecord(listing);
    void maybeAutoPublishListing(user, listing);

    return c.json({ ok: true, item: listingToResponse(listing) });
});

app.delete('/api/listings/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    const listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    await deleteListingRecord(listingId);
    return c.json({ ok: true });
});

app.post('/api/listings/:id/renew', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const listingId = c.req.param('id') ?? '';
    let listing = listingsById.get(listingId) ?? await getListingById(listingId);
    if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    if (listing.status === 'sold' || listing.status === 'archived') {
        return c.json({ ok: false, error: 'Este aviso ya está cerrado y no puede renovarse.' }, 409);
    }

    listing.updatedAt = Date.now();
    if (listing.status === 'draft') {
        listing.status = 'active';
    }
    listing = await saveListingRecord(listing);
    void maybeAutoPublishListing(user, listing);

    return c.json({ ok: true, item: listingToResponse(listing) });
});

app.get('/api/boost/catalog', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const sections = getSectionsForVertical(vertical);
    const listings =
        user.role === 'superadmin'
            ? boostListingsSeed.filter((item) => item.vertical === vertical)
            : getBoostListingsByOwner(vertical, user.id);
    const plansBySection = Object.fromEntries(
        sections.map((section) => [
            section,
            getBoostPlans(vertical, section),
        ])
    );

    const reserved = Object.fromEntries(
        sections.map((section) => [
            section,
            {
                used: countReservedSlots(vertical, section),
                max: MAX_BOOST_SLOTS_PER_SECTION,
            },
        ])
    );

    return c.json({
        ok: true,
        vertical,
        sections,
        listings,
        plansBySection,
        reserved,
    });
});

app.get('/api/boost/orders', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const orders = getBoostOrdersForUser(user.id, vertical).map((order) => {
        const listing = getBoostListingById(order.vertical, order.listingId);
        return {
            ...order,
            sectionLabel: sectionLabel(order.section),
            listing,
        };
    });

    return c.json({ ok: true, orders });
});

app.post('/api/boost/orders', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = createBoostOrderSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const vertical = parsed.data.vertical;
    const listing = getBoostListingById(vertical, parsed.data.listingId);
    if (!listing) {
        return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
    }
    if (listing.ownerId !== user.id && user.role !== 'superadmin') {
        return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
    }

    const section = parsed.data.section
        ? parseBoostSection(parsed.data.section, vertical)
        : listing.section;

    if (!isBoostSectionAllowed(vertical, section)) {
        return c.json({ ok: false, error: 'Sección inválida para esta vertical' }, 400);
    }

    const plans = getBoostPlans(vertical, section);
    const selectedPlan = plans.find((item) => item.id === parsed.data.planId);
    if (!selectedPlan) {
        return c.json({ ok: false, error: 'Plan no disponible' }, 400);
    }
    const created = createBoostOrderRecord({
        userId: user.id,
        vertical,
        listing,
        section,
        plan: selectedPlan,
        startAt: parsed.data.startAt,
    });
    if (!created.ok || !created.order) {
        return c.json({ ok: false, error: created.error ?? 'No pudimos crear el boost.' }, 409);
    }

    return c.json({
        ok: true,
        order: {
            ...created.order,
            sectionLabel: sectionLabel(created.order.section),
            listing,
        },
    });
});

app.patch('/api/boost/orders/:id', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = updateBoostOrderSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const orderId = c.req.param('id') ?? '';
    const current = boostOrdersByUser.get(user.id) ?? [];
    const targetIndex = current.findIndex((order) => order.id === orderId);
    if (targetIndex < 0) return c.json({ ok: false, error: 'Boost no encontrado' }, 404);

    const target = normalizeBoostOrder(current[targetIndex]);
    const nextStatus = parsed.data.status;

    if (target.status === 'ended') {
        return c.json({ ok: false, error: 'El boost ya está finalizado' }, 409);
    }

    let updated: BoostOrder;
    if (nextStatus === 'ended') {
        updated = {
            ...target,
            status: 'ended',
            endAt: Date.now(),
            updatedAt: Date.now(),
        };
    } else if (nextStatus === 'paused') {
        updated = {
            ...target,
            status: 'paused',
            updatedAt: Date.now(),
        };
    } else {
        updated = normalizeBoostOrder({
            ...target,
            status: 'active',
            updatedAt: Date.now(),
        });
    }

    const nextOrders = [...current];
    nextOrders[targetIndex] = updated;
    boostOrdersByUser.set(user.id, nextOrders);

    return c.json({ ok: true, order: updated });
});

app.get('/api/boost/featured', async (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const section = parseBoostSection(c.req.query('section'), vertical);
    const limitRaw = Number(c.req.query('limit') ?? '8');
    const limit = Number.isFinite(limitRaw) ? Math.min(24, Math.max(1, limitRaw)) : 8;

    const items = await listFeaturedBoosted(vertical, section, limit);
    return c.json({
        ok: true,
        vertical,
        section,
        sectionLabel: sectionLabel(section),
        items,
    });
});

app.get('/api/subscriptions/catalog', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const plans = getSubscriptionPlans(vertical);
    const freePlan = plans.find((plan) => plan.id === 'free') ?? null;
    const currentSubscription = getCurrentSubscription(user.id, vertical);
    const orders = getPaymentOrdersForUser(user.id, { vertical, kind: 'subscription' }).map((order) => paymentOrderToResponse(order));

    return c.json({
        ok: true,
        vertical,
        mercadoPagoEnabled: isMercadoPagoConfigured(),
        plans,
        freePlan,
        currentSubscription: activeSubscriptionToResponse(currentSubscription),
        orders,
    });
});

app.get('/api/subscriptions/admin/all', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

    const verticalFilter = c.req.query('vertical') as VerticalType | undefined;
    const statusFilter = c.req.query('status');

    const allUsers = await listAdminUsersSnapshot();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const results: {
        id: string;
        userId: string;
        userName: string;
        userEmail: string;
        vertical: string;
        planId: string;
        planName: string;
        status: string;
        providerStatus: string | null;
        startedAt: string;
        expiresAt: string | null;
        cancelledAt: string | null;
    }[] = [];

    for (const [userId, subs] of activeSubscriptionsByUser.entries()) {
        const u = userMap.get(userId);
        for (const sub of subs) {
            if (verticalFilter && sub.vertical !== verticalFilter) continue;
            if (statusFilter && sub.status !== statusFilter) continue;
            const plan = getSubscriptionPlanById(sub.planId as SubscriptionPlanId, sub.vertical);
            results.push({
                id: sub.id,
                userId,
                userName: u?.name ?? 'Usuario',
                userEmail: u?.email ?? '',
                vertical: sub.vertical,
                planId: sub.planId,
                planName: plan?.name ?? sub.planId,
                status: sub.status,
                providerStatus: sub.providerStatus ?? null,
                startedAt: new Date(sub.startedAt).toISOString(),
                expiresAt: sub.expiresAt ? new Date(sub.expiresAt).toISOString() : null,
                cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt).toISOString() : null,
            });
        }
    }

    results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return c.json({ ok: true, subscriptions: results, total: results.length });
});

app.post('/api/payments/checkout', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isMercadoPagoConfigured()) {
        return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = createCheckoutSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);
    const checkoutData = parsed.data;

    try {
        if (checkoutData.kind === 'boost') {
            const vertical = checkoutData.vertical;
            const boostInput = checkoutData.boost;
            const returnUrl = resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
            const listing = getBoostListingById(vertical, boostInput.listingId);
            if (!listing) {
                return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
            }
            if (listing.ownerId !== user.id && user.role !== 'superadmin') {
                return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
            }

            const section = boostInput.section
                ? parseBoostSection(boostInput.section, vertical)
                : listing.section;
            if (!isBoostSectionAllowed(vertical, section)) {
                return c.json({ ok: false, error: 'Sección inválida para esta vertical' }, 400);
            }

            const plan = getBoostPlans(vertical, section).find((item) => item.id === boostInput.planId);
            if (!plan) {
                return c.json({ ok: false, error: 'Plan no disponible' }, 400);
            }

            const existingBoost = getBoostOrdersForUser(user.id).some((order) => {
                if (order.vertical !== vertical || order.listingId !== listing.id) return false;
                return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
            });
            if (existingBoost) {
                return c.json({ ok: false, error: 'Ya tienes un boost vigente para esta publicación' }, 409);
            }

            if (countReservedSlots(vertical, section) >= MAX_BOOST_SLOTS_PER_SECTION) {
                return c.json({ ok: false, error: 'No quedan cupos en esta sección para el periodo seleccionado' }, 409);
            }

            const orderId = makePaymentOrderId('boost');
            const backUrls = {
                success: appendCheckoutParams(returnUrl, { checkout: 'success', purchaseId: orderId, kind: 'boost' }),
                failure: appendCheckoutParams(returnUrl, { checkout: 'failure', purchaseId: orderId, kind: 'boost' }),
                pending: appendCheckoutParams(returnUrl, { checkout: 'pending', purchaseId: orderId, kind: 'boost' }),
            };
            const preference = await createCheckoutPreference({
                externalReference: orderId,
                title: `Boost ${plan.name} · ${listing.title}`,
                description: `${sectionLabel(section)} por ${plan.days} días`,
                amount: plan.price,
                currencyId: 'CLP',
                payerEmail: user.email,
                payerName: user.name,
                backUrls,
                metadata: {
                    kind: 'boost',
                    vertical,
                    listingId: listing.id,
                    section,
                    planId: plan.id,
                },
            });

            const order = upsertPaymentOrder({
                id: orderId,
                userId: user.id,
                vertical,
                kind: 'boost',
                title: `Boost ${plan.name} · ${listing.title}`,
                amount: plan.price,
                currency: 'CLP',
                status: 'pending',
                providerStatus: 'created',
                providerReferenceId: null,
                preferenceId: preference.id,
                checkoutUrl: preference.initPoint ?? preference.sandboxInitPoint,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                appliedAt: null,
                appliedResourceId: null,
                metadata: {
                    kind: 'boost',
                    listingId: listing.id,
                    section,
                    planId: plan.id,
                    listingTitle: listing.title,
                },
            });

            return c.json({
                ok: true,
                orderId: order.id,
                checkoutUrl: order.checkoutUrl,
                order: paymentOrderToResponse(order),
            });
        }

        if (checkoutData.kind === 'advertising') {
            const vertical = checkoutData.vertical;
            const advertisingInput = checkoutData.advertising;
            const campaign = await getAdCampaignRecordForUser(user.id, advertisingInput.campaignId);
            if (!campaign || campaign.vertical !== vertical) {
                return c.json({ ok: false, error: 'La campaña no existe o no pertenece a tu cuenta.' }, 404);
            }
            if (campaign.paymentStatus === 'paid') {
                return c.json({ ok: false, error: 'Esa campaña ya fue pagada.' }, 409);
            }
            const returnUrl = resolveMercadoPagoReturnUrl(vertical, checkoutData.returnUrl);
            const amount = getAdvertisingPrice(
                vertical,
                campaign.format,
                campaign.durationDays
            );
            const orderId = makePaymentOrderId('advertising');
            const backUrls = {
                success: appendCheckoutParams(returnUrl, { checkout: 'success', purchaseId: orderId, kind: 'advertising' }),
                failure: appendCheckoutParams(returnUrl, { checkout: 'failure', purchaseId: orderId, kind: 'advertising' }),
                pending: appendCheckoutParams(returnUrl, { checkout: 'pending', purchaseId: orderId, kind: 'advertising' }),
            };
            const preference = await createCheckoutPreference({
                externalReference: orderId,
                title: `Publicidad ${AD_FORMAT_LABELS[campaign.format]} · ${campaign.name}`,
                description: `${campaign.durationDays} días`,
                amount,
                currencyId: 'CLP',
                payerEmail: user.email,
                payerName: user.name,
                backUrls,
                metadata: {
                    kind: 'advertising',
                    vertical,
                    campaignId: campaign.id,
                    format: campaign.format,
                    durationDays: campaign.durationDays,
                },
            });

            await db.update(adCampaigns).set({
                paymentStatus: 'pending',
                updatedAt: new Date(),
            }).where(eq(adCampaigns.id, campaign.id));

            const order = upsertPaymentOrder({
                id: orderId,
                userId: user.id,
                vertical,
                kind: 'advertising',
                title: `Publicidad ${AD_FORMAT_LABELS[campaign.format]} · ${campaign.name}`,
                amount,
                currency: 'CLP',
                status: 'pending',
                providerStatus: 'created',
                providerReferenceId: null,
                preferenceId: preference.id,
                checkoutUrl: preference.initPoint ?? preference.sandboxInitPoint,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                appliedAt: null,
                appliedResourceId: null,
                metadata: {
                    kind: 'advertising',
                    campaignId: campaign.id,
                    format: campaign.format,
                    durationDays: campaign.durationDays,
                    campaignName: campaign.name,
                },
            });

            return c.json({
                ok: true,
                orderId: order.id,
                checkoutUrl: order.checkoutUrl,
                order: paymentOrderToResponse(order),
            });
        }

        const vertical = checkoutData.vertical;
        const resolvedPlanId = checkoutData.planId ?? checkoutData.subscription?.planId;
        if (!resolvedPlanId) {
            return c.json({ ok: false, error: 'planId es requerido' }, 400);
        }
        const returnUrl = ensureMercadoPagoSubscriptionReturnUrl(vertical, checkoutData.returnUrl);
        const plan = getPaidSubscriptionPlan(vertical, resolvedPlanId);
        if (!plan) {
            return c.json({ ok: false, error: 'Plan no disponible' }, 400);
        }
        const currentSubscription = getCurrentSubscription(user.id, vertical);
        if (currentSubscription?.planId === plan.id && currentSubscription.status === 'active') {
            return c.json({ ok: false, error: 'Ese plan ya está activo en tu cuenta.' }, 409);
        }

        const orderId = makePaymentOrderId('subscription');
        const preapproval = await createPreapproval({
            externalReference: orderId,
            reason: `Suscripción ${plan.name} · ${vertical === 'autos' ? 'SimpleAutos' : vertical === 'propiedades' ? 'SimplePropiedades' : 'SimpleAgenda'}`,
            amount: plan.priceMonthly,
            currencyId: plan.currency,
            payerEmail: user.email,
            backUrl: appendCheckoutParams(returnUrl, { checkout: 'return', purchaseId: orderId, kind: 'subscription' }),
        });

        const order = upsertPaymentOrder({
            id: orderId,
            userId: user.id,
            vertical,
            kind: 'subscription',
            title: `Suscripción ${plan.name}`,
            amount: plan.priceMonthly,
            currency: plan.currency,
            status: preapproval.status === 'authorized' ? 'authorized' : 'pending',
            providerStatus: preapproval.status,
            providerReferenceId: preapproval.id,
            preferenceId: null,
            checkoutUrl: preapproval.initPoint,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            appliedAt: null,
            appliedResourceId: null,
            metadata: {
                kind: 'subscription',
                planId: plan.id,
                planName: plan.name,
            },
        });

        return c.json({
            ok: true,
            orderId: order.id,
            checkoutUrl: order.checkoutUrl,
            order: paymentOrderToResponse(order),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No pudimos iniciar el checkout.';
        const status = message.includes('requiere una URL publica HTTPS') ? 400 : 502;
        return c.json({ ok: false, error: message }, status);
    }
});

app.post('/api/payments/confirm', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    if (!isMercadoPagoConfigured()) {
        return c.json({ ok: false, error: 'Mercado Pago no está configurado en el backend.' }, 503);
    }

    const payload = await c.req.json().catch(() => null);
    const parsed = confirmCheckoutSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const paymentId = parsed.data.paymentId != null ? String(parsed.data.paymentId) : '';
    const order = getPaymentOrdersForUser(user.id).find((item) => item.id === parsed.data.orderId);
    if (!order) {
        return c.json({ ok: false, error: 'Orden no encontrada' }, 404);
    }

    try {
        if (order.kind === 'subscription') {
            const subscriptionMeta = order.metadata.kind === 'subscription' ? order.metadata : null;
            if (!subscriptionMeta) {
                return c.json({ ok: false, error: 'La orden no tiene metadata de suscripción válida.' }, 409);
            }
            if (!order.providerReferenceId) {
                return c.json({ ok: false, error: 'La suscripción no tiene referencia en Mercado Pago.' }, 409);
            }

            const providerPayload = await getPreapprovalById(order.providerReferenceId);
            const providerStatus = asString(asObject(providerPayload).status);
            const externalReference = asString(asObject(providerPayload).external_reference);
            if (externalReference && externalReference !== order.id) {
                return c.json({ ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.' }, 409);
            }

            let nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
                ...current,
                status: parseMercadoPagoPreapprovalStatus(providerStatus),
                providerStatus,
                updatedAt: Date.now(),
            })) ?? order;

            if (nextOrder.status === 'authorized' && !nextOrder.appliedAt) {
                const plan = getPaidSubscriptionPlan(nextOrder.vertical, subscriptionMeta.planId);
                if (!plan) {
                    return c.json({ ok: false, error: 'No pudimos resolver el plan de suscripción.' }, 409);
                }

                const subscription = upsertActiveSubscription({
                    id: makeSubscriptionId(nextOrder.vertical, subscriptionMeta.planId),
                    userId: user.id,
                    vertical: nextOrder.vertical,
                    planId: subscriptionMeta.planId,
                    planName: plan.name,
                    priceMonthly: plan.priceMonthly,
                    currency: plan.currency,
                    features: plan.features,
                    status: 'active',
                    providerPreapprovalId: nextOrder.providerReferenceId ?? '',
                    providerStatus,
                    startedAt: Date.now(),
                    updatedAt: Date.now(),
                });

                nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
                    ...current,
                    status: 'authorized',
                    providerStatus,
                    updatedAt: Date.now(),
                    appliedAt: Date.now(),
                    appliedResourceId: subscription.id,
                })) ?? nextOrder;

                return c.json({
                    ok: true,
                    status: nextOrder.status,
                    order: paymentOrderToResponse(nextOrder),
                    subscription: activeSubscriptionToResponse(subscription),
                });
            }

            return c.json({
                ok: true,
                status: nextOrder.status,
                order: paymentOrderToResponse(nextOrder),
                subscription: activeSubscriptionToResponse(getCurrentSubscription(user.id, order.vertical)),
            });
        }

        const paymentReferenceId = paymentId || order.providerReferenceId || '';
        if (!paymentReferenceId) {
            return c.json({ ok: false, error: 'Mercado Pago no devolvió un identificador de pago.' }, 400);
        }

        const providerPayload = await getPaymentById(paymentReferenceId);
        const payloadObject = asObject(providerPayload);
        const providerStatus = asString(payloadObject.status);
        const externalReference = asString(payloadObject.external_reference);
        if (externalReference && externalReference !== order.id) {
            return c.json({ ok: false, error: 'La respuesta de Mercado Pago no coincide con esta orden.' }, 409);
        }

        let nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
            ...current,
            status: parseMercadoPagoPaymentStatus(providerStatus),
            providerStatus,
            providerReferenceId: paymentReferenceId,
            updatedAt: Date.now(),
        })) ?? order;

        if ((nextOrder.status === 'approved' || nextOrder.status === 'authorized') && !nextOrder.appliedAt) {
            if (nextOrder.kind === 'boost') {
                const boostMeta = nextOrder.metadata.kind === 'boost' ? nextOrder.metadata : null;
                if (!boostMeta) {
                    return c.json({ ok: false, error: 'La orden no tiene metadata de boost válida.' }, 409);
                }

                const listing = getBoostListingById(nextOrder.vertical, boostMeta.listingId);
                if (!listing) {
                    return c.json({ ok: false, error: 'Pago aprobado, pero la publicación ya no existe.' }, 409);
                }
                const plan = getBoostPlans(nextOrder.vertical, boostMeta.section).find(
                    (item) => item.id === boostMeta.planId
                );
                if (!plan) {
                    return c.json({ ok: false, error: 'Pago aprobado, pero el plan ya no está disponible.' }, 409);
                }

                const created = createBoostOrderRecord({
                    userId: user.id,
                    vertical: nextOrder.vertical,
                    listing,
                    section: boostMeta.section,
                    plan,
                });
                if (!created.ok || !created.order) {
                    return c.json({ ok: false, error: created.error ?? 'Pago aprobado, pero no pudimos activar el boost.' }, 409);
                }

                nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
                    ...current,
                    status: 'approved',
                    providerStatus,
                    providerReferenceId: paymentReferenceId,
                    updatedAt: Date.now(),
                    appliedAt: Date.now(),
                    appliedResourceId: created.order?.id ?? null,
                })) ?? nextOrder;

                return c.json({
                    ok: true,
                    status: nextOrder.status,
                    order: paymentOrderToResponse(nextOrder),
                    boostOrder: {
                        ...created.order,
                        sectionLabel: sectionLabel(created.order.section),
                        listing,
                    },
                });
            }

            if (nextOrder.kind === 'advertising') {
                const advertisingMeta = nextOrder.metadata.kind === 'advertising' ? nextOrder.metadata : null;
                if (!advertisingMeta) {
                    return c.json({ ok: false, error: 'La orden no tiene metadata de publicidad válida.' }, 409);
                }

                const campaign = await getAdCampaignRecordForUser(user.id, advertisingMeta.campaignId);
                if (!campaign) {
                    return c.json({ ok: false, error: 'Pago aprobado, pero la campaña ya no existe.' }, 409);
                }

                const rows = await db.update(adCampaigns).set({
                    paymentStatus: 'paid',
                    paidAt: new Date(),
                    updatedAt: new Date(),
                }).where(and(eq(adCampaigns.id, campaign.id), eq(adCampaigns.userId, user.id))).returning();

                const normalizedCampaign = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
                nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
                    ...current,
                    status: 'approved',
                    providerStatus,
                    providerReferenceId: paymentReferenceId,
                    updatedAt: Date.now(),
                    appliedAt: Date.now(),
                    appliedResourceId: normalizedCampaign.id,
                })) ?? nextOrder;

                return c.json({
                    ok: true,
                    status: nextOrder.status,
                    order: paymentOrderToResponse(nextOrder),
                    campaign: adCampaignToResponse(normalizedCampaign),
                });
            }

            nextOrder = updatePaymentOrder(user.id, order.id, (current) => ({
                ...current,
                status: 'approved',
                providerStatus,
                providerReferenceId: paymentReferenceId,
                updatedAt: Date.now(),
                appliedAt: Date.now(),
                appliedResourceId: current.id,
            })) ?? nextOrder;
        }

        if (nextOrder.kind === 'advertising') {
            const advertisingMeta = nextOrder.metadata.kind === 'advertising' ? nextOrder.metadata : null;
            if (advertisingMeta) {
                await db.update(adCampaigns).set({
                    paymentStatus: getAdPaymentStatusFromOrderStatus(nextOrder.status),
                    updatedAt: new Date(),
                }).where(and(eq(adCampaigns.id, advertisingMeta.campaignId), eq(adCampaigns.userId, user.id)));
            }
        }

        return c.json({
            ok: true,
            status: nextOrder.status,
            order: paymentOrderToResponse(nextOrder),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No pudimos validar el pago.';
        return c.json({ ok: false, error: message }, 502);
    }
});

app.get('/api/social/feed', async (c) => {
    const vertical = parseVertical(c.req.query('vertical'));
    const section = c.req.query('section');
    const user = await authUser(c);
    const followSet = user ? getFollowSetByVertical(user.id, vertical) : new Set<string>();

    const items = buildSocialFeedClips(vertical, section)
        .sort((a, b) => {
            const aFollowed = followSet.has(a.authorId) ? 1 : 0;
            const bFollowed = followSet.has(b.authorId) ? 1 : 0;
            if (aFollowed !== bFollowed) return bFollowed - aFollowed;
            if (Boolean(a.featured) !== Boolean(b.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
            return b.publishedAt - a.publishedAt;
        })
        .map((clip) => {
            const author = usersById.get(clip.authorId);
            const authorProfile = author ? getPublishedSellerProfile(author.id, vertical) : null;
            const authorName = authorProfile?.displayName ?? author?.name ?? 'Cuenta verificada';
            const authorUsername = authorProfile?.slug ?? usernameFromName(authorName);
            return {
                id: clip.id,
                vertical: clip.vertical,
                section: clip.section,
                href: clip.href,
                title: clip.title,
                price: clip.price,
                location: clip.location,
                mediaType: clip.mediaType,
                mediaUrl: clip.mediaUrl,
                posterUrl: clip.posterUrl,
                views: clip.views,
                saves: clip.saves,
                publishedAgo: formatAgo(clip.publishedAt),
                featured: Boolean(clip.featured),
                author: {
                    id: clip.authorId,
                    name: authorName,
                    username: authorUsername,
                    profileHref: authorProfile ? `/perfil/${authorUsername}` : null,
                    avatar: authorProfile?.avatarImageUrl ?? author?.avatar,
                    followers: countFollowers(clip.authorId, vertical),
                    isFollowing: followSet.has(clip.authorId),
                    canFollow: user ? user.id !== clip.authorId : true,
                },
            };
        });

    return c.json({ ok: true, clips: items });
});

app.get('/api/social/follows', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const vertical = parseVertical(c.req.query('vertical'));
    const followees = Array.from(getFollowSetByVertical(user.id, vertical));
    return c.json({ ok: true, followees });
});

app.post('/api/social/follows/toggle', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    const payload = await c.req.json().catch(() => null);
    const parsed = followToggleSchema.safeParse(payload);
    if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

    const { followeeUserId, vertical } = parsed.data;
    if (!usersById.has(followeeUserId)) {
        return c.json({ ok: false, error: 'Cuenta no encontrada' }, 404);
    }
    if (followeeUserId === user.id) {
        return c.json({ ok: false, error: 'No puedes seguirte a ti mismo' }, 400);
    }

    const existing = getFollowRecords(user.id);
    const index = existing.findIndex((entry) => entry.followeeUserId === followeeUserId && entry.vertical === vertical);

    let following = false;
    let updated: FollowRecord[];

    if (index >= 0) {
        updated = existing.filter((_, idx) => idx !== index);
    } else {
        following = true;
        updated = [{ followeeUserId, vertical, followedAt: Date.now() }, ...existing];
    }

    followsByUser.set(user.id, updated);

    return c.json({
        ok: true,
        following,
        followees: Array.from(getFollowSetByVertical(user.id, vertical)),
        followers: countFollowers(followeeUserId, vertical),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAgendaProfile(userId: string) {
    return db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.userId, userId),
    });
}

const FREE_TIER_LIMITS = { maxClientsTotal: 5, maxAppointmentsPerMonth: 10 };

function isFreePlan(profile: { plan: string; planExpiresAt: Date | null }): boolean {
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

/** Generate time slots for a given date based on availability rules and existing appointments */
function generateSlots(
    rules: { startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null }[],
    durationMinutes: number,
    dateMidnight: Date,
    existingAppts: { startsAt: Date; endsAt: Date }[],
    blockedSlots: { startsAt: Date; endsAt: Date }[],
    timezone: string,
): { startsAt: string; endsAt: string }[] {
    const slots: { startsAt: string; endsAt: string }[] = [];

    for (const rule of rules) {
        const [sh, sm] = rule.startTime.split(':').map(Number);
        const [eh, em] = rule.endTime.split(':').map(Number);
        let cursor = new Date(dateMidnight);
        cursor.setHours(sh, sm, 0, 0);
        const end = new Date(dateMidnight);
        end.setHours(eh, em, 0, 0);

        let bStart: Date | null = null;
        let bEnd: Date | null = null;
        if (rule.breakStart && rule.breakEnd) {
            const [bsh, bsm] = rule.breakStart.split(':').map(Number);
            const [beh, bem] = rule.breakEnd.split(':').map(Number);
            bStart = new Date(dateMidnight);
            bStart.setHours(bsh, bsm, 0, 0);
            bEnd = new Date(dateMidnight);
            bEnd.setHours(beh, bem, 0, 0);
        }

        while (cursor < end) {
            const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
            if (slotEnd > end) break;

            const inBreak = bStart && bEnd && cursor < bEnd && slotEnd > bStart;
            const clash = existingAppts.some(
                (a) => cursor < a.endsAt && slotEnd > a.startsAt && !['cancelled', 'no_show'].includes((a as any).status ?? ''),
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
// SimpleAgenda — Professional profile
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/profile', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    let profile = await getAgendaProfile(user.id);
    if (!profile) {
        // Auto-create on first access
        const slug = `${user.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`;
        const [created] = await db.insert(agendaProfessionalProfiles).values({
            userId: user.id,
            slug,
            displayName: user.name,
            avatarUrl: user.avatar || null,
        }).returning();
        profile = created;
    }
    return c.json({ ok: true, profile });
});

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

app.get('/api/agenda/slug-available', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const slug = asString(c.req.query('slug')).toLowerCase().trim();
    const validation = isValidSlug(slug);
    if (!validation.ok) return c.json({ ok: false, available: false, error: validation.error });

    const existing = await db.select({ id: agendaProfessionalProfiles.id })
        .from(agendaProfessionalProfiles)
        .where(eq(agendaProfessionalProfiles.slug, slug))
        .limit(1);

    const profile = await getAgendaProfile(user.id);
    const isSelf = existing.length > 0 && profile && existing[0].id === profile.id;
    const available = existing.length === 0 || isSelf;
    return c.json({ ok: true, available, error: available ? undefined : 'Este link ya está en uso por otro profesional.' });
});

app.patch('/api/agenda/profile', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const allowed = [
        'slug', 'isPublished', 'profession', 'displayName', 'headline', 'bio', 'avatarUrl',
        'publicEmail', 'publicPhone', 'publicWhatsapp', 'city', 'region', 'address',
        'currency', 'timezone', 'bookingWindowDays', 'cancellationHours', 'confirmationMode',
        'encuadre', 'requiresAdvancePayment', 'advancePaymentInstructions',
        'waNotificationsEnabled', 'waNotifyProfessional', 'waProfessionalPhone',
        'paymentLinkUrl', 'bankTransferData',
        'coverUrl',
        'websiteUrl', 'instagramUrl', 'facebookUrl', 'linkedinUrl', 'tiktokUrl', 'youtubeUrl', 'twitterUrl',
    ] as const;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
        if (key in body) patch[key] = body[key];
    }

    // Validate slug if being changed
    if ('slug' in body && body.slug !== profile.slug) {
        const newSlug = String(body.slug ?? '').toLowerCase().trim();
        const validation = isValidSlug(newSlug);
        if (!validation.ok) return c.json({ ok: false, error: validation.error }, 400);

        const existing = await db.select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.slug, newSlug))
            .limit(1);
        if (existing.length > 0 && existing[0].id !== profile.id) {
            return c.json({ ok: false, error: 'Este link ya está en uso por otro profesional.' }, 409);
        }
        patch.slug = newSlug;
    }

    const [updated] = await db.update(agendaProfessionalProfiles)
        .set(patch)
        .where(eq(agendaProfessionalProfiles.id, profile.id))
        .returning();
    return c.json({ ok: true, profile: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Services
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/services', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, services: [] });
    const services = await db.select().from(agendaServices)
        .where(and(eq(agendaServices.professionalId, profile.id), eq(agendaServices.isActive, true)))
        .orderBy(asc(agendaServices.position), asc(agendaServices.createdAt));
    return c.json({ ok: true, services });
});

app.post('/api/agenda/services', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
    const [service] = await db.insert(agendaServices).values({
        professionalId: profile.id,
        name: String(body.name),
        description: typeof body.description === 'string' ? body.description : null,
        durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : 60,
        price: typeof body.price === 'string' && body.price ? body.price : null,
        currency: typeof body.currency === 'string' ? body.currency : profile.currency,
        isOnline: body.isOnline !== false,
        isPresential: body.isPresential === true,
        color: typeof body.color === 'string' ? body.color : null,
        position: typeof body.position === 'number' ? body.position : 0,
    }).returning();
    return c.json({ ok: true, service });
});

app.put('/api/agenda/services/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['name', 'description', 'durationMinutes', 'price', 'currency', 'isOnline', 'isPresential', 'color', 'position', 'isActive'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    const [updated] = await db.update(agendaServices).set(patch)
        .where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
    return c.json({ ok: true, service: updated });
});

app.delete('/api/agenda/services/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    await db.update(agendaServices).set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id)));
    return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Availability
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/availability', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, rules: [], blockedSlots: [] });
    const [rules, blockedSlots] = await Promise.all([
        db.select().from(agendaAvailabilityRules)
            .where(eq(agendaAvailabilityRules.professionalId, profile.id))
            .orderBy(asc(agendaAvailabilityRules.dayOfWeek)),
        db.select().from(agendaBlockedSlots)
            .where(and(eq(agendaBlockedSlots.professionalId, profile.id), gte(agendaBlockedSlots.endsAt, new Date())))
            .orderBy(asc(agendaBlockedSlots.startsAt)),
    ]);
    return c.json({ ok: true, rules, blockedSlots });
});

app.post('/api/agenda/availability/rules', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const [rule] = await db.insert(agendaAvailabilityRules).values({
        professionalId: profile.id,
        dayOfWeek: Number(body.dayOfWeek),
        startTime: String(body.startTime ?? '09:00'),
        endTime: String(body.endTime ?? '18:00'),
        breakStart: typeof body.breakStart === 'string' ? body.breakStart : null,
        breakEnd: typeof body.breakEnd === 'string' ? body.breakEnd : null,
        isActive: body.isActive !== false,
    }).returning();
    return c.json({ ok: true, rule });
});

app.put('/api/agenda/availability/rules/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['dayOfWeek', 'startTime', 'endTime', 'breakStart', 'breakEnd', 'isActive'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    const [updated] = await db.update(agendaAvailabilityRules).set(patch)
        .where(and(eq(agendaAvailabilityRules.id, id), eq(agendaAvailabilityRules.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Regla no encontrada' }, 404);
    return c.json({ ok: true, rule: updated });
});

app.delete('/api/agenda/availability/rules/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    await db.delete(agendaAvailabilityRules)
        .where(and(eq(agendaAvailabilityRules.id, id), eq(agendaAvailabilityRules.professionalId, profile.id)));
    return c.json({ ok: true });
});

app.post('/api/agenda/availability/blocked-slots', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const [slot] = await db.insert(agendaBlockedSlots).values({
        professionalId: profile.id,
        startsAt: new Date(String(body.startsAt)),
        endsAt: new Date(String(body.endsAt)),
        reason: typeof body.reason === 'string' ? body.reason : null,
    }).returning();
    return c.json({ ok: true, slot });
});

app.delete('/api/agenda/availability/blocked-slots/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    await db.delete(agendaBlockedSlots)
        .where(and(eq(agendaBlockedSlots.id, id), eq(agendaBlockedSlots.professionalId, profile.id)));
    return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Locations (consulting rooms / offices)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/locations', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, locations: [] });
    const locations = await db.select().from(agendaLocations)
        .where(eq(agendaLocations.professionalId, profile.id))
        .orderBy(desc(agendaLocations.isDefault), asc(agendaLocations.position), asc(agendaLocations.createdAt));
    return c.json({ ok: true, locations });
});

app.post('/api/agenda/locations', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const addressLine = typeof body.addressLine === 'string' ? body.addressLine.trim() : '';
    if (!name) return c.json({ ok: false, error: 'El nombre de la consulta es requerido.' }, 400);
    if (!addressLine) return c.json({ ok: false, error: 'La dirección es requerida.' }, 400);

    const isDefault = body.isDefault === true;
    if (isDefault) {
        await db.update(agendaLocations)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(agendaLocations.professionalId, profile.id));
    }

    const [location] = await db.insert(agendaLocations).values({
        professionalId: profile.id,
        name,
        addressLine,
        city: typeof body.city === 'string' ? body.city : null,
        region: typeof body.region === 'string' ? body.region : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        googleMapsUrl: typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl : null,
        isDefault,
        isActive: body.isActive !== false,
    }).returning();
    return c.json({ ok: true, location });
});

app.put('/api/agenda/locations/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.name === 'string') {
        const name = body.name.trim();
        if (!name) return c.json({ ok: false, error: 'El nombre de la consulta es requerido.' }, 400);
        patch.name = name;
    }
    if (typeof body.addressLine === 'string') {
        const addressLine = body.addressLine.trim();
        if (!addressLine) return c.json({ ok: false, error: 'La dirección es requerida.' }, 400);
        patch.addressLine = addressLine;
    }
    for (const key of ['city', 'region', 'notes', 'googleMapsUrl'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    if ('isActive' in body) patch.isActive = body.isActive !== false;

    if (body.isDefault === true) {
        await db.update(agendaLocations)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(and(eq(agendaLocations.professionalId, profile.id), sql`id <> ${id}`));
        patch.isDefault = true;
    } else if (body.isDefault === false) {
        patch.isDefault = false;
    }

    const [updated] = await db.update(agendaLocations).set(patch)
        .where(and(eq(agendaLocations.id, id), eq(agendaLocations.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Consulta no encontrada.' }, 404);
    return c.json({ ok: true, location: updated });
});

app.delete('/api/agenda/locations/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    await db.delete(agendaLocations)
        .where(and(eq(agendaLocations.id, id), eq(agendaLocations.professionalId, profile.id)));
    return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Clients
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/clients', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, clients: [] });
    const clients = await db.select().from(agendaClients)
        .where(eq(agendaClients.professionalId, profile.id))
        .orderBy(asc(agendaClients.firstName), asc(agendaClients.lastName));
    return c.json({ ok: true, clients });
});

app.post('/api/agenda/clients', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    if (isFreePlan(profile)) {
        const limitError = await checkClientLimit(profile.id);
        if (limitError) return c.json({ ok: false, error: limitError }, 403);
    }
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.firstName) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
    const [client] = await db.insert(agendaClients).values({
        professionalId: profile.id,
        firstName: String(body.firstName),
        lastName: typeof body.lastName === 'string' ? body.lastName || null : null,
        email: typeof body.email === 'string' ? body.email || null : null,
        phone: typeof body.phone === 'string' ? body.phone || null : null,
        whatsapp: typeof body.whatsapp === 'string' ? body.whatsapp || null : null,
        rut: typeof body.rut === 'string' ? body.rut || null : null,
        dateOfBirth: typeof body.dateOfBirth === 'string' ? body.dateOfBirth || null : null,
        gender: typeof body.gender === 'string' ? body.gender || null : null,
        occupation: typeof body.occupation === 'string' ? body.occupation || null : null,
        city: typeof body.city === 'string' ? body.city || null : null,
        referredBy: typeof body.referredBy === 'string' ? body.referredBy || null : null,
        internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes || null : null,
    }).returning();
    return c.json({ ok: true, client });
});

app.get('/api/agenda/clients/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const client = await db.query.agendaClients.findFirst({
        where: and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id)),
    });
    if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
    const appointments = await db.select().from(agendaAppointments)
        .where(and(eq(agendaAppointments.clientId, id), eq(agendaAppointments.professionalId, profile.id)))
        .orderBy(desc(agendaAppointments.startsAt));
    return c.json({ ok: true, client, appointments });
});

app.put('/api/agenda/clients/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['firstName', 'lastName', 'email', 'phone', 'whatsapp', 'rut', 'dateOfBirth', 'gender', 'occupation', 'address', 'city', 'emergencyContactName', 'emergencyContactPhone', 'referredBy', 'internalNotes', 'status'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    const [updated] = await db.update(agendaClients).set(patch)
        .where(and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
    return c.json({ ok: true, client: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Appointments
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/appointments', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, appointments: [] });

    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const conditions = [eq(agendaAppointments.professionalId, profile.id)];
    if (fromStr) conditions.push(gte(agendaAppointments.startsAt, new Date(fromStr)));
    if (toStr) conditions.push(lte(agendaAppointments.startsAt, new Date(toStr)));

    const appointments = await db.select().from(agendaAppointments)
        .where(and(...conditions))
        .orderBy(asc(agendaAppointments.startsAt));
    return c.json({ ok: true, appointments });
});

app.post('/api/agenda/appointments', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    if (isFreePlan(profile)) {
        const limitError = await checkAppointmentLimit(profile.id);
        if (limitError) return c.json({ ok: false, error: limitError }, 403);
    }
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.startsAt) return c.json({ ok: false, error: 'Fecha de inicio requerida' }, 400);
    const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
    const startsAt = new Date(String(body.startsAt));
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    // Handle recurring weekly appointments
    const repeatWeeks = typeof body.repeatWeekly === 'number' && body.repeatWeekly > 0 ? Math.min(body.repeatWeekly, 52) : 0;
    const appointments: (typeof agendaAppointments.$inferSelect)[] = [];

    for (let i = 0; i <= repeatWeeks; i++) {
        const offsetMs = i * 7 * 24 * 60 * 60 * 1000;
        const [appt] = await db.insert(agendaAppointments).values({
            professionalId: profile.id,
            serviceId: typeof body.serviceId === 'string' ? body.serviceId || null : null,
            clientId: typeof body.clientId === 'string' ? body.clientId || null : null,
            clientName: typeof body.clientName === 'string' ? body.clientName || null : null,
            clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail || null : null,
            clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone || null : null,
            startsAt: new Date(startsAt.getTime() + offsetMs),
            endsAt: new Date(endsAt.getTime() + offsetMs),
            durationMinutes,
            modality: typeof body.modality === 'string' ? body.modality : 'online',
            status: 'confirmed',
            price: typeof body.price === 'string' && body.price ? body.price : null,
            currency: profile.currency,
            internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes || null : null,
        }).returning();
        appointments.push(appt);
        // Sync first occurrence to Google Calendar
        if (i === 0) {
            const eventId = await syncToGoogleCalendar(profile, { ...appt, googleEventId: null }, 'create');
            if (eventId) {
                await db.update(agendaAppointments).set({ googleEventId: eventId }).where(eq(agendaAppointments.id, appt.id));
            }
        }
    }

    // Push notification to professional
    const firstAppt = appointments[0];
    const tz = profile.timezone ?? 'America/Santiago';
    const fmtT = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
    const fmtD = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
    void sendPushToUser(user.id, {
        title: '📅 Nueva cita agendada',
        body: `${firstAppt.clientName ?? 'Paciente'} — ${fmtD(firstAppt.startsAt)} a las ${fmtT(firstAppt.startsAt)}`,
        url: '/panel/agenda',
    });

    return c.json({ ok: true, appointment: appointments[0], appointments });
});

app.put('/api/agenda/appointments/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.startsAt) {
        const startsAt = new Date(String(body.startsAt));
        const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
        patch.startsAt = startsAt;
        patch.endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        patch.durationMinutes = durationMinutes;
    } else if (body.durationMinutes) {
        patch.durationMinutes = body.durationMinutes;
    }
    for (const key of ['serviceId', 'clientId', 'clientName', 'clientEmail', 'clientPhone', 'modality', 'price', 'internalNotes'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    const [updated] = await db.update(agendaAppointments).set(patch)
        .where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
    // Sync update to Google Calendar in background
    void syncToGoogleCalendar(profile, updated, 'update');
    return c.json({ ok: true, appointment: updated });
});

app.patch('/api/agenda/appointments/:id/status', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const status = String(body.status ?? '');
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!allowed.includes(status)) return c.json({ ok: false, error: 'Estado inválido' }, 400);

    const patch: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === 'cancelled') {
        patch.cancelledAt = new Date();
        patch.cancelledBy = 'professional';
        if (typeof body.cancellationReason === 'string') patch.cancellationReason = body.cancellationReason;
    }

    const [updated] = await db.update(agendaAppointments).set(patch)
        .where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);

    // Notify cancellation via WhatsApp + remove from Google Calendar
    if (status === 'cancelled') {
        const phone = updated.clientPhone;
        if (phone && profile.waNotificationsEnabled) {
            void notifyCancellation(
                { clientName: updated.clientName, clientPhone: phone, startsAt: updated.startsAt, endsAt: updated.endsAt },
                { displayName: profile.displayName, timezone: profile.timezone, cancellationHours: profile.cancellationHours },
            );
        }
        void syncToGoogleCalendar(profile, updated, 'delete');
    } else {
        void syncToGoogleCalendar(profile, updated, 'update');
    }

    return c.json({ ok: true, appointment: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/stats', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, stats: { todayCount: 0, activeClients: 0, pendingPayments: 0, nextAppointment: null, weeklyData: [], thisMonthRevenue: 0, lastMonthRevenue: 0, thisMonthAppointments: 0 } });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Week bounds (Mon–Sun of current week)
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() + diffToMon); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

    // Month bounds
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
        todayAppts,
        activeClientsResult,
        pendingPaymentsResult,
        nextAppt,
        weeklyAppts,
        thisMonthPaid,
        lastMonthPaid,
        thisMonthApptCount,
        servicesCount,
        rulesCount,
        locationsCount,
    ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(agendaAppointments)
            .where(and(
                eq(agendaAppointments.professionalId, profile.id),
                gte(agendaAppointments.startsAt, todayStart),
                lte(agendaAppointments.startsAt, todayEnd),
                sql`${agendaAppointments.status} NOT IN ('cancelled', 'no_show')`,
            )),
        db.select({ count: sql<number>`count(*)` }).from(agendaClients)
            .where(and(eq(agendaClients.professionalId, profile.id), eq(agendaClients.status, 'active'))),
        db.select({ total: sql<string>`coalesce(sum(amount), 0)` }).from(agendaPayments)
            .where(and(eq(agendaPayments.professionalId, profile.id), eq(agendaPayments.status, 'pending'))),
        db.select().from(agendaAppointments)
            .where(and(
                eq(agendaAppointments.professionalId, profile.id),
                gte(agendaAppointments.startsAt, now),
                sql`${agendaAppointments.status} NOT IN ('cancelled', 'no_show')`,
            ))
            .orderBy(asc(agendaAppointments.startsAt))
            .limit(1),
        // Weekly appointments grouped by date
        db.select({
            day: sql<string>`DATE(${agendaAppointments.startsAt})`,
            count: sql<number>`count(*)`,
        }).from(agendaAppointments)
            .where(and(
                eq(agendaAppointments.professionalId, profile.id),
                gte(agendaAppointments.startsAt, weekStart),
                lte(agendaAppointments.startsAt, weekEnd),
                sql`${agendaAppointments.status} NOT IN ('cancelled', 'no_show')`,
            ))
            .groupBy(sql`DATE(${agendaAppointments.startsAt})`),
        // This month confirmed revenue
        db.select({ total: sql<string>`coalesce(sum(amount), 0)` }).from(agendaPayments)
            .where(and(
                eq(agendaPayments.professionalId, profile.id),
                eq(agendaPayments.status, 'paid'),
                gte(agendaPayments.paidAt, monthStart),
                lte(agendaPayments.paidAt, monthEnd),
            )),
        // Last month confirmed revenue
        db.select({ total: sql<string>`coalesce(sum(amount), 0)` }).from(agendaPayments)
            .where(and(
                eq(agendaPayments.professionalId, profile.id),
                eq(agendaPayments.status, 'paid'),
                gte(agendaPayments.paidAt, lastMonthStart),
                lte(agendaPayments.paidAt, lastMonthEnd),
            )),
        // This month total appointments
        db.select({ count: sql<number>`count(*)` }).from(agendaAppointments)
            .where(and(
                eq(agendaAppointments.professionalId, profile.id),
                gte(agendaAppointments.startsAt, monthStart),
                lte(agendaAppointments.startsAt, monthEnd),
                sql`${agendaAppointments.status} NOT IN ('cancelled', 'no_show')`,
            )),
        // Setup checklist: active services count
        db.select({ count: sql<number>`count(*)` }).from(agendaServices)
            .where(and(eq(agendaServices.professionalId, profile.id), eq(agendaServices.isActive, true))),
        // Setup checklist: active availability rules count
        db.select({ count: sql<number>`count(*)` }).from(agendaAvailabilityRules)
            .where(and(eq(agendaAvailabilityRules.professionalId, profile.id), eq(agendaAvailabilityRules.isActive, true))),
        // Setup checklist: active locations count
        db.select({ count: sql<number>`count(*)` }).from(agendaLocations)
            .where(and(eq(agendaLocations.professionalId, profile.id), eq(agendaLocations.isActive, true))),
    ]);

    // Build 7-day week array Mon–Sun
    const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const weeklyMap = new Map(weeklyAppts.map((r) => [r.day, Number(r.count)]));
    const todayStr = todayStart.toISOString().slice(0, 10);
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        return {
            label: DAY_LABELS[i],
            date: dateStr,
            count: weeklyMap.get(dateStr) ?? 0,
            isToday: dateStr === todayStr,
        };
    });

    return c.json({
        ok: true,
        stats: {
            todayCount: Number(todayAppts[0]?.count ?? 0),
            activeClients: Number(activeClientsResult[0]?.count ?? 0),
            pendingPayments: Number(pendingPaymentsResult[0]?.total ?? 0),
            nextAppointment: nextAppt[0] ?? null,
            weeklyData,
            thisMonthRevenue: Number(thisMonthPaid[0]?.total ?? 0),
            lastMonthRevenue: Number(lastMonthPaid[0]?.total ?? 0),
            thisMonthAppointments: Number(thisMonthApptCount[0]?.count ?? 0),
            hasServices: Number(servicesCount[0]?.count ?? 0) > 0,
            hasRules: Number(rulesCount[0]?.count ?? 0) > 0,
            hasLocations: Number(locationsCount[0]?.count ?? 0) > 0,
        },
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Session notes
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/notes/:appointmentId', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const appointmentId = c.req.param('appointmentId') ?? '';
    const note = await db.query.agendaSessionNotes.findFirst({
        where: and(eq(agendaSessionNotes.appointmentId, appointmentId), eq(agendaSessionNotes.professionalId, profile.id)),
    });
    return c.json({ ok: true, note: note ?? null });
});

app.post('/api/agenda/notes', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.appointmentId || !body.content) return c.json({ ok: false, error: 'appointmentId y content requeridos' }, 400);

    // Verify appointment belongs to this professional
    const appt = await db.query.agendaAppointments.findFirst({
        where: and(eq(agendaAppointments.id, String(body.appointmentId)), eq(agendaAppointments.professionalId, profile.id)),
    });
    if (!appt) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);

    // Upsert note
    const existing = await db.query.agendaSessionNotes.findFirst({
        where: and(eq(agendaSessionNotes.appointmentId, String(body.appointmentId)), eq(agendaSessionNotes.professionalId, profile.id)),
    });

    let note;
    if (existing) {
        const [updated] = await db.update(agendaSessionNotes)
            .set({ content: String(body.content), updatedAt: new Date() })
            .where(eq(agendaSessionNotes.id, existing.id))
            .returning();
        note = updated;
    } else {
        const [created] = await db.insert(agendaSessionNotes).values({
            appointmentId: String(body.appointmentId),
            professionalId: profile.id,
            clientId: appt.clientId ?? null,
            content: String(body.content),
        }).returning();
        note = created;
    }
    return c.json({ ok: true, note });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Payments
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/payments', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, payments: [] });
    const payments = await db.select().from(agendaPayments)
        .where(eq(agendaPayments.professionalId, profile.id))
        .orderBy(desc(agendaPayments.createdAt));
    return c.json({ ok: true, payments });
});

app.post('/api/agenda/payments', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.amount) return c.json({ ok: false, error: 'El monto es requerido' }, 400);
    const [payment] = await db.insert(agendaPayments).values({
        professionalId: profile.id,
        appointmentId: typeof body.appointmentId === 'string' ? body.appointmentId || null : null,
        clientId: typeof body.clientId === 'string' ? body.clientId || null : null,
        amount: String(body.amount),
        currency: typeof body.currency === 'string' ? body.currency : profile.currency,
        method: typeof body.method === 'string' ? body.method || null : null,
        status: typeof body.status === 'string' ? body.status : 'pending',
        paidAt: body.status === 'paid' ? new Date() : null,
        notes: typeof body.notes === 'string' ? body.notes || null : null,
    }).returning();
    return c.json({ ok: true, payment });
});

app.patch('/api/agenda/payments/:id', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ['amount', 'method', 'status', 'notes'] as const) {
        if (key in body) patch[key] = body[key] === '' ? null : body[key];
    }
    if (body.status === 'paid' && !body.paidAt) patch.paidAt = new Date();
    const [updated] = await db.update(agendaPayments).set(patch)
        .where(and(eq(agendaPayments.id, id), eq(agendaPayments.professionalId, profile.id)))
        .returning();
    if (!updated) return c.json({ ok: false, error: 'Cobro no encontrado' }, 404);
    return c.json({ ok: true, payment: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Google Calendar
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getGoogleOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/google-calendar/callback`,
    );
}

// Helper: sync an appointment to Google Calendar (create/update/delete event)
async function syncToGoogleCalendar(
    profile: { googleAccessToken: string | null; googleRefreshToken: string | null; googleTokenExpiry: Date | null; googleCalendarId: string | null; displayName: string | null },
    appointment: { id: string; startsAt: Date; endsAt: Date; clientName: string | null; clientEmail: string | null; internalNotes: string | null; googleEventId: string | null },
    action: 'create' | 'update' | 'delete',
): Promise<string | null> {
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
            return null;
        }

        const resource = {
            summary: appointment.clientName ? `Sesión con ${appointment.clientName}` : 'Sesión',
            description: appointment.internalNotes ?? undefined,
            start: { dateTime: appointment.startsAt.toISOString() },
            end: { dateTime: appointment.endsAt.toISOString() },
            attendees: appointment.clientEmail ? [{ email: appointment.clientEmail }] : undefined,
        };

        if (!appointment.googleEventId) {
            const res = await calApi.events.insert({ calendarId: profile.googleCalendarId, requestBody: resource, sendUpdates: 'none' });
            return res.data.id ?? null;
        } else {
            await calApi.events.update({ calendarId: profile.googleCalendarId, eventId: appointment.googleEventId, requestBody: resource, sendUpdates: 'none' });
            return appointment.googleEventId;
        }
    } catch (e) {
        console.error('[agenda] Google Calendar sync error:', e);
        return null;
    }
}

app.get('/api/agenda/google-calendar/auth', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const oauth2Client = getGoogleOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_CALENDAR_SCOPES,
        state: user.id,
        prompt: 'consent',
    });
    return c.redirect(url);
});

app.get('/api/agenda/google-calendar/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state'); // userId
    if (!code || !state) return c.redirect('/panel/configuracion/integraciones?gc=error');
    try {
        const oauth2Client = getGoogleOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
        const calList = await calendarApi.calendarList.list({ minAccessRole: 'owner' });
        const primaryCal = calList.data.items?.find((c) => c.primary) ?? calList.data.items?.[0];

        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, state),
        });
        if (!profile) return c.redirect('/panel/configuracion/integraciones?gc=error');

        await db.update(agendaProfessionalProfiles).set({
            googleCalendarId: primaryCal?.id ?? null,
            googleAccessToken: tokens.access_token ?? null,
            googleRefreshToken: tokens.refresh_token ?? null,
            googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            updatedAt: new Date(),
        }).where(eq(agendaProfessionalProfiles.id, profile.id));

        return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/integraciones?gc=connected`);
    } catch (e) {
        console.error('[agenda] Google Calendar callback error:', e);
        return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/integraciones?gc=error`);
    }
});

app.delete('/api/agenda/google-calendar/disconnect', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    await db.update(agendaProfessionalProfiles).set({
        googleCalendarId: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        updatedAt: new Date(),
    }).where(eq(agendaProfessionalProfiles.id, profile.id));
    return c.json({ ok: true });
});

app.get('/api/agenda/google-calendar/status', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    const connected = !!(profile?.googleAccessToken);
    return c.json({ ok: true, connected, calendarId: profile?.googleCalendarId ?? null });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — MercadoPago OAuth
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/agenda/mercadopago/auth — redirect professional to MP OAuth
app.get('/api/agenda/mercadopago/auth', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const appId = process.env.MP_AGENDA_APP_ID;
    if (!appId) return c.json({ ok: false, error: 'MP_AGENDA_APP_ID no configurado' }, 500);
    const redirectUri = encodeURIComponent(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`);
    const state = encodeURIComponent(user.id);
    const url = `https://auth.mercadopago.cl/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`;
    return c.redirect(url);
});

// GET /api/agenda/mercadopago/callback
app.get('/api/agenda/mercadopago/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state'); // userId
    if (!code || !state) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/cobros?mp=error`);
    try {
        const appId = process.env.MP_AGENDA_APP_ID;
        const appSecret = process.env.MP_AGENDA_APP_SECRET;
        if (!appId || !appSecret) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/cobros?mp=error`);

        const redirectUri = `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`;
        const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: appId,
                client_secret: appSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });
        if (!tokenRes.ok) throw new Error('MP token exchange failed');
        const tokens = await tokenRes.json() as { access_token: string; public_key: string; refresh_token?: string; user_id?: number };

        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.userId, state),
        });
        if (!profile) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/cobros?mp=error`);

        await db.update(agendaProfessionalProfiles).set({
            mpAccessToken: tokens.access_token,
            mpPublicKey: tokens.public_key ?? null,
            mpUserId: tokens.user_id ? String(tokens.user_id) : null,
            mpRefreshToken: tokens.refresh_token ?? null,
            updatedAt: new Date(),
        }).where(eq(agendaProfessionalProfiles.id, profile.id));

        return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/cobros?mp=connected`);
    } catch (e) {
        console.error('[agenda] MP OAuth callback error:', e);
        return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3002'}/panel/configuracion/cobros?mp=error`);
    }
});

// DELETE /api/agenda/mercadopago/disconnect
app.delete('/api/agenda/mercadopago/disconnect', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    await db.update(agendaProfessionalProfiles).set({
        mpAccessToken: null, mpPublicKey: null, mpUserId: null, mpRefreshToken: null, updatedAt: new Date(),
    }).where(eq(agendaProfessionalProfiles.id, profile.id));
    return c.json({ ok: true });
});

// POST /api/agenda/mercadopago/webhook — receives IPN from MercadoPago
app.post('/api/agenda/mercadopago/webhook', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const bodyData = (body.data ?? {}) as Record<string, unknown>;
        const topic = c.req.query('topic') ?? String(body.type ?? '');
        const resourceId = c.req.query('id') ?? String(bodyData.id ?? body.id ?? '');

        if (topic !== 'payment' && topic !== 'merchant_order') return c.json({ ok: true });
        if (!resourceId) return c.json({ ok: true });

        // Fetch payment details from MP to get externalReference (our appointment id)
        const mpToken = c.req.header('x-mp-access-token'); // not standard, we'll do a lookup below
        // Find which professional has this payment by querying MP for each connected professional
        // Simpler: MP sends us the externalReference in the webhook body
        const externalRef = String(body.external_reference ?? bodyData.external_reference ?? '');
        if (!externalRef) return c.json({ ok: true });

        // Find the appointment
        const appt = await db.query.agendaAppointments.findFirst({
            where: eq(agendaAppointments.id, externalRef),
        });
        if (!appt) return c.json({ ok: true });

        // Mark payment as paid
        await db.update(agendaAppointments)
            .set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
            .where(eq(agendaAppointments.id, appt.id));

        // Create payment record if not exists
        const existingPayment = await db.query.agendaPayments.findFirst({
            where: and(eq(agendaPayments.appointmentId, appt.id), eq(agendaPayments.status, 'paid')),
        });
        if (!existingPayment && appt.price) {
            await db.insert(agendaPayments).values({
                professionalId: appt.professionalId,
                appointmentId: appt.id,
                clientId: appt.clientId ?? null,
                amount: appt.price,
                currency: appt.currency,
                method: 'mercadopago',
                status: 'paid',
                paidAt: new Date(),
                notes: `Pago automático MP ref: ${resourceId}`,
            });
        }

        console.log('[agenda] MP webhook: payment confirmed for appointment', appt.id);
        return c.json({ ok: true });
    } catch (e) {
        console.error('[agenda] MP webhook error:', e);
        return c.json({ ok: true }); // always 200 to avoid MP retries
    }
});

// GET /api/agenda/mercadopago/status
app.get('/api/agenda/mercadopago/status', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    return c.json({ ok: true, connected: !!(profile?.mpAccessToken), userId: profile?.mpUserId ?? null });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — WhatsApp test
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/agenda/whatsapp/test', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const phone = profile.waProfessionalPhone ?? profile.publicWhatsapp ?? profile.publicPhone;
    if (!phone) return c.json({ ok: false, error: 'No hay número de WhatsApp configurado' }, 400);
    try {
        await sendTestMessage(phone, profile.displayName ?? user.name);
        return c.json({ ok: true });
    } catch (e) {
        console.error('[agenda] WhatsApp test error:', e);
        return c.json({ ok: false, error: 'Error al enviar mensaje' }, 500);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Web Push helpers
// ─────────────────────────────────────────────────────────────────────────────

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
            // 410 Gone = subscription expired, remove it
            if (e && typeof e === 'object' && 'statusCode' in e && (e as { statusCode: number }).statusCode === 410) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            }
        }
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Notifications
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/agenda/notifications', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: true, items: [], lastSeenAt: null });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
    const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const appts = await db.select().from(agendaAppointments)
        .where(and(
            eq(agendaAppointments.professionalId, profile.id),
            or(
                gte(agendaAppointments.createdAt, sevenDaysAgo),
                and(
                    gte(agendaAppointments.startsAt, todayStart),
                    lte(agendaAppointments.startsAt, twoWeeksAhead),
                ),
            ),
        ))
        .orderBy(desc(agendaAppointments.createdAt))
        .limit(50);

    const tz = profile.timezone ?? 'America/Santiago';
    const fmtDate = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
    const fmtTime = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });

    type NotifItem = { id: string; type: string; title: string; body: string; createdAt: number };
    const seen = new Set<string>();
    const items: NotifItem[] = [];

    for (const appt of appts) {
        const clientLabel = appt.clientName ?? 'Paciente';
        const timeLabel = `${fmtDate(appt.startsAt)} a las ${fmtTime(appt.startsAt)}`;

        // Client cancellation (recent)
        if (appt.cancelledBy === 'client' && appt.cancelledAt && appt.cancelledAt >= sevenDaysAgo && !seen.has(appt.id)) {
            seen.add(appt.id);
            items.push({
                id: `cancel:${appt.id}`,
                type: 'cancellation',
                title: `Cancelación: ${clientLabel}`,
                body: `${clientLabel} canceló su cita del ${timeLabel}`,
                createdAt: appt.cancelledAt.getTime(),
            });
        }

        // Today's appointments
        if (appt.startsAt >= todayStart && appt.startsAt < tomorrowStart && appt.status !== 'cancelled' && !seen.has(`today:${appt.id}`)) {
            seen.add(`today:${appt.id}`);
            items.push({
                id: `today:${appt.id}`,
                type: 'today',
                title: `Hoy: ${clientLabel}`,
                body: `Cita a las ${fmtTime(appt.startsAt)}`,
                createdAt: appt.createdAt.getTime(),
            });
        }

        // New booking (last 7 days, not cancelled by client)
        if (appt.createdAt >= sevenDaysAgo && appt.cancelledBy !== 'client' && appt.status !== 'cancelled' && !seen.has(appt.id)) {
            seen.add(appt.id);
            items.push({
                id: `booking:${appt.id}`,
                type: 'new_booking',
                title: `Nueva cita: ${clientLabel}`,
                body: `Agendó para el ${timeLabel}`,
                createdAt: appt.createdAt.getTime(),
            });
        }
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    return c.json({
        ok: true,
        items: items.slice(0, 15),
        lastSeenAt: profile.notificationsLastSeenAt ? profile.notificationsLastSeenAt.getTime() : null,
    });
});

app.post('/api/agenda/notifications/seen', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const profile = await getAgendaProfile(user.id);
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    await db.update(agendaProfessionalProfiles)
        .set({ notificationsLastSeenAt: new Date() })
        .where(eq(agendaProfessionalProfiles.id, profile.id));
    return c.json({ ok: true });
});

// Push subscription management
app.get('/api/agenda/push/vapid-public-key', requireVerifiedSession, async (c) => {
    return c.json({ ok: true, key: VAPID_PUBLIC_KEY || null });
});

app.post('/api/agenda/push/subscribe', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
    const keys = body.keys && typeof body.keys === 'object' ? body.keys as Record<string, string> : null;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return c.json({ ok: false, error: 'Suscripción inválida' }, 400);
    const ua = c.req.header('user-agent')?.slice(0, 500) ?? null;
    await db.insert(pushSubscriptions).values({
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: ua,
    }).onConflictDoNothing();
    return c.json({ ok: true });
});

app.post('/api/agenda/push/unsubscribe', requireVerifiedSession, async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
    if (!endpoint) return c.json({ ok: false, error: 'endpoint requerido' }, 400);
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
    return c.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — Public booking
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/public/agenda/:slug', async (c) => {
    const slug = c.req.param('slug') ?? '';
    const profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)),
    });
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    const services = await db.select().from(agendaServices)
        .where(and(eq(agendaServices.professionalId, profile.id), eq(agendaServices.isActive, true)))
        .orderBy(asc(agendaServices.position));
    const locations = await db.select().from(agendaLocations)
        .where(and(eq(agendaLocations.professionalId, profile.id), eq(agendaLocations.isActive, true)))
        .orderBy(asc(agendaLocations.position));
    return c.json({
        ok: true,
        profile: {
            slug: profile.slug,
            displayName: profile.displayName,
            profession: profile.profession,
            headline: profile.headline,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            coverUrl: profile.coverUrl ?? null,
            city: profile.city,
            publicEmail: profile.publicEmail ?? null,
            publicPhone: profile.publicPhone ?? null,
            publicWhatsapp: profile.publicWhatsapp,
            websiteUrl: profile.websiteUrl ?? null,
            instagramUrl: profile.instagramUrl ?? null,
            facebookUrl: profile.facebookUrl ?? null,
            linkedinUrl: profile.linkedinUrl ?? null,
            tiktokUrl: profile.tiktokUrl ?? null,
            youtubeUrl: profile.youtubeUrl ?? null,
            twitterUrl: profile.twitterUrl ?? null,
            timezone: profile.timezone,
            bookingWindowDays: profile.bookingWindowDays,
            encuadre: profile.encuadre,
            requiresAdvancePayment: profile.requiresAdvancePayment,
            advancePaymentInstructions: profile.advancePaymentInstructions,
            paymentMethods: {
                requiresAdvancePayment: profile.requiresAdvancePayment,
                mpConnected: !!(profile.mpAccessToken),
                paymentLinkUrl: profile.paymentLinkUrl ?? null,
                bankTransferData: profile.bankTransferData ?? null,
            },
            services,
            locations: locations.map(loc => ({
                id: loc.id,
                name: loc.name,
                addressLine: loc.addressLine,
                city: loc.city,
                region: loc.region,
                notes: loc.notes,
                googleMapsUrl: loc.googleMapsUrl,
            })),
        },
    });
});

app.get('/api/public/agenda/:slug/slots', async (c) => {
    const slug = c.req.param('slug') ?? '';
    const dateStr = c.req.query('date'); // YYYY-MM-DD
    const serviceId = c.req.query('serviceId');
    if (!dateStr) return c.json({ ok: false, error: 'Fecha requerida' }, 400);

    const profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)),
    });
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    const rules = await db.select().from(agendaAvailabilityRules)
        .where(and(
            eq(agendaAvailabilityRules.professionalId, profile.id),
            eq(agendaAvailabilityRules.dayOfWeek, dayOfWeek),
            eq(agendaAvailabilityRules.isActive, true),
        ));
    if (rules.length === 0) return c.json({ ok: true, slots: [] });

    // Service duration
    let durationMinutes = 60;
    if (serviceId) {
        const svc = await db.query.agendaServices.findFirst({ where: eq(agendaServices.id, serviceId) });
        if (svc) durationMinutes = svc.durationMinutes;
    }

    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');
    const [existingAppts, blockedSlots] = await Promise.all([
        db.select().from(agendaAppointments)
            .where(and(
                eq(agendaAppointments.professionalId, profile.id),
                gte(agendaAppointments.startsAt, dayStart),
                lte(agendaAppointments.startsAt, dayEnd),
                sql`${agendaAppointments.status} NOT IN ('cancelled', 'no_show')`,
            )),
        db.select().from(agendaBlockedSlots)
            .where(and(
                eq(agendaBlockedSlots.professionalId, profile.id),
                lt(agendaBlockedSlots.startsAt, dayEnd),
                gte(agendaBlockedSlots.endsAt, dayStart),
            )),
    ]);

    const slots = generateSlots(rules, durationMinutes, dayStart, existingAppts, blockedSlots, profile.timezone);
    return c.json({ ok: true, slots });
});

// POST /api/public/agenda/appointments/:id/cancel — client self-cancellation
app.post('/api/public/agenda/appointments/:id/cancel', async (c) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

    const appt = await db.query.agendaAppointments.findFirst({
        where: eq(agendaAppointments.id, id),
    });
    if (!appt || appt.status === 'cancelled') {
        return c.json({ ok: false, error: 'Cita no encontrada o ya cancelada.' }, 404);
    }
    if (appt.status === 'completed') {
        return c.json({ ok: false, error: 'No se puede cancelar una cita completada.' }, 400);
    }

    // Check cancellation window
    const profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.id, appt.professionalId),
    });
    if (profile?.cancellationHours) {
        const hoursUntil = (appt.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntil < profile.cancellationHours) {
            return c.json({ ok: false, error: `La cancelación debe hacerse con al menos ${profile.cancellationHours} horas de anticipación.` }, 400);
        }
    }

    const [updated] = await db.update(agendaAppointments)
        .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'client',
            cancellationReason: typeof body.reason === 'string' ? body.reason || null : null,
            updatedAt: new Date(),
        })
        .where(eq(agendaAppointments.id, id))
        .returning();

    // Notify professional via WhatsApp
    if (profile?.waNotifyProfessional) {
        const profPhone = profile.waProfessionalPhone ?? profile.publicWhatsapp ?? profile.publicPhone;
        if (profPhone && updated.clientName) {
            void notifyProfessionalNewBooking(
                profPhone,
                { displayName: profile.displayName, timezone: profile.timezone, cancellationHours: profile.cancellationHours },
                { clientName: `❌ CANCELACIÓN por ${updated.clientName}`, clientPhone: updated.clientPhone, startsAt: updated.startsAt, endsAt: updated.endsAt },
            );
        }
    }

    // Remove from Google Calendar
    if (profile) void syncToGoogleCalendar(profile, updated, 'delete');

    // Push notification to professional
    if (profile) {
        const tz2 = profile.timezone ?? 'America/Santiago';
        const fmtT2 = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz2 });
        const fmtD2 = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz2 });
        const profUser = await db.query.users.findFirst({ where: eq(users.id, profile.userId) });
        if (profUser) {
            void sendPushToUser(profUser.id, {
                title: '❌ Cita cancelada',
                body: `${updated.clientName ?? 'Paciente'} canceló para el ${fmtD2(updated.startsAt)} a las ${fmtT2(updated.startsAt)}`,
                url: '/panel/agenda',
            });
        }
    }

    return c.json({ ok: true, message: 'Cita cancelada correctamente.' });
});

app.post('/api/public/agenda/:slug/book', async (c) => {
    const slug = c.req.param('slug') ?? '';
    const profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)),
    });
    if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
    if (isFreePlan(profile)) {
        const limitError = await checkAppointmentLimit(profile.id);
        if (limitError) return c.json({ ok: false, error: 'Este profesional ha alcanzado el límite de citas de su plan actual. Intenta más adelante.' }, 403);
    }

    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    if (!body.startsAt || !body.clientName) return c.json({ ok: false, error: 'Datos requeridos: startsAt, clientName' }, 400);

    let durationMinutes = 60;
    let serviceId: string | null = null;
    let price: string | null = null;
    let serviceName: string | null = null;
    if (typeof body.serviceId === 'string' && body.serviceId) {
        const svc = await db.query.agendaServices.findFirst({ where: eq(agendaServices.id, body.serviceId) });
        if (svc) { durationMinutes = svc.durationMinutes; serviceId = svc.id; price = svc.price ?? null; serviceName = svc.name; }
    }

    const startsAt = new Date(String(body.startsAt));
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    const status = profile.confirmationMode === 'auto' ? 'confirmed' : 'pending';

    const [appointment] = await db.insert(agendaAppointments).values({
        professionalId: profile.id,
        serviceId,
        clientName: String(body.clientName),
        clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail || null : null,
        clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone || null : null,
        clientNotes: typeof body.clientNotes === 'string' ? body.clientNotes || null : null,
        startsAt,
        endsAt,
        durationMinutes,
        modality: typeof body.modality === 'string' ? body.modality : 'online',
        status,
        price,
        currency: profile.currency,
        policyAgreed: body.policyAgreed === true,
        policyAgreedAt: body.policyAgreed === true ? new Date() : null,
        paymentStatus: profile.requiresAdvancePayment ? 'pending' : 'not_required',
    }).returning();

    // WhatsApp: confirm to client
    const clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone : null;
    if (status === 'confirmed' && clientPhone && profile.waNotificationsEnabled) {
        void notifyConfirmation(
            { id: appointment.id, slug: profile.slug, clientName: String(body.clientName), clientPhone, startsAt, endsAt },
            { displayName: profile.displayName, timezone: profile.timezone, cancellationHours: profile.cancellationHours },
        );
    }

    // WhatsApp: alert professional
    if (profile.waNotifyProfessional) {
        const profPhone = profile.waProfessionalPhone ?? profile.publicWhatsapp ?? profile.publicPhone;
        if (profPhone) {
            void notifyProfessionalNewBooking(
                profPhone,
                { displayName: profile.displayName, timezone: profile.timezone, cancellationHours: profile.cancellationHours },
                { clientName: String(body.clientName), clientPhone, startsAt, endsAt },
            );
        }
    }

    // Sync to Google Calendar
    void syncToGoogleCalendar(profile, { ...appointment, googleEventId: null }, 'create').then(async (eventId) => {
        if (eventId) {
            await db.update(agendaAppointments).set({ googleEventId: eventId }).where(eq(agendaAppointments.id, appointment.id));
        }
    });

    // Push notification to professional
    const tz3 = profile.timezone ?? 'America/Santiago';
    const fmtT3 = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz3 });
    const fmtD3 = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz3 });
    void sendPushToUser(profile.userId, {
        title: '📅 Nueva cita agendada',
        body: `${String(body.clientName)} — ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}`,
        url: '/panel/agenda',
    });

    // If requiresAdvancePayment AND professional has MP connected → create checkout preference
    let checkoutUrl: string | null = null;
    if (profile.requiresAdvancePayment && profile.mpAccessToken && price) {
        try {
            const baseUrl = process.env.AGENDA_APP_URL ?? 'http://localhost:3002';
            const pref = await createCheckoutPreference({
                externalReference: appointment.id,
                title: `Sesión con ${profile.displayName ?? 'el profesional'}`,
                amount: parseFloat(price),
                currencyId: profile.currency,
                payerEmail: typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : 'paciente@simpleagenda.app',
                payerName: String(body.clientName),
                backUrls: {
                    success: `${baseUrl}/${slug}?payment=success&appt=${appointment.id}`,
                    failure: `${baseUrl}/${slug}?payment=failure&appt=${appointment.id}`,
                    pending: `${baseUrl}/${slug}?payment=pending&appt=${appointment.id}`,
                },
                accessToken: profile.mpAccessToken,
            });
            checkoutUrl = pref.initPoint;
        } catch (e) {
            console.error('[agenda] MP checkout creation error:', e);
        }
    }

    // Email confirmation to client
    const clientEmail = typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : null;
    if (clientEmail) {
        const agendaAppUrl = asString(process.env.AGENDA_APP_URL) || 'https://simpleagenda.app';
        const cancelUrl = `${agendaAppUrl}/cancelar?appt=${appointment.id}&slug=${profile.slug}`;

        void sendBookingConfirmationEmail(clientEmail, {
            appointmentId: appointment.id,
            clientName: String(body.clientName),
            professionalName: profile.displayName ?? 'el profesional',
            slug: profile.slug,
            serviceName,
            startsAt,
            endsAt,
            durationMinutes,
            modality: typeof body.modality === 'string' ? body.modality : 'online',
            price,
            currency: profile.currency,
            timezone: profile.timezone ?? 'America/Santiago',
            status,
            paymentMethods: {
                requiresAdvancePayment: profile.requiresAdvancePayment,
                mpConnected: !!(profile.mpAccessToken),
                paymentLinkUrl: profile.paymentLinkUrl ?? null,
                bankTransferData: (profile.bankTransferData ?? null) as Record<string, string> | null,
                checkoutUrl,
            },
            cancelUrl,
            appUrl: agendaAppUrl,
        }).catch((err: unknown) => console.error('[agenda] booking email error:', err));
    }

    return c.json({
        ok: true,
        appointment: {
            id: appointment.id,
            status: appointment.status,
            startsAt: appointment.startsAt,
            paymentStatus: appointment.paymentStatus,
        },
        checkoutUrl,
        paymentMethods: {
            mpConnected: !!(profile.mpAccessToken),
            paymentLinkUrl: profile.paymentLinkUrl ?? null,
            bankTransferData: profile.bankTransferData ?? null,
            requiresAdvancePayment: profile.requiresAdvancePayment,
        },
    });
});

// ==========================================
// NUEVOS ENDPOINTS DE INSTAGRAM INTELLIGENCE
// ==========================================

// Publicación con IA mejorada
app.post('/api/integrations/instagram/publish-enhanced', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    try {
        const payload = await c.req.json().catch(() => null);
        const parsed = instagramEnhancedPublishSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload invalido', details: parsed.error.format() }, 400);
        }

        const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
        if (!listing) {
            return c.json({ ok: false, error: 'Publicacion no encontrada' }, 404);
        }
        if (listing.vertical !== parsed.data.vertical) {
            return c.json({ ok: false, error: 'La publicacion no corresponde a esta vertical.' }, 409);
        }
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicacion' }, 403);
        }

        const listingData = buildInstagramListingData(listing);
        const templates = generateSmartTemplates(listingData);
        const selectedTemplate = [
            templates.recommendedTemplate,
            ...templates.alternatives,
        ].find((template) => template.id === parsed.data.templateId) ?? templates.recommendedTemplate;

        console.log('[instagram] enhanced publish template resolved:', {
            listingId: listing.id,
            requestedTemplateId: parsed.data.templateId ?? null,
            resolvedTemplateId: selectedTemplate?.id ?? null,
            layoutVariant: selectedTemplate?.layoutVariant ?? null,
        });

        const publication = await publishListingToInstagram(user, listing, {
            captionOverride: parsed.data.captionOverride ?? null,
            template: selectedTemplate,
        });

        return c.json({
            ok: true,
            result: publication,
            publication,
            template: selectedTemplate,
            aiContent: null,
            adaptations: null,
            score: selectedTemplate?.score ?? null,
        });

    } catch (error) {
        console.error('[instagram] Error en publicación mejorada:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido'
        }, 500);
    }
});

// Endpoint de prueba para templates (sin autenticación)
app.post('/api/test/templates', async (c) => {
    try {
        const { vertical } = await c.req.json();
        
        const testListingData: InstagramListingData = {
            id: 'test-123',
            vertical: vertical as 'autos' | 'propiedades' | 'agenda',
            title: 'Toyota Corolla 2022',
            price: 15000000,
            brand: 'Toyota',
            model: 'Corolla',
            year: 2022,
            category: 'Sedan',
            condition: 'Excelente',
            features: ['Aire acondicionado', 'GPS', 'Bluetooth'],
            images: [],
            location: 'Santiago, Chile',
            description: 'Excelente vehículo, muy bien cuidado'
        };
        
        // Generar templates
        const templates = generateSmartTemplates(testListingData);
        
        return c.json({ ok: true, ...templates });
        
    } catch (error) {
        console.error('[test] Error generando templates:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Generar templates inteligentes
app.post('/api/integrations/instagram/templates', async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

    try {
        const body = asObject(await c.req.json().catch(() => null));
        const vertical = parseVertical(asString(body.vertical));
        const listingId = asString(body.listingId);

        if (!listingId) {
            return c.json({ ok: false, error: 'listingId es requerido' }, 400);
        }

        const listing = listingsById.get(listingId) ?? await getListingById(listingId);
        if (!listing) {
            return c.json({ ok: false, error: 'Publicacion no encontrada' }, 404);
        }
        if (listing.vertical !== vertical) {
            return c.json({ ok: false, error: 'La publicacion no corresponde a esta vertical.' }, 409);
        }
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicacion' }, 403);
        }

        const listingData = buildInstagramListingData(listing);
        const templates = generateSmartTemplates(listingData);

        console.log('[API] /api/integrations/instagram/templates response:', {
            recommendedTemplate: templates.recommendedTemplate.id,
            recommendedOverlay: templates.recommendedTemplate.overlayVariant,
            alternatives: templates.alternatives.map(t => ({ id: t.id, overlay: t.overlayVariant }))
        });

        return c.json({ ok: true, ...templates });

    } catch (error) {
        console.error('[instagram] Error generando templates:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Obtener insights de Instagram
app.get('/api/integrations/instagram/insights', async (c) => {
    try {
        const { listingId, from, to } = c.req.query();
        
        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, 'autos')
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de analytics
        const { getInstagramInsights } = await import('./instagram.js');

        // Obtener insights
        const insights = await getInstagramInsights(
            instagramAccount.instagramUserId,
            instagramAccount.accessToken,
            listingId as string,
            from && to ? {
                from: new Date(from as string),
                to: new Date(to as string)
            } : undefined
        );

        return c.json({ ok: true, ...insights });

    } catch (error) {
        console.error('[instagram] Error obteniendo insights:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Crear campaña de A/B testing
app.post('/api/integrations/instagram/ab-test/create', async (c) => {
    try {
        const { vertical, listingId, baseContent, variations } = await c.req.json();
        
        if (!listingId || !baseContent) {
            return c.json({ ok: false, error: 'listingId y baseContent son requeridos' }, 400);
        }

        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, vertical)
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de A/B testing
        const { createABTestCampaign } = await import('./instagram.js');

        // Obtener datos del listing
        const listing = await db.query.listings.findFirst({
            where: eq(listings.id, listingId)
        });

        if (!listing) {
            return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
        }

        // Convertir a ListingData
        const listingData = {
            id: listing.id,
            vertical: vertical as 'autos' | 'propiedades' | 'agenda',
            title: listing.title,
            price: listing.rawData && (listing.rawData as any).price ? parseFloat((listing.rawData as any).price) : undefined,
            brand: listing.rawData && (listing.rawData as any).brand,
            model: listing.rawData && (listing.rawData as any).model,
            year: listing.rawData && (listing.rawData as any).year,
            category: listing.rawData && (listing.rawData as any).category,
            condition: listing.rawData && (listing.rawData as any).condition,
            features: listing.rawData && (listing.rawData as any).features || [],
            images: listing.rawData && (listing.rawData as any).images || [],
            location: (listing as any).location,
            description: listing.description || ''
        };

        // Crear campaña de A/B testing
        const campaign = await createABTestCampaign(listingData, baseContent, variations);

        return c.json({ ok: true, campaign });

    } catch (error) {
        console.error('[instagram] Error creando A/B test:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Analizar resultados de A/B test
app.post('/api/integrations/instagram/ab-test/:campaignId/analyze', async (c) => {
    try {
        const campaignId = c.req.param('campaignId');
        
        // Importar funciones de A/B testing
        const { analyzeABTestResults } = await import('./instagram.js');

        // Analizar resultados
        const results = await analyzeABTestResults(campaignId);

        return c.json({ ok: true, ...results });

    } catch (error) {
        console.error('[instagram] Error analizando A/B test:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Programar publicación inteligente
app.post('/api/integrations/instagram/schedule', async (c) => {
    try {
        const { vertical, listingId, content, options = {} } = await c.req.json();
        
        if (!listingId || !content) {
            return c.json({ ok: false, error: 'listingId y content son requeridos' }, 400);
        }

        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, vertical)
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de scheduler
        const { scheduleInstagramPost } = await import('./instagram.js');

        // Obtener datos del listing
        const listing = await db.query.listings.findFirst({
            where: eq(listings.id, listingId)
        });

        if (!listing) {
            return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
        }

        // Convertir a ListingData
        const listingData = {
            id: listing.id,
            vertical: vertical as 'autos' | 'propiedades' | 'agenda',
            title: listing.title,
            price: listing.rawData && (listing.rawData as any).price ? parseFloat((listing.rawData as any).price) : undefined,
            brand: listing.rawData && (listing.rawData as any).brand,
            model: listing.rawData && (listing.rawData as any).model,
            year: listing.rawData && (listing.rawData as any).year,
            category: listing.rawData && (listing.rawData as any).category,
            condition: listing.rawData && (listing.rawData as any).condition,
            features: listing.rawData && (listing.rawData as any).features || [],
            images: listing.rawData && (listing.rawData as any).images || [],
            location: (listing as any).location,
            description: listing.description || ''
        };

        // Programar publicación
        const scheduledPost = await scheduleInstagramPost(listingData, content, options);

        return c.json({ ok: true, scheduledPost });

    } catch (error) {
        console.error('[instagram] Error programando publicación:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Obtener insights de scheduling
app.get('/api/integrations/instagram/scheduling-insights', async (c) => {
    try {
        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, 'autos')
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de scheduler
        const { getSchedulingInsights } = await import('./instagram.js');

        // Obtener insights (simulados por ahora)
        const insights = getSchedulingInsights([], []);

        return c.json({ ok: true, ...insights });

    } catch (error) {
        console.error('[instagram] Error obteniendo scheduling insights:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Obtener publicaciones programadas
app.get('/api/integrations/instagram/scheduled', async (c) => {
    try {
        const hoursAhead = parseInt(c.req.query('hoursAhead') as string) || 24;
        
        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, 'autos')
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de scheduler
        const { InstagramSchedulerService } = await import('./instagram-scheduler.js');

        // Obtener publicaciones programadas (simuladas por ahora)
        const posts = InstagramSchedulerService.getUpcomingPosts([], hoursAhead);

        return c.json({ ok: true, posts });

    } catch (error) {
        console.error('[instagram] Error obteniendo posts programados:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

// Optimizar contenido existente
app.post('/api/integrations/instagram/optimize', async (c) => {
    try {
        const { vertical, publicationId, currentContent, listingId } = await c.req.json();
        
        if (!publicationId || !currentContent || !listingId) {
            return c.json({ ok: false, error: 'publicationId, currentContent y listingId son requeridos' }, 400);
        }

        // Obtener cuenta de Instagram
        const instagramAccount = await db.query.instagramAccounts.findFirst({
            where: eq(instagramAccounts.vertical, vertical)
        });

        if (!instagramAccount) {
            return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
        }

        // Importar funciones de IA
        const { optimizeInstagramContent } = await import('./instagram.js');

        // Obtener datos del listing
        const listing = await db.query.listings.findFirst({
            where: eq(listings.id, listingId)
        });

        if (!listing) {
            return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
        }

        // Convertir a ListingData
        const listingData = {
            id: listing.id,
            vertical: vertical as 'autos' | 'propiedades' | 'agenda',
            title: listing.title,
            price: listing.rawData && (listing.rawData as any).price ? parseFloat((listing.rawData as any).price) : undefined,
            brand: listing.rawData && (listing.rawData as any).brand,
            model: listing.rawData && (listing.rawData as any).model,
            year: listing.rawData && (listing.rawData as any).year,
            category: listing.rawData && (listing.rawData as any).category,
            condition: listing.rawData && (listing.rawData as any).condition,
            features: listing.rawData && (listing.rawData as any).features || [],
            images: listing.rawData && (listing.rawData as any).images || [],
            location: (listing as any).location,
            description: listing.description || ''
        };

        // Optimizar contenido
        const optimization = await optimizeInstagramContent(
            instagramAccount.instagramUserId,
            instagramAccount.accessToken,
            publicationId,
            currentContent,
            listingData
        );

        return c.json({ ok: true, ...optimization });

    } catch (error) {
        console.error('[instagram] Error optimizando contenido:', error);
        return c.json({ 
            ok: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
        }, 500);
    }
});

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
                await notifyReminder24h(
                    { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                    { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                );
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
                await notifyReminder30min(
                    { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                    { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                );
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
                ADD COLUMN IF NOT EXISTS payment_status varchar(20) NOT NULL DEFAULT 'not_required'
        `);
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
