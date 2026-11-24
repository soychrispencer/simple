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
import { canManageAccountRole } from './modules/accounts/permissions.js';
import { runAccountManagerWrite } from './modules/accounts/write-access.js';
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
import { isMarketplaceLaunchActive, resolveMarketplaceSubscriptionEntitlements } from '@simple/utils';
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
import { normalizeListingHref } from './modules/listings/href-slug.js';
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
    fetchListingRowByHrefSlug,
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
import { buildListingDistribution } from './modules/listings/listing-distribution.js';
import {
    embedStoredListingMetadata,
    extractStoredListingIntegrations,
    isPortalAvailableForVertical,
    stripStoredListingMetadata,
    type ListingPortalSyncRecord,
    type PortalKey,
} from './modules/listings/portals.js';
import { listPaymentOrdersForAccountFromDb, listPaymentOrdersForUserFromDb } from './modules/payments/queries.js';

import { db, pgClient } from './db/index.js';
import { applyPostJournalMigrations } from './db/apply-post-journal-migrations.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq, and, or, desc, asc, gt, lt, gte, lte, isNull, sql, inArray, ilike, type SQL } from 'drizzle-orm';
import {
    users,
    userPlatformAccess,
    accounts,
    accountUsers,
    accountInvitations,
    accountVerticalSettings,
    userVerticalOnboarding,
    accountListingAssignments,
    accountRelationshipAssignments,
    accountRelationshipTasks,
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
    marketplaceOperatorProducts,
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
    agendaAccountVisits,
    serenatas,
    serenataOffers,
    serenataMusicians,
    serenataClients,
    serenataOwners,
    serenataProviderGroups,
    serenataGroupServices,
    serenataProviderGroupMembers,
    serenataRepertoireSongs,
    serenataSongScores,
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
    timelineEvents,
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
    createAgendaPropertyVisitCalendarSync,
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
import { createListingAccessControl } from './modules/listings/access.js';
import { createBoostRouter } from './modules/boost/index.js';
import { insertBoostOrderRow, upsertBoostOrderInCache, mapBoostOrderRow } from './modules/boost/persist.js';
import { getAllBoostOrdersNormalized, getBoostListingById, getBoostOrdersForUser, getBoostOrdersForAccount, isBoostSectionAllowed, getBoostListingsByOwner, parseBoostSection, getSectionsForVertical, getBoostPlans, createBoostOrderRecord, normalizeBoostOrder, countReservedSlots, sectionLabel, inferBoostTargetType } from './modules/boost/service.js';
import { getBoostTargetById, listBoostTargetsForOwner, listBoostTargetsForAccount } from './modules/boost/target-resolvers.js';
import { MARKETPLACE_BOOST_PRICING } from '@simple/utils';
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
import { fetchPublishedOperatorCatalog, getPublicOperatorServiceById, searchPublicOperatorCatalog } from './modules/public-profile/operator-services.js';
import { fetchPublishedOperatorProducts, getPublicOperatorProductById, mountOperatorProductsRoutes, searchPublicOperatorProducts } from './modules/public-profile/operator-products.js';
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
    sendAccountInvitationEmail,
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
    trackListingPortalSchema,
    instagramSettingsSchema,
    instagramPublishPreferencesSchema,
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
import { createAgendaTeamRouter } from './modules/agenda/team-router.js';
import { registerAgendaCronJobs } from './modules/agenda/cron.js';
import { registerSerenatasCronJobs } from './modules/serenatas/cron.js';
import { createAccountRouter } from './modules/public-profile/index.js';
import { createAdvertisingRouter } from './modules/advertising/index.js';
import { getAdvertisingPrice, getAdPaymentStatusFromOrderStatus, normalizeAdCampaigns, getSubscriptionPlans, isValidHttpDestinationUrl, isAdPlacementSectionAllowed } from './modules/advertising/service.js';
import { countAccountListingsForVertical, countUserListingsForVertical } from './modules/listings/listing-plan-limit.js';
import { AD_FORMAT_LABELS, MAX_CAMPAIGNS_TOTAL, MAX_ACTIVE_HERO_CAMPAIGNS } from './modules/advertising/types.js';
import { createMessagesRouter, createPanelNotificationsRouter } from './modules/messages/index.js';
import { getMessageThreadByContext } from './modules/messages/service.js';
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
import { createPartnershipInquiryRouter } from './modules/public/partnership-inquiries.js';
import { createPartnershipInquiryDelivery } from './modules/public/partnership-inquiry-delivery.js';
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
    activeSubscriptionsByAccount,
    activeSubscriptionsByUser,
    addressBookByAccount,
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
    publicProfilesByAccountVertical,
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
    setDefaultAccountForUser,
    removeAccountUserCache,
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
// Local OAuth can return through the shared production API while keeping local
// session cookies independent. The callback API and this API must share this
// signing secret; production defaults to its existing SESSION_SECRET.
const MERCADOPAGO_OAUTH_STATE_SECRET = asString(process.env.MP_OPERATOR_OAUTH_STATE_SECRET) || SESSION_SECRET;

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

    const row = await fetchListingRowByHrefSlug(slugLike);
    if (!row) return null;
    return upsertListingCache(mapListingRowToRecord(row));
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

    return result.map(row => {
        const vertical = row.vertical as VerticalType;
        const listingRecord = {
            id: row.listingId,
            ownerId: row.ownerId,
            vertical,
            section: row.section as BoostSection,
            listingType: row.section as BoostSection,
            title: row.title,
            description: row.description || '',
            price: row.priceLabel || '',
            location: row.location || '',
            href: row.hrefSlug || '',
            status: 'active' as const,
            views: 0,
            favs: 0,
            leads: 0,
            createdAt: row.savedAt.getTime(),
            updatedAt: row.savedAt.getTime(),
            rawData: row.rawData,
            integrations: {},
        };
        const mediaUrls = extractListingMediaUrls(listingRecord);
        const videoUrl = extractListingVideoUrl(listingRecord) || undefined;

        return {
            id: row.listingId,
            href: normalizeListingHref(vertical, row.listingId, row.hrefSlug),
            title: row.title,
            price: row.priceLabel || '',
            image: mediaUrls[0] || undefined,
            images: mediaUrls,
            location: row.location || undefined,
            meta: extractListingSummary(listingRecord),
            badge: publicSectionLabel(row.section as BoostSection),
            section: row.section as BoostSection,
            videoUrl,
            sellerName: row.ownerName,
            sellerMeta: row.ownerEmail,
            savedAt: row.savedAt.getTime(),
        };
    });
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
    return result.map((row) => mapBoostOrderRow(row) as BoostOrder);
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
} = createSubscriptionAccess({
    activeSubscriptionsByUser,
    activeSubscriptionsByAccount,
    defaultAccountIdByUserId,
    accountsById,
});

function getPersonalAccountIdForUser(userId: string): string | null {
    for (const account of accountsById.values()) {
        if (account.isPersonal && account.ownerUserId === userId) return account.id;
    }
    return null;
}

async function resolveMarketplaceEntitlementsForUser(
    user: { id: string; role?: string },
    vertical: 'autos' | 'propiedades',
    accountIdOverride?: string | null,
    planIdOverride?: SubscriptionPlanId,
    includeTeamUsage = true,
) {
    const accountId = accountIdOverride === undefined
        ? (await getAccountMembershipFromDb(user.id))?.accountId ?? null
        : accountIdOverride;
    const billingContext = await getMarketplaceAccountBillingContext(user.id, vertical, accountId);
    const planId = planIdOverride ?? getEffectivePlanId(user as AppUser, vertical, accountId);
    const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId)
        ?? getSubscriptionPlans(vertical).find((item) => item.id === 'free');
    if (!plan) return null;

    const activeListings = accountId
        ? countAccountListingsForVertical(
            listingsById,
            accountId,
            user.id,
            vertical,
            billingContext.isPersonal,
        )
        : countUserListingsForVertical(listingIdsByUser, listingsById, user.id, vertical);
    const teamMembers = accountId && includeTeamUsage
        ? await db.select({ id: accountUsers.id })
            .from(accountUsers)
            .where(eq(accountUsers.accountId, accountId))
        : [];
    const pendingInvitations = accountId && includeTeamUsage
        ? await db.select({ email: accountInvitations.email })
            .from(accountInvitations)
            .where(and(
                eq(accountInvitations.accountId, accountId),
                isNull(accountInvitations.acceptedAt),
                isNull(accountInvitations.revokedAt),
                gt(accountInvitations.expiresAt, new Date()),
            ))
        : [];
    const teamMemberUsage = teamMembers.length + new Set(
        pendingInvitations.map((invitation) => invitation.email.trim().toLowerCase()),
    ).size;

    return resolveMarketplaceSubscriptionEntitlements({
        vertical,
        accountId,
        accountKind: billingContext.accountKind,
        plan,
        usage: { activeListings, teamMembers: teamMemberUsage },
        launchMode: isMarketplaceLaunchActive(vertical),
    });
}

function marketplaceUserCanUsePublicProfile(user: AppUser, vertical: VerticalType, accountId?: string | null): boolean {
    if (vertical === 'autos' || vertical === 'propiedades') {
        const planId = getEffectivePlanId(user, vertical, accountId);
        const plan = getSubscriptionPlans(vertical).find((item) => item.id === planId);
        if (!plan) return false;
        return resolveMarketplaceSubscriptionEntitlements({
            vertical,
            accountId: accountId === undefined ? getPrimaryAccountIdForUserSync(user.id) : accountId,
            accountKind: 'individual',
            plan,
            usage: { activeListings: 0 },
            launchMode: isMarketplaceLaunchActive(vertical),
        }).capabilities.publicProfile;
    }
    return getEffectivePlanId(user, vertical, accountId) !== 'free';
}

const processedMercadoPagoWebhookPaymentIds = new Set<string>();
const processedMercadoPagoWebhookPreapprovalIds = new Set<string>();

function getDefaultPublicProfileAddress(userId: string, vertical: VerticalType, accountIdOverride?: string | null): AddressBookEntry | null {
    const accountId = accountIdOverride === undefined
        ? getPrimaryAccountIdForUserSync(userId)
        : accountIdOverride;
    const entries = accountId ? addressBookByAccount.get(accountId) ?? [] : [];
    const visibleEntries = entries.filter((entry) =>
        entry.scope === 'business' && entry.vertical === vertical && entry.isPublicVisible,
    );
    return visibleEntries.find((item) => item.isDefault) ?? visibleEntries[0] ?? null;
}

function getAddressBookEntryById(userId: string, addressId: string, accountId?: string | null): AddressBookEntry | null {
    const resolvedAccountId = accountId ?? getPersonalAccountIdForUser(userId);
    if (!resolvedAccountId) return null;
    const entries = addressBookByAccount.get(resolvedAccountId) ?? [];
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
    getBoostTargetById: (vertical, targetType, targetId) =>
        getBoostTargetById(vertical as VerticalType, targetType as any, targetId),
    getUserById,
    listingsById,
    extractListingMediaUrls,
    extractListingSummary: (record) => extractListingSummary(record as ListingRecord),
    extractAutosCondition: (record) => extractAutosCondition(record as ListingRecord),
    extractPublicOfferPricing: (record) => extractPublicOfferPricing(record as ListingRecord),
    buildLocationPublicLabel: (locationData) =>
        buildLocationPublicLabel(locationData as Parameters<typeof buildLocationPublicLabel>[0]),
    humanizePublicLocationFallback,
    toPublicMediaUrl,
    getPublishedSellerProfile: (userId, vertical, accountId) => {
        const profile = getPublishedSellerProfile(userId, vertical as VerticalType, accountId);
        if (!profile) return null;
        return {
            displayName: profile.displayName,
            slug: profile.slug,
            publicEmail: profile.publicEmail,
            publicPhone: profile.publicPhone,
            publicWhatsapp: profile.publicWhatsapp,
            avatarImageUrl: profile.avatarImageUrl ?? null,
        };
    },
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
    updateInstagramAccountSettingsForManager,
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
    getPersonalAccountIdForUser,
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
    getPersonalAccountIdForUser,
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
    getPersonalAccountIdForUser,
});

const refreshInstagramAccountIfNeeded = (account: InstagramAccountRecord) =>
    refreshInstagramAccountToken(account, updateInstagramAccountSettings);

const {
    getAddressBookEntries: getAddressBookEntriesFromDb,
    upsertAddressBookEntry: upsertAddressBookEntryInDb,
    deleteAddressBookEntry: deleteAddressBookEntryInDb,
} = createAddressBookService(
    getPrimaryAccountIdForUser,
    (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    async (userId) => getAccountMembershipFromDb(userId),
);

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

    if (scope !== 'personal') {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (accountId) {
            const current = addressBookByAccount.get(accountId) ?? [];
            const businessItems = items.filter((entry) => entry.scope === 'business');
            const next = scope === 'business' && vertical
                ? [
                    ...current.filter((entry) => entry.vertical !== vertical),
                    ...businessItems,
                ]
                : businessItems;
            addressBookByAccount.set(accountId, next);
        }
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
    const items = await getAddressBookEntries(userId);
    addressBookByUser.set(userId, items);
}

function mapUserRowToAppUser(user: typeof users.$inferSelect): AppUser {
    const role: UserRole = user.role === 'admin' || user.role === 'superadmin'
        ? user.role
        : 'user';
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
        role,
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

function parsePaymentVertical(raw: string | undefined): PaymentVerticalType {
    if (raw === 'propiedades') return 'propiedades';
    if (raw === 'agenda') return 'agenda';
    if (raw === 'serenatas') return 'serenatas';
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
    extractAutosCondition,
    extractPublicOfferPricing,
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
    getPersonalAccountIdForUser,
    getPublishedSellerProfile: (userId, vertical, accountId) => {
        const profile = getPublishedSellerProfile(userId, vertical as VerticalType, accountId);
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
        userCanUseInstagram: (user, vertical, accountId) =>
            userCanUseInstagram(
                user as AppUser,
                vertical as VerticalType,
                accountId === null ? getPersonalAccountIdForUser(user.id) : accountId,
            ),
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
    getPersonalAccountIdForUser,
});

const publishListingToFacebookPage = createPublishListingToFacebookPage({
    getInstagramAccount,
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(
            user as AppUser,
            vertical as VerticalType,
            accountId === null ? getPersonalAccountIdForUser(user.id) : accountId,
        ),
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
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(
            user as AppUser,
            vertical as VerticalType,
            accountId === null ? getPersonalAccountIdForUser(user.id) : accountId,
        ),
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
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(
            user as AppUser,
            vertical as VerticalType,
            accountId === null ? getPersonalAccountIdForUser(user.id) : accountId,
        ),
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
    const saved = await saveListingRecord(updated as Parameters<typeof saveListingRecord>[0], input.user);
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

const operatorProductsDbDeps = {
    db,
    dbHelpers: { eq, and, asc, desc, ilike, or, sql },
    tables: {
        publicProfiles,
        marketplaceOperatorProducts,
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
    getEffectivePlanId: (user, vertical, accountId) => getEffectivePlanId(user as AppUser, vertical, accountId),
    getCurrentPlanLabel: (user, vertical, accountId) => getCurrentPlanLabel(user as AppUser, vertical, accountId),
    userCanUsePublicProfile: (user, vertical, accountId) => marketplaceUserCanUsePublicProfile(user as AppUser, vertical, accountId),
    countFollowers,
    extractListingMediaUrls: (listing) => extractListingMediaUrls(listing as ListingRecord),
    isPublicListingVisible: (listing) => isPublicListingVisible(listing as ListingRecord),
    listingToPublicResponse: (listing) => listingToPublicResponse(listing as ListingRecord),
    listingsById: listingsById as Map<string, {
        accountId?: string | null;
        ownerId: string;
        vertical: VerticalType;
        updatedAt: number;
        views: number;
        favs: number;
        status: string;
        rawData?: unknown;
    }>,
    fetchPublishedOperatorCatalog: async (profileId) => {
        const catalog = await fetchPublishedOperatorCatalog(operatorServicesDbDeps, profileId);
        const products = await fetchPublishedOperatorProducts(operatorProductsDbDeps, profileId);
        return { ...catalog, products };
    },
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
        userPlatformAccess,
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
    refreshCaches: async () => loadDataFromDB(),
    caches: {
        usersById,
        savedByUser,
        followsByUser,
        boostOrdersByUser,
        addressBookByUser,
        paymentOrdersByUser,
        activeSubscriptionsByUser,
        activeSubscriptionsByAccount,
        instagramPublicationsByUser,
        socialPublicationsByUser,
        publicProfilesByUserVertical,
        publicProfilesByAccountVertical,
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
const syncPropertyVisitToGoogleCalendar = createAgendaPropertyVisitCalendarSync({
    db,
    agendaProfessionalProfiles,
});

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
        addressBookByAccount,
        paymentOrdersByUser,
        instagramAccountByUserVertical,
        tiktokAccountByUserVertical,
        youtubeAccountByUserVertical,
        instagramPublicationsByUser,
        socialPublicationsByUser,
        publicProfilesByAccountVertical,
        publicProfilesByUserVertical,
        publicProfilesByVerticalSlug,
        activeSubscriptionsByUser,
        activeSubscriptionsByAccount,
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

function getFreeBoostQuota(
    user: AppUser,
    vertical: VerticalType,
    accountId?: string | null,
    legacyPersonalOwnerUserId?: string,
) {
    const sub = getCurrentSubscription(user.id, vertical, accountId);
    const planId = (sub?.planId ?? 'free') as Exclude<SubscriptionPlanId, 'free'> | 'free';
    return resolveFreeBoostQuota(user, vertical, planId, accountId, legacyPersonalOwnerUserId);
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
app.use('/api/accounts/*', async (c, next) => {
    if (c.req.method === 'GET' && c.req.path === '/api/accounts/invitations/preview') {
        await next();
        return;
    }
    return requireVerifiedSession(c, next);
});
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

async function getListingTeamContext(userId: string, vertical: 'autos' | 'propiedades') {
    const membership = await getAccountMembershipFromDb(userId);
    const accountId = membership?.accountId ?? null;
    if (!accountId || !membership) return null;

    const [account, workspace] = await Promise.all([
        db.query.accounts.findFirst({ columns: { isPersonal: true }, where: eq(accounts.id, accountId) }),
        db.query.accountVerticalSettings.findFirst({
            columns: { accountKind: true },
            where: and(
                eq(accountVerticalSettings.accountId, accountId),
                eq(accountVerticalSettings.vertical, vertical),
            ),
        }),
    ]);
    const teamEnabled = Boolean(account && !account.isPersonal && workspace?.accountKind === 'company');
    const canManage = canManageAccountRole(membership.role);
    if (!teamEnabled) return { accountId, teamEnabled: false, canManage, members: [] as any[] };

    const members = await db.select({
        userId: accountUsers.userId,
        role: accountUsers.role,
        name: users.name,
        email: users.email,
    })
        .from(accountUsers)
        .innerJoin(users, eq(accountUsers.userId, users.id))
        .where(eq(accountUsers.accountId, accountId));
    return {
        accountId,
        teamEnabled: true,
        canManage,
        members: members.map((member) => ({
            userId: member.userId,
            role: member.role,
            name: member.name?.trim() || member.email || 'Integrante',
            email: member.email ?? null,
        })),
    };
}

const isListingAssignedToUser = async (accountId: string, listingId: string, userId: string) => {
    const [assignment] = await db.select({ id: accountListingAssignments.id })
        .from(accountListingAssignments)
        .where(and(
            eq(accountListingAssignments.accountId, accountId),
            eq(accountListingAssignments.listingId, listingId),
            eq(accountListingAssignments.assignedUserId, userId),
        ))
        .limit(1);
    return Boolean(assignment);
};

const listingAccessControl = createListingAccessControl({
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    isPersonalAccountForUser: (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    isListingAssignedToUser,
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
        user: { id: string },
        vertical: unknown,
        _mine: boolean,
        accountId?: string | null,
    ) => {
        const parsedVertical = parseVertical(typeof vertical === 'string' ? vertical : undefined);
        const rows = await fetchListingRowsForPanel({
            vertical: parsedVertical,
            ownerId: user.id,
            accountId,
            includeLegacyPersonalListings: Boolean(accountId && accountsById.get(accountId)?.isPersonal),
            includeAllInVertical: false,
        });
        let visibleRows = rows;
        const membership = accountId
            ? await getAccountMembershipFromDb(user.id, accountId)
            : null;
        if (accountId && membership?.role === 'agent') {
            const assignments = await db.select({ listingId: accountListingAssignments.listingId })
                .from(accountListingAssignments)
                .where(and(
                    eq(accountListingAssignments.accountId, accountId),
                    eq(accountListingAssignments.vertical, parsedVertical),
                    eq(accountListingAssignments.assignedUserId, user.id),
                ));
            const assignedListingIds = new Set(assignments.map((item) => item.listingId));
            visibleRows = rows.filter((row) => row.ownerId === user.id || assignedListingIds.has(row.id));
        }
        return visibleRows.map((row) => upsertListingCache(mapListingRowToRecord(row)));
    },
    getListingTeamContext,
    listingAccessControl,
    listAccountListingAssignments: async (accountId: string, vertical: 'autos' | 'propiedades') => (
        db.select({ listingId: accountListingAssignments.listingId, assignedUserId: accountListingAssignments.assignedUserId })
            .from(accountListingAssignments)
            .where(and(
                eq(accountListingAssignments.accountId, accountId),
                eq(accountListingAssignments.vertical, vertical),
            ))
    ),
    isListingAssignedToUser,
    replaceAccountListingAssignments: async (input: {
        accountId: string;
        vertical: 'autos' | 'propiedades';
        listingId: string;
        assignedUserIds: string[];
        assignedByUserId: string;
    }) => {
        return db.transaction(async (tx) => {
            const [actorMembership] = await tx.select({ role: accountUsers.role, isDefault: accountUsers.isDefault })
                .from(accountUsers)
                .where(and(
                    eq(accountUsers.accountId, input.accountId),
                    eq(accountUsers.userId, input.assignedByUserId),
                ))
                .limit(1)
                .for('update');
            if (!actorMembership || !actorMembership.isDefault || !canManageAccountRole(actorMembership.role)) {
                return { ok: false as const, error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.', status: 403 as const };
            }

            const [account] = await tx.select({ isPersonal: accounts.isPersonal })
                .from(accounts)
                .where(eq(accounts.id, input.accountId))
                .limit(1)
                .for('update');
            const [workspace] = await tx.select({ accountKind: accountVerticalSettings.accountKind })
                .from(accountVerticalSettings)
                .where(and(
                    eq(accountVerticalSettings.accountId, input.accountId),
                    eq(accountVerticalSettings.vertical, input.vertical),
                ))
                .limit(1)
                .for('update');
            if (!account || account.isPersonal || workspace?.accountKind !== 'company') {
                return { ok: false as const, error: 'La asignación solo está disponible en un espacio de empresa activo.', status: 403 as const };
            }

            for (const assignedUserId of [...input.assignedUserIds].sort()) {
                const [targetMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, input.accountId),
                        eq(accountUsers.userId, assignedUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!targetMembership) {
                    return { ok: false as const, error: 'Hay una persona seleccionada que ya no pertenece a este equipo.', status: 400 as const };
                }
            }

            const [listing] = await tx.select({ id: listings.id })
                .from(listings)
                .where(and(
                    eq(listings.id, input.listingId),
                    eq(listings.accountId, input.accountId),
                    eq(listings.vertical, input.vertical),
                ))
                .limit(1)
                .for('update');
            if (!listing) return { ok: false as const, error: 'La publicación ya no pertenece a este espacio.', status: 404 as const };

            await tx.delete(accountListingAssignments).where(and(
                eq(accountListingAssignments.accountId, input.accountId),
                eq(accountListingAssignments.listingId, input.listingId),
                eq(accountListingAssignments.vertical, input.vertical),
            ));
            if (input.assignedUserIds.length > 0) {
                await tx.insert(accountListingAssignments).values(input.assignedUserIds.map((assignedUserId) => ({
                    accountId: input.accountId,
                    vertical: input.vertical,
                    listingId: input.listingId,
                    assignedUserId,
                    assignedByUserId: input.assignedByUserId,
                    updatedAt: new Date(),
                })));
            }
            return { ok: true as const };
        });
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
    buildListingDistribution,
    getInstagramPublicationsForUser,
    getSocialPublicationsForUser,
    getListingDraftRecord,
    upsertListingDraftRecord,
    deleteListingDraftRecord,
    generateListingReel: generateListingReelForUser,
    isReelGeneratorAvailable,
    checkListingCreationAllowed: async (
        user: { id: string },
        vertical: unknown,
        options?: {
            targetStatus?: string;
            previousStatus?: string;
            photoCount?: number;
            previousPhotoCount?: number;
        },
    ) => {
        const parsedVertical = parseVertical(typeof vertical === 'string' ? vertical : undefined);
        if (parsedVertical !== 'autos' && parsedVertical !== 'propiedades') return null;

        const accountId = (await getAccountMembershipFromDb(user.id))?.accountId ?? null;
        const entitlements = await resolveMarketplaceEntitlementsForUser(
            user,
            parsedVertical,
            accountId,
            undefined,
            false,
        );
        if (!entitlements) return null;
        const targetStatus = options?.targetStatus ?? 'active';
        const previousStatus = options?.previousStatus;
        const countsTowardLimit = (status: string | undefined) => status === 'active' || status === 'paused';
        if (
            countsTowardLimit(targetStatus)
            && !countsTowardLimit(previousStatus)
            && !entitlements.canCreateActiveListing
        ) {
            return entitlements.listingLimitReason;
        }

        const imageLimit = entitlements.limits.imagesPerListing;
        const photoCount = options?.photoCount;
        const previousPhotoCount = options?.previousPhotoCount;
        if (
            imageLimit !== null
            && photoCount !== undefined
            && photoCount > imageLimit
            && (previousPhotoCount === undefined || photoCount > previousPhotoCount)
        ) {
            return 'Tu plan permite hasta ' + imageLimit + ' fotos por publicación. Quita algunas para guardar los cambios.';
        }
        return null;
    },
    getPrimaryAccountIdForUser: async (userId: string) => {
        const accountId = await getPrimaryAccountIdForUser(userId);
        if (!accountId) throw new Error('Cuenta primaria no encontrada');
        return accountId;
    },
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    isPersonalAccountForUser: (userId: string, accountId: string) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    schemas: {
        createListingSchema,
        updateListingSchema,
        updateListingStatusSchema,
        publishListingPortalSchema,
        trackListingPortalSchema,
        listingDraftWriteSchema,
        generateListingReelSchema,
    },
};
app.route('/api/listings', createListingsRouter(listingsDeps));
app.route('/api/listing-draft', createListingDraftRouter(listingsDeps));

app.route('/api/boost', createBoostRouter({
    authUser,
    db,
    parseVertical: parsePaymentVertical,
    parseBoostSection,
    getSectionsForVertical,
    isBoostSectionAllowed,
    getBoostPlans,
    inferBoostTargetType,
    listBoostTargetsForOwner,
    listBoostTargetsForAccount,
    getBoostTargetById,
    getBoostOrdersForUser,
    getBoostOrdersForAccount,
    createBoostOrderRecord,
    normalizeBoostOrder,
    countReservedSlots,
    getFreeBoostQuota,
    sectionLabel,
    listFeaturedBoosted,
    boostOrdersByUser,
    MAX_BOOST_SLOTS_PER_SECTION,
    getMarketplaceBoostPricing: (vertical) => MARKETPLACE_BOOST_PRICING[vertical as keyof typeof MARKETPLACE_BOOST_PRICING] ?? null,
    schemas: {
        createBoostOrderSchema,
        updateBoostOrderSchema,
    },
    insertBoostOrderRow: async (order, accountId, transaction) => {
        const resolvedAccountId = accountId ?? await getPrimaryAccountIdForUser(order.userId);
        await insertBoostOrderRow(order, resolvedAccountId, transaction ?? db, !transaction);
    },
    upsertBoostOrderInCache,
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    isPersonalAccountForUser: (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    listAssignedListingIdsForUser: async (accountId, vertical, userId) => (
        await db.select({ listingId: accountListingAssignments.listingId })
            .from(accountListingAssignments)
            .where(and(
                eq(accountListingAssignments.accountId, accountId),
                eq(accountListingAssignments.vertical, vertical),
                eq(accountListingAssignments.assignedUserId, userId),
            ))
    ).map((item) => item.listingId),
}));

app.route('/api/valuation', createValuationRouter());

app.route('/api/vehicle-valuation', createVehicleValuationRouter());

app.use('/api/address-book', requireVerifiedSession);
app.use('/api/address-book/*', requireVerifiedSession);
app.use('/api/boost/catalog', requireVerifiedSession);
app.use('/api/boost/catalog/*', requireVerifiedSession);
app.use('/api/boost/orders', requireVerifiedSession);
app.use('/api/boost/orders/*', requireVerifiedSession);

const addressBookDeps = {
    authUser,
    getAddressBookEntries,
    upsertAddressBookEntry,
    deleteAddressBookEntry,
    canManageActiveAccountProfile: async (userId: string) => {
        const membership = await getAccountMembershipFromDb(userId);
        return canManageAccountRole(membership?.role);
    },
    schemas: { addressBookWriteSchema },
};
app.route('/api/address-book', createAddressBookRouter(addressBookDeps));
app.route('/api/account/address-book', createAddressBookRouter(addressBookDeps));

app.route('/api', createPaymentsRouter({
    authUser,
    requireVerifiedSession,
    parseVertical: parsePaymentVertical,
    isAdminRole,
    isMercadoPagoConfigured,
    getSubscriptionPlans,
    getPaidSubscriptionPlan,
    getCurrentSubscription,
    getSubscriptionForAccount: (accountId, vertical) => (
        activeSubscriptionsByAccount.get(accountId)?.find((subscription) => (
            subscription.vertical === vertical && subscription.status === 'active'
        )) ?? null
    ),
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
    getBoostTargetById,
    inferBoostTargetType,
    getBoostOrdersForUser,
    getBoostOrdersForAccount,
    getBoostPlans,
    parseBoostSection,
    isBoostSectionAllowed,
    createBoostOrderRecord,
    countReservedSlots,
    sectionLabel,
    insertBoostOrderRow: async (order: Parameters<typeof insertBoostOrderRow>[0], accountId?: string | null) => {
        await insertBoostOrderRow(order, accountId ?? await getPrimaryAccountIdForUser(order.userId));
    },
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
    dbHelpers: { eq, and, isNull },
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
    listPaymentOrdersForAccountFromDb,
    listPaymentOrdersForUserFromDb,
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    getPersonalAccountIdForUser: getPersonalAccountIdFromDb,
    isPersonalAccountForUser: (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    getMarketplaceAccountBillingContext,
    getAgendaAccountBillingContext,
    getMarketplaceEntitlements: async (user, vertical, accountId, planId) => (
        resolveMarketplaceEntitlementsForUser(
            user,
            vertical,
            accountId,
            planId as SubscriptionPlanId | undefined,
        )
    ),
    cancelActiveSubscriptionForUser,
    processedMercadoPagoWebhookPaymentIds,
    processedMercadoPagoWebhookPreapprovalIds,
}));
app.use('/api/advertising/campaigns', requireVerifiedSession);
app.use('/api/advertising/campaigns/*', requireVerifiedSession);
app.use('/api/integrations/social', requireVerifiedSession);
app.use('/api/integrations/social/*', requireVerifiedSession);

app.route('/api/admin', createAdminRouter({
    authUser,
    db,
    eq,
    and,
    isNull,
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
    cancelActiveSubscriptionForUser,
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
        timelineEvents,
    },
    inArray,
}));

app.route('/api/accounts', createAccountsRouter({
    accountsById,
    authUser,
    db,
    ensurePrimaryAccountForUser,
    eq,
    gt,
    getAccountMembershipsForUser,
    getMarketplaceEntitlements: (user, vertical, accountId) => (
        resolveMarketplaceEntitlementsForUser(user, vertical, accountId, undefined, false)
    ),
    mapAccountRow,
    mapPublicProfileRow,
    getUserByEmail,
    tables: {
        accounts,
        accountUsers,
        accountInvitations,
        users,
        addressBook,
        accountVerticalSettings,
        userVerticalOnboarding,
        accountListingAssignments,
        accountRelationshipAssignments,
        accountRelationshipTasks,
        agendaAccountVisits,
        messageThreads,
        platformNotifications,
        publicProfiles,
        serenataClients,
        serenataMusicians,
        serenataOwners,
    },
    and,
    inArray,
    isNull,
    mapAccountUserRow,
    upsertAccountCache,
    upsertAccountUserCache,
    setDefaultAccountForUser,
    removeAccountUserCache,
    upsertPublicProfileCache,
    resolveBrowserOrigin,
    isAuthEmailConfigured,
    issueEmailVerification,
    sendAccountInvitationEmail,
    getClientIdentifier,
    consumeRateLimit,
    AUTH_RATE_LIMIT_WINDOW_MS,
    emailChangeRequestSchema,
    syncPropertyVisitToGoogleCalendar,
}));

const ensureMarketplaceDraftProfileForUser = async (user: AppUser, vertical: VerticalType, accountIdOverride?: string | null) => {
    if (!isMarketplaceVertical(vertical)) return;
    const accountId = accountIdOverride === undefined
        ? (await getAccountMembershipFromDb(user.id))?.accountId ?? null
        : accountIdOverride;
    if (!accountId) return;
    if (getPublicProfileRecord(user.id, vertical, accountId)) return;

    const editable = buildEditablePublicProfile(user, vertical);
    const now = new Date();
    try {
        const result = await runAccountManagerWrite(db, { userId: user.id, accountId }, async (tx) => {
            const [existing] = await tx.select().from(publicProfiles)
                .where(and(
                    eq(publicProfiles.accountId, accountId),
                    eq(publicProfiles.vertical, vertical),
                ))
                .limit(1);
            if (existing) return existing;

            const [workspace] = await tx.select().from(accountVerticalSettings)
                .where(and(
                    eq(accountVerticalSettings.accountId, accountId),
                    eq(accountVerticalSettings.vertical, vertical),
                ))
                .limit(1);
            const [account] = await tx.select({ isPersonal: accounts.isPersonal })
                .from(accounts)
                .where(eq(accounts.id, accountId))
                .limit(1);
            const accountKind = account?.isPersonal === false
                ? 'company'
                : workspace?.accountKind ?? editable.accountKind;
            const hasMatchingWorkspace = workspace?.accountKind === accountKind;
            const [profile] = await tx.insert(publicProfiles).values({
                accountId,
                userId: user.id,
                vertical,
                slug: editable.slug,
                isPublished: false,
                accountKind,
                operatorSubtype: hasMatchingWorkspace ? workspace?.operatorSubtype ?? null : account?.isPersonal === false ? null : editable.operatorSubtype,
                operatorSubtypeCustom: hasMatchingWorkspace ? workspace?.operatorSubtypeCustom ?? null : account?.isPersonal === false ? null : editable.operatorSubtypeCustom,
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
            return profile ?? null;
        });
        if (result.ok && result.value) {
            upsertPublicProfileCache(mapPublicProfileRow(result.value));
        }
    } catch (error) {
        console.error('[marketplace] draft profile bootstrap failed:', error);
    }
};

const canManageActiveAccountProfile = async (userId: string) => {
    const membership = await getAccountMembershipFromDb(userId);
    return canManageAccountRole(membership?.role);
};

const canManageAccountIntegration = (userId: string, accountId: string | null) => {
    if (!accountId) return false;
    const membership = getAccountMembershipsForUser(userId).find((item) => item.accountId === accountId);
    return canManageAccountRole(membership?.role);
};

async function getAccountMembershipFromDb(userId: string, accountId?: string) {
    const where = accountId
        ? and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, accountId))
        : and(eq(accountUsers.userId, userId), eq(accountUsers.isDefault, true));
    const [membership] = await db.select({
        accountId: accountUsers.accountId,
        role: accountUsers.role,
    })
        .from(accountUsers)
        .where(where)
        .limit(1);
    return membership ?? null;
}

async function getPersonalAccountIdFromDb(userId: string): Promise<string | null> {
    const [account] = await db.select({ id: accounts.id })
        .from(accounts)
        .where(and(
            eq(accounts.ownerUserId, userId),
            eq(accounts.isPersonal, true),
        ))
        .limit(1);
    return account?.id ?? null;
}

async function getMarketplaceAccountBillingContext(
    userId: string,
    vertical: 'autos' | 'propiedades',
    accountIdOverride?: string | null,
) {
    const defaultMembership = accountIdOverride === undefined
        ? await getAccountMembershipFromDb(userId)
        : null;
    const accountId = accountIdOverride === undefined
        ? defaultMembership?.accountId ?? null
        : accountIdOverride;
    const membership = accountId
        ? (defaultMembership?.accountId === accountId
            ? defaultMembership
            : await getAccountMembershipFromDb(userId, accountId))
        : null;
    const [account] = accountId
        ? await db.select({
            id: accounts.id,
            name: accounts.name,
            isPersonal: accounts.isPersonal,
        })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1)
        : [];
    const [workspace] = accountId
        ? await db.select({ accountKind: accountVerticalSettings.accountKind })
            .from(accountVerticalSettings)
            .where(and(
                eq(accountVerticalSettings.accountId, accountId),
                eq(accountVerticalSettings.vertical, vertical),
            ))
            .limit(1)
        : [];
    const profile = accountId ? getPublicProfileRecord(userId, vertical, accountId) : null;
    const rawAccountKind = account?.isPersonal === false
        ? 'company'
        : workspace?.accountKind ?? profile?.accountKind ?? 'individual';
    const accountKind: PublicProfileAccountKind = rawAccountKind === 'company'
        ? 'company'
        : rawAccountKind === 'independent'
            ? 'independent'
            : 'individual';
    const memberCount = accountId
        ? Array.from(accountUsersByUserId.values()).flat().filter((item) => item.accountId === accountId).length
        : 0;

    return {
        accountId,
        accountName: account?.name ?? null,
        isPersonal: Boolean(account?.isPersonal),
        accountKind,
        role: membership?.role ?? null,
        memberCount,
        canManageBilling: canManageAccountRole(membership?.role),
    };
}

async function getAgendaAccountBillingContext(userId: string, accountIdOverride?: string | null) {
    const defaultMembership = accountIdOverride === undefined
        ? await getAccountMembershipFromDb(userId)
        : null;
    const accountId = accountIdOverride === undefined
        ? defaultMembership?.accountId ?? null
        : accountIdOverride;
    if (!accountId) return null;
    const membership = defaultMembership?.accountId === accountId
        ? defaultMembership
        : await getAccountMembershipFromDb(userId, accountId);
    const [account] = await db.select({
        id: accounts.id,
        name: accounts.name,
        isPersonal: accounts.isPersonal,
    })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
    const [workspace] = await db.select({ accountKind: accountVerticalSettings.accountKind })
        .from(accountVerticalSettings)
        .where(and(
            eq(accountVerticalSettings.accountId, accountId),
            eq(accountVerticalSettings.vertical, 'agenda'),
        ))
        .limit(1);
    const profile = await getAgendaProfile(userId, accountId);
    const rawAccountKind = account?.isPersonal === false
        ? 'company'
        : workspace?.accountKind ?? profile?.accountKind ?? 'individual';
    const accountKind: PublicProfileAccountKind = rawAccountKind === 'company'
        ? 'company'
        : rawAccountKind === 'independent'
            ? 'independent'
            : 'individual';
    const memberCount = Array.from(accountUsersByUserId.values())
        .flat()
        .filter((item) => item.accountId === accountId).length;

    return {
        accountId,
        accountName: account?.name ?? null,
        isPersonal: Boolean(account?.isPersonal),
        accountKind,
        role: membership?.role ?? null,
        memberCount,
        canManageBilling: canManageAccountRole(membership?.role),
    };
}

app.route('/api/account', createAccountRouter({
    authUser,
    parseVertical,
    updateProfileSchema,
    publicProfileWriteSchema,
    publicProfilePaymentMethodsWriteSchema,
    publicProfileBookingTermsWriteSchema,
    generateBookingPoliciesSchema,
    db,
    tables: { users, publicProfiles, addressBook, accountVerticalSettings },
    dbHelpers: { eq, and, isNull },
    mapUserRowToAppUser,
    usersById,
    sanitizeUser,
    buildAccountPublicProfileResponse,
    normalizePublicProfileSlug,
    isValidPublicProfileSlug,
    publicProfilesByVerticalSlug,
    publicProfileVerticalSlugKey,
    userCanUsePublicProfile: marketplaceUserCanUsePublicProfile,
    getMarketplaceEntitlements: (user, vertical, accountId) => (
        resolveMarketplaceEntitlementsForUser(user, vertical, accountId, undefined, false)
    ),
    getPublicProfileRecord,
    canManageActiveAccountProfile,
    getAccountMembershipFromDb,
    ensureMarketplaceDraftProfileForUser,
    getEffectivePlanId: (user, vertical, accountId) => getEffectivePlanId(user as AppUser, vertical, accountId),
    PUBLIC_PROFILE_DAYS,
    normalizePublicProfileSocialLinks,
    normalizeExternalUrlInput,
    toNullIfEmpty,
    upsertPublicProfileCache,
    mapPublicProfileRow,
    getPrimaryAccountIdForUser,
    isPersonalAccountForUser: (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
    refreshAddressBookCacheForUser,
    randomUUID,
    buildMarketplaceOperatorAnalytics: (userId, vertical, accountId) => buildMarketplaceOperatorAnalytics(userId, vertical, {
        listingsById,
        listingIdsByUser,
        getAccountScopeForUser: (id, accountIdOverride) => {
            const accountId = accountIdOverride === undefined
                ? getPrimaryAccountIdForUserSync(id)
                : accountIdOverride;
            return {
                accountId,
                isPersonal: Boolean(accountId && accountsById.get(accountId)?.isPersonal),
            };
        },
        getPublicProfileRecord,
        countFollowers,
        getDefaultDisplayName: (id) => usersById.get(id)?.name ?? 'Tu cuenta',
    }, accountId),
    operatorServices: {
        canManageActiveAccountProfile,
        getAccountMembershipFromDb,
        db,
        dbHelpers: { eq, and, asc, desc, ilike, or, sql },
        tables: {
            publicProfiles,
            marketplaceOperatorServices,
            marketplaceOperatorServicePacks,
            marketplaceOperatorServicePromotions,
        },
        getPublicProfileRecord,
        ensureMarketplaceDraftProfileForUser: async (user, vertical, accountId) => ensureMarketplaceDraftProfileForUser(user as AppUser, vertical, accountId),
    },
    operatorProducts: {
        canManageActiveAccountProfile,
        getAccountMembershipFromDb,
        db,
        dbHelpers: { eq, and, asc, desc, ilike, or, sql },
        tables: {
            publicProfiles,
            marketplaceOperatorProducts,
        },
        getPublicProfileRecord,
        ensureMarketplaceDraftProfileForUser: async (user, vertical, accountId) => ensureMarketplaceDraftProfileForUser(user as AppUser, vertical, accountId),
    },
}));


app.route('/api/advertising', createAdvertisingRouter({
    authUser,
    parseVertical: parsePaymentVertical,
    db,
    tables: { adCampaigns },
    dbHelpers: { eq, and, isNull },
    listAdCampaignRecords,
    adCampaignToResponse,
    adCampaignCreateSchema,
    adCampaignUpdateSchema,
    getAdCampaignRecordForUser,
    sanitizeAdCampaignWriteInput,
    normalizeAdCampaigns,
    mapAdCampaignRow,
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    isPersonalAccountForUser: (userId, accountId) => {
        const account = accountsById.get(accountId);
        return Boolean(account?.isPersonal && account.ownerUserId === userId);
    },
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
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    getMessageThreadByContext: (contextType, contextId, buyerUserId) =>
        getMessageThreadByContext(messageServiceDeps, contextType, contextId, buyerUserId),
}));

app.route('/api/panel', createPanelNotificationsRouter({
    authUser,
    parseVertical: parseMessageVertical,
    listMessageThreadsForUser,
    buildMessageThreadNotification,
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
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
    canManageListing: listingAccessControl.canManageListing,
    getInstagramAccount,
    getPrimaryAccountIdForUser,
    getAccountMembershipFromDb,
    canManageIntegration: canManageAccountIntegration,
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
    instagramPublishPreferencesSchema,
    updateInstagramAccountSettings,
    updateInstagramAccountSettingsForManager,
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
}));

app.route('/api/integrations/social', createSocialHubRouter({
    authUser,
    parseVertical,
    asString,
    asObject,
    listingsById,
    getListingById,
    canManageListing: listingAccessControl.canManageListing,
    isInstagramConfigured,
    getPrimaryAccountIdForUser,
    getAccountMembershipFromDb,
    canManageIntegration: canManageAccountIntegration,
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType, accountId),
    getEffectivePlanId: (user, vertical, accountId) => getEffectivePlanId(user as AppUser, vertical as VerticalType, accountId),
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
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType, accountId),
    getEffectivePlanId: (user, vertical, accountId) => getEffectivePlanId(user as AppUser, vertical as VerticalType, accountId),
    getPrimaryAccountIdForUser,
    getAccountMembershipFromDb,
    canManageIntegration: canManageAccountIntegration,
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
    userCanUseInstagram: (user, vertical, accountId) =>
        userCanUseInstagram(user as AppUser, vertical as VerticalType, accountId),
    getEffectivePlanId: (user, vertical, accountId) => getEffectivePlanId(user as AppUser, vertical as VerticalType, accountId),
    getPrimaryAccountIdForUser,
    getAccountMembershipFromDb,
    canManageIntegration: canManageAccountIntegration,
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
    accountId?: string | null,
): Promise<boolean> {
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(user.id, accountId);
        if (!profile) return false;
        return hasAgendaFullAccess(profile);
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        return userCanUsePublicProfile(user, vertical, accountId);
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
    accountId?: string | null,
): Promise<string> {
    if (vertical === 'agenda') {
        const profile = await getAgendaProfile(user.id, accountId);
        return profile?.plan ?? 'free';
    }
    if (vertical === 'autos' || vertical === 'propiedades') {
        return getEffectivePlanId(user, vertical, accountId);
    }
    return await resolveActiveSerenataBillingPlan(user.id);
}

app.route('/api/integrations/mercadopago', createMercadoPagoIntegrationRouter({
    authUser,
    asString,
    resolveBrowserOrigin,
    sanitizeBrowserReturnUrl,
    randomBytes,
    sessionSecret: MERCADOPAGO_OAUTH_STATE_SECRET,
    userCanConnectMercadoPago: (user, vertical, accountId) => userCanConnectMercadoPagoOperator(user as AppUser, vertical, accountId),
    getCurrentPlanId: (user, vertical, accountId) => getMercadoPagoOperatorPlanId(user as AppUser, vertical, accountId),
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
    ensureMercadoPagoOperatorTarget: async (userId, vertical, accountId) => {
        if (vertical === 'autos' || vertical === 'propiedades') {
            const user = usersById.get(userId);
            if (user) await ensureMarketplaceDraftProfileForUser(user, vertical, accountId);
        }
    },
    onMercadoPagoOperatorConnected: async (userId, vertical, accountId) => {
        if (vertical !== 'autos' && vertical !== 'propiedades') return;
        const row = accountId
            ? await db.query.publicProfiles.findFirst({
                where: and(
                    eq(publicProfiles.userId, userId),
                    eq(publicProfiles.vertical, vertical),
                    eq(publicProfiles.accountId, accountId),
                ),
            })
            : await db.query.publicProfiles.findFirst({
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
    getListingById,
    canManageListing: listingAccessControl.canManageListing,
    canAccessProxyMedia: async (user, src) => {
        const attachmentRows = await db.select({
            userId: agendaProfessionalProfiles.userId,
            accountId: agendaProfessionalProfiles.accountId,
        })
            .from(agendaClientAttachments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaClientAttachments.professionalId, agendaProfessionalProfiles.id))
            .where(eq(agendaClientAttachments.url, src))
            .limit(1);
        const attachment = attachmentRows[0];
        if (attachment?.userId === user.id) {
            if (!attachment.accountId) return true;
            return Boolean(await getAccountMembershipFromDb(user.id, attachment.accountId));
        }

        const scoreRows = await db.select({
            groupId: serenataRepertoireSongs.providerGroupId,
            ownerUserId: serenataProviderGroups.ownerUserId,
            ownerId: serenataProviderGroups.ownerId,
        })
            .from(serenataSongScores)
            .innerJoin(serenataRepertoireSongs, eq(serenataSongScores.repertoireSongId, serenataRepertoireSongs.id))
            .innerJoin(serenataProviderGroups, eq(serenataRepertoireSongs.providerGroupId, serenataProviderGroups.id))
            .where(eq(serenataSongScores.storageUrl, src))
            .limit(1);
        const score = scoreRows[0];
        if (!score) return false;
        if (score.ownerUserId === user.id) return true;

        if (score.ownerId) {
            const ownerRows = await db.select({ userId: serenataOwners.userId })
                .from(serenataOwners)
                .where(eq(serenataOwners.id, score.ownerId))
                .limit(1);
            if (ownerRows[0]?.userId === user.id) return true;
        }

        const musicianRows = await db.select({ id: serenataMusicians.id })
            .from(serenataMusicians)
            .where(eq(serenataMusicians.userId, user.id))
            .limit(1);
        const musicianId = musicianRows[0]?.id;
        if (!musicianId) return false;
        const memberships = await db.select({ id: serenataProviderGroupMembers.id })
            .from(serenataProviderGroupMembers)
            .where(and(
                eq(serenataProviderGroupMembers.providerGroupId, score.groupId),
                eq(serenataProviderGroupMembers.musicianId, musicianId),
                eq(serenataProviderGroupMembers.status, 'active'),
            ))
            .limit(1);
        return memberships.length > 0;
    },
    getStorageProvider,
    getMediaProxyS3Client,
    getS3ClientForUrl,
    isStorageUrl,
    extractStorageObjectKey,
    env: {
        CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        CLOUDFLARE_R2_PRIVATE_BUCKET_NAME: process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME,
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
    searchPublicOperatorProducts: (input) => searchPublicOperatorProducts(operatorProductsDbDeps, input),
    getPublicOperatorServiceById: (input) => getPublicOperatorServiceById(operatorServicesDbDeps, input),
    getPublicOperatorProductById: (input) => getPublicOperatorProductById(operatorProductsDbDeps, input),
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

app.route('/api/public/partnership-inquiries', createPartnershipInquiryRouter({
    ...createPartnershipInquiryDelivery({ db, timelineEvents, eq }),
    allowLocalOrigins: process.env.NODE_ENV !== 'production',
}));

app.use('/api/platform/*', requireVerifiedSession);
app.route('/api/platform', createPlatformRouter({
    authUser,
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
}));

app.route('/api/serenatas', createSerenatasRouter({
    authUser,
    requireVerifiedSession,
    sanitizeUser: (user) => sanitizeUser(user as AppUser),
    cancelActiveSubscriptionForUser: (userId, _vertical, accountId, billingProfileType) => (
        cancelActiveSubscriptionForUser(userId, 'serenatas' as never, accountId, billingProfileType)
    ),
    getPrimaryAccountIdForUser,
    getAccountMembershipsForUser,
    getAccountMembershipFromDb,
}));

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — mount modular routers
// ─────────────────────────────────────────────────────────────────────────────

{
    const agendaDeps = {
        authUser,
        requireVerifiedSession,
        getPrimaryAccountIdForUser,
        getAccountMembershipsForUser,
        getAccountMembershipFromDb,
        cancelActiveSubscriptionForUser: (userId: string, _vertical: 'agenda', accountId?: string | null) => (
            cancelActiveSubscriptionForUser(userId, 'agenda', accountId)
        ),
        asString,
        randomUUID,
        randomBytes,
        SESSION_SECRET,
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
            timelineEvents,
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
        syncPropertyVisitToGoogleCalendar,
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
    app.route('/api/agenda/team', createAgendaTeamRouter({
        db, authUser, requireVerifiedSession, syncToGoogleCalendar, sendBookingConfirmationEmail, logAudit: agendaDeps.logAudit, scheduleDeps: agendaDeps,
    }));
    app.route('/api/agenda', createAgendaRouter(agendaDeps));
    app.route('/api/public/agenda', createPublicAgendaRouter(agendaDeps));
}

// ─────────────────────────────────────────────────────────────────────────────
// SimpleAgenda — recordatorios por email (cron)
// ─────────────────────────────────────────────────────────────────────────────

// Cron jobs moved to modules/agenda/cron.ts
