import { appendFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { env, isProduction } from './env.js';
import { allowedOrigins, defaultCorsOrigin, isLocalOrigin } from './lib/cors.js';
import { warmEmailLogoCache } from './lib/email-brand-logo.js';
import {
    buildGoogleRedirectUri,
    resolveBrowserOrigin as resolveBrowserOriginFromLib,
    sanitizeBrowserReturnUrl as sanitizeBrowserReturnUrlFromLib,
} from './lib/browser-origin.js';
import { formatAgo, formatRelativeTimestamp, publicSectionLabel } from './lib/format-relative.js';
import { activeSubscriptionToResponse, paymentOrderToResponse } from './modules/payments/presentation.js';
import { createDebugLogger, asString, asNumber, asObject } from './modules/shared/index.js';
import type { ValuationFeedRecord, VehicleValuationFeedRecord, ValuationHistoricalPoint, ValuationSourceBreakdown, ValuationConfidenceBreakdown, ValuationFeedLicense, ValuationFeedTransport, ValuationFeedHealth, ValuationFeedSourceStatus, ValuationFeedConnectorLoadResult, ValuationFeedConnector, VehicleValuationFeedConnector, ValuationComparable, VehicleValuationComparable } from './modules/shared/index.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    getMediaProxyS3Client,
    getR2S3Client,
    getS3ClientForUrl,
} from './modules/media/s3-clients.js';
import {
    createMercadoPagoIntegrationRouter,
} from './modules/mercadopago/integration-router.js';
import {
    createGoogleCalendarIntegrationRouter,
} from './modules/google-calendar/integration-router.js';
import type { MercadoPagoOperatorVertical } from './modules/mercadopago/oauth-state.js';
import { resolveActiveSerenataBillingPlan } from './modules/serenatas/plan.js';
import {
    checkAppointmentLimit,
    checkClientLimit,
    generateSlots,
    getAgendaProfile,
    hasAgendaFullAccess,
    isFreePlan,
} from './modules/agenda/plan-limits.js';
import { createEnsureAgendaProfile } from './modules/agenda/ensure-profile.js';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { logger } from '@simple/logger';
import {
    generateSmartTemplates,
} from './modules/instagram/templates.js';
import {
    createCheckoutPreference,
    createPreapproval,
    getPaymentById,
    getPreapprovalById,
    isMercadoPagoConfigured,
    warnMercadoPagoWebhookSecretAtStartup,
} from './modules/mercadopago/service.js';
import {
    appendCheckoutParams,
    ensureMercadoPagoSubscriptionReturnUrl,
    isLocalHostname,
    parseMercadoPagoPaymentStatus as parseMpPaymentStatus,
    parseMercadoPagoPreapprovalStatus as parseMpPreapprovalStatus,
    resolveMercadoPagoReturnUrl,
} from './modules/mercadopago/checkout-helpers.js';
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
import { buildInstagramTemplateOverlaySvg } from './modules/instagram/svg-render.js';
import { defaultInstagramCaptionTemplate } from './modules/instagram/listing-presentation.js';
import { loadPaymentOrdersCache } from './modules/payments/load-payment-orders-cache.js';
import { createPlatformRouter } from './modules/platform/index.js';
import { createStartupDataLoader } from './modules/cache/startup-load.js';
import { buildEnvStatusSnapshot } from './lib/env-status.js';
import {
    createInstagramAccountStore,
    mapInstagramAccountRow,
    mapInstagramPublicationRow,
} from './modules/instagram/account-store.js';
import { refreshInstagramAccountIfNeeded as refreshInstagramAccountToken } from './modules/instagram/publish-listing.js';
import { createInstagramPublishWiring } from './modules/instagram/publish-wiring.js';
import { createPaymentOrderStore } from './modules/payments/order-cache.js';
import { createListingPersist, isListingSlugConflictError } from './modules/listings/persist.js';
import { deleteStoredMediaUrls, resolveAccessibleStoredMediaUrl } from './modules/media/stored-object.js';
import {
    extractAllListingMediaUrls,
    extractListingMediaUrls,
    extractListingVideoUrl,
    extractR2ObjectKey,
    extractStorageObjectKey,
    isCloudflareR2Url,
    isOwnedStorageUrl,
    isStorageUrl,
    normalizeMediaValueForResponse,
    toDeliveredMediaUrl,
    toPublicMediaUrl,
} from './modules/listings/media-delivery.js';
import { buildSocialFeedClips as buildSocialFeedClipsFromRecords } from './modules/social/feed.js';
import {
    buildLocationPublicLabel,
    geocodeListingLocation,
    geocodeLocationRemotely,
    geocodeLocationRequestSchema,
    humanizePublicLocationFallback,
    normalizeListingLocation,
    makeGeoPoint,
} from './modules/listings/location.js';
import {
    fetchActivePublicListingRowsForMarketplace,
    fetchListingRowById,
    fetchListingRowsForPanel,
} from './modules/listings/queries.js';
import {
    createMapListingRowToRecord,
    listingDefaultHref,
    parseNumberFromString,
} from './modules/listings/row-mapper.js';
import { getPortalCoverage } from './modules/listings/portal-coverage.js';
import {
    getPortalSyncView,
    listingAgeDays,
    listingToDetailResponse,
    listingToResponse,
} from './modules/listings/panel-present.js';
import {
    embedStoredListingMetadata,
    extractStoredListingIntegrations,
    isPortalAvailableForVertical,
    stripStoredListingMetadata,
    type ListingPortalSyncRecord,
    type PortalKey,
} from './modules/listings/portals.js';
import { listPaymentOrdersForUserFromDb } from './modules/payments/queries.js';

import { db, pgClient } from './db/index.js';
import { applyPostJournalMigrations } from './db/apply-post-journal-migrations.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq, and, or, desc, asc, gt, lt, gte, lte, isNull, sql, inArray, ilike, type SQL } from 'drizzle-orm';
import {
    users,
    userPlatformAccess,
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
    socialPublications,
    tiktokAccounts,
    youtubeAccounts,
    publicProfiles,
    marketplaceOperatorServices,
    marketplaceOperatorServicePacks,
    marketplaceOperatorServicePromotions,
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
    agendaGroupAttendees,
    serenatas,
    serenataOffers,
    serenataMusicians,
    serenataClients,
    serenataOwners,
    serenataProviderGroups,
    serenataGroupServices,
    serenataProviderGroupMembers,
    serenataProviderGroupMemberInvites,
    serenataAvailabilityRules,
    serenataProviderGroupBlockedSlots,
    serenataSavedProviderGroups,
    serenataProviderGroupApplications,
    serenataGroups,
    serenataGroupMembers,
    serenataGroupInvites,
    userNotificationLog,
    platformNotifications,
    mortgageRates,
} from './db/schema.js';
import { createAccountCache } from './modules/accounts/account-cache.js';
import { createAddressBookService } from './modules/accounts/address-book-service.js';
import { createAccountsRouter } from './modules/accounts/index.js';
import { createMessageRuntimeBindings } from './modules/messages/runtime-bindings.js';
import { createMessageServiceDeps } from './modules/messages/message-service-factory.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from './modules/instagram/oauth-state.js';
import { createSubscriptionAccess } from './modules/subscriptions/access.js';
import { createAdminRouter, listAdminUsersSnapshot, listAdminListingsSnapshot } from './modules/admin/index.js';
import { createPermanentlyDeleteUser } from './modules/admin/permanently-delete-user.js';
import {
    adCampaignToResponse,
    createAdCampaignStore,
    mapAdCampaignRow,
    sanitizeAdCampaignWriteInput,
} from './modules/advertising/campaign-store.js';
import {
    AGENDA_RESERVED_SLUGS,
    createAgendaGoogleCalendarSync,
    createAgendaPushSender,
    createEnsureNpsForAppointment,
    isValidAgendaSlug,
} from './modules/agenda/runtime-support.js';
import { createListingPublicPresent, extractListingSlugCandidate } from './modules/listings/public-present.js';
import { createBoostListingSeedSync } from './modules/boost/listing-seed-sync.js';
import { createListFeaturedBoosted } from './modules/boost/featured-list.js';
import { createAuthRouter } from './modules/auth/router.js';
import { createAuthSessionRuntime } from './modules/auth/session-runtime.js';
import {
    getUserByEmail as fetchUserByEmail,
    canAuthenticateUser,
    touchUserLastLoginAt,
} from './modules/auth/user-auth.js';
import {
    countActiveSuperadminUsers,
    isActiveAdminStatus,
    isAdminBootstrapEnabled,
    isAdminForVertical,
    isAdminRole,
} from './modules/auth/admin-guard.js';
import { createListingsRouter, createListingDraftRouter } from './modules/listings/index.js';
import { createBoostRouter } from './modules/boost/index.js';
import { getAllBoostOrdersNormalized, getBoostListingById, getBoostOrdersForUser, isBoostSectionAllowed, getBoostListingsByOwner, parseBoostSection, getSectionsForVertical, getBoostPlans, createBoostOrderRecord, normalizeBoostOrder, countReservedSlots, sectionLabel } from './modules/boost/service.js';
import { resolveFreeBoostQuota } from './modules/boost/quota.js';
import { createValuationRouter } from './modules/valuation/index.js';
import {
    configurePropertyValuationFeeds,
    getValuationFeedState,
    refreshValuationFeeds,
} from './modules/valuation/property-feeds.js';
import {
    configurePropertyValuationEstimate,
    estimatePropertyValuation,
    propertyValuationRequestSchema,
} from './modules/valuation/property-estimate.js';
import {
    configureVehicleValuationEstimate,
    estimateVehicleValuation,
    vehicleValuationRequestSchema,
} from './modules/vehicle-valuation/estimate.js';
import {
    configureVehicleValuationFeeds,
    createVehicleValuationRouter,
    getVehicleValuationFeedState,
    normalizeVehicleSlug,
    normalizeVehicleType,
    refreshVehicleValuationFeeds,
} from './modules/vehicle-valuation/index.js';
import {
    PUBLIC_PROFILE_DAYS,
    PUBLIC_PROFILE_SOCIAL_KEYS,
    createDefaultPublicProfileBusinessHours,
    createDefaultPublicProfileSocialLinks,
    isValidAbsoluteUrl,
    isValidPublicProfileSlug,
    normalizeExternalUrlInput,
    normalizePublicProfileBusinessHours,
    normalizePublicProfileSlug,
    normalizePublicProfileSocialLinks,
    publicProfileUserVerticalKey,
    publicProfileVerticalSlugKey,
    toNullIfEmpty,
} from './modules/public-profile/normalize.js';
import { createPublicProfilePresentation } from './modules/public-profile/presentation.js';
import { fetchPublishedOperatorCatalog, searchPublicOperatorCatalog } from './modules/public-profile/operator-services.js';
import { buildMarketplaceOperatorAnalytics } from './modules/public-profile/operator-analytics.js';
import { isMarketplaceVertical } from './modules/public-profile/marketplace-plan-limits.js';
import {
    mapPublicProfileRow,
} from './modules/public-profile/row-mappers.js';
import { createAddressBookRouter } from './modules/address-book/index.js';
import { createPaymentsRouter } from './modules/payments/index.js';
import { findPaymentOrderByIdFromDb, loadPaymentOrderFromDb } from './modules/payments/queries.js';
import bcrypt from 'bcryptjs';
import webpush from 'web-push';
import { googleAuth } from '@hono/oauth-providers/google';
import { google } from 'googleapis';
import cron from 'node-cron';
import { getStorageProvider } from './storage-providers/index.js';
import { clearRateLimit, consumeRateLimit } from './lib/auth-rate-limit.js';
import { rateLimit } from './lib/rate-limit.js';
import {
    buildPasswordResetUrl,
    hashOpaqueToken,
    isAuthEmailConfigured,
    issueEmailVerification,
    sendAppointmentReminderEmail,
    sendBookingConfirmationEmail,
    sendPasswordChangedEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
} from './lib/auth-email.js';
import { SESSION_COOKIE_NAME } from './lib/session-cookie.js';
import {
    loginSchema,
    registerSchema,
    updateProfileSchema,
    publicProfileWriteSchema,
    publicProfilePaymentMethodsWriteSchema,
    publicProfileBookingTermsWriteSchema,
    generateBookingPoliciesSchema,
    passwordResetRequestSchema,
    passwordResetConfirmSchema,
    passwordChangeSchema,
    savedRecordSchema,
    followToggleSchema,
    updateListingStatusSchema,
    listingDraftWriteSchema,
    addressBookWriteSchema,
    createBoostOrderSchema,
    updateBoostOrderSchema,
    createListingSchema,
    updateListingSchema,
    publishListingPortalSchema,
    instagramSettingsSchema,
    instagramPublishSchema,
    instagramEnhancedPublishSchema,
    socialPublishSchema,
    generateListingReelSchema,
    adCampaignCreateSchema,
    adCampaignUpdateSchema,
    createCheckoutSchema,
    confirmCheckoutSchema,
    emailVerificationRequestSchema,
    emailVerificationConfirmSchema,
    emailChangeRequestSchema,
    messageEntryCreateSchema,
    messageFolderSchema,
    messageThreadUpdateSchema,
} from './lib/request-schemas.js';
import { logAudit, logNotification } from './lib/audit.js';
import { publicResidenceFromUser } from './lib/sync-user-timezone.js';
import { createAgendaRouter, createPublicAgendaRouter } from './modules/agenda/router.js';
import { registerAgendaCronJobs } from './modules/agenda/cron.js';
import { registerSerenatasCronJobs } from './modules/serenatas/cron.js';
import { createAccountRouter } from './modules/public-profile/index.js';
import { createAdvertisingRouter } from './modules/advertising/index.js';
import { getAdvertisingPrice, getAdPaymentStatusFromOrderStatus, normalizeAdCampaigns, getSubscriptionPlans, isValidHttpDestinationUrl, isAdPlacementSectionAllowed } from './modules/advertising/service.js';
import { countUserListingsForVertical, getListingLimitError } from './modules/listings/listing-plan-limit.js';
import { AD_FORMAT_LABELS, MAX_CAMPAIGNS_TOTAL, MAX_ACTIVE_HERO_CAMPAIGNS } from './modules/advertising/types.js';
import { createMessagesRouter, createPanelNotificationsRouter } from './modules/messages/index.js';
import {
    createInstagramRouter,
    createInstagramPublicImageRouter,
} from './modules/instagram/index.js';
import {
    createTikTokRouter,
    createTikTokAccountStore,
    mapTikTokAccountRow,
    createPublishListingToTikTok,
    isTikTokConfigured,
} from './modules/tiktok/index.js';
import {
    createYouTubeRouter,
    createYouTubeAccountStore,
    mapYouTubeAccountRow,
    createPublishListingToYouTube,
    isYouTubeConfigured,
} from './modules/youtube/index.js';
import {
    createSocialRouter,
    createSocialHubRouter,
    createSocialPublicationStore,
    createPublishListingToFacebookPage,
    createSocialHubPublisher,
    mapSocialPublicationRow,
} from './modules/social/index.js';
import { createMediaRouter, createStorageRouter } from './modules/media/index.js';
import {
    attachGeneratedVideoToListing,
    generateListingReelVideo,
    isReelGeneratorAvailable,
} from './modules/media/generate-listing-reel.js';
import { createSystemRouter } from './modules/system/index.js';
import { createPublicRouter } from './modules/public/index.js';
import { attachSerenataPaymentOrder, createSerenatasRouter, getSerenataPaymentTarget, markSerenataPaymentFailed, publishPaidSerenataToOwners } from './modules/serenatas/index.js';
import type {
    AccountRecord,
    AccountRole,
    AccountType,
    AccountUserRecord,
    ActiveSubscription,
    AddressBookEntry,
    AddressBookKind,
    AdCampaignRecord,
    AdFormat,
    AppUser,
    BoostListingRecord,
    BoostOrder,
    BoostOrderStatus,
    BoostPlanId,
    BoostSection,
    CheckoutKind,
    FeedClip,
    FollowRecord,
    GeoPoint,
    InstagramAccountRecord,
    SocialPublicationRecord,
    InstagramPublicationRecord,
    TikTokAccountRecord,
    YouTubeAccountRecord,
    ListingDraftRow,
    ListingLocation,
    ListingRecord,
    ListingRow,
    ListingStatus,
    MessageEntryRecord,
    MessageFolder,
    MessageSenderRole,
    MessageThreadRecord,
    PaidSubscriptionPlanRecord,
    PaymentOrderMetadata,
    PaymentOrderRecord,
    PaymentVerticalType,
    PublicProfileAccountKind,
    PublicProfileRecord,
    PublicUser,
    SavedListingRecord,
    SubscriptionPlanId,
    UserRole,
    UserStatus,
    VerticalType,
} from './lib/domain-types.js';
import {
    accountUsersByUserId,
    accountsById,
    activeSubscriptionsByUser,
    addressBookByUser,
    boostOrdersByUser,
    defaultAccountIdByUserId,
    followsByUser,
    getPublicProfileRecord,
    getPublishedPublicProfileBySlug,
    instagramAccountByUserVertical,
    tiktokAccountByUserVertical,
    youtubeAccountByUserVertical,
    instagramPublicationsByUser,
    socialPublicationsByUser,
    listingIdsByUser,
    listingsById,
    paymentOrdersByUser,
    publicProfilesByUserVertical,
    publicProfilesByVerticalSlug,
    savedByUser,
    upsertPublicProfileCache,
    usersById,
} from './modules/cache/domain-maps.js';

const {
    mapAccountRow,
    mapAccountUserRow,
    upsertAccountCache,
    upsertAccountUserCache,
    getAccountMembershipsForUser,
    getPrimaryAccountIdForUserSync,
    getPrimaryAccountIdForUser,
    buildPersonalAccountName,
    ensurePrimaryAccountForUser,
} = createAccountCache({
    accountsById,
    accountUsersByUserId,
    defaultAccountIdByUserId,
    usersById,
});

const API_ROOT_DIR = path.resolve(__dirname, '..');
const DEBUG_LOG_FILE = path.resolve(process.cwd(), 'api_debug.log');
const logDebug = createDebugLogger(DEBUG_LOG_FILE);

logDebug('--- API RESTARTED ---');

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const OAUTH_STATE_COOKIE = 'simple_oauth_state';
const INSTAGRAM_STATE_COOKIE = 'simple_instagram_state';
const TIKTOK_STATE_COOKIE = 'simple_tiktok_state';
const YOUTUBE_STATE_COOKIE = 'simple_youtube_state';
const SESSION_SECRET = asString(env.SESSION_SECRET);

// ── Web Push (VAPID) ──────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hola@simpleplataforma.app';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const AUTH_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15;
const authCookieSameSite = (() => {
    const raw = asString(env.AUTH_COOKIE_SAMESITE).toLowerCase();
    if (raw === 'strict') return 'Strict' as const;
    if (raw === 'none') return 'None' as const;
    if (raw === 'lax') return 'Lax' as const;
    return isProduction ? 'None' as const : 'Lax' as const;
})();
const authCookieSecure = isProduction || authCookieSameSite === 'None';

if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
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

async function getListingBySlug(slugLike: string): Promise<ListingRecord | null> {
    const slug = extractListingSlugCandidate(slugLike);
    if (!slug) return null;

    const cached = Array.from(listingsById.values()).find((item) => item.href.split('/').filter(Boolean).at(-1) === slug);
    if (cached) return cached;

    const result = await db.select().from(listings).where(eq(listings.hrefSlug, slug)).limit(1);
    if (result.length === 0) return null;
    return upsertListingCache(mapListingRowToRecord(result[0]));
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

function syncFollowsCache(userId: string, records: FollowRecord[]): void {
    followsByUser.set(userId, records);
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

// Property/vehicle valuation feeds — modules/valuation/property-feeds.ts, modules/vehicle-valuation/
configurePropertyValuationFeeds({
    countInternalPropiedadesListings: () => Array.from(listingsById.values()).filter((item) => item.vertical === 'propiedades').length,
});
configureVehicleValuationFeeds({
    countInternalAutosListings: () => Array.from(listingsById.values()).filter((item) => item.vertical === 'autos').length,
});
configurePropertyValuationEstimate({
    getInternalListings: () => Array.from(listingsById.values()),
});
configureVehicleValuationEstimate({
    getInternalListings: () => Array.from(listingsById.values()),
});

// Boost constants moved to modules/boost/types.ts
import { MAX_BOOST_SLOTS_PER_SECTION } from './modules/boost/types.js';
import { boostListingsSeed } from './modules/boost/service.js';
// Advertising constants moved to modules/advertising/types.ts
// Subscription plans moved to modules/advertising/types.ts
// Boost functions moved to modules/boost/service.ts
// Advertising functions moved to modules/advertising/service.ts

const {
    getPaidSubscriptionPlan,
    getActiveSubscriptionsForUser,
    getCurrentSubscription,
    getEffectivePlanId,
    getDefaultPublicProfileAccountKind,
    getCurrentPlanLabel,
    getInstagramRequiredPlanIds,
    userCanUsePublicProfile,
    userCanUseInstagram,
    upsertActiveSubscription,
    cancelActiveSubscriptionForUser,
    makeSubscriptionId,
    formatPlanLimit,
} = createSubscriptionAccess({ activeSubscriptionsByUser });

function getMarketplaceEffectivePlanId(user: AppUser, vertical: VerticalType): SubscriptionPlanId {
    if (user.role === 'superadmin') return 'enterprise';
    return getEffectivePlanId(user, vertical);
}

function marketplaceUserCanUsePublicProfile(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return getEffectivePlanId(user, vertical) !== 'free';
}

const processedMercadoPagoWebhookPaymentIds = new Set<string>();
const processedMercadoPagoWebhookPreapprovalIds = new Set<string>();

function getDefaultPublicProfileAddress(userId: string): AddressBookEntry | null {
    const entries = addressBookByUser.get(userId) ?? [];
    if (entries.length === 0) return null;
    return entries.find((item) => item.isDefault) ?? entries[0] ?? null;
}

function getAddressBookEntryById(userId: string, addressId: string): AddressBookEntry | null {
    const entries = addressBookByUser.get(userId) ?? [];
    return entries.find((item) => item.id === addressId) ?? null;
}

function instagramAccountKey(userId: string, vertical: VerticalType): string {
    return `${userId}:${vertical}`;
}

const mapListingRowToRecord = createMapListingRowToRecord(() => 0);

function upsertListingCache(record: ListingRecord): ListingRecord {
    listingsById.set(record.id, record);
    return record;
}

function makeAddressBookId(): string {
    return `addr-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
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

const listFeaturedBoosted = createListFeaturedBoosted({
    getAllBoostOrdersNormalized,
    getBoostListingById: (vertical, listingId) => getBoostListingById(vertical as VerticalType, listingId),
    getUserById,
    listingsById,
    extractListingMediaUrls,
    buildLocationPublicLabel: (locationData) =>
        buildLocationPublicLabel(locationData as Parameters<typeof buildLocationPublicLabel>[0]),
    humanizePublicLocationFallback,
    sanitizeUser: (user) => sanitizeUser(user as AppUser),
    usersById,
    toPublicMediaUrl,
    getPublishedSellerProfile: (userId, vertical) => {
        const profile = getPublishedSellerProfile(userId, vertical as VerticalType);
        if (!profile) return null;
        return { avatarImageUrl: profile.avatarImageUrl ?? null };
    },
    boostListingsSeed,
});

function sanitizeUser(user: AppUser): PublicUser {
    const runtimeUser = applyRuntimeRole(user);
    return {
        id: runtimeUser.id,
        email: runtimeUser.email,
        name: runtimeUser.name,
        phone: runtimeUser.phone ?? null,
        emailNotifyInvitations: runtimeUser.emailNotifyInvitations ?? true,
        emailNotifyRequests: runtimeUser.emailNotifyRequests ?? true,
        emailNotifyAgenda: runtimeUser.emailNotifyAgenda ?? true,
        emailNotifyAccount: runtimeUser.emailNotifyAccount ?? true,
        inAppNotificationsEnabled: runtimeUser.inAppNotificationsEnabled ?? true,
        pendingEmail: runtimeUser.pendingEmail ?? null,
        role: runtimeUser.role,
        status: runtimeUser.status,
        primaryVertical: runtimeUser.primaryVertical ?? null,
        signupApp: runtimeUser.signupApp ?? null,
        signupOrigin: runtimeUser.signupOrigin ?? null,
        avatar: resolveAccessibleStoredMediaUrl(runtimeUser.avatar) ?? undefined,
        provider: runtimeUser.provider,
        hasPassword: Boolean(runtimeUser.passwordHash),
        lastLoginAt: runtimeUser.lastLoginAt ?? null,
        primaryAccountId: runtimeUser.primaryAccountId ?? defaultAccountIdByUserId.get(runtimeUser.id) ?? null,
        timezone: runtimeUser.timezone ?? 'America/Santiago',
        ...publicResidenceFromUser(runtimeUser as Record<string, unknown>),
    };
}

function localDevForcesSuperadmin(): boolean {
    /** Solo en development explícito: evita elevar roles en test/staging/production. */
    return env.NODE_ENV === 'development' && process.env.LOCAL_DEV_FORCE_SUPERADMIN === 'true';
}

function applyRuntimeRole(user: AppUser): AppUser {
    if (!localDevForcesSuperadmin()) return user;
    if (user.role === 'superadmin') return user;
    return {
        ...user,
        role: 'superadmin',
    };
}

const {
    getInstagramAccount,
    getInstagramPublicationsForUser,
    instagramAccountToResponse,
    instagramPublicationToResponse,
    upsertInstagramAccountRecord,
    updateInstagramAccountSettings,
    disconnectInstagramAccount,
    createInstagramPublicationRecord,
    getLatestInstagramPublicationForListing,
} = createInstagramAccountStore({
    instagramAccountByUserVertical,
    instagramPublicationsByUser,
    getPrimaryAccountIdForUser: async (userId) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
});

const {
    getTikTokAccount,
    tiktokAccountToResponse,
    upsertTikTokAccountRecord,
    updateTikTokAccountRecord,
    disconnectTikTokAccount,
} = createTikTokAccountStore({
    tiktokAccountByUserVertical,
    getPrimaryAccountIdForUser: async (userId) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
});

const {
    getYouTubeAccount,
    youtubeAccountToResponse,
    upsertYouTubeAccountRecord,
    updateYouTubeAccountRecord,
    disconnectYouTubeAccount,
} = createYouTubeAccountStore({
    youtubeAccountByUserVertical,
    getPrimaryAccountIdForUser: async (userId) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
});

const refreshInstagramAccountIfNeeded = (account: InstagramAccountRecord) =>
    refreshInstagramAccountToken(account, updateInstagramAccountSettings);

const {
    getAddressBookEntries: getAddressBookEntriesFromDb,
    upsertAddressBookEntry: upsertAddressBookEntryInDb,
    deleteAddressBookEntry: deleteAddressBookEntryInDb,
} = createAddressBookService(getPrimaryAccountIdForUser);

async function getAddressBookEntries(
    userId: string,
    scope?: import('./lib/domain-types.js').AddressBookScope,
    vertical?: import('./lib/domain-types.js').AddressBookBusinessVertical,
) {
    const items = await getAddressBookEntriesFromDb(userId, scope, vertical);
    if (!scope) {
        addressBookByUser.set(userId, items);
    } else {
        const current = addressBookByUser.get(userId) ?? [];
        const other = current.filter((entry) => {
            if (entry.scope !== scope) return true;
            if (scope === 'business' && vertical) {
                return entry.vertical !== vertical;
            }
            return false;
        });
        addressBookByUser.set(userId, [...other, ...items]);
    }
    return items;
}

async function upsertAddressBookEntry(
    userId: string,
    input: Parameters<typeof upsertAddressBookEntryInDb>[1],
    existingId?: string,
) {
    const items = await upsertAddressBookEntryInDb(userId, input, existingId);
    await refreshAddressBookCacheForUser(userId);
    return items;
}

async function deleteAddressBookEntry(userId: string, addressId: string) {
    const items = await deleteAddressBookEntryInDb(userId, addressId);
    await refreshAddressBookCacheForUser(userId);
    return items;
}

async function refreshAddressBookCacheForUser(userId: string): Promise<void> {
    const items = await getAddressBookEntriesFromDb(userId);
    addressBookByUser.set(userId, items);
}

function mapUserRowToAppUser(user: typeof users.$inferSelect): AppUser {
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash ?? undefined,
        name: user.name,
        phone: user.phone ?? null,
        emailNotifyInvitations: user.emailNotifyInvitations ?? true,
        emailNotifyRequests: user.emailNotifyRequests ?? true,
        emailNotifyAgenda: user.emailNotifyAgenda ?? true,
        emailNotifyAccount: user.emailNotifyAccount ?? true,
        inAppNotificationsEnabled: user.inAppNotificationsEnabled ?? true,
        pendingEmail: user.pendingEmail ?? null,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        primaryVertical: (user.primaryVertical as VerticalType | null | undefined) ?? null,
        signupApp: user.signupApp ?? null,
        signupOrigin: user.signupOrigin ?? null,
        avatar: user.avatarUrl ?? undefined,
        provider: user.provider ?? undefined,
        providerId: user.providerId ?? undefined,
        lastLoginAt: user.lastLoginAt ?? null,
        primaryAccountId: defaultAccountIdByUserId.get(user.id) ?? null,
        timezone: user.timezone ?? 'America/Santiago',
        dstEnabled: user.dstEnabled ?? false,
        residenceCountryCode: user.residenceCountryCode ?? 'CL',
        residenceRegionId: user.residenceRegionId ?? null,
        residenceRegionName: user.residenceRegionName ?? null,
        residenceLocalityId: user.residenceLocalityId ?? null,
        residenceLocalityName: user.residenceLocalityName ?? null,
    };
}

function getUserByEmail(email: string): Promise<AppUser | undefined> {
    return fetchUserByEmail(email, mapUserRowToAppUser);
}

function getClientIdentifier(c: Context): string {
    const forwarded = asString(c.req.header('x-forwarded-for'));
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
    return asString(c.req.header('x-real-ip')) || 'unknown';
}

function safeEqualStrings(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
}

const defaultOrigin = defaultCorsOrigin;

function resolveBrowserOrigin(c: Context): string | null {
    return resolveBrowserOriginFromLib(c, { isProduction, defaultOrigin });
}

function sanitizeBrowserReturnUrl(rawReturnUrl: string, fallbackOrigin: string): string {
    return sanitizeBrowserReturnUrlFromLib(rawReturnUrl, fallbackOrigin, { isProduction });
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

type MessageVertical = VerticalType | 'serenatas';

function parseMessageVertical(raw: string | undefined): MessageVertical {
    if (raw === 'propiedades') return 'propiedades';
    if (raw === 'agenda') return 'agenda';
    if (raw === 'serenatas') return 'serenatas';
    return 'autos';
}

function parseInstagramStateFromCookie(value: string) {
    return parseInstagramStatePayload(value, { asString, parseVertical });
}

function getUrlPathSegment(url: string, fromEnd = 1): string {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments.at(-fromEnd) ?? '';
}

const {
    extractListingSummary,
    isPublicListingVisible,
    matchesListingSlug,
    listingToPublicResponse,
} = createListingPublicPresent({
    toPublicMediaUrl,
    publicSectionLabel,
    buildLocationPublicLabel: (locationData) =>
        buildLocationPublicLabel(locationData as Parameters<typeof buildLocationPublicLabel>[0]),
    humanizePublicLocationFallback,
    listingAgeDays,
    formatAgo,
    usernameFromName,
    usersById,
    getPublishedSellerProfile: (userId, vertical) => {
        const profile = getPublishedSellerProfile(userId, vertical as VerticalType);
        if (!profile) return null;
        return {
            displayName: profile.displayName,
            slug: profile.slug,
            avatarImageUrl: profile.avatarImageUrl ?? null,
        };
    },
});

const upsertBoostListingFromListing = createBoostListingSeedSync({
    boostListingsSeed,
    extractListingSummary: (listing) => extractListingSummary(listing as ListingRecord),
    extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
});

const messageDeps = createMessageServiceDeps({ listingsById, usersById });

const {
    messageDeps: messageServiceDeps,
    messageThreadToResponse,
    messageEntryToResponse,
    buildMessageThreadNotification,
    getMessageThreadById,
    getMessageThreadByListingAndBuyer,
    listMessageThreadsForUser,
    listMessageEntries,
    createMessageThread,
    createMessageEntry,
    touchMessageThreadAfterIncomingMessage,
    markMessageThreadRead,
    updateMessageThreadViewerState,
    isThreadParticipant,
} = createMessageRuntimeBindings(messageDeps);

function buildSocialFeedClips(vertical: VerticalType, section: string | null | undefined): FeedClip[] {
    return buildSocialFeedClipsFromRecords(
        {
            listingsById,
            getActiveFeaturedListingIds: (feedVertical) =>
                new Set(
                    getAllBoostOrdersNormalized()
                        .filter((order) => order.vertical === feedVertical && order.status === 'active')
                        .map((order) => order.listingId),
                ),
            isPublicListingVisible: (record) => isPublicListingVisible(record as ListingRecord),
            extractListingMediaUrls: (record) => extractListingMediaUrls(record as ListingRecord),
            publicSectionLabel: (feedSection) => publicSectionLabel(feedSection as BoostSection),
        },
        vertical,
        section ?? undefined,
    ) as FeedClip[];
}

const {
    buildInstagramCaption,
    buildInstagramListingData,
    getInstagramBasePublicOrigin,
    buildListingPublicUrlForInstagram,
    prepareInstagramImageUrl,
    publishListingToInstagram,
    maybeAutoPublishListing,
} = createInstagramPublishWiring(
    {
        extractListingSummary: (listing) => extractListingSummary(listing as ListingRecord) as ReturnType<typeof extractListingSummary>,
        extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
        parseNumberFromString,
        listingDefaultHref: (vertical, listingId) => listingDefaultHref(vertical as VerticalType, listingId),
        extractStorageObjectKey,
    },
    {
        getInstagramAccount,
        userCanUseInstagram: (user, vertical) =>
            userCanUseInstagram(user as AppUser, vertical as VerticalType),
        getLatestInstagramPublicationForListing,
        instagramPublicationToResponse,
        refreshInstagramAccountIfNeeded,
        extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
        extractListingVideoUrl: (listing) => extractListingVideoUrl(listing as ListingRecord),
        logDebug,
        createInstagramPublicationRecord,
        updateInstagramAccountSettings,
    },
);

const {
    getSocialPublicationsForUser,
    getLatestSocialPublicationForListing,
    socialPublicationToResponse,
    createSocialPublicationRecord,
} = createSocialPublicationStore({
    socialPublicationsByUser,
    getPrimaryAccountIdForUser: async (userId) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
});

const publishListingToFacebookPage = createPublishListingToFacebookPage({
    getInstagramAccount,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getLatestSocialPublicationForListing,
    socialPublicationToResponse,
    buildListingPublicUrl: buildListingPublicUrlForInstagram,
    extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
    extractListingVideoUrl: (listing) => extractListingVideoUrl(listing as ListingRecord),
    buildListingCaption: buildInstagramCaption,
    createSocialPublicationRecord,
    updateInstagramAccountSettings,
});

const publishListingToTikTok = createPublishListingToTikTok({
    getTikTokAccount,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getLatestSocialPublicationForListing,
    socialPublicationToResponse,
    buildListingPublicUrl: buildListingPublicUrlForInstagram,
    extractListingVideoUrl: (listing) => extractListingVideoUrl(listing as ListingRecord),
    buildListingCaption: buildInstagramCaption,
    createSocialPublicationRecord,
    updateTikTokAccountRecord,
});

const publishListingToYouTube = createPublishListingToYouTube({
    getYouTubeAccount,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getLatestSocialPublicationForListing,
    socialPublicationToResponse,
    buildListingPublicUrl: buildListingPublicUrlForInstagram,
    extractListingVideoUrl: (listing) => extractListingVideoUrl(listing as ListingRecord),
    buildListingCaption: buildInstagramCaption,
    createSocialPublicationRecord,
    updateYouTubeAccountRecord,
});

const publishListingToSocialHub = createSocialHubPublisher({
    extractListingVideoUrl: (listing) => extractListingVideoUrl(listing as ListingRecord),
    publishListingToInstagram,
    publishListingToFacebookPage,
    publishListingToTikTok,
    publishListingToYouTube,
});

async function generateListingReelForUser(input: {
    user: { id: string; role?: string };
    listing: ListingRecord;
    replaceExisting?: boolean;
}) {
    const existingVideo = extractListingVideoUrl(input.listing);
    if (existingVideo && !input.replaceExisting) {
        throw new Error('Este aviso ya tiene video. Activa reemplazar para generar uno nuevo desde las fotos.');
    }

    const result = await generateListingReelVideo({
        title: input.listing.title,
        price: input.listing.price,
        imageUrls: extractListingMediaUrls(input.listing),
        upload: async (file, fileName) => {
            const storage = getStorageProvider();
            const uploadResult = await storage.upload({
                file: new Blob([new Uint8Array(file)], { type: 'video/mp4' }),
                fileName,
                mimeType: 'video/mp4',
                fileType: 'video',
                userId: input.user.id,
                listingId: input.listing.id,
            });
            const publicUrl = asString(uploadResult?.publicUrl) || asString(uploadResult?.url);
            if (!publicUrl) throw new Error('No se pudo subir el video generado a almacenamiento.');
            return { publicUrl };
        },
    });

    const updated = attachGeneratedVideoToListing(input.listing, result.publicUrl, result.sizeBytes);
    const saved = await saveListingRecord(updated as Parameters<typeof saveListingRecord>[0]);
    upsertBoostListingFromListing(saved as Parameters<typeof upsertBoostListingFromListing>[0]);
    return result;
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

const operatorServicesDbDeps = {
    db,
    dbHelpers: { eq, and, asc, desc, ilike, or, sql },
    tables: {
        publicProfiles,
        marketplaceOperatorServices,
        marketplaceOperatorServicePacks,
        marketplaceOperatorServicePromotions,
    },
};

const {
    buildEditablePublicProfile,
    getPublishedSellerProfile,
    buildPublicProfileResponse,
    buildAccountPublicProfileResponse,
} = createPublicProfilePresentation({
    usernameFromName,
    getDefaultPublicProfileAccountKind: (user, vertical) => getDefaultPublicProfileAccountKind(user as AppUser, vertical),
    getDefaultPublicProfileAddress,
    getAddressBookEntryById,
    getPublicProfileRecord,
    getEffectivePlanId: (user, vertical) => getMarketplaceEffectivePlanId(user as AppUser, vertical),
    getCurrentPlanLabel: (user, vertical) => getCurrentPlanLabel(user as AppUser, vertical),
    userCanUsePublicProfile: (user, vertical) => marketplaceUserCanUsePublicProfile(user as AppUser, vertical),
    countFollowers,
    extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
    isPublicListingVisible: (listing) => isPublicListingVisible(listing as ListingRecord),
    listingToPublicResponse: (listing) => listingToPublicResponse(listing as ListingRecord),
    listingsById: listingsById as Map<string, {
        ownerId: string;
        vertical: VerticalType;
        updatedAt: number;
        views: number;
        favs: number;
        status: string;
        rawData?: unknown;
    }>,
    fetchPublishedOperatorCatalog: (profileId) => fetchPublishedOperatorCatalog(operatorServicesDbDeps, profileId),
});

const permanentlyDeleteUser = createPermanentlyDeleteUser({
    db,
    tables: {
        agendaProfessionalProfiles,
        listings,
        messageThreads,
        messageEntries,
        instagramAccounts,
        instagramPublications,
        socialPublications,
        tiktokAccounts,
        youtubeAccounts,
        savedListings,
        boostOrders,
        adCampaigns,
        listingDrafts,
        follows,
        publicProfiles,
        passwordResetTokens,
        emailVerificationTokens,
        accounts,
        accountUsers,
        agendaClients,
        agendaPacks,
        agendaClientTagAssignments,
        agendaClientAttachments,
        agendaClientPacks,
        agendaGroupAttendees,
        agendaNpsResponses,
        agendaSessionNotes,
        agendaPayments,
        agendaAppointments,
        agendaReferrals,
        agendaPromotions,
        agendaBlockedSlots,
        agendaAvailabilityRules,
        agendaLocations,
        agendaServices,
        agendaAuditEvents,
        agendaNotificationEvents,
        pushSubscriptions,
        users,
        agendaClientTags,
        addressBook,
        paymentOrders,
        subscriptions,
        mortgageRates,
        userNotificationLog,
        platformNotifications,
        serenataProviderGroupMemberInvites,
        serenataGroupInvites,
        serenataProviderGroupApplications,
        serenataProviderGroups,
        serenataGroupServices,
        serenataAvailabilityRules,
        serenataProviderGroupBlockedSlots,
        serenataSavedProviderGroups,
        serenataProviderGroupMembers,
        serenatas,
        serenataOffers,
        serenataGroupMembers,
        serenataMusicians,
        serenataClients,
        serenataOwners,
        serenataGroups,
    },
    extractAllListingMediaUrls,
    deleteStoredMediaUrls,
    instagramAccountKey: (userId, vertical) => instagramAccountKey(userId, vertical as VerticalType),
    publicProfileUserVerticalKey: (userId, vertical) => publicProfileUserVerticalKey(userId, vertical as VerticalType),
    caches: {
        usersById,
        savedByUser,
        followsByUser,
        boostOrdersByUser,
        addressBookByUser,
        paymentOrdersByUser,
        activeSubscriptionsByUser,
        instagramPublicationsByUser,
        socialPublicationsByUser,
        publicProfilesByUserVertical,
        instagramAccountByUserVertical,
        tiktokAccountByUserVertical,
        youtubeAccountByUserVertical,
        listingsById,
        publicProfilesByVerticalSlug,
    },
});

const {
    listAdCampaignRecords,
    getAdCampaignRecordById,
    getAdCampaignRecordForUser,
} = createAdCampaignStore(db, adCampaigns);

const sendPushToUser = createAgendaPushSender({
    db,
    pushSubscriptions,
    webpush,
    vapidPublicKey: VAPID_PUBLIC_KEY,
    vapidPrivateKey: VAPID_PRIVATE_KEY,
});

const syncToGoogleCalendar = createAgendaGoogleCalendarSync({ db, agendaAppointments });

const ensureNpsForAppointment = createEnsureNpsForAppointment({ db, agendaNpsResponses });

const ensureAgendaProfile = createEnsureAgendaProfile({ ensurePrimaryAccountForUser });

const isValidSlug = isValidAgendaSlug;
const RESERVED_SLUGS = AGENDA_RESERVED_SLUGS;

const getEnvStatus = () => buildEnvStatusSnapshot();

const {
    authUser,
    requireVerifiedSession,
    setSession,
    clearSession,
    setOAuthState,
    consumeOAuthState,
    setInstagramState,
    consumeInstagramState,
} = createAuthSessionRuntime({
    sessionCookie: SESSION_COOKIE,
    oauthStateCookie: OAUTH_STATE_COOKIE,
    instagramStateCookie: INSTAGRAM_STATE_COOKIE,
    sessionSecret: SESSION_SECRET,
    authCookieSameSite,
    authCookieSecure,
    isProduction,
    getUserById,
    canAuthenticateUser,
    ensurePrimaryAccountForUser,
    applyRuntimeRole,
});

export const loadDataFromDB = createStartupDataLoader({
    maps: {
        usersById,
        accountsById,
        accountUsersByUserId,
        defaultAccountIdByUserId,
        savedByUser,
        followsByUser,
        boostOrdersByUser,
        listingsById,
        addressBookByUser,
        paymentOrdersByUser,
        instagramAccountByUserVertical,
        tiktokAccountByUserVertical,
        youtubeAccountByUserVertical,
        instagramPublicationsByUser,
        socialPublicationsByUser,
        publicProfilesByUserVertical,
        publicProfilesByVerticalSlug,
        activeSubscriptionsByUser,
    },
    boostListingsSeed,
    mapUserRowToAppUser,
    mapAccountRow,
    mapAccountUserRow,
    upsertAccountUserCache,
    upsertActiveSubscription,
    mapPublicProfileRow,
    upsertPublicProfileCache,
    mapListingRowToRecord,
    upsertBoostListingFromListing,
    instagramAccountKey,
    mapInstagramAccountRow,
    mapTikTokAccountRow,
    mapYouTubeAccountRow,
    mapInstagramPublicationRow,
    mapSocialPublicationRow,
});

export const app = new Hono();

// CORS middleware - MUST be applied FIRST before any other middleware or routes
app.use(
    '*',
    cors({
        origin: (origin) => {
            if (!origin) return defaultOrigin;
            return allowedOrigins.has(origin) ? origin : '';
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
    if (error instanceof HTTPException) {
        return error.getResponse();
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    logDebug(`[GLOBAL ERROR] ${c.req.method} ${c.req.path} - ${errMsg}\nStack: ${stack}`);
    console.error('[simple-api] unhandled request error', error);
    return c.json(
        {
            ok: false,
            error: 'Internal server error',
            details: !isProduction ? errMsg : undefined,
        },
        500
    );
});

app.route('/', createSystemRouter({
    serviceName: 'simple-v2-api',
    apiRootDir: API_ROOT_DIR,
    env: {
        NODE_ENV: env.NODE_ENV,
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        LOCAL_STORAGE_URL: process.env.LOCAL_STORAGE_URL,
        CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    },
}));

async function getUserPendingEmail(userId: string): Promise<string | null> {
    const rows = await db
        .select({ pendingEmail: users.pendingEmail })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    return rows[0]?.pendingEmail ?? null;
}

async function applyUserEmailChange(userId: string, email: string): Promise<void> {
    const now = new Date();
    await db.update(users).set({
        email: email.trim().toLowerCase(),
        pendingEmail: null,
        updatedAt: now,
    }).where(eq(users.id, userId));
    const cached = usersById.get(userId);
    if (cached) {
        usersById.set(userId, { ...cached, email: email.trim().toLowerCase() });
    }
}

function getFreeBoostQuota(user: AppUser, vertical: VerticalType) {
    const sub = getCurrentSubscription(user.id, vertical);
    const planId = (sub?.planId ?? 'free') as Exclude<SubscriptionPlanId, 'free'> | 'free';
    return resolveFreeBoostQuota(user, vertical, planId);
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
        userPlatformAccess,
        passwordResetTokens,
        emailVerificationTokens,
    },
    bcrypt,
    getUserByEmail,
    getUserById,
    getUserPendingEmail,
    applyUserEmailChange,
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
    passwordChangeSchema,
    emailVerificationRequestSchema,
    emailVerificationConfirmSchema,
    permanentlyDeleteUser,
    countActiveSuperadminUsers,
}));

app.use('/api/account/*', requireVerifiedSession);
app.use('/api/accounts/*', requireVerifiedSession);
app.use('/api/panel/*', requireVerifiedSession);
app.use('/api/messages/*', requireVerifiedSession);
app.use('/api/listing-draft', requireVerifiedSession);
app.use('/api/listings', requireVerifiedSession);
app.use('/api/listings/*', requireVerifiedSession);

const {
    insertListingRecord,
    saveListingRecord,
    deleteListingRecord,
    getListingDraftRecord,
    upsertListingDraftRecord,
    deleteListingDraftRecord,
} = createListingPersist({
    listingsById,
    listingIdsByUser,
    getPrimaryAccountIdForUser: async (userId) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
    getListingById,
    mapListingRowToRecord,
    listingDefaultHref,
    toPublicMediaUrl,
} as Parameters<typeof createListingPersist>[0]);

const {
    getPaymentOrdersForUser,
    upsertPaymentOrder,
    updatePaymentOrder,
    makePaymentOrderId,
} = createPaymentOrderStore({
    paymentOrdersByUser,
    loadPaymentOrderFromDb,
});

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
    getListingByIdFromDb: async (listingId: string) => {
        const row = await fetchListingRowById(listingId);
        if (!row) return null;
        return upsertListingCache(mapListingRowToRecord(row));
    },
    listListingsFromDb: async (
        user: { id: string; role: string },
        vertical: unknown,
        mine: boolean,
    ) => {
        const parsedVertical = parseVertical(typeof vertical === 'string' ? vertical : undefined);
        const rows = await fetchListingRowsForPanel({
            vertical: parsedVertical,
            ownerId: user.id,
            includeAllInVertical: !mine && user.role === 'superadmin',
        });
        return rows.map((row) => upsertListingCache(mapListingRowToRecord(row)));
    },
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
    generateListingReel: generateListingReelForUser,
    isReelGeneratorAvailable,
    checkListingCreationAllowed: (user: { id: string; role?: string }, vertical: unknown) => {
        if (user.role === 'superadmin') return null;
        const parsedVertical = parseVertical(typeof vertical === 'string' ? vertical : undefined);
        const planId = getMarketplaceEffectivePlanId(user as AppUser, parsedVertical);
        const plan = getSubscriptionPlans(parsedVertical).find((item) => item.id === planId);
        const count = countUserListingsForVertical(listingIdsByUser, listingsById, user.id, parsedVertical);
        return getListingLimitError(plan, count);
    },
    schemas: {
        createListingSchema,
        updateListingSchema,
        updateListingStatusSchema,
        publishListingPortalSchema,
        listingDraftWriteSchema,
        generateListingReelSchema,
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

app.route('/api/valuation', createValuationRouter());

app.route('/api/vehicle-valuation', createVehicleValuationRouter());

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
    requireVerifiedSession,
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
    parseMercadoPagoPaymentStatus: parseMpPaymentStatus,
    parseMercadoPagoPreapprovalStatus: parseMpPreapprovalStatus,
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
    tables2: { agendaProfessionalProfiles, serenataOwners, publicProfiles },
    schemas: {
        createCheckoutSchema,
        confirmCheckoutSchema,
    },
    serenataPayments: {
        getTarget: getSerenataPaymentTarget,
        attachOrder: attachSerenataPaymentOrder,
        applyPaid: publishPaidSerenataToOwners,
        markFailed: markSerenataPaymentFailed,
    },
    findPaymentOrderByIdFromDb,
    loadPaymentOrderFromDb,
    listPaymentOrdersForUserFromDb,
    getPrimaryAccountIdForUser,
    cancelActiveSubscriptionForUser,
    processedMercadoPagoWebhookPaymentIds,
    processedMercadoPagoWebhookPreapprovalIds,
}));
app.use('/api/advertising/campaigns', requireVerifiedSession);
app.use('/api/advertising/campaigns/*', requireVerifiedSession);
app.use('/api/integrations/instagram', requireVerifiedSession);
app.use('/api/integrations/instagram/*', requireVerifiedSession);
app.use('/api/integrations/social', requireVerifiedSession);
app.use('/api/integrations/social/*', requireVerifiedSession);

app.route('/api/admin', createAdminRouter({
    authUser,
    db,
    eq,
    and,
    or,
    desc,
    asc,
    sql,
    isAdminRole,
    isAdminForVertical,
    parseVertical,
    getPrimaryAccountIdForUser,
    ensurePrimaryAccountForUser,
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
        users,
        agendaProfessionalProfiles,
        subscriptions,
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
    getUserByEmail,
    tables: {
        accounts,
        users,
        addressBook,
    },
    and,
    upsertAccountCache,
    resolveBrowserOrigin,
    isAuthEmailConfigured,
    issueEmailVerification,
    getClientIdentifier,
    consumeRateLimit,
    AUTH_RATE_LIMIT_WINDOW_MS,
    emailChangeRequestSchema,
}));

const ensureMarketplaceDraftProfileForUser = async (user: AppUser, vertical: VerticalType) => {
    if (!isMarketplaceVertical(vertical)) return;
    if (getPublicProfileRecord(user.id, vertical)) return;

    const editable = buildEditablePublicProfile(user, vertical);
    const now = new Date();
    try {
        const rows = await db.insert(publicProfiles).values({
            accountId: await getPrimaryAccountIdForUser(user.id),
            userId: user.id,
            vertical,
            slug: editable.slug,
            isPublished: false,
            accountKind: editable.accountKind,
            operatorSubtype: editable.operatorSubtype,
            operatorSubtypeCustom: editable.operatorSubtypeCustom,
            displayName: editable.displayName,
            headline: editable.headline,
            bio: editable.bio,
            companyName: editable.companyName,
            website: editable.website,
            publicEmail: editable.publicEmail,
            publicPhone: editable.publicPhone,
            publicWhatsapp: editable.publicWhatsapp,
            addressLine: editable.addressLine,
            city: editable.city,
            region: editable.region,
            countryCode: editable.countryCode,
            regionId: editable.regionId,
            localityId: editable.localityId,
            timezone: editable.timezone ?? 'America/Santiago',
            coverImageUrl: editable.coverImageUrl,
            avatarImageUrl: editable.avatarImageUrl,
            socialLinks: editable.socialLinks,
            businessHours: editable.businessHours,
            specialties: editable.specialties,
            scheduleNote: editable.scheduleNote,
            alwaysOpen: editable.alwaysOpen,
            weeklyBreakStart: editable.weeklyBreakStart ?? null,
            weeklyBreakEnd: editable.weeklyBreakEnd ?? null,
            scheduleBlockedSlots: editable.scheduleBlockedSlots ?? [],
            createdAt: now,
            updatedAt: now,
        }).returning();
        if (rows[0]) {
            upsertPublicProfileCache(mapPublicProfileRow(rows[0]));
        }
    } catch (error) {
        console.error('[marketplace] draft profile bootstrap failed:', error);
    }
};

app.route('/api/account', createAccountRouter({
    authUser,
    parseVertical,
    updateProfileSchema,
    publicProfileWriteSchema,
    publicProfilePaymentMethodsWriteSchema,
    publicProfileBookingTermsWriteSchema,
    generateBookingPoliciesSchema,
    db,
    tables: { users, publicProfiles, addressBook },
    dbHelpers: { eq, and },
    mapUserRowToAppUser,
    usersById,
    sanitizeUser,
    buildAccountPublicProfileResponse,
    normalizePublicProfileSlug,
    isValidPublicProfileSlug,
    publicProfilesByVerticalSlug,
    publicProfileVerticalSlugKey,
    userCanUsePublicProfile: marketplaceUserCanUsePublicProfile,
    getPublicProfileRecord,
    ensureMarketplaceDraftProfileForUser,
    getEffectivePlanId: (user, vertical) => getEffectivePlanId(user as AppUser, vertical),
    PUBLIC_PROFILE_DAYS,
    normalizePublicProfileSocialLinks,
    normalizeExternalUrlInput,
    toNullIfEmpty,
    upsertPublicProfileCache,
    mapPublicProfileRow,
    getPrimaryAccountIdForUser,
    refreshAddressBookCacheForUser,
    randomUUID,
    buildMarketplaceOperatorAnalytics: (userId, vertical) => buildMarketplaceOperatorAnalytics(userId, vertical, {
        listingsById,
        listingIdsByUser,
        getPublicProfileRecord,
        countFollowers,
        getDefaultDisplayName: (id) => usersById.get(id)?.name ?? 'Tu cuenta',
    }),
    operatorServices: {
        db,
        dbHelpers: { eq, and, asc, desc, ilike, or, sql },
        tables: {
            publicProfiles,
            marketplaceOperatorServices,
            marketplaceOperatorServicePacks,
            marketplaceOperatorServicePromotions,
        },
        getPublicProfileRecord,
        ensureMarketplaceDraftProfileForUser: async (user, vertical) => ensureMarketplaceDraftProfileForUser(user as AppUser, vertical),
    },
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

app.route('/api/messages', createMessagesRouter({
    authUser,
    parseVertical: parseMessageVertical,
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
    updateMessageThreadViewerState,
    createMessageEntry,
    touchMessageThreadAfterIncomingMessage,
    buildMessageThreadNotification,
    messageDeps: messageServiceDeps,
    getListingById,
    isPublicListingVisible,
}));

app.route('/api/panel', createPanelNotificationsRouter({
    authUser,
    parseVertical: parseMessageVertical,
    listMessageThreadsForUser,
    buildMessageThreadNotification,
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
    parseInstagramStatePayload: parseInstagramStateFromCookie,
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

app.route('/api/integrations/social', createSocialHubRouter({
    authUser,
    parseVertical,
    asString,
    asObject,
    listingsById,
    getListingById,
    isInstagramConfigured,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getEffectivePlanId: (user, vertical) => getEffectivePlanId(user as AppUser, vertical as VerticalType),
    getInstagramRequiredPlanIds,
    getInstagramAccount,
    getTikTokAccount,
    getYouTubeAccount,
    resolveBrowserOrigin,
    instagramAccountToResponse: (account) => instagramAccountToResponse(account as InstagramAccountRecord | null),
    getSocialPublicationsForUser,
    socialPublicationToResponse: (item) => socialPublicationToResponse(item as SocialPublicationRecord),
    socialPublishSchema,
    publishListingToSocialHub,
    isTikTokConfigured,
    isYouTubeConfigured,
}));

app.route('/api/integrations/tiktok', createTikTokRouter({
    authUser,
    parseVertical,
    asString,
    resolveBrowserOrigin,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getEffectivePlanId: (user, vertical) => getEffectivePlanId(user as AppUser, vertical as VerticalType),
    getInstagramRequiredPlanIds,
    getTikTokAccount,
    tiktokAccountToResponse: (account) => tiktokAccountToResponse(account as TikTokAccountRecord | null),
    sanitizeBrowserReturnUrl,
    randomBytes,
    defaultOrigin,
    safeEqualStrings,
    getUserById,
    canAuthenticateUser: (user) => canAuthenticateUser(user as AppUser),
    upsertTikTokAccountRecord: (input) => upsertTikTokAccountRecord(input as Parameters<typeof upsertTikTokAccountRecord>[0]),
    disconnectTikTokAccount,
    tiktokStateCookie: TIKTOK_STATE_COOKIE,
    authCookieSameSite,
    authCookieSecure,
}));

app.route('/api/integrations/youtube', createYouTubeRouter({
    authUser,
    parseVertical,
    asString,
    resolveBrowserOrigin,
    userCanUseInstagram: (user, vertical) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType),
    getEffectivePlanId: (user, vertical) => getEffectivePlanId(user as AppUser, vertical as VerticalType),
    getInstagramRequiredPlanIds,
    getYouTubeAccount,
    youtubeAccountToResponse: (account) => youtubeAccountToResponse(account as YouTubeAccountRecord | null),
    sanitizeBrowserReturnUrl,
    randomBytes,
    defaultOrigin,
    safeEqualStrings,
    getUserById,
    canAuthenticateUser: (user) => canAuthenticateUser(user as AppUser),
    upsertYouTubeAccountRecord: (input) => upsertYouTubeAccountRecord(input as Parameters<typeof upsertYouTubeAccountRecord>[0]),
    disconnectYouTubeAccount,
    youtubeStateCookie: YOUTUBE_STATE_COOKIE,
    authCookieSameSite,
    authCookieSecure,
}));

async function userCanConnectMercadoPagoOperator(
    user: AppUser,
    vertical: MercadoPagoOperatorVertical,
): Promise<boolean> {
    if (user.role === 'superadmin') return true;
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(user.id);
        if (!profile) return false;
        return hasAgendaFullAccess(profile, user.role);
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        return userCanUsePublicProfile(user, vertical);
    }
    const plan = await resolveActiveSerenataBillingPlan(user.id);
    if (plan === 'pro') return true;
    const owner = await db.query.serenataOwners.findFirst({
        where: eq(serenataOwners.userId, user.id),
        columns: { trialEndsAt: true },
    });
    return Boolean(owner?.trialEndsAt && owner.trialEndsAt.getTime() >= Date.now());
}

async function getMercadoPagoOperatorPlanId(
    user: AppUser,
    vertical: MercadoPagoOperatorVertical,
): Promise<string> {
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(user.id);
        return profile?.plan ?? 'free';
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        return getEffectivePlanId(user, vertical);
    }
    return await resolveActiveSerenataBillingPlan(user.id);
}

app.route('/api/integrations/mercadopago', createMercadoPagoIntegrationRouter({
    authUser,
    asString,
    resolveBrowserOrigin,
    sanitizeBrowserReturnUrl,
    randomBytes,
    safeEqualStrings,
    getUserById,
    canAuthenticateUser: (user) => canAuthenticateUser(user as AppUser),
    userCanConnectMercadoPago: (user, vertical) => userCanConnectMercadoPagoOperator(user as AppUser, vertical),
    getCurrentPlanId: (user, vertical) => getMercadoPagoOperatorPlanId(user as AppUser, vertical),
    ensureMercadoPagoOperatorTarget: async (userId, vertical) => {
        if (vertical === 'autos' || vertical === 'propiedades') {
            const user = usersById.get(userId);
            if (user) await ensureMarketplaceDraftProfileForUser(user, vertical);
        }
    },
    onMercadoPagoOperatorConnected: async (userId, vertical) => {
        if (vertical !== 'autos' && vertical !== 'propiedades') return;
        const row = await db.query.publicProfiles.findFirst({
            where: and(eq(publicProfiles.userId, userId), eq(publicProfiles.vertical, vertical)),
        });
        if (row) upsertPublicProfileCache(mapPublicProfileRow(row));
    },
    authCookieSameSite,
    authCookieSecure,
}));

app.route('/api/integrations/google-calendar', createGoogleCalendarIntegrationRouter({
    authUser,
    asString,
    resolveBrowserOrigin,
    sanitizeBrowserReturnUrl,
    randomBytes,
    safeEqualStrings,
    getUserById,
    authCookieSameSite,
    authCookieSecure,
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
    isStorageUrl,
    extractStorageObjectKey,
    env: {
        CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    },
}));

app.route('/api/storage', createStorageRouter({
    getStorageProvider,
    env: {
        STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
        CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    },
}));

app.route('/api', createSocialRouter({
    authUser,
    parseVertical,
    db,
    tables: { savedListings, follows },
    dbHelpers: { eq, and },
    savedRecordSchema,
    followToggleSchema,
    getSavedListingsByUser,
    getListingById,
    getFollowSetByVertical,
    getFollowsByUser,
    syncFollowsCache,
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
    getListingBySlug,
    fetchActivePublicListingRowsForMarketplace,
    mapListingRowToRecord: (row) => mapListingRowToRecord(row as ListingRow),
    usersById,
    getPublishedPublicProfileBySlug,
    userCanUsePublicProfile,
    buildPublicProfileResponse,
    searchPublicOperatorCatalog: (input) => searchPublicOperatorCatalog(operatorServicesDbDeps, input),
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

app.use('/api/platform/*', requireVerifiedSession);
app.route('/api/platform', createPlatformRouter({ authUser }));

app.route('/api/serenatas', createSerenatasRouter({
    authUser,
    requireVerifiedSession,
    sanitizeUser: (user) => sanitizeUser(user as AppUser),
    cancelActiveSubscriptionForUser: (userId) => cancelActiveSubscriptionForUser(userId, 'serenatas' as never),
}));

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
            agendaGroupAttendees,
            agendaNpsResponses,
            agendaReferrals,
            agendaNotificationEvents,
            pushSubscriptions,
            users,
        },
        dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        getAgendaProfile,
        ensureAgendaProfile,
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

// Cron jobs moved to modules/agenda/cron.ts
