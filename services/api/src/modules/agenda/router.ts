import { Hono } from 'hono';
import type { Context } from 'hono';
import { canManageAccountRole } from '../accounts/permissions.js';
import { runAccountManagerWrite, runAccountMemberWrite } from '../accounts/write-access.js';
import { gt, ilike, isNotNull, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { cleanupReplacedMediaUrl, isOwnedStorageUrl, toProtectedMediaUrl, unwrapProtectedMediaUrl } from '../media/stored-object.js';
import { getPaymentById, verifyMercadoPagoWebhookSignature } from '../mercadopago/service.js';
import { refreshMercadoPagoOperatorOAuthToken } from '../mercadopago/operator-oauth.js';
import { ensureAgendaProfileTrial, getAgendaMonthlyBookingCount, getAgendaWhatsappMonthlyLimit, getAgendaWhatsappQuota, hasAgendaProPlusAccess } from './plan-limits.js';
import {
    extractWhatsAppButtonActions,
    extractWhatsAppOptOuts,
    getWhatsAppWebhookVerifyToken,
    isWhatsAppCloudConfigured,
    isWhatsAppWebhookForConfiguredAssets,
    isWhatsAppWebhookConfigured,
    normalizeWhatsAppRecipient,
    verifyWhatsAppWebhookSignature,
} from '../../lib/whatsapp-cloud.js';
import { insertPlatformNotifications } from '../platform/notifications-service.js';
import {
    getCustomDomainTargetHost,
    getCustomDomainTargetIp,
    normalizeCustomDomain,
    syncCustomDomainWithCoolify,
    verifyCustomDomainDns,
} from './custom-domain.js';
import { buildAgendaOAuthState, verifyAgendaOAuthState } from './oauth-state.js';
import { resolveAgendaProfessionalTimezone, syncAgendaProfileTimezoneFromOperatingLocation } from '../../lib/sync-user-timezone.js';
import { generateAgendaLandingPageContent } from './generate-landing-page.js';
import { recurringBookingStart } from './recurrence.js';
import {
    getPublishedAppearance,
    landingAppearanceSchema,
    landingBriefSchema,
    landingContentSchema,
    landingGenerationTargetSchema,
    landingMutationContextSchema,
    mergeGeneratedLandingContent,
    normalizeLandingConfig,
} from './site-page-config.js';
import { agendaOperatingPatchFromBody, operatingLocationFromAgendaProfile } from '../../lib/structured-location.js';
import {
    filterAgendaMarketplaceProfiles,
    mapAgendaProfileToMarketplaceItem,
} from './marketplace.js';
import {
    expandWeeklyRulesToDaySegments,
    BUSINESS_SCHEDULE_ALWAYS_OPEN_RULES,
    resolveBookingModality,
    bookingTermsFromRecord,
    serializeBookingTermsWrite,
    normalizeOperatorSiteLayout,
    normalizeOperatorSiteColorMode,
    OPERATOR_SITE_LAYOUTS,
    OPERATOR_SITE_COLOR_MODES,
    isValidOperatorSiteAccentStorage,
    normalizeOperatorSiteAccentHex,
    parseDateTimeInTimezone,
    AGENDA_PRICING,
    addChileVat,
    type OperatorSiteLandingBrief,
    type OperatorSiteLandingConfig,
    type OperatorSiteLandingContent,
} from '@simple/utils';
import {
    agendaBusiness,
    agendaClientPerson,
    emitTimelineEvent,
} from '../platform/timeline-events.js';
import {
    accountVerticalSettings,
    accounts,
    accountUsers,
    accountListingAssignments,
    accountRelationshipAssignments,
    agendaAccountVisits,
    agendaAccountTrials,
    agendaWhatsappOptOuts,
    listings,
    messageThreads,
    platformNotifications,
    publicProfiles,
    subscriptions,
} from '../../db/schema.js';

export interface AgendaRouterDeps {
    authUser: (c: Context) => Promise<any>;
    requireVerifiedSession: any;
    asString: (v: any) => string;
    randomUUID: () => string;
    randomBytes: (n: number) => Buffer;
    SESSION_SECRET: string;
    db: any;
    sql: any;
    tables: {
        agendaProfessionalProfiles: any;
        agendaServices: any;
        agendaAvailabilityRules: any;
        agendaBlockedSlots: any;
        agendaLocations: any;
        agendaClients: any;
        agendaClientTags: any;
        agendaClientTagAssignments: any;
        agendaClientAttachments: any;
        agendaAppointments: any;
        agendaSessionNotes: any;
        agendaPayments: any;
        agendaPromotions: any;
        agendaPacks: any;
        agendaClientPacks: any;
        agendaGroupAttendees: any;
        agendaNpsResponses: any;
        agendaReferrals: any;
        agendaNotificationEvents: any;
        pushSubscriptions: any;
        users: any;
        timelineEvents: any;
    };
    dbHelpers: { eq: any; and: any; or: any; asc: any; desc: any; gte: any; lte: any; lt: any; inArray: any; isNull: any };
    getAgendaProfile: (userId: string, accountId: string | null) => Promise<any>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    cancelActiveSubscriptionForUser: (userId: string, vertical: 'agenda', accountId?: string | null) => void;
    ensureAgendaProfile: (user: any) => Promise<any>;
    isFreePlan: (profile: any) => boolean;
    checkClientLimit: (profileId: string, additionalClients?: number, queryable?: any) => Promise<string | null>;
    checkAppointmentLimit: (profileId: string, additionalAppointments?: number, queryable?: any) => Promise<string | null>;
    generateSlots: (rules: any[], duration: number, dayStart: Date, existing: any[], blocked: any[], tz: string) => any[];
    isValidSlug: (slug: string) => { ok: boolean; error?: string };
    RESERVED_SLUGS: Set<string>;
    logAudit: (opts: any) => Promise<void>;
    logNotification: (opts: any) => Promise<void>;
    syncToGoogleCalendar: (profile: any, appt: any, action: 'create' | 'update' | 'delete', options?: { persistMeetingUrl?: boolean }) => Promise<any>;
    syncPropertyVisitToGoogleCalendar: (input: {
        visit: {
            id: string;
            accountId: string;
            visitType: string;
            startsAt: Date;
            durationMinutes: number;
            contactName: string;
            location: string | null;
            googleEventId: string | null;
            googleCalendarOwnerUserId: string | null;
        };
        listingTitle: string | null;
        targetUserId: string | null;
        action: 'upsert' | 'delete';
    }) => Promise<{ ok: boolean; eventId: string | null; ownerUserId: string | null; connected: boolean }>;
    sendPushToUser: (userId: string, payload: any) => Promise<void>;
    sendBookingConfirmationEmail: (email: string, opts: any) => Promise<void>;
    sendAppointmentReminderEmail: (email: string, opts: any) => Promise<boolean>;
    ensureNpsForAppointment: (professionalId: string, appointmentId: string, clientId: string | null) => Promise<{ token: string } | null>;
    createCheckoutPreference: (opts: any) => Promise<{ initPoint: string | null; [key: string]: any }>;
    google: any;
    VAPID_PUBLIC_KEY: string | undefined;
    VAPID_PRIVATE_KEY: string | undefined;
    webpush: any;
    rateLimit: (opts: any) => any;
}

type PreconsultFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
type PreconsultField = { id: string; label: string; type: PreconsultFieldType; required: boolean; placeholder?: string; options?: string[] };

const AGENDA_PRO_REQUIRED_MESSAGE = `Esta función está incluida en Pro (${AGENDA_PRICING.proMonthlyNetClp.toLocaleString('es-CL')} + IVA al mes).`;
const AGENDA_PRO_PLUS_REQUIRED_MESSAGE = `El dominio propio está incluido en Pro+ (${AGENDA_PRICING.proPlusMonthlyNetClp.toLocaleString('es-CL')} + IVA al mes).`;

function matchesLandingRevision(config: OperatorSiteLandingConfig, revision: string | null | undefined): boolean {
    return revision === undefined || revision === (config.draftRevision ?? null);
}

const PAGE_DRAFT_CONFLICT = 'El espacio o el borrador cambió. Actualiza la página para continuar.';

const AGENDA_PROFILE_FIELDS = [
    'id', 'accountId', 'userId', 'slug', 'isPublished', 'plan', 'planExpiresAt',
    'profession', 'accountKind', 'operatorSubtype', 'displayName', 'headline', 'bio', 'avatarUrl', 'coverUrl',
    'publicEmail', 'publicPhone', 'publicWhatsapp', 'city', 'region', 'address',
    'countryCode', 'regionId', 'localityId', 'serviceLocalities', 'servesOnline', 'servesPresential',
    'currency', 'timezone', 'bookingWindowDays', 'cancellationHours', 'confirmationMode', 'allowsRecurrentBooking',
    'alwaysOpen', 'scheduleNote', 'encuadre', 'requiresAdvancePayment', 'advancePaymentInstructions',
    'acceptsTransfer', 'acceptsMp', 'acceptsPaymentLink', 'paymentLinkUrl', 'bankTransferData',
    'websiteUrl', 'instagramUrl', 'facebookUrl', 'linkedinUrl', 'tiktokUrl', 'youtubeUrl', 'twitterUrl',
    'operatorSiteLayout', 'operatorSiteColorMode', 'operatorSiteAccentColor',
    'customDomain', 'customDomainStatus', 'customDomainVerifiedAt',
    'notificationsLastSeenAt', 'createdAt', 'updatedAt',
] as const;

function serializeAgendaProfile(profile: Record<string, unknown>) {
    return {
        ...Object.fromEntries(AGENDA_PROFILE_FIELDS.map((field) => [field, profile[field]])),
        operatorSiteLandingConfig: normalizeLandingConfig(profile.operatorSiteLandingConfig),
        mpConnected: Boolean(profile.mpAccessToken),
        googleCalendarConnected: Boolean(profile.googleCalendarId && profile.googleAccessToken),
    };
}

function normalizePreconsultFields(raw: unknown, randomUUID: () => string): PreconsultField[] {
    if (!Array.isArray(raw)) return [];
    const allowed: PreconsultFieldType[] = ['text', 'textarea', 'select', 'checkbox', 'number'];
    const out: PreconsultField[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as Record<string, unknown>;
        const label = typeof rec.label === 'string' ? rec.label.trim().slice(0, 200) : '';
        if (!label) continue;
        const type = allowed.includes(rec.type as PreconsultFieldType) ? rec.type as PreconsultFieldType : 'text';
        const id = typeof rec.id === 'string' && rec.id ? rec.id : randomUUID();
        const field: PreconsultField = { id, label, type, required: rec.required === true };
        if (typeof rec.placeholder === 'string') field.placeholder = rec.placeholder.slice(0, 200);
        if (type === 'select' && Array.isArray(rec.options)) {
            field.options = rec.options.map((o) => String(o).slice(0, 100)).filter(Boolean).slice(0, 20);
        }
        out.push(field);
        if (out.length >= 20) break;
    }
    return out;
}

function normalizePreconsultResponses(raw: unknown, fields: PreconsultField[]): Array<{ label: string; value: string }> | null {
    if (!fields.length) return null;
    const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    return fields.map((field) => {
        const v = input[field.id];
        let value = '';
        if (field.type === 'checkbox') value = v === true || v === 'true' ? 'Sí' : 'No';
        else if (v !== undefined && v !== null) value = String(v).slice(0, 2000);
        return { label: field.label, value };
    });
}

function normalizePromoCode(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) return null;
    return trimmed.length > 40 ? trimmed.slice(0, 40) : trimmed;
}

function parseOptionalNumber(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(raw: unknown): Date | null {
    if (typeof raw !== 'string' || !raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function applyPromotionToPrice(promotion: any, basePrice: number, serviceId: string | null, now: Date = new Date()): any {
    if (!promotion.isActive) return { ok: false, error: 'inactive', message: 'Este cupón está desactivado.' };
    if (promotion.startsAt && now < promotion.startsAt) return { ok: false, error: 'not_started', message: 'Este cupón aún no está vigente.' };
    if (promotion.endsAt && now > promotion.endsAt) return { ok: false, error: 'expired', message: 'Este cupón ya expiró.' };
    if (promotion.maxUses !== null && promotion.maxUses !== undefined && promotion.usesCount >= promotion.maxUses) return { ok: false, error: 'max_uses_reached', message: 'Este cupón alcanzó su límite de usos.' };
    if (promotion.appliesTo === 'services') {
        const list = Array.isArray(promotion.serviceIds) ? promotion.serviceIds : [];
        if (!serviceId || !list.includes(serviceId)) return { ok: false, error: 'service_not_eligible', message: 'Este cupón no aplica al servicio elegido.' };
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) return { ok: false, error: 'no_price', message: 'Este servicio no tiene precio, no se puede aplicar un cupón.' };
    const minAmount = promotion.minAmount ? Number(promotion.minAmount) : null;
    if (minAmount !== null && basePrice < minAmount) return { ok: false, error: 'min_amount_not_reached', message: `Monto mínimo para este cupón: ${minAmount.toLocaleString('es-CL')}.` };
    const value = Number(promotion.discountValue);
    let discountAmount = promotion.discountType === 'percent' ? Math.round((basePrice * value) / 100) : Math.round(value);
    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > basePrice) discountAmount = basePrice;
    return { ok: true, promotion, discountAmount, finalPrice: Math.max(0, basePrice - discountAmount), originalPrice: basePrice };
}

function isPublicAgendaPromotionVisible(promotion: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    maxUses: number | null;
    usesCount: number;
}, now: Date = new Date()) {
    if (!promotion.isActive) return false;
    if (promotion.startsAt && now < promotion.startsAt) return false;
    if (promotion.endsAt && now > promotion.endsAt) return false;
    if (promotion.maxUses !== null && promotion.maxUses !== undefined && promotion.usesCount >= promotion.maxUses) return false;
    return true;
}

function mapPublicAgendaProfile(
    profile: Record<string, any>,
    input: {
        services: any[];
        locations: any[];
        rules: any[];
        packs: any[];
        promotions: any[];
        operationalTz: string;
        operatingLocation: ReturnType<typeof operatingLocationFromAgendaProfile>;
    },
) {
    const { services, locations, rules, packs, promotions, operationalTz, operatingLocation } = input;
    return {
        slug: profile.slug,
        displayName: profile.displayName,
        profession: profile.profession,
        accountKind: profile.accountKind,
        operatorSubtype: profile.operatorSubtype,
        headline: profile.headline,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl ?? null,
        city: operatingLocation.localityName ?? profile.city,
        countryCode: operatingLocation.countryCode,
        region: operatingLocation.regionName ?? profile.region,
        regionId: profile.regionId,
        operatingLocation,
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
        timezone: operationalTz,
        servesOnline: profile.servesOnline,
        servesPresential: profile.servesPresential,
        serviceLocalities: profile.serviceLocalities ?? [],
        bookingWindowDays: profile.bookingWindowDays,
        allowsRecurrentBooking: profile.allowsRecurrentBooking,
        encuadre: profile.encuadre,
        bookingTermsText: bookingTermsFromRecord(profile),
        requiresAdvancePayment: profile.requiresAdvancePayment,
        advancePaymentInstructions: profile.advancePaymentInstructions,
        whatsappRemindersEnabled: Boolean(profile.whatsappRemindersEnabled ?? true),
        paymentMethods: {
            requiresAdvancePayment: profile.requiresAdvancePayment,
            acceptsMp: !!profile.acceptsMp,
            acceptsTransfer: Boolean(profile.acceptsTransfer && profile.bankTransferData),
            acceptsPaymentLink: !!profile.acceptsPaymentLink,
            mpConnected: !!(profile.acceptsMp && profile.mpAccessToken),
            paymentLinkUrl: profile.acceptsPaymentLink ? (profile.paymentLinkUrl ?? null) : null,
            bankTransferData: profile.acceptsTransfer ? (profile.bankTransferData ?? null) : null,
        },
        customDomain: profile.customDomain && profile.customDomainStatus === 'verified' ? profile.customDomain : null,
        schedule: {
            alwaysOpen: Boolean(profile.alwaysOpen),
            scheduleNote: profile.scheduleNote ?? null,
            rules: rules.map((rule) => ({
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
                breakStart: rule.breakStart ?? null,
                breakEnd: rule.breakEnd ?? null,
                isActive: rule.isActive !== false,
            })),
        },
        services,
        packs: packs.map((pack) => ({
            id: pack.id,
            name: pack.name,
            description: pack.description ?? null,
            sessionsCount: pack.sessionsCount,
            price: String(pack.price),
            currency: pack.currency,
            validityDays: pack.validityDays ?? null,
        })),
        promotions: promotions.map((promo) => ({
            id: promo.id,
            label: promo.label,
            description: promo.description ?? null,
            discountType: promo.discountType,
            discountValue: String(promo.discountValue),
            code: promo.code ?? null,
        })),
        locations: locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            addressLine: loc.addressLine,
            city: loc.city,
            region: loc.region,
            notes: loc.notes,
            googleMapsUrl: loc.googleMapsUrl,
        })),
        appearance: {
            layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
            colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
            accentColor: profile.operatorSiteAccentColor,
        },
        // Only the explicitly approved content crosses the public boundary.
        landingPage: normalizeLandingConfig(profile.operatorSiteLandingConfig).published,
    };
}

const PROMOTION_DISCOUNT_TYPES = new Set(['percent', 'fixed']);
const PROMOTION_APPLIES_TO = new Set(['all', 'services']);
const PACK_APPLIES_TO = new Set(['all', 'services']);
const CLIENT_PACK_STATUS = new Set(['active', 'expired', 'completed', 'refunded']);
const REFERRAL_STATUSES = ['pending', 'converted', 'rewarded', 'cancelled'] as const;
const GROUP_ATTENDEE_STATUS = new Set(['registered', 'attended', 'no_show', 'cancelled']);
const AGENDA_SERVICE_KINDS = new Set(['appointment', 'group_event']);
const GROUP_SESSION_STATUS = new Set(['scheduled', 'completed', 'cancelled']);
const ATTACHMENT_KINDS = ['document', 'image', 'prescription', 'other'] as const;
const ACCOUNT_VISIT_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
const ACCOUNT_VISIT_TYPES = ['property_visit', 'brokerage_meeting'] as const;

const accountVisitCreateSchema = z.object({
    visitType: z.enum(ACCOUNT_VISIT_TYPES).default('property_visit'),
    listingId: z.string().uuid().nullable().optional(),
    contactUserId: z.string().uuid().nullable().optional(),
    contactName: z.string().max(160).optional(),
    contactPhone: z.string().max(30).optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    startsAt: z.string().min(1),
    durationMinutes: z.coerce.number().int().min(15).max(240).default(30),
    location: z.string().max(255).optional(),
    internalNotes: z.string().max(2000).optional(),
}).refine((value) => value.visitType !== 'property_visit' || Boolean(value.listingId), {
    path: ['listingId'],
    message: 'Elige una propiedad o proyecto para esta visita.',
});

const accountVisitPatchSchema = z.object({
    startsAt: z.string().min(1).optional(),
    durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    status: z.enum(ACCOUNT_VISIT_STATUSES).optional(),
    location: z.string().max(255).nullable().optional(),
    internalNotes: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

function publicAccountVisit(visit: any) {
    if (!visit) return visit;
    const response = { ...visit };
    delete response.googleEventId;
    delete response.googleCalendarOwnerUserId;
    return response;
}

type PropertyVisitTeamContext = {
    accountId: string;
    accountName: string;
    isPersonal: boolean;
    ownerUserId: string;
    accountKind: string | null;
    enabled: boolean;
    teamMode: boolean;
    role: string;
    canManage: boolean;
};

const ACCOUNT_VISIT_MEMBER_PAGE_SIZE = 50;

function formatPublicReviewAuthor(rawName?: string | null): string {
    const parts = (rawName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Paciente verificado';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]?.toUpperCase() ?? ''}.`;
}

function resolveStarsFromNps(row: { ratingStars?: number | null; score?: number | null }): number {
    if (typeof row.ratingStars === 'number' && row.ratingStars >= 1 && row.ratingStars <= 5) {
        return Math.round(row.ratingStars);
    }
    const score = typeof row.score === 'number' ? row.score : 10;
    return Math.max(1, Math.min(5, Math.round(score / 2)));
}

function resolvePublicProfileUrls(profile: any) {
    const agendaAppUrl = (typeof process.env.AGENDA_APP_URL === 'string' && process.env.AGENDA_APP_URL.trim()) || 'https://simpleagenda.app';
    const hasVerifiedDomain = Boolean(
        profile?.customDomain
        && profile?.customDomainStatus === 'verified'
        && hasAgendaProPlusAccess(profile),
    );
    const baseUrl = hasVerifiedDomain ? `https://${profile.customDomain}` : agendaAppUrl;
    const bookingUrl = hasVerifiedDomain ? baseUrl : `${baseUrl}/${encodeURIComponent(profile.slug)}`;
    return { agendaAppUrl, baseUrl, bookingUrl };
}

async function refreshAgendaMpToken(db: any, agendaProfessionalProfiles: any, eq: any, profile: any): Promise<string | null> {
    if (!profile?.mpRefreshToken) return null;
    const refreshed = await refreshMercadoPagoOperatorOAuthToken(String(profile.mpRefreshToken));
    if (!refreshed?.accessToken) return null;
    await db.update(agendaProfessionalProfiles).set({
        mpAccessToken: refreshed.accessToken,
        mpRefreshToken: refreshed.refreshToken ?? profile.mpRefreshToken,
        ...(refreshed.publicKey ? { mpPublicKey: refreshed.publicKey } : {}),
        updatedAt: new Date(),
    }).where(eq(agendaProfessionalProfiles.id, profile.id));
    profile.mpAccessToken = refreshed.accessToken;
    profile.mpRefreshToken = refreshed.refreshToken ?? profile.mpRefreshToken;
    return refreshed.accessToken;
}

export function createAgendaRouter(deps: AgendaRouterDeps) {
    const {
        authUser, requireVerifiedSession, asString, randomUUID, randomBytes, SESSION_SECRET,
        db, sql, tables, dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        getAgendaProfile: getAgendaProfileForAccount, getPrimaryAccountIdForUser,
        ensureAgendaProfile, isFreePlan, checkClientLimit, checkAppointmentLimit, generateSlots,
        isValidSlug, logAudit, logNotification, syncToGoogleCalendar, syncPropertyVisitToGoogleCalendar, sendPushToUser,
        sendBookingConfirmationEmail, sendAppointmentReminderEmail,
        ensureNpsForAppointment, createCheckoutPreference,
        google, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, webpush, rateLimit,
    } = deps;

    const {
        agendaProfessionalProfiles, agendaServices, agendaAvailabilityRules, agendaBlockedSlots,
        agendaLocations, agendaClients, agendaClientTags, agendaClientTagAssignments,
        agendaClientAttachments, agendaAppointments, agendaSessionNotes, agendaPayments,
        agendaPromotions, agendaPacks, agendaClientPacks, agendaGroupAttendees,
        agendaNpsResponses, agendaReferrals, agendaNotificationEvents, pushSubscriptions, users,
        timelineEvents,
    } = tables;

    const proGateError = (profile: any) =>
        isFreePlan(profile) ? AGENDA_PRO_REQUIRED_MESSAGE : null;
    const proPlusGateError = (profile: any) =>
        hasAgendaProPlusAccess(profile) ? null : AGENDA_PRO_PLUS_REQUIRED_MESSAGE;

    async function areProfileAppointmentServices(profileId: string, serviceIds: string[], queryable: any = db) {
        const uniqueIds = [...new Set(serviceIds)];
        if (uniqueIds.some((id) => !id)) return false;
        if (uniqueIds.length === 0) return true;
        const rows = await queryable.select({ id: agendaServices.id })
            .from(agendaServices)
            .where(and(
                eq(agendaServices.professionalId, profileId),
                eq(agendaServices.kind, 'appointment'),
                inArray(agendaServices.id, uniqueIds),
            ));
        return rows.length === uniqueIds.length;
    }

    async function getCurrentAgendaProfile(userId: string) {
        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(userId)
            : null;
        const accountId = deps.getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await getPrimaryAccountIdForUser(userId);
        if (!accountId) return null;
        return getAgendaProfileForAccount(userId, accountId);
    }

    async function withCurrentAgendaProfileWrite<T>(
        userId: string,
        profile: any,
        write: (tx: any, current: any) => Promise<T>,
    ): Promise<T | null> {
        const accountId = typeof profile?.accountId === 'string' ? profile.accountId : null;
        if (!accountId) return null;
        const result = await runAccountMemberWrite(db, { userId, accountId }, async (tx) => {
            const [current] = await tx.select().from(agendaProfessionalProfiles)
                .where(and(
                    eq(agendaProfessionalProfiles.id, profile.id),
                    eq(agendaProfessionalProfiles.userId, userId),
                    eq(agendaProfessionalProfiles.accountId, accountId),
                ))
                .limit(1)
                .for('update');
            if (!current) return { found: false as const };
            return { found: true as const, value: await write(tx, current) };
        });
        if (!result.ok || !result.value.found) return null;
        return result.value.value;
    }

    async function getAgendaPublishMissing(
        executor: typeof db,
        profile: { id: string; displayName?: string | null; profession?: string | null; slug?: string | null; alwaysOpen?: boolean },
    ): Promise<string[]> {
        const missing: string[] = [];
        if (!profile.displayName?.trim()) missing.push('nombre público');
        if (!profile.profession?.trim()) missing.push('actividad');
        if (!profile.slug?.trim()) missing.push('enlace público');

        const [service] = await executor
            .select({ id: agendaServices.id })
            .from(agendaServices)
            .where(and(
                eq(agendaServices.professionalId, profile.id),
                eq(agendaServices.isActive, true),
                eq(agendaServices.kind, 'appointment'),
            ))
            .limit(1);
        if (!service) missing.push('un servicio reservable');

        if (!profile.alwaysOpen) {
            const rules: Array<{ startTime: string; endTime: string }> = await executor
                .select({ startTime: agendaAvailabilityRules.startTime, endTime: agendaAvailabilityRules.endTime })
                .from(agendaAvailabilityRules)
                .where(and(
                    eq(agendaAvailabilityRules.professionalId, profile.id),
                    eq(agendaAvailabilityRules.isActive, true),
                ));
            if (!rules.some((rule) => rule.startTime && rule.endTime)) missing.push('un horario');
        }
        return missing;
    }

    async function getAgendaOAuthProfile(context: {
        profileId: string;
        userId: string;
        accountId: string | null;
    }) {
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: and(
                eq(agendaProfessionalProfiles.id, context.profileId),
                eq(agendaProfessionalProfiles.userId, context.userId),
            ),
        });
        if (!profile || (profile.accountId ?? null) !== context.accountId) return null;

        if (context.accountId) {
            const [membership] = await db.select({ id: accountUsers.id })
                .from(accountUsers)
                .where(and(
                    eq(accountUsers.accountId, context.accountId),
                    eq(accountUsers.userId, context.userId),
                ))
                .limit(1);
            if (!membership) return null;
        }

        return profile;
    }

    async function saveAgendaOAuthProfileTokens(
        context: { profileId: string; userId: string; accountId: string | null },
        tokens: Partial<typeof agendaProfessionalProfiles.$inferInsert>,
    ): Promise<boolean> {
        return db.transaction(async (tx: any) => {
            if (context.accountId) {
                const [membership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, context.accountId),
                        eq(accountUsers.userId, context.userId),
                    ))
                    .limit(1)
                    .for('update');
                if (!membership) return false;
            }

            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ ...tokens, updatedAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, context.profileId),
                    eq(agendaProfessionalProfiles.userId, context.userId),
                    context.accountId
                        ? eq(agendaProfessionalProfiles.accountId, context.accountId)
                        : isNull(agendaProfessionalProfiles.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return Boolean(updated);
        });
    }

    async function hasPropertyVisitSchedulingConflict(input: {
        accountId: string;
        userId: string | null;
        startsAt: Date;
        durationMinutes: number;
        excludeVisitId?: string;
    }, queryable: any = db): Promise<boolean> {
        if (!input.userId) return false;
        const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);

        // Las citas privadas solo bloquean el horario; la respuesta no expone sus datos.
        const [privateAppointment] = await queryable.select({ id: agendaAppointments.id })
            .from(agendaAppointments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
            .where(and(
                eq(agendaProfessionalProfiles.userId, input.userId),
                eq(agendaAppointments.status, 'confirmed'),
                lt(agendaAppointments.startsAt, endsAt),
                sql`${agendaAppointments.endsAt} > ${input.startsAt}`,
            ))
            .limit(1);
        if (privateAppointment) return true;

        const visitConditions: SQL[] = [
            eq(agendaAccountVisits.accountId, input.accountId),
            eq(agendaAccountVisits.assignedUserId, input.userId),
            inArray(agendaAccountVisits.status, ['scheduled', 'confirmed']),
            lt(agendaAccountVisits.startsAt, endsAt),
            sql`(${agendaAccountVisits.startsAt} + ${agendaAccountVisits.durationMinutes} * interval '1 minute') > ${input.startsAt}`,
        ];
        if (input.excludeVisitId) {
            visitConditions.push(sql`${agendaAccountVisits.id} <> ${input.excludeVisitId}`);
        }
        const [teamVisit] = await queryable.select({ id: agendaAccountVisits.id })
            .from(agendaAccountVisits)
            .where(and(...visitConditions))
            .limit(1);
        return Boolean(teamVisit);
    }

    function getGoogleOAuth2Client() {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/google-calendar/callback`,
        );
    }

    const app = new Hono();

    async function resolvePropertyVisitContext(userId: string): Promise<PropertyVisitTeamContext | null> {
        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(userId)
            : null;
        const accountId = deps.getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await deps.getPrimaryAccountIdForUser(userId);
        const currentMembership = membership?.accountId === accountId
            ? membership
            : accountId
                ? deps.getAccountMembershipsForUser(userId).find((item: any) => item.accountId === accountId) ?? null
                : null;
        if (!accountId || !currentMembership) return null;

        const [account] = await db
            .select({ id: accounts.id, name: accounts.name, isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);
        const [workspace] = await db
            .select({ accountKind: accountVerticalSettings.accountKind })
            .from(accountVerticalSettings)
            .where(and(
                eq(accountVerticalSettings.accountId, accountId),
                eq(accountVerticalSettings.vertical, 'propiedades'),
            ))
            .limit(1);

        const profileScope = account?.isPersonal && account.ownerUserId === userId
            ? or(
                eq(publicProfiles.accountId, accountId),
                and(eq(publicProfiles.userId, userId), isNull(publicProfiles.accountId)),
            )!
            : eq(publicProfiles.accountId, accountId);
        const [profile] = account
            ? await db.select({ accountKind: publicProfiles.accountKind })
                .from(publicProfiles)
                .where(and(
                    eq(publicProfiles.vertical, 'propiedades'),
                    profileScope,
                ))
                .limit(1)
            : [];
        const accountKind = account?.isPersonal === false
            ? workspace?.accountKind === 'company' || (!workspace?.accountKind && profile?.accountKind === 'company')
                ? 'company'
                : null
            : workspace?.accountKind ?? profile?.accountKind ?? null;
        const enabled = Boolean(account && accountKind);
        const teamMode = Boolean(enabled && account && !account.isPersonal && accountKind === 'company');
        if (!enabled) {
            return {
                accountId,
                accountName: account?.name ?? 'Simple',
                isPersonal: account?.isPersonal ?? true,
                ownerUserId: account?.ownerUserId ?? userId,
                accountKind,
                enabled: false,
                teamMode: false,
                role: currentMembership.role as string,
                canManage: false,
            };
        }

        return {
            accountId,
            accountName: account?.name ?? 'Simple',
            isPersonal: account?.isPersonal ?? true,
            ownerUserId: account?.ownerUserId ?? userId,
            accountKind,
            enabled: true,
            teamMode,
            role: currentMembership.role as string,
            canManage: canManageAccountRole(currentMembership.role),
        };
    }

    async function lockPropertyVisitWorkspace(tx: any, context: PropertyVisitTeamContext): Promise<boolean> {
        const [account] = await tx.select({
            id: accounts.id,
            isPersonal: accounts.isPersonal,
            ownerUserId: accounts.ownerUserId,
        })
            .from(accounts)
            .where(eq(accounts.id, context.accountId))
            .limit(1)
            .for('update');
        if (!account
            || account.isPersonal !== context.isPersonal
            || account.ownerUserId !== context.ownerUserId) return false;

        const [workspace] = await tx.select({ accountKind: accountVerticalSettings.accountKind })
            .from(accountVerticalSettings)
            .where(and(
                eq(accountVerticalSettings.accountId, context.accountId),
                eq(accountVerticalSettings.vertical, 'propiedades'),
            ))
            .limit(1)
            .for('update');
        let accountKind = account.isPersonal
            ? workspace?.accountKind ?? null
            : workspace?.accountKind === 'company' ? 'company' : null;
        if (!workspace?.accountKind) {
            const profileScope = account.isPersonal && account.ownerUserId === context.ownerUserId
                ? or(
                    eq(publicProfiles.accountId, context.accountId),
                    and(eq(publicProfiles.userId, context.ownerUserId), isNull(publicProfiles.accountId)),
                )!
                : eq(publicProfiles.accountId, context.accountId);
            const [profile] = await tx.select({ accountKind: publicProfiles.accountKind })
                .from(publicProfiles)
                .where(and(
                    eq(publicProfiles.vertical, 'propiedades'),
                    profileScope,
                ))
                .limit(1)
                .for('update');
            accountKind = account.isPersonal
                ? profile?.accountKind ?? null
                : profile?.accountKind === 'company' ? 'company' : null;
        }
        const teamMode = Boolean(!account.isPersonal && accountKind === 'company');
        return Boolean(accountKind && accountKind === context.accountKind && teamMode === context.teamMode);
    }

    async function getAssignedVisitListingIds(
        context: PropertyVisitTeamContext,
        userId: string,
        queryable: any = db,
        lockRows = false,
    ): Promise<string[]> {
        if (context.canManage) return [];
        const query = queryable.select({ listingId: accountListingAssignments.listingId })
            .from(accountListingAssignments)
            .where(and(
                eq(accountListingAssignments.accountId, context.accountId),
                eq(accountListingAssignments.vertical, 'propiedades'),
                eq(accountListingAssignments.assignedUserId, userId),
            ));
        const rows = lockRows ? await query.for('update') : await query;
        return rows.map((row: any) => row.listingId);
    }

    function propertyVisitListingScope(
        context: PropertyVisitTeamContext,
        userId: string,
        assignedListingIds: string[],
    ) {
        const accountScope = context.isPersonal
            ? or(
                eq(listings.accountId, context.accountId),
                and(eq(listings.ownerId, context.ownerUserId), isNull(listings.accountId)),
            )!
            : eq(listings.accountId, context.accountId);
        if (context.canManage) return accountScope;

        const allowedListingScopes: SQL[] = [eq(listings.ownerId, userId)];
        if (assignedListingIds.length) {
            allowedListingScopes.push(inArray(listings.id, assignedListingIds));
        }
        return and(accountScope, or(...allowedListingScopes)!);
    }

    function propertyVisitConversationScope(context: PropertyVisitTeamContext, userId: string) {
        const accountScope = eq(messageThreads.accountId, context.accountId);
        if (!context.isPersonal) return accountScope;
        return or(
            accountScope,
            and(eq(messageThreads.ownerUserId, userId), isNull(messageThreads.accountId)),
        )!;
    }

    async function canAccessVisitContact(
        context: PropertyVisitTeamContext,
        userId: string,
        personId: string,
        assignedListingIds: string[],
        queryable: any = db,
        lockRows = false,
    ): Promise<boolean> {
        if (context.canManage) return true;
        const relationshipQuery = queryable.select({ id: accountRelationshipAssignments.id })
            .from(accountRelationshipAssignments)
            .where(and(
                eq(accountRelationshipAssignments.accountId, context.accountId),
                eq(accountRelationshipAssignments.vertical, 'propiedades'),
                eq(accountRelationshipAssignments.personId, personId),
                eq(accountRelationshipAssignments.assignedUserId, userId),
            ))
            .limit(1);
        const [assignedRelationship] = lockRows
            ? await relationshipQuery.for('update')
            : await relationshipQuery;
        if (assignedRelationship) return true;

        const threadAccess: SQL[] = [eq(messageThreads.ownerUserId, userId)];
        if (assignedListingIds.length) {
            threadAccess.push(inArray(messageThreads.listingId, assignedListingIds));
        }
        const threadQuery = queryable.select({ id: messageThreads.id })
            .from(messageThreads)
            .where(and(
                propertyVisitConversationScope(context, userId),
                eq(messageThreads.vertical, 'propiedades'),
                eq(messageThreads.contextType, 'listing'),
                eq(messageThreads.buyerUserId, personId),
                or(...threadAccess)!,
            ))
            .limit(1);
        const [accessibleThread] = lockRows
            ? await threadQuery.for('update')
            : await threadQuery;
        return Boolean(accessibleThread);
    }

    async function syncPropertyVisitCalendar(
        visit: typeof agendaAccountVisits.$inferSelect,
        listingTitle: string | null,
        targetUserId: string | null,
        action: 'upsert' | 'delete',
    ) {
        try {
            const result = await syncPropertyVisitToGoogleCalendar({
                visit,
                listingTitle,
                targetUserId,
                action,
            });
            if (!result.ok) return visit;
            const [updatedVisit] = await db.update(agendaAccountVisits)
                .set({
                    googleEventId: result.eventId,
                    googleCalendarOwnerUserId: result.ownerUserId,
                })
                .where(and(
                    eq(agendaAccountVisits.id, visit.id),
                    eq(agendaAccountVisits.accountId, visit.accountId),
                ))
                .returning();
            return updatedVisit ?? {
                ...visit,
                googleEventId: result.eventId,
                googleCalendarOwnerUserId: result.ownerUserId,
            };
        } catch {
            console.warn('[agenda] property visit calendar sync did not complete', { visitId: visit.id });
            return visit;
        }
    }

    app.get('/account-visits/context', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const context = await resolvePropertyVisitContext(user.id);
        if (!context) return c.json({ ok: true, enabled: false });
        return c.json({
            ok: true,
            enabled: context.enabled,
            teamMode: context.teamMode,
            accountName: context.accountName,
            role: context.role,
            canManage: context.canManage,
        });
    });

    app.get('/account-visits', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const context = await resolvePropertyVisitContext(user.id);
        if (!context) return c.json({ ok: true, enabled: false, teamMode: false, visits: [], listings: [], contacts: [], members: [] });
        if (!context.enabled) {
            return c.json({ ok: true, enabled: false, teamMode: false, accountName: context.accountName, visits: [], listings: [], contacts: [], members: [] });
        }

        const now = Date.now();
        const windowStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const windowEnd = new Date(now + 120 * 24 * 60 * 60 * 1000);
        const visitConditions: SQL[] = [
            eq(agendaAccountVisits.accountId, context.accountId),
            gte(agendaAccountVisits.startsAt, windowStart),
            lte(agendaAccountVisits.startsAt, windowEnd),
        ];
        if (!context.canManage) {
            visitConditions.push(or(
                eq(agendaAccountVisits.assignedUserId, user.id),
                eq(agendaAccountVisits.createdByUserId, user.id),
            )!);
        }
        const [assignedListingIds, assignedContactRows] = await Promise.all([
            getAssignedVisitListingIds(context, user.id),
            context.canManage
                ? Promise.resolve([])
                : db.select({ personId: accountRelationshipAssignments.personId })
                    .from(accountRelationshipAssignments)
                    .where(and(
                        eq(accountRelationshipAssignments.accountId, context.accountId),
                        eq(accountRelationshipAssignments.vertical, 'propiedades'),
                        eq(accountRelationshipAssignments.assignedUserId, user.id),
                    )),
        ]);
        const contactAccessScopes: SQL[] = [eq(messageThreads.ownerUserId, user.id)];
        if (assignedListingIds.length) {
            contactAccessScopes.push(inArray(messageThreads.listingId, assignedListingIds));
        }
        if (assignedContactRows.length) {
            contactAccessScopes.push(inArray(
                messageThreads.buyerUserId,
                assignedContactRows.map((row: any) => row.personId),
            ));
        }
        const contactConditions: SQL[] = [
            propertyVisitConversationScope(context, user.id),
            eq(messageThreads.vertical, 'propiedades'),
            eq(messageThreads.contextType, 'listing'),
        ];
        if (!context.canManage) contactConditions.push(or(...contactAccessScopes)!);

        const [visitRows, propertyRows, contactRows, memberRows] = await Promise.all([
            db.select({ visit: agendaAccountVisits, assignedUserName: users.name })
                .from(agendaAccountVisits)
                .leftJoin(accountUsers, and(
                    eq(accountUsers.accountId, context.accountId),
                    eq(accountUsers.userId, agendaAccountVisits.assignedUserId),
                ))
                .leftJoin(users, eq(users.id, accountUsers.userId))
                .where(and(...visitConditions))
                .orderBy(asc(agendaAccountVisits.startsAt))
                .limit(300),
            db.select({ id: listings.id, title: listings.title })
                .from(listings)
                .where(and(
                    propertyVisitListingScope(context, user.id, assignedListingIds),
                    eq(listings.vertical, 'propiedades'),
                    inArray(listings.status, ['active', 'paused']),
                ))
                .orderBy(asc(listings.title))
                .limit(300),
            db.selectDistinct({
                id: messageThreads.buyerUserId,
                name: users.name,
                email: users.email,
            })
                .from(messageThreads)
                .innerJoin(users, eq(messageThreads.buyerUserId, users.id))
                .where(and(...contactConditions))
                .orderBy(asc(users.name))
                .limit(300),
            context.canManage
                ? db.select({
                    userId: accountUsers.userId,
                    name: users.name,
                    role: accountUsers.role,
                })
                    .from(accountUsers)
                    .innerJoin(users, eq(accountUsers.userId, users.id))
                    .where(eq(accountUsers.accountId, context.accountId))
                    .orderBy(asc(users.name), asc(accountUsers.userId))
                    .limit(ACCOUNT_VISIT_MEMBER_PAGE_SIZE + 1)
                : Promise.resolve([]),
        ]);
        const visits = visitRows.map(({ visit, assignedUserName }: any) => ({
            ...publicAccountVisit(visit),
            assignedUserName: assignedUserName?.trim() || null,
        }));
        const membersHaveMore = memberRows.length > ACCOUNT_VISIT_MEMBER_PAGE_SIZE;
        const members = memberRows.slice(0, ACCOUNT_VISIT_MEMBER_PAGE_SIZE).map((member: any) => ({
            userId: member.userId,
            name: member.name?.trim() || 'Integrante',
            role: member.role,
        }));

        return c.json({
            ok: true,
            enabled: true,
            teamMode: context.teamMode,
            accountName: context.accountName,
            role: context.role,
            canManage: context.canManage,
            members,
            membersHaveMore,
            visits,
            listings: propertyRows,
            contacts: contactRows.map((contact: any) => ({
                id: contact.id,
                name: contact.name?.trim() || contact.email || 'Interesado',
                email: contact.email ?? null,
            })),
        });
    });

    app.get('/account-visits/members', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const context = await resolvePropertyVisitContext(user.id);
        if (!context?.enabled || !context.canManage) {
            return c.json({ ok: false, error: 'Solo quien administra el espacio puede buscar responsables.' }, 403);
        }

        const rawOffset = c.req.query('offset') ?? '0';
        const offset = Number(rawOffset);
        if (!Number.isSafeInteger(offset) || offset < 0) {
            return c.json({ ok: false, error: 'La página solicitada no es válida.' }, 400);
        }
        const query = (c.req.query('q') ?? '').trim().slice(0, 120);
        const conditions: SQL[] = [eq(accountUsers.accountId, context.accountId)];
        if (query) {
            const pattern = `%${query}%`;
            conditions.push(or(
                ilike(users.name, pattern),
                ilike(users.email, pattern),
            )!);
        }
        const rows = await db.select({
            userId: accountUsers.userId,
            name: users.name,
            role: accountUsers.role,
        })
            .from(accountUsers)
            .innerJoin(users, eq(accountUsers.userId, users.id))
            .where(and(...conditions))
            .orderBy(asc(users.name), asc(accountUsers.userId))
            .limit(ACCOUNT_VISIT_MEMBER_PAGE_SIZE + 1)
            .offset(offset);
        const hasMore = rows.length > ACCOUNT_VISIT_MEMBER_PAGE_SIZE;
        return c.json({
            ok: true,
            members: rows.slice(0, ACCOUNT_VISIT_MEMBER_PAGE_SIZE).map((member: any) => ({
                userId: member.userId,
                name: member.name?.trim() || 'Integrante',
                role: member.role,
            })),
            hasMore,
            nextOffset: offset + Math.min(rows.length, ACCOUNT_VISIT_MEMBER_PAGE_SIZE),
        });
    });

    app.post('/account-visits', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const payload = await c.req.json().catch(() => null);
        const parsed = accountVisitCreateSchema.safeParse(payload);
        if (!parsed.success) {
            const missingProperty = parsed.error.issues.some((issue) => issue.path[0] === 'listingId');
            return c.json({
                ok: false,
                error: missingProperty
                    ? 'Elige una propiedad o proyecto para esta visita.'
                    : 'Completa los datos de la visita o reunión.',
            }, 400);
        }

        const context = await resolvePropertyVisitContext(user.id);
        if (!context?.enabled) return c.json({ ok: false, error: 'Configura tu espacio en SimplePropiedades para coordinar visitas y reuniones.' }, 403);

        const startsAt = parseDateTimeInTimezone(parsed.data.startsAt, 'America/Santiago');
        if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
            return c.json({ ok: false, error: 'Elige una fecha y hora futuras.' }, 400);
        }

        const assignedListingIds = await getAssignedVisitListingIds(context, user.id);
        const visitType = parsed.data.visitType;
        const listingId = parsed.data.listingId ?? null;
        let listing: { id: string; title: string } | null = null;
        if (listingId) {
            const [matchedListing] = await db.select({ id: listings.id, title: listings.title })
                .from(listings)
                .where(and(
                    eq(listings.id, listingId),
                    propertyVisitListingScope(context, user.id, assignedListingIds),
                    eq(listings.vertical, 'propiedades'),
                    inArray(listings.status, ['active', 'paused']),
                ))
                .limit(1);
            listing = matchedListing ?? null;
            if (!listing) return c.json({ ok: false, error: 'La propiedad ya no está disponible en este espacio.' }, 400);
        }
        if (visitType === 'property_visit' && !listing) {
            return c.json({ ok: false, error: 'Elige una propiedad o proyecto para esta visita.' }, 400);
        }

        let contactName = parsed.data.contactName?.trim() ?? '';
        if (parsed.data.contactUserId) {
            const [conversation] = await db.select({ id: messageThreads.id })
                .from(messageThreads)
                .where(and(
                    propertyVisitConversationScope(context, user.id),
                    eq(messageThreads.vertical, 'propiedades'),
                    eq(messageThreads.contextType, 'listing'),
                    eq(messageThreads.buyerUserId, parsed.data.contactUserId),
                ))
                .limit(1);
            if (!conversation) return c.json({ ok: false, error: 'El contacto ya no pertenece a las consultas de este espacio.' }, 400);
            if (!await canAccessVisitContact(context, user.id, parsed.data.contactUserId, assignedListingIds)) {
                return c.json({ ok: false, error: 'Ese contacto no está asignado a tu cartera de trabajo.' }, 403);
            }
            const [contact] = await db.select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, parsed.data.contactUserId))
                .limit(1);
            contactName ||= contact?.name?.trim() || contact?.email || '';
        }
        if (contactName.length < 2) return c.json({ ok: false, error: 'Indica quién asistirá a la visita.' }, 400);

        const assignedUserId = context.canManage ? (parsed.data.assignedUserId || user.id) : user.id;
        if (!context.canManage && parsed.data.assignedUserId && parsed.data.assignedUserId !== user.id) {
            return c.json({ ok: false, error: 'Solo quien administra el espacio puede asignar visitas a otras personas.' }, 403);
        }

        const creation = await db.transaction(async (tx: any) => {
            const [actorMembership] = await tx.select({ role: accountUsers.role, isDefault: accountUsers.isDefault })
                .from(accountUsers)
                .where(and(
                    eq(accountUsers.accountId, context.accountId),
                    eq(accountUsers.userId, user.id),
                ))
                .limit(1)
                .for('update');
            if (!actorMembership) {
                return { ok: false as const, error: 'Ya no perteneces a este espacio de trabajo.', status: 403 as const };
            }
            if (!actorMembership.isDefault) {
                return { ok: false as const, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.', status: 409 as const };
            }
            if (actorMembership.role !== context.role) {
                return { ok: false as const, error: 'Tus permisos cambiaron. Actualiza el espacio e inténtalo nuevamente.', status: 409 as const };
            }
            const canManageNow = canManageAccountRole(actorMembership.role);
            if (canManageNow !== context.canManage) {
                return { ok: false as const, error: 'Tus permisos cambiaron. Actualiza el espacio e inténtalo nuevamente.', status: 409 as const };
            }
            if (!await lockPropertyVisitWorkspace(tx, context)) {
                return { ok: false as const, error: 'Este espacio ya no tiene habilitada la actividad de Propiedades.', status: 409 as const };
            }

            if (assignedUserId !== user.id) {
                const [assigneeMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, context.accountId),
                        eq(accountUsers.userId, assignedUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!assigneeMembership) {
                    return { ok: false as const, error: 'La persona asignada ya no pertenece a este equipo.', status: 400 as const };
                }
            }

            const currentAssignedListingIds = await getAssignedVisitListingIds(context, user.id, tx, true);
            let currentListingTitle: string | null = null;
            if (listingId) {
                const [currentListing] = await tx.select({ id: listings.id, title: listings.title })
                    .from(listings)
                    .where(and(
                        propertyVisitListingScope(context, user.id, currentAssignedListingIds),
                        eq(listings.id, listingId),
                        eq(listings.vertical, 'propiedades'),
                        inArray(listings.status, ['active', 'paused']),
                    ))
                    .limit(1)
                    .for('update');
                if (!currentListing) {
                    return { ok: false as const, error: 'La propiedad ya no está disponible en tu cartera de trabajo.', status: 403 as const };
                }
                currentListingTitle = currentListing.title;
            }

            if (parsed.data.contactUserId) {
                const [currentConversation] = await tx.select({ id: messageThreads.id })
                    .from(messageThreads)
                    .where(and(
                        propertyVisitConversationScope(context, user.id),
                        eq(messageThreads.vertical, 'propiedades'),
                        eq(messageThreads.contextType, 'listing'),
                        eq(messageThreads.buyerUserId, parsed.data.contactUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!currentConversation) {
                    return { ok: false as const, error: 'El contacto ya no pertenece a las consultas de este espacio.', status: 400 as const };
                }
                if (!await canAccessVisitContact(
                    context,
                    user.id,
                    parsed.data.contactUserId,
                    currentAssignedListingIds,
                    tx,
                    true,
                )) {
                    return { ok: false as const, error: 'Ese contacto ya no está asignado a tu cartera de trabajo.', status: 403 as const };
                }
            }

            if (await hasPropertyVisitSchedulingConflict({
                accountId: context.accountId,
                userId: assignedUserId,
                startsAt,
                durationMinutes: parsed.data.durationMinutes,
            }, tx)) {
                return { ok: false as const, error: 'Ese horario no está disponible para la persona responsable. Elige otro horario o responsable.', status: 409 as const };
            }

            const [visit] = await tx.insert(agendaAccountVisits).values({
                accountId: context.accountId,
                visitType,
                listingId,
                contactUserId: parsed.data.contactUserId ?? null,
                contactName: contactName.slice(0, 160),
                contactPhone: parsed.data.contactPhone?.trim().slice(0, 30) || null,
                assignedUserId,
                createdByUserId: user.id,
                startsAt,
                durationMinutes: parsed.data.durationMinutes,
                status: 'scheduled',
                location: parsed.data.location?.trim().slice(0, 255) || null,
                internalNotes: parsed.data.internalNotes?.trim().slice(0, 2000) || null,
                updatedAt: new Date(),
            }).returning();

            if (parsed.data.contactUserId && visitType === 'property_visit') {
                const [currentRelationship] = await tx.select({
                    assignedUserId: accountRelationshipAssignments.assignedUserId,
                    stage: accountRelationshipAssignments.stage,
                })
                    .from(accountRelationshipAssignments)
                    .where(and(
                        eq(accountRelationshipAssignments.accountId, context.accountId),
                        eq(accountRelationshipAssignments.vertical, 'propiedades'),
                        eq(accountRelationshipAssignments.personId, parsed.data.contactUserId),
                    ))
                    .limit(1)
                    .for('update');
                const currentStage = currentRelationship?.stage ?? 'new';
                const nextStage = ['new', 'contacted', 'visit_scheduled'].includes(currentStage)
                    ? 'visit_scheduled'
                    : currentStage;

                await tx.insert(accountRelationshipAssignments).values({
                    accountId: context.accountId,
                    vertical: 'propiedades',
                    personId: parsed.data.contactUserId,
                    assignedUserId: currentRelationship?.assignedUserId ?? assignedUserId,
                    assignedByUserId: user.id,
                    stage: nextStage,
                    updatedAt: new Date(),
                }).onConflictDoUpdate({
                    target: [
                        accountRelationshipAssignments.accountId,
                        accountRelationshipAssignments.vertical,
                        accountRelationshipAssignments.personId,
                    ],
                    set: { stage: nextStage, updatedAt: new Date() },
                });
            }

            return { ok: true as const, visit, assignedUserId, listingTitle: currentListingTitle };
        });
        if (!creation.ok) return c.json({ ok: false, error: creation.error }, creation.status);
        const {
            visit,
            assignedUserId: visitAssignedUserId,
            listingTitle: visitListingTitle,
        } = creation;

        if (parsed.data.contactUserId) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'visit.scheduled',
                business: { vertical: 'propiedades', id: context.accountId },
                person: { id: parsed.data.contactUserId, kind: 'user' },
                subject: {
                    kind: visitType === 'brokerage_meeting' ? 'account_business_visit' : 'account_property_visit',
                    id: visit.id,
                },
                actor: 'team_member',
                payload: {
                    visitType,
                    listingId: listing?.id ?? null,
                    listingTitle: visitListingTitle,
                    startsAt: startsAt.toISOString(),
                    assignedUserId: visitAssignedUserId,
                    contactName: contactName.slice(0, 160),
                },
            });
        }

        const visitWithCalendar = await syncPropertyVisitCalendar(
            visit,
            visitListingTitle,
            visitAssignedUserId,
            'upsert',
        );
        return c.json({ ok: true, visit: publicAccountVisit(visitWithCalendar) }, 201);
    });

    app.patch('/account-visits/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const visitId = c.req.param('id');
        if (!z.string().uuid().safeParse(visitId).success) return c.json({ ok: false, error: 'Visita no válida.' }, 400);
        const payload = await c.req.json().catch(() => null);
        const parsed = accountVisitPatchSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'No pudimos guardar esos cambios.' }, 400);

        const context = await resolvePropertyVisitContext(user.id);
        if (!context?.enabled) return c.json({ ok: false, error: 'No encontramos un espacio inmobiliario activo.' }, 403);
        const [visit] = await db.select().from(agendaAccountVisits)
            .where(and(
                eq(agendaAccountVisits.id, visitId),
                eq(agendaAccountVisits.accountId, context.accountId),
            ))
            .limit(1);
        if (!visit) return c.json({ ok: false, error: 'Visita no encontrada.' }, 404);
        if (!context.canManage && visit.assignedUserId !== user.id && visit.createdByUserId !== user.id) {
            return c.json({ ok: false, error: 'Esta visita no está asignada a tu trabajo.' }, 403);
        }
        if (!context.canManage && parsed.data.assignedUserId !== undefined) {
            return c.json({ ok: false, error: 'Solo quien administra el espacio puede cambiar la asignación.' }, 403);
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (parsed.data.startsAt !== undefined) {
            const startsAt = parseDateTimeInTimezone(parsed.data.startsAt, 'America/Santiago');
            if (!Number.isFinite(startsAt.getTime())) return c.json({ ok: false, error: 'La fecha y hora no son válidas.' }, 400);
            updates.startsAt = startsAt;
        }
        if (parsed.data.durationMinutes !== undefined) updates.durationMinutes = parsed.data.durationMinutes;
        if (parsed.data.status !== undefined) updates.status = parsed.data.status;
        if (parsed.data.location !== undefined) updates.location = parsed.data.location?.trim() || null;
        if (parsed.data.internalNotes !== undefined) updates.internalNotes = parsed.data.internalNotes?.trim() || null;
        if (parsed.data.assignedUserId !== undefined) updates.assignedUserId = parsed.data.assignedUserId;
        const nextStartsAt = parsed.data.startsAt === undefined ? visit.startsAt : new Date(parsed.data.startsAt);
        if (!Number.isFinite(nextStartsAt.getTime())) return c.json({ ok: false, error: 'La fecha y hora no son válidas.' }, 400);
        const nextDurationMinutes = parsed.data.durationMinutes ?? visit.durationMinutes;
        const nextAssignedUserId = parsed.data.assignedUserId === undefined
            ? visit.assignedUserId
            : parsed.data.assignedUserId;
        const nextStatus = parsed.data.status ?? visit.status;
        if (
            (parsed.data.startsAt !== undefined || parsed.data.status !== undefined)
            && ['scheduled', 'confirmed'].includes(nextStatus)
            && nextStartsAt.getTime() <= Date.now()
        ) {
            return c.json({ ok: false, error: 'Elige una fecha futura para mantener la visita agendada.' }, 400);
        }
        if (
            parsed.data.startsAt !== undefined
            || parsed.data.status !== undefined
            || parsed.data.assignedUserId !== undefined
        ) {
            updates.reminderSentAt = null;
        }

        const updateResult = await db.transaction(async (tx: any) => {
            const [actorMembership] = await tx.select({ role: accountUsers.role, isDefault: accountUsers.isDefault })
                .from(accountUsers)
                .where(and(
                    eq(accountUsers.accountId, context.accountId),
                    eq(accountUsers.userId, user.id),
                ))
                .limit(1)
                .for('update');
            if (!actorMembership) {
                return { ok: false as const, error: 'Ya no perteneces a este espacio de trabajo.', status: 403 as const };
            }
            if (!actorMembership.isDefault) {
                return { ok: false as const, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.', status: 409 as const };
            }
            if (actorMembership.role !== context.role) {
                return { ok: false as const, error: 'Tus permisos cambiaron. Actualiza el espacio e inténtalo nuevamente.', status: 409 as const };
            }
            const canManageNow = canManageAccountRole(actorMembership.role);
            if (canManageNow !== context.canManage) {
                return { ok: false as const, error: 'Tus permisos cambiaron. Actualiza el espacio e inténtalo nuevamente.', status: 409 as const };
            }
            if (!await lockPropertyVisitWorkspace(tx, context)) {
                return { ok: false as const, error: 'Este espacio ya no tiene habilitada la actividad de Propiedades.', status: 409 as const };
            }

            const candidateAssigneeUserId = parsed.data.assignedUserId === undefined
                ? visit.assignedUserId
                : parsed.data.assignedUserId;
            if (candidateAssigneeUserId) {
                const [assigneeMembership] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, context.accountId),
                        eq(accountUsers.userId, candidateAssigneeUserId),
                    ))
                    .limit(1)
                    .for('update');
                if (!assigneeMembership) {
                    return { ok: false as const, error: 'La persona asignada ya no pertenece a este equipo.', status: 400 as const };
                }
            }

            const [lockedVisit] = await tx.select().from(agendaAccountVisits)
                .where(and(
                    eq(agendaAccountVisits.id, visitId),
                    eq(agendaAccountVisits.accountId, context.accountId),
                ))
                .limit(1)
                .for('update');
            if (!lockedVisit) {
                return { ok: false as const, error: 'Visita no encontrada.', status: 404 as const };
            }
            if (lockedVisit.updatedAt.getTime() !== visit.updatedAt.getTime()) {
                return { ok: false as const, error: 'La visita cambió mientras la editabas. Recarga e inténtalo nuevamente.', status: 409 as const };
            }
            if (!canManageNow && lockedVisit.assignedUserId !== user.id && lockedVisit.createdByUserId !== user.id) {
                return { ok: false as const, error: 'Esta visita ya no está asignada a tu trabajo.', status: 403 as const };
            }
            if (!canManageNow && parsed.data.assignedUserId !== undefined) {
                return { ok: false as const, error: 'Solo quien administra el espacio puede cambiar la asignación.', status: 403 as const };
            }

            if (
                ['scheduled', 'confirmed'].includes(nextStatus)
                && await hasPropertyVisitSchedulingConflict({
                    accountId: context.accountId,
                    userId: nextAssignedUserId,
                    startsAt: nextStartsAt,
                    durationMinutes: nextDurationMinutes,
                    excludeVisitId: lockedVisit.id,
                }, tx)
            ) {
                return { ok: false as const, error: 'Ese horario no está disponible para la persona responsable. Elige otro horario o responsable.', status: 409 as const };
            }

            const [updated] = await tx.update(agendaAccountVisits)
                .set(updates)
                .where(and(
                    eq(agendaAccountVisits.id, visitId),
                    eq(agendaAccountVisits.accountId, context.accountId),
                ))
                .returning();
            if (
                parsed.data.startsAt !== undefined
                || parsed.data.status !== undefined
                || parsed.data.assignedUserId !== undefined
            ) {
                await tx.delete(platformNotifications).where(and(
                    eq(platformNotifications.vertical, 'agenda'),
                    inArray(platformNotifications.entityType, ['account_property_visit', 'account_business_visit']),
                    eq(platformNotifications.entityId, visitId),
                    sql`${platformNotifications.metadata}->>'accountId' = ${context.accountId}`,
                ));
            }
            return updated
                ? { ok: true as const, updated }
                : { ok: false as const, error: 'No pudimos guardar los cambios de la visita.', status: 409 as const };
        });
        if (!updateResult.ok) {
            return c.json({ ok: false, error: updateResult.error }, updateResult.status);
        }
        const { updated } = updateResult;
        let visitWithCalendar = updated;
        if (ACCOUNT_VISIT_STATUSES.includes(nextStatus as typeof ACCOUNT_VISIT_STATUSES[number])) {
            let listingTitle: string | null = null;
            if (updated.listingId) {
                const [listing] = await db.select({ title: listings.title })
                    .from(listings)
                    .where(and(
                        eq(listings.id, updated.listingId),
                        propertyVisitListingScope(context, user.id, await getAssignedVisitListingIds(context, user.id)),
                    ))
                    .limit(1);
                listingTitle = listing?.title ?? null;
            }
            visitWithCalendar = await syncPropertyVisitCalendar(
                updated,
                listingTitle,
                ['scheduled', 'confirmed'].includes(nextStatus) ? nextAssignedUserId : null,
                ['scheduled', 'confirmed'].includes(nextStatus) ? 'upsert' : 'delete',
            );
        }
        return c.json({ ok: true, visit: publicAccountVisit(visitWithCalendar) });
    });

    const requireProFeature = async (c: Context, next: () => Promise<void>) => {
        let blockedResponse: Response | undefined;
        const sessionResponse = await requireVerifiedSession(c, async () => {
            const user = await authUser(c);
            if (!user) {
                blockedResponse = c.json({ ok: false, error: 'No autenticado' }, 401);
                return;
            }
            const profile = await getCurrentAgendaProfile(user.id);
            const error = profile ? proGateError(profile) : null;
            if (error) {
                blockedResponse = c.json({ ok: false, error }, 403);
                return;
            }
            await next();
        });
        return blockedResponse ?? sessionResponse;
    };

    for (const path of ['/analytics', '/nps', '/referrals', '/promotions']) {
        app.use(path, requireProFeature);
        app.use(`${path}/*`, requireProFeature);
    }
    app.use('/services/:id/attendees', requireProFeature);

    // ── Profile ───────────────────────────────────────────────────────────────
    app.get('/profile', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        let profile = await ensureAgendaProfile(user);
        profile = await ensureAgendaProfileTrial(profile);
        const [operationalTz, monthlyBookingsUsed, whatsappQuota] = await Promise.all([
            resolveAgendaProfessionalTimezone(user.id, profile as Record<string, unknown>),
            getAgendaMonthlyBookingCount(profile.id),
            getAgendaWhatsappQuota(profile),
        ]);
        return c.json({
            ok: true,
            profile: {
                ...serializeAgendaProfile(profile),
                monthlyBookingsUsed,
                monthlyBookingsLimit: AGENDA_PRICING.free.monthlyBookings,
                whatsappQuota,
                bookingTermsText: bookingTermsFromRecord(profile),
                timezone: operationalTz,
                operatingLocation: operatingLocationFromAgendaProfile(profile),
            },
        });
    });

    app.post('/site-page/generate', requireVerifiedSession, rateLimit({
        name: 'agenda-landing-generation',
        limit: 5,
        windowMs: 60 * 60 * 1000,
    }), async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        if (isFreePlan(profile)) {
            return c.json({ ok: false, error: 'La página personalizada con IA está disponible desde Pro.' }, 403);
        }
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const briefResult = landingBriefSchema.safeParse(body.brief);
        const appearanceResult = landingAppearanceSchema.optional().safeParse(body.appearance);
        const context = landingMutationContextSchema.safeParse(body);
        const currentCopy = landingContentSchema.optional().safeParse(body.content);
        const target = landingGenerationTargetSchema.safeParse(body.target);
        if (!briefResult.success || !appearanceResult.success || !context.success || !currentCopy.success || !target.success) {
            return c.json({ ok: false, error: 'Revisa los datos para personalizar tu página.' }, 400);
        }
        if (context.data.profileId && context.data.profileId !== profile.id) {
            return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        }
        if (!profile.displayName?.trim() || !profile.profession?.trim()) {
            return c.json({ ok: false, error: 'Completa primero el nombre y la actividad de tu negocio.' }, 400);
        }

        const services = await db.select({ name: agendaServices.name, description: agendaServices.description })
            .from(agendaServices)
            .where(and(
                eq(agendaServices.professionalId, profile.id),
                eq(agendaServices.isActive, true),
                eq(agendaServices.kind, 'appointment'),
            ));
        if (!services.length) return c.json({ ok: false, error: 'Agrega un servicio reservable antes de generar tu página.' }, 400);

        const generation = await generateAgendaLandingPageContent({
            displayName: profile.displayName,
            profession: profile.profession,
            existingHeadline: profile.headline,
            existingBio: profile.bio,
            city: profile.city,
            servesOnline: profile.servesOnline,
            servesPresential: profile.servesPresential,
            services,
            brief: briefResult.data as OperatorSiteLandingBrief,
        });
        if (!generation.ok) return c.json({ ok: false, error: generation.error }, 503);

        const nextConfig = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const config = normalizeLandingConfig(current.operatorSiteLandingConfig);
            if (isFreePlan(current) || !matchesLandingRevision(config, context.data.revision)) return null;
            const value: OperatorSiteLandingConfig = {
                ...config,
                brief: briefResult.data as OperatorSiteLandingBrief,
                draft: mergeGeneratedLandingContent(currentCopy.data ?? config.draft ?? config.published ?? undefined, generation.content, target.data),
                draftAppearance: appearanceResult.data ?? config.draftAppearance,
                draftRevision: randomUUID(),
            };
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ operatorSiteLandingConfig: value, updatedAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return updated ? value : null;
        });
        if (!nextConfig) return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        return c.json({ ok: true, config: nextConfig });
    });

    app.patch('/site-page/draft', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        if (isFreePlan(profile)) {
            return c.json({ ok: false, error: 'La página personalizada está disponible desde Pro.' }, 403);
        }
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const contentResult = landingContentSchema.safeParse(body.content);
        const briefResult = landingBriefSchema.safeParse(body.brief);
        const appearanceResult = landingAppearanceSchema.optional().safeParse(body.appearance);
        const context = landingMutationContextSchema.safeParse(body);
        if (!contentResult.success || !briefResult.success || !appearanceResult.success || !context.success) {
            return c.json({ ok: false, error: 'Hay campos de la página que necesitan revisión.' }, 400);
        }
        if (context.data.profileId && context.data.profileId !== profile.id) {
            return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        }
        const nextConfig = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const config = normalizeLandingConfig(current.operatorSiteLandingConfig);
            if (isFreePlan(current) || !matchesLandingRevision(config, context.data.revision)) return null;
            const value: OperatorSiteLandingConfig = {
                ...config,
                brief: briefResult.data as OperatorSiteLandingBrief,
                draft: contentResult.data as OperatorSiteLandingContent,
                draftAppearance: appearanceResult.data ?? config.draftAppearance,
                draftRevision: randomUUID(),
            };
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ operatorSiteLandingConfig: value, updatedAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return updated ? value : null;
        });
        if (!nextConfig) return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        return c.json({ ok: true, config: nextConfig });
    });

    app.post('/site-page/publish', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        if (isFreePlan(profile)) {
            return c.json({ ok: false, error: 'La página personalizada está disponible desde Pro.' }, 403);
        }
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const context = landingMutationContextSchema.safeParse(body);
        if (!context.success) return c.json({ ok: false, error: 'Revisa el borrador antes de publicar.' }, 400);
        if (context.data.profileId && context.data.profileId !== profile.id) {
            return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const config = normalizeLandingConfig(current.operatorSiteLandingConfig);
            if (isFreePlan(current) || !matchesLandingRevision(config, context.data.revision)) return null;
            const publishedAppearance = getPublishedAppearance(current);
            if (!config.draft) return { error: 'Guarda un borrador antes de publicar.' };
            if (config.draft.sections?.highlights !== false && config.draft.highlights.some((item) => !item.title || !item.description)) {
                return { error: 'Completa el título y la descripción de cada punto destacado.' };
            }
            const version = {
                content: config.draft,
                appearance: {
                    ...(config.draftAppearance ?? publishedAppearance),
                    avatarUrl: current.avatarUrl,
                },
            };
            if (!current.isPublished) {
                const missing = await getAgendaPublishMissing(tx, current);
                if (missing.length) return { error: `Para publicar tu agenda, completa: ${missing.join(', ')}.` };
            }
            const now = new Date();
            const value: OperatorSiteLandingConfig = {
                ...config,
                draft: version.content,
                draftAppearance: undefined,
                draftRevision: randomUUID(),
                published: version.content,
                previous: current.isPublished || config.publishedAt
                    ? { content: config.published, appearance: publishedAppearance }
                    : undefined,
                publishedAt: now.toISOString(),
            };
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({
                    operatorSiteLandingConfig: value,
                    operatorSiteLayout: version.appearance.layout,
                    operatorSiteColorMode: version.appearance.colorMode,
                    operatorSiteAccentColor: version.appearance.accentColor,
                    coverUrl: version.appearance.coverUrl,
                    isPublished: true,
                    updatedAt: now,
                })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return updated ? { config: value, appearance: version.appearance } : null;
        });
        if (!result) return c.json({ ok: false, error: PAGE_DRAFT_CONFLICT }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, 400);
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: 'publish', metadata: { source: 'site-page' }, ctx: c });
        return c.json({ ok: true, config: result.config, appearance: result.appearance, isPublished: true });
    });

    app.patch('/profile', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const pageAppearanceFields = [
            'coverUrl',
            'operatorSiteLayout',
            'operatorSiteColorMode',
            'operatorSiteAccentColor',
        ];
        if (pageAppearanceFields.some((field) => field in body) && isFreePlan(profile)) {
            return c.json({
                ok: false,
                error: 'La personalización visual de la página pública está disponible desde Pro.',
            }, 403);
        }
        if ('isPublished' in body && body.isPublished === true) {
            const missing = await getAgendaPublishMissing(db, {
                ...profile,
                displayName: typeof body.displayName === 'string' ? body.displayName : profile.displayName,
                slug: typeof body.slug === 'string' ? body.slug : profile.slug,
            });

            if (missing.length > 0) {
                return c.json({
                    ok: false,
                    error: `Para publicar tu agenda, completa: ${missing.join(', ')}.`,
                }, 400);
            }
        }
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        const replacedMedia: Array<{ previousUrl: string | null | undefined; nextUrl: string | null }> = [];
        if ('bookingTermsText' in body) {
            patch.encuadre = serializeBookingTermsWrite(
                typeof body.bookingTermsText === 'string' ? body.bookingTermsText : null,
            ).bookingTermsText;
        }
        const allowed = ['displayName','headline','bio','avatarUrl','address','city','region','countryCode','regionId','localityId','serviceLocalities','servesOnline','servesPresential','publicEmail','publicPhone','publicWhatsapp','isPublished','slug','currency','bookingWindowDays','cancellationHours','confirmationMode','encuadre','requiresAdvancePayment','advancePaymentInstructions','whatsappRemindersEnabled','acceptsTransfer','acceptsMp','acceptsPaymentLink','paymentLinkUrl','bankTransferData','coverUrl','websiteUrl','instagramUrl','facebookUrl','linkedinUrl','tiktokUrl','youtubeUrl','twitterUrl','allowsRecurrentBooking','operatorSiteLayout','operatorSiteColorMode','operatorSiteAccentColor'] as const;
        for (const key of allowed) {
            if (key === 'avatarUrl' || key === 'coverUrl') continue;
            if (key in body) patch[key] = body[key];
        }
        if ('operatorSiteLayout' in body) {
            const layout = typeof body.operatorSiteLayout === 'string' ? body.operatorSiteLayout : '';
            if (!OPERATOR_SITE_LAYOUTS.includes(layout as typeof OPERATOR_SITE_LAYOUTS[number])) {
                return c.json({ ok: false, error: 'Estilo de página no válido.' }, 400);
            }
            patch.operatorSiteLayout = layout;
        }
        if ('operatorSiteColorMode' in body) {
            const colorMode = typeof body.operatorSiteColorMode === 'string' ? body.operatorSiteColorMode : '';
            if (!OPERATOR_SITE_COLOR_MODES.includes(colorMode as typeof OPERATOR_SITE_COLOR_MODES[number])) {
                return c.json({ ok: false, error: 'Modo de color no válido.' }, 400);
            }
            patch.operatorSiteColorMode = colorMode;
        }
        if ('operatorSiteAccentColor' in body) {
            const accent = typeof body.operatorSiteAccentColor === 'string' ? body.operatorSiteAccentColor.trim() : '';
            if (!isValidOperatorSiteAccentStorage(accent)) {
                return c.json({ ok: false, error: 'Color de acento no válido.' }, 400);
            }
            patch.operatorSiteAccentColor = normalizeOperatorSiteAccentHex(accent) ?? accent;
        }
        const operatingExtras = agendaOperatingPatchFromBody(body);
        for (const [key, value] of Object.entries(operatingExtras)) {
            if (key !== 'updatedAt') patch[key] = value;
        }
        if ('slug' in body && body.slug !== profile.slug) {
            const newSlug = String(body.slug ?? '').toLowerCase().trim();
            const validation = isValidSlug(newSlug);
            if (!validation.ok) return c.json({ ok: false, error: validation.error }, 400);
            const existing = await db.select({ id: agendaProfessionalProfiles.id }).from(agendaProfessionalProfiles).where(eq(agendaProfessionalProfiles.slug, newSlug)).limit(1);
            if (existing.length > 0 && existing[0].id !== profile.id) return c.json({ ok: false, error: 'Este link ya está en uso por otro profesional.' }, 409);
            patch.slug = newSlug;
        }
        if ('avatarUrl' in body) {
            const raw = body.avatarUrl;
            const nextAvatarUrl =
                raw === null
                    ? null
                    : typeof raw === 'string'
                      ? raw.trim() || null
                      : profile.avatarUrl ?? null;
            replacedMedia.push({ previousUrl: profile.avatarUrl, nextUrl: nextAvatarUrl });
            patch.avatarUrl = nextAvatarUrl;
        }
        if ('coverUrl' in body) {
            const raw = body.coverUrl;
            const nextCoverUrl =
                raw === null
                    ? null
                    : typeof raw === 'string'
                      ? raw.trim() || null
                      : profile.coverUrl ?? null;
            replacedMedia.push({ previousUrl: profile.coverUrl, nextUrl: nextCoverUrl });
            patch.coverUrl = nextCoverUrl;
        }
        const synced = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set(patch)
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning();
            return updated ?? null;
        });
        if (!synced) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        for (const item of replacedMedia) {
            await cleanupReplacedMediaUrl(item.previousUrl, item.nextUrl);
        }
        if ('isPublished' in body && body.isPublished !== profile.isPublished) await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: body.isPublished ? 'publish' : 'unpublish', ctx: c });
        if ('slug' in body && patch.slug && patch.slug !== profile.slug) await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: 'slug_change', metadata: { from: profile.slug, to: patch.slug }, ctx: c });
        await syncAgendaProfileTimezoneFromOperatingLocation(user.id, synced as Record<string, unknown>);
        const operationalTz = await resolveAgendaProfessionalTimezone(user.id, synced as Record<string, unknown>);
        return c.json({
            ok: true,
            profile: {
                ...serializeAgendaProfile(synced),
                timezone: operationalTz,
                operatingLocation: operatingLocationFromAgendaProfile(synced),
            },
        });
    });

    app.get('/slug-available', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const slug = (c.req.query('slug') ?? '').toLowerCase().trim();
        const validation = isValidSlug(slug);
        if (!validation.ok) return c.json({ ok: false, available: false, error: validation.error });
        const existing = await db.select({ id: agendaProfessionalProfiles.id }).from(agendaProfessionalProfiles).where(eq(agendaProfessionalProfiles.slug, slug)).limit(1);
        const profile = await getCurrentAgendaProfile(user.id);
        const isMine = profile && existing.length > 0 && existing[0].id === profile.id;
        return c.json({ ok: true, available: existing.length === 0 || isMine });
    });

    app.get('/custom-domain', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        let profile = await ensureAgendaProfile(user);
        profile = await ensureAgendaProfileTrial(profile);
        const targetHost = getCustomDomainTargetHost();
        const targetIp = await getCustomDomainTargetIp(targetHost);
        return c.json({
            ok: true,
            customDomain: profile.customDomain ?? null,
            customDomainStatus: profile.customDomainStatus ?? 'none',
            customDomainVerifiedAt: profile.customDomainVerifiedAt ?? null,
            targetHost,
            targetIp,
            proPlusEligible: hasAgendaProPlusAccess(profile),
        });
    });

    app.put('/custom-domain', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        let profile = await ensureAgendaProfile(user);
        profile = await ensureAgendaProfileTrial(profile);
        if (proPlusGateError(profile)) {
            return c.json({ ok: false, error: proPlusGateError(profile) }, 403);
        }

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const rawDomain = typeof body.domain === 'string' ? body.domain : '';
        const normalized = normalizeCustomDomain(rawDomain);
        if (!normalized.ok) {
            return c.json({ ok: false, error: normalized.error }, 400);
        }

        const existing = await db.select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.customDomain, normalized.domain))
            .limit(1);
        if (existing.length > 0 && existing[0].id !== profile.id) {
            return c.json({ ok: false, error: 'Este dominio ya está conectado a otra cuenta.' }, 409);
        }

        if (profile.customDomain && profile.customDomain !== normalized.domain) {
            await syncCustomDomainWithCoolify({ action: 'remove', domain: profile.customDomain });
        }

        const [updated] = await db.update(agendaProfessionalProfiles)
            .set({
                customDomain: normalized.domain,
                customDomainStatus: 'pending',
                customDomainVerifiedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(agendaProfessionalProfiles.id, profile.id))
            .returning();

        const targetHost = getCustomDomainTargetHost();
        const targetIp = await getCustomDomainTargetIp(targetHost);

        return c.json({
            ok: true,
            customDomain: updated.customDomain,
            customDomainStatus: updated.customDomainStatus,
            customDomainVerifiedAt: updated.customDomainVerifiedAt,
            targetHost,
            targetIp,
        });
    });

    app.post('/custom-domain/verify', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        let profile = await ensureAgendaProfile(user);
        profile = await ensureAgendaProfileTrial(profile);
        if (proPlusGateError(profile)) {
            return c.json({ ok: false, error: proPlusGateError(profile) }, 403);
        }
        if (!profile.customDomain) {
            return c.json({ ok: false, error: 'Primero guarda un dominio para verificarlo.' }, 400);
        }

        const dnsCheck = await verifyCustomDomainDns(profile.customDomain);
        if (!dnsCheck.verified) {
            await db.update(agendaProfessionalProfiles)
                .set({
                    customDomainStatus: 'error',
                    customDomainVerifiedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(agendaProfessionalProfiles.id, profile.id));
            return c.json({
                ok: false,
                error: dnsCheck.error ?? 'Aún no detectamos el registro DNS.',
                customDomainStatus: 'error',
                method: dnsCheck.method,
            }, 422);
        }

        const coolifySync = await syncCustomDomainWithCoolify({
            action: 'add',
            domain: profile.customDomain,
        });
        if (!coolifySync.ok) {
            return c.json({
                ok: false,
                error: coolifySync.error ?? 'No pudimos sincronizar el certificado SSL.',
            }, 502);
        }

        const verifiedAt = new Date();
        const [updated] = await db.update(agendaProfessionalProfiles)
            .set({
                customDomainStatus: 'verified',
                customDomainVerifiedAt: verifiedAt,
                updatedAt: verifiedAt,
            })
            .where(eq(agendaProfessionalProfiles.id, profile.id))
            .returning();

        return c.json({
            ok: true,
            customDomain: updated.customDomain,
            customDomainStatus: updated.customDomainStatus,
            customDomainVerifiedAt: updated.customDomainVerifiedAt,
            method: dnsCheck.method,
            coolifySynced: coolifySync.synced,
        });
    });

    app.delete('/custom-domain', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        if (profile.customDomain) {
            await syncCustomDomainWithCoolify({ action: 'remove', domain: profile.customDomain });
        }
        await db.update(agendaProfessionalProfiles)
            .set({
                customDomain: null,
                customDomainStatus: 'none',
                customDomainVerifiedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(agendaProfessionalProfiles.id, profile.id));
        return c.json({ ok: true });
    });

    // ── Services ──────────────────────────────────────────────────────────────
    app.get('/services', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, services: [] });
        const rows = await db.select().from(agendaServices).where(eq(agendaServices.professionalId, profile.id)).orderBy(asc(agendaServices.position), asc(agendaServices.createdAt));
        const groupIds = rows.filter((row: { kind?: string }) => row.kind === 'group_event').map((row: { id: string }) => row.id);
        let countsByService: Record<string, number> = {};
        if (groupIds.length > 0) {
            const counts = await db.select({ serviceId: agendaGroupAttendees.sessionId, count: sql<number>`count(*)::int` })
                .from(agendaGroupAttendees)
                .where(and(inArray(agendaGroupAttendees.sessionId, groupIds), sql`${agendaGroupAttendees.status} <> 'cancelled'`))
                .groupBy(agendaGroupAttendees.sessionId);
            countsByService = Object.fromEntries(counts.map((row: { serviceId: string; count: number }) => [row.serviceId, row.count]));
        }
        return c.json({
            ok: true,
            services: rows.map((row: Record<string, unknown>) => ({
                ...row,
                attendeeCount: row.kind === 'group_event' ? (countsByService[row.id as string] ?? 0) : undefined,
            })),
        });
    });

    app.get('/services/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const service = await db.query.agendaServices.findFirst({ where: and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id)) });
        if (!service) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        const attendees = service.kind === 'group_event'
            ? await db.select().from(agendaGroupAttendees).where(eq(agendaGroupAttendees.sessionId, id)).orderBy(asc(agendaGroupAttendees.registeredAt))
            : [];
        const activeCount = attendees.filter((a: { status: string }) => a.status !== 'cancelled').length;
        return c.json({ ok: true, service: { ...service, attendeeCount: activeCount }, attendees });
    });

    app.post('/services', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        const kind = typeof body.kind === 'string' && AGENDA_SERVICE_KINDS.has(body.kind) ? body.kind : 'appointment';
        const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
        if (durationMinutes < 15) return c.json({ ok: false, error: 'La duración mínima es 15 minutos.' }, 400);
        let startsAt: Date | null = null;
        let capacity: number | null = null;
        let sessionStatus: string | null = null;
        const location: string | null = typeof body.location === 'string' ? body.location.trim() || null : null;
        const meetingUrl: string | null = typeof body.meetingUrl === 'string' ? body.meetingUrl.trim() || null : null;
        const isOnline = typeof body.isOnline === 'boolean' ? body.isOnline : true;
        const isPresential = body.isPresential === true;
        if (!isOnline && !isPresential) return c.json({ ok: false, error: 'Selecciona una modalidad.' }, 400);
        if (kind === 'group_event') {
            if (!body.startsAt) return c.json({ ok: false, error: 'Indica fecha y hora de inicio.' }, 400);
            startsAt = new Date(String(body.startsAt));
            if (Number.isNaN(startsAt.getTime())) return c.json({ ok: false, error: 'Fecha inválida.' }, 400);
            const cap = parseOptionalNumber(body.capacity);
            if (cap === null || cap <= 0) return c.json({ ok: false, error: 'Cupo inválido.' }, 400);
            capacity = Math.floor(cap);
            sessionStatus = 'scheduled';
            if (isPresential && !location) return c.json({ ok: false, error: 'Indica la dirección del evento.' }, 400);
        }
        const writeResult = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (isFreePlan(current)) {
                if (kind === 'group_event') return { denied: AGENDA_PRO_REQUIRED_MESSAGE };
                const [activeServices] = await tx
                    .select({ count: sql<number>`count(*)::int` })
                    .from(agendaServices)
                    .where(and(eq(agendaServices.professionalId, current.id), eq(agendaServices.isActive, true)));
                if (Number(activeServices?.count ?? 0) >= AGENDA_PRICING.free.activeServices) {
                    return { denied: `Gratis permite hasta ${AGENDA_PRICING.free.activeServices} servicios activos. Activa Pro para agregar más.` };
                }
            }
            const [service] = await tx.insert(agendaServices).values({
                professionalId: current.id,
                name: String(body.name),
                description: typeof body.description === 'string' ? body.description : null,
                durationMinutes,
                price: typeof body.price === 'string' && body.price ? body.price : (typeof body.price === 'number' ? String(body.price) : null),
                currency: typeof body.currency === 'string' ? body.currency : current.currency,
                isOnline,
                isPresential,
                color: typeof body.color === 'string' ? body.color : null,
                imageUrl: typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null,
                position: typeof body.position === 'number' ? body.position : 0,
                preconsultFields: kind === 'appointment' ? normalizePreconsultFields(body.preconsultFields, randomUUID) : [],
                kind,
                capacity,
                startsAt,
                location,
                meetingUrl,
                sessionStatus,
            }).returning();
            return { service };
        });
        if (!writeResult) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('denied' in writeResult) return c.json({ ok: false, error: writeResult.denied }, 403);
        const service = writeResult.service;
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: service.id, action: 'create', metadata: { name: service.name, kind: service.kind }, ctx: c });
        return c.json({ ok: true, service });
    });

    app.put('/services/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const writeResult = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [existing] = await tx.select().from(agendaServices)
                .where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, current.id)))
                .limit(1)
                .for('update');
            if (!existing) return { missing: true as const };

            const patch: Record<string, unknown> = { updatedAt: new Date() };
            for (const key of ['name', 'description', 'durationMinutes', 'price', 'currency', 'isOnline', 'isPresential', 'color', 'position', 'isActive', 'capacity', 'location', 'meetingUrl', 'sessionStatus'] as const) {
                if (!(key in body)) continue;
                if (key === 'isOnline' || key === 'isPresential' || key === 'isActive') {
                    patch[key] = body[key] === true;
                } else {
                    patch[key] = body[key] === '' ? null : body[key];
                }
            }
            if (typeof body.kind === 'string' && AGENDA_SERVICE_KINDS.has(body.kind)) patch.kind = body.kind;
            const nextKind = typeof patch.kind === 'string' ? patch.kind : (existing.kind ?? 'appointment');
            const nextIsActive = 'isActive' in patch ? patch.isActive === true : existing.isActive !== false;
            if (isFreePlan(current)) {
                if (nextKind === 'group_event') return { denied: AGENDA_PRO_REQUIRED_MESSAGE };
                if (nextIsActive && existing.isActive === false) {
                    const [activeServices] = await tx
                        .select({ count: sql<number>`count(*)::int` })
                        .from(agendaServices)
                        .where(and(eq(agendaServices.professionalId, current.id), eq(agendaServices.isActive, true)));
                    if (Number(activeServices?.count ?? 0) >= AGENDA_PRICING.free.activeServices) {
                        return { denied: `Gratis permite hasta ${AGENDA_PRICING.free.activeServices} servicios activos. Activa Pro para reactivar este servicio.` };
                    }
                }
            }
            if ('startsAt' in body) {
                if (!body.startsAt) patch.startsAt = null;
                else {
                    const d = new Date(String(body.startsAt));
                    if (Number.isNaN(d.getTime())) return { error: 'Fecha inválida.', status: 400 };
                    patch.startsAt = d;
                }
            }
            const imageChanged = 'imageUrl' in body;
            const nextImageUrl = imageChanged
                ? (typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null)
                : existing.imageUrl;
            if (imageChanged) patch.imageUrl = nextImageUrl;
            if ('preconsultFields' in body && (existing.kind ?? 'appointment') === 'appointment') {
                patch.preconsultFields = normalizePreconsultFields(body.preconsultFields, randomUUID);
            }
            const nextOnline = 'isOnline' in patch ? patch.isOnline === true : existing.isOnline !== false;
            const nextPresential = 'isPresential' in patch ? patch.isPresential === true : existing.isPresential === true;
            if (!nextOnline && !nextPresential) return { error: 'Selecciona al menos una modalidad.', status: 400 };
            const nextLocation = 'location' in patch ? patch.location : existing.location;
            if (nextKind === 'group_event' && nextPresential && !nextLocation) {
                return { error: 'Indica la dirección del evento.', status: 400 };
            }
            const nextDuration = 'durationMinutes' in patch ? Number(patch.durationMinutes) : existing.durationMinutes;
            if (Number.isFinite(nextDuration) && nextDuration < 15) {
                return { error: 'La duración mínima es 15 minutos.', status: 400 };
            }
            const [updated] = await tx.update(agendaServices).set(patch)
                .where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, current.id)))
                .returning();
            return {
                updated: updated ?? null,
                previousImageUrl: imageChanged ? existing.imageUrl : null,
                nextImageUrl: imageChanged ? nextImageUrl : null,
            };
        });
        if (!writeResult) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('denied' in writeResult) return c.json({ ok: false, error: writeResult.denied }, 403);
        if ('error' in writeResult) return c.json({ ok: false, error: writeResult.error }, writeResult.status as 400);
        if ('missing' in writeResult) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        if (!writeResult.updated) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        if (writeResult.previousImageUrl !== null) {
            await cleanupReplacedMediaUrl(writeResult.previousImageUrl, writeResult.nextImageUrl);
        }
        const updated = writeResult.updated;
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: updated.id, action: 'update', metadata: { fields: Object.keys(body) }, ctx: c });
        return c.json({ ok: true, service: updated });
    });

    app.delete('/services/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaServices)
                .set({ isActive: false, updatedAt: new Date() })
                .where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, current.id)))
                .returning({ id: agendaServices.id });
            return Boolean(updated);
        });
        if (result === null) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: id, action: 'delete', ctx: c });
        return c.json({ ok: true });
    });

    // ── Availability ──────────────────────────────────────────────────────────
    app.post('/availability/rules', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const rule = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [created] = await tx.insert(agendaAvailabilityRules).values({
                professionalId: current.id,
                dayOfWeek: Number(body.dayOfWeek),
                startTime: String(body.startTime ?? '09:00'),
                endTime: String(body.endTime ?? '18:00'),
                breakStart: typeof body.breakStart === 'string' ? body.breakStart : null,
                breakEnd: typeof body.breakEnd === 'string' ? body.breakEnd : null,
                isActive: body.isActive !== false,
            }).returning();
            return created;
        });
        if (!rule) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true, rule });
    });

    app.put('/availability/rules/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['dayOfWeek','startTime','endTime','breakStart','breakEnd','isActive'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaAvailabilityRules).set(patch).where(and(
                eq(agendaAvailabilityRules.id, id),
                eq(agendaAvailabilityRules.professionalId, current.id),
            )).returning();
            return { rule: updated ?? null };
        });
        if (result === null) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.rule) return c.json({ ok: false, error: 'Regla no encontrada' }, 404);
        return c.json({ ok: true, rule: result.rule });
    });

    app.delete('/availability/rules/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const id = c.req.param('id') ?? '';
        const deleted = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            await tx.delete(agendaAvailabilityRules).where(and(
                eq(agendaAvailabilityRules.id, id),
                eq(agendaAvailabilityRules.professionalId, current.id),
            ));
            return true;
        });
        if (deleted === null) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    app.post('/availability/blocked-slots', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const profileTz = profile.timezone ?? 'America/Santiago';
        const slot = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [created] = await tx.insert(agendaBlockedSlots).values({
                professionalId: current.id,
                startsAt: parseDateTimeInTimezone(String(body.startsAt), profileTz),
                endsAt: parseDateTimeInTimezone(String(body.endsAt), profileTz),
                reason: typeof body.reason === 'string' ? body.reason : null,
            }).returning();
            return created;
        });
        if (!slot) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true, slot });
    });

    app.delete('/availability/blocked-slots/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const id = c.req.param('id') ?? '';
        const deleted = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            await tx.delete(agendaBlockedSlots).where(and(
                eq(agendaBlockedSlots.id, id),
                eq(agendaBlockedSlots.professionalId, current.id),
            ));
            return true;
        });
        if (deleted === null) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    app.put('/availability', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as {
            rules?: unknown[];
            alwaysOpen?: boolean;
            scheduleNote?: string | null;
        };
        const rulesInput = Array.isArray(body.rules) ? body.rules : [];

        const saved = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (typeof body.alwaysOpen === 'boolean' || body.scheduleNote !== undefined) {
                await tx.update(agendaProfessionalProfiles).set({
                    ...(typeof body.alwaysOpen === 'boolean' ? { alwaysOpen: body.alwaysOpen } : {}),
                    ...(body.scheduleNote !== undefined
                        ? { scheduleNote: typeof body.scheduleNote === 'string' && body.scheduleNote.trim()
                            ? body.scheduleNote.trim().slice(0, 255)
                            : null }
                        : {}),
                    updatedAt: new Date(),
                }).where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ));
            }

            await tx.delete(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, current.id));
            if (rulesInput.length > 0) {
                await tx.insert(agendaAvailabilityRules).values(
                    rulesInput.map((raw) => {
                        const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
                        return {
                            professionalId: current.id,
                            dayOfWeek: Number(r.dayOfWeek),
                            startTime: String(r.startTime ?? '09:00'),
                            endTime: String(r.endTime ?? '18:00'),
                            breakStart: typeof r.breakStart === 'string' ? r.breakStart : null,
                            breakEnd: typeof r.breakEnd === 'string' ? r.breakEnd : null,
                            isActive: r.isActive !== false,
                        };
                    }),
                );
            }

            const [updatedProfile] = await tx
                .select({
                    alwaysOpen: agendaProfessionalProfiles.alwaysOpen,
                    scheduleNote: agendaProfessionalProfiles.scheduleNote,
                })
                .from(agendaProfessionalProfiles)
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .limit(1);
            const rules = await tx
                .select()
                .from(agendaAvailabilityRules)
                .where(eq(agendaAvailabilityRules.professionalId, current.id))
                .orderBy(asc(agendaAvailabilityRules.dayOfWeek));
            return { updatedProfile, rules };
        });
        if (!saved) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({
            ok: true,
            rules: saved.rules,
            alwaysOpen: Boolean(saved.updatedProfile?.alwaysOpen),
            scheduleNote: saved.updatedProfile?.scheduleNote ?? null,
        });
    });

    app.get('/availability', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, rules: [], blockedSlots: [], alwaysOpen: false, scheduleNote: null });
        const [rules, blockedSlots] = await Promise.all([
            db.select().from(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, profile.id)).orderBy(asc(agendaAvailabilityRules.dayOfWeek)),
            db.select().from(agendaBlockedSlots).where(and(eq(agendaBlockedSlots.professionalId, profile.id), gte(agendaBlockedSlots.endsAt, new Date()))).orderBy(asc(agendaBlockedSlots.startsAt)),
        ]);
        return c.json({
            ok: true,
            rules,
            blockedSlots,
            alwaysOpen: Boolean(profile.alwaysOpen),
            scheduleNote: profile.scheduleNote ?? null,
        });
    });

    // ── Locations ─────────────────────────────────────────────────────────────
    app.get('/locations', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, locations: [] });
        const locations = await db.select().from(agendaLocations).where(eq(agendaLocations.professionalId, profile.id)).orderBy(desc(agendaLocations.isDefault), asc(agendaLocations.position), asc(agendaLocations.createdAt));
        return c.json({ ok: true, locations });
    });

    app.post('/locations', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const addressLine = typeof body.addressLine === 'string' ? body.addressLine.trim() : '';
        if (!name) return c.json({ ok: false, error: 'El nombre de la consulta es requerido.' }, 400);
        if (!addressLine) return c.json({ ok: false, error: 'La dirección es requerida.' }, 400);
        const isDefault = body.isDefault === true;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (isFreePlan(current) && body.isActive !== false) {
                const [activeLocations] = await tx
                    .select({ count: sql<number>`count(*)::int` })
                    .from(agendaLocations)
                    .where(and(eq(agendaLocations.professionalId, current.id), eq(agendaLocations.isActive, true)));
                if (Number(activeLocations?.count ?? 0) >= AGENDA_PRICING.free.activeLocations) {
                    return { limitReached: true as const };
                }
            }
            if (isDefault) {
                await tx.update(agendaLocations).set({ isDefault: false, updatedAt: new Date() })
                    .where(eq(agendaLocations.professionalId, current.id));
            }
            const [location] = await tx.insert(agendaLocations).values({
                professionalId: current.id,
                name,
                addressLine,
                city: typeof body.city === 'string' ? body.city : null,
                region: typeof body.region === 'string' ? body.region : null,
                notes: typeof body.notes === 'string' ? body.notes : null,
                googleMapsUrl: typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl : null,
                isDefault,
                isActive: body.isActive !== false,
            }).returning();
            return { limitReached: false as const, location };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.limitReached) {
            return c.json({ ok: false, error: `Gratis permite ${AGENDA_PRICING.free.activeLocations} ubicación. Activa Pro para agregar otra.` }, 403);
        }
        return c.json({ ok: true, location: result.location });
    });

    app.put('/locations/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n) return c.json({ ok: false, error: 'El nombre de la consulta es requerido.' }, 400); patch.name = n; }
        if (typeof body.addressLine === 'string') { const a = body.addressLine.trim(); if (!a) return c.json({ ok: false, error: 'La dirección es requerida.' }, 400); patch.addressLine = a; }
        for (const key of ['city','region','notes','googleMapsUrl'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        if ('isActive' in body) patch.isActive = body.isActive !== false;
        if (body.isDefault === true) patch.isDefault = true; else if (body.isDefault === false) patch.isDefault = false;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [existing] = await tx.select().from(agendaLocations)
                .where(and(eq(agendaLocations.id, id), eq(agendaLocations.professionalId, current.id)))
                .limit(1);
            if (!existing) return { kind: 'missing' as const };
            if (isFreePlan(current) && patch.isActive === true && existing.isActive === false) {
                const [activeLocations] = await tx
                    .select({ count: sql<number>`count(*)::int` })
                    .from(agendaLocations)
                    .where(and(eq(agendaLocations.professionalId, current.id), eq(agendaLocations.isActive, true)));
                if (Number(activeLocations?.count ?? 0) >= AGENDA_PRICING.free.activeLocations) {
                    return { kind: 'limit' as const };
                }
            }
            if (body.isDefault === true) {
                await tx.update(agendaLocations).set({ isDefault: false, updatedAt: new Date() })
                    .where(and(eq(agendaLocations.professionalId, current.id), sql`${agendaLocations.id} <> ${id}`));
            }
            const [updated] = await tx.update(agendaLocations).set(patch).where(and(
                eq(agendaLocations.id, id),
                eq(agendaLocations.professionalId, current.id),
            )).returning();
            return updated ? { kind: 'updated' as const, location: updated } : { kind: 'missing' as const };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'missing') return c.json({ ok: false, error: 'Consulta no encontrada.' }, 404);
        if (result.kind === 'limit') {
            return c.json({ ok: false, error: `Gratis permite ${AGENDA_PRICING.free.activeLocations} ubicación. Activa Pro para reactivar esta ubicación.` }, 403);
        }
        return c.json({ ok: true, location: result.location });
    });

    app.delete('/locations/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const deleted = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            await tx.delete(agendaLocations).where(and(
                eq(agendaLocations.id, id),
                eq(agendaLocations.professionalId, current.id),
            ));
            return true;
        });
        if (deleted === null) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    // ── Clients ───────────────────────────────────────────────────────────────
    app.get('/clients', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, clients: [] });
        const clients = await db.select().from(agendaClients).where(eq(agendaClients.professionalId, profile.id)).orderBy(asc(agendaClients.firstName), asc(agendaClients.lastName));
        const clientIds = clients.map((c: any) => c.id);
        const tagsByClient: Record<string, string[]> = {};
        if (clientIds.length > 0) {
            const rows = await db.select({ clientId: agendaClientTagAssignments.clientId, tagId: agendaClientTagAssignments.tagId }).from(agendaClientTagAssignments).where(inArray(agendaClientTagAssignments.clientId, clientIds));
            for (const r of rows) { (tagsByClient[r.clientId] ??= []).push(r.tagId); }
        }
        return c.json({ ok: true, clients: clients.map((cl: any) => ({ ...cl, tagIds: tagsByClient[cl.id] ?? [] })) });
    });

    app.post('/clients', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile)) { const limitError = await checkClientLimit(profile.id); if (limitError) return c.json({ ok: false, error: limitError }, 403); }
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.firstName) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        const client = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [created] = await tx.insert(agendaClients).values({
                professionalId: current.id,
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
            return created;
        });
        if (!client) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        emitTimelineEvent(db, timelineEvents, {
            type: 'relationship.created',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(client.id),
            subject: { kind: 'agenda_client', id: client.id },
            actor: 'professional',
            payload: { source: 'manual' },
        });
        return c.json({ ok: true, client });
    });

    app.get('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const appointments = await db.select().from(agendaAppointments).where(and(eq(agendaAppointments.clientId, id), eq(agendaAppointments.professionalId, profile.id))).orderBy(desc(agendaAppointments.startsAt));
        const apptIds = appointments.map((a: any) => a.id);
        const sessionNotes = apptIds.length > 0 ? await db.select().from(agendaSessionNotes).where(inArray(agendaSessionNotes.appointmentId, apptIds)) : [];
        const notesByAppt: Record<string, string> = {};
        for (const n of sessionNotes) notesByAppt[n.appointmentId] = n.content;
        const tagRows = await db.select({ id: agendaClientTags.id, name: agendaClientTags.name, color: agendaClientTags.color }).from(agendaClientTagAssignments).innerJoin(agendaClientTags, eq(agendaClientTagAssignments.tagId, agendaClientTags.id)).where(and(
            eq(agendaClientTagAssignments.clientId, id),
            eq(agendaClientTags.professionalId, profile.id),
        ));
        return c.json({ ok: true, client: { ...client, tags: tagRows }, appointments: appointments.map((a: any) => ({ ...a, sessionNote: notesByAppt[a.id] ?? null })) });
    });

    app.get('/clients/:id/timeline', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({
            where: and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id)),
        });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const events = await db
            .select()
            .from(timelineEvents)
            .where(and(
                eq(timelineEvents.businessId, profile.id),
                eq(timelineEvents.personId, id),
                eq(timelineEvents.vertical, 'agenda'),
            ))
            .orderBy(desc(timelineEvents.occurredAt))
            .limit(100);
        return c.json({ ok: true, events });
    });

    app.put('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['firstName','lastName','email','phone','whatsapp','rut','dateOfBirth','gender','occupation','address','city','emergencyContactName','emergencyContactPhone','referredBy','internalNotes','status'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaClients).set(patch).where(and(
                eq(agendaClients.id, id),
                eq(agendaClients.professionalId, current.id),
            )).returning();
            return { client: updated ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        return c.json({ ok: true, client: result.client });
    });

    app.delete('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaClients).where(and(
                eq(agendaClients.id, id),
                eq(agendaClients.professionalId, current.id),
            )).returning({ id: agendaClients.id });
            return { deleted: Boolean(deleted) };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.deleted) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Client Tags ────────────────────────────────────────────────────────────
    app.get('/client-tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, tags: [] });
        const tags = await db.select().from(agendaClientTags).where(eq(agendaClientTags.professionalId, profile.id)).orderBy(asc(agendaClientTags.position), asc(agendaClientTags.name));
        return c.json({ ok: true, tags });
    });

    app.post('/client-tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) return c.json({ ok: false, error: 'El nombre de la etiqueta es requerido' }, 400);
        if (name.length > 60) return c.json({ ok: false, error: 'Máx. 60 caracteres' }, 400);
        try {
            const tag = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
                const [created] = await tx.insert(agendaClientTags).values({
                    professionalId: current.id,
                    name,
                    color: typeof body.color === 'string' ? body.color || null : null,
                    position: typeof body.position === 'number' ? body.position : 0,
                }).returning();
                return created;
            });
            if (!tag) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
            return c.json({ ok: true, tag });
        } catch (err) { const msg = err instanceof Error ? err.message : String(err); if (msg.includes('unique')) return c.json({ ok: false, error: 'Ya existe una etiqueta con ese nombre.' }, 409); throw err; }
    });

    app.put('/client-tags/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n || n.length > 60) return c.json({ ok: false, error: 'Nombre inválido' }, 400); patch.name = n; }
        if ('color' in body) patch.color = typeof body.color === 'string' ? body.color || null : null;
        if (typeof body.position === 'number') patch.position = body.position;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaClientTags).set(patch).where(and(
                eq(agendaClientTags.id, id),
                eq(agendaClientTags.professionalId, current.id),
            )).returning();
            return { tag: updated ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.tag) return c.json({ ok: false, error: 'Etiqueta no encontrada' }, 404);
        return c.json({ ok: true, tag: result.tag });
    });

    app.delete('/client-tags/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [tag] = await tx.select({ id: agendaClientTags.id }).from(agendaClientTags).where(and(
                eq(agendaClientTags.id, id),
                eq(agendaClientTags.professionalId, current.id),
            )).limit(1);
            if (!tag) return { deleted: false };
            await tx.delete(agendaClientTagAssignments).where(eq(agendaClientTagAssignments.tagId, id));
            await tx.delete(agendaClientTags).where(and(
                eq(agendaClientTags.id, id),
                eq(agendaClientTags.professionalId, current.id),
            ));
            return { deleted: true };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.deleted) return c.json({ ok: false, error: 'Etiqueta no encontrada' }, 404);
        return c.json({ ok: true });
    });

    app.post('/clients/:id/tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const tagId = typeof body.tagId === 'string' ? body.tagId : '';
        if (!tagId) return c.json({ ok: false, error: 'tagId requerido' }, 400);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [client] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                eq(agendaClients.id, clientId),
                eq(agendaClients.professionalId, current.id),
            )).limit(1);
            const [tag] = await tx.select({ id: agendaClientTags.id }).from(agendaClientTags).where(and(
                eq(agendaClientTags.id, tagId),
                eq(agendaClientTags.professionalId, current.id),
            )).limit(1);
            if (!client || !tag) return { found: false };
            await tx.insert(agendaClientTagAssignments).values({ clientId, tagId }).onConflictDoNothing();
            return { found: true };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.found) return c.json({ ok: false, error: 'Cliente o etiqueta no encontrado' }, 404);
        return c.json({ ok: true });
    });

    app.delete('/clients/:id/tags/:tagId', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const tagId = c.req.param('tagId') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [client] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                eq(agendaClients.id, clientId),
                eq(agendaClients.professionalId, current.id),
            )).limit(1);
            const [tag] = await tx.select({ id: agendaClientTags.id }).from(agendaClientTags).where(and(
                eq(agendaClientTags.id, tagId),
                eq(agendaClientTags.professionalId, current.id),
            )).limit(1);
            if (!client || !tag) return { found: false };
            await tx.delete(agendaClientTagAssignments).where(and(
                eq(agendaClientTagAssignments.clientId, clientId),
                eq(agendaClientTagAssignments.tagId, tagId),
            ));
            return { found: true };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.found) return c.json({ ok: false, error: 'Cliente o etiqueta no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Client Attachments ────────────────────────────────────────────────────
    app.get('/clients/:id/attachments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, attachments: [] });
        const clientId = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const attachments = await db.select().from(agendaClientAttachments).where(and(
            eq(agendaClientAttachments.clientId, clientId),
            eq(agendaClientAttachments.professionalId, profile.id),
        )).orderBy(desc(agendaClientAttachments.uploadedAt));
        return c.json({
            ok: true,
            attachments: attachments.map((attachment: any) => ({
                ...attachment,
                url: isOwnedStorageUrl(attachment.url) ? toProtectedMediaUrl(attachment.url) : attachment.url,
            })),
        });
    });

    app.post('/clients/:id/attachments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const url = typeof body.url === 'string' ? unwrapProtectedMediaUrl(body.url) : '';
        const rawKind = typeof body.kind === 'string' ? body.kind : 'document';
        const kind = (ATTACHMENT_KINDS as readonly string[]).includes(rawKind) ? (rawKind as typeof ATTACHMENT_KINDS[number]) : 'document';
        if (!name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        if (!url) return c.json({ ok: false, error: 'El archivo es requerido' }, 400);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [client] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                eq(agendaClients.id, clientId),
                eq(agendaClients.professionalId, current.id),
            )).limit(1);
            if (!client) return { attachment: null };
            const [attachment] = await tx.insert(agendaClientAttachments).values({
                professionalId: current.id,
                clientId,
                name,
                url,
                mimeType: typeof body.mimeType === 'string' ? body.mimeType : null,
                sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null,
                kind,
            }).returning();
            return { attachment: attachment ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.attachment) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const attachment = result.attachment;
        emitTimelineEvent(db, timelineEvents, {
            type: 'file.attached',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(clientId),
            subject: { kind: 'agenda_attachment', id: attachment.id },
            actor: 'professional',
            payload: { name, kind },
        });
        return c.json({
            ok: true,
            attachment: {
                ...attachment,
                url: isOwnedStorageUrl(attachment.url) ? toProtectedMediaUrl(attachment.url) : attachment.url,
            },
        });
    });

    app.delete('/clients/:id/attachments/:aid', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const attachmentId = c.req.param('aid') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaClientAttachments).where(and(
                eq(agendaClientAttachments.id, attachmentId),
                eq(agendaClientAttachments.clientId, clientId),
                eq(agendaClientAttachments.professionalId, current.id),
            )).returning({ id: agendaClientAttachments.id });
            return { deleted: Boolean(deleted) };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.deleted) return c.json({ ok: false, error: 'Archivo no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Session Notes ─────────────────────────────────────────────────────────
    app.get('/notes/:appointmentId', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const appointmentId = c.req.param('appointmentId') ?? '';
        const note = await db.query.agendaSessionNotes.findFirst({ where: and(eq(agendaSessionNotes.appointmentId, appointmentId), eq(agendaSessionNotes.professionalId, profile.id)) });
        return c.json({ ok: true, note: note ?? null });
    });

    app.post('/notes', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.appointmentId || !body.content) return c.json({ ok: false, error: 'appointmentId y content requeridos' }, 400);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [appointment] = await tx.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.id, String(body.appointmentId)),
                eq(agendaAppointments.professionalId, current.id),
            )).limit(1);
            if (!appointment) return { appointment: null, note: null, created: false };
            const [existing] = await tx.select().from(agendaSessionNotes).where(and(
                eq(agendaSessionNotes.appointmentId, String(body.appointmentId)),
                eq(agendaSessionNotes.professionalId, current.id),
            )).limit(1);
            const [note] = existing
                ? await tx.update(agendaSessionNotes).set({ content: String(body.content), updatedAt: new Date() })
                    .where(and(eq(agendaSessionNotes.id, existing.id), eq(agendaSessionNotes.professionalId, current.id)))
                    .returning()
                : await tx.insert(agendaSessionNotes).values({
                    appointmentId: String(body.appointmentId),
                    professionalId: current.id,
                    clientId: appointment.clientId ?? null,
                    content: String(body.content),
                }).returning();
            return { appointment, note: note ?? null, created: !existing };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.appointment || !result.note) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        const { appointment: appt, note } = result;
        emitTimelineEvent(db, timelineEvents, {
            type: 'note.written',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(appt.clientId),
            subject: { kind: 'agenda_session_note', id: note.id },
            actor: 'professional',
            payload: { appointmentId: appt.id, created: result.created },
        });
        return c.json({ ok: true, note });
    });

    // ── Appointments ──────────────────────────────────────────────────────────
    app.get('/appointments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, appointments: [] });
        const fromStr = c.req.query('from'); const toStr = c.req.query('to');
        const conditions: SQL[] = [eq(agendaAppointments.professionalId, profile.id)];
        if (fromStr) conditions.push(gte(agendaAppointments.startsAt, new Date(fromStr)));
        if (toStr) conditions.push(lte(agendaAppointments.startsAt, new Date(toStr)));
        const appointments = await db.select().from(agendaAppointments).where(and(...conditions)).orderBy(asc(agendaAppointments.startsAt));
        return c.json({ ok: true, appointments });
    });

    app.post('/appointments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const appointmentClientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
        if (appointmentClientId) {
            const client = await db.query.agendaClients.findFirst({
                where: and(
                    eq(agendaClients.id, appointmentClientId),
                    eq(agendaClients.professionalId, profile.id),
                ),
            });
            if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        }
        if (!body.startsAt) return c.json({ ok: false, error: 'Fecha de inicio requerida' }, 400);
        const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
        if (durationMinutes < 15) return c.json({ ok: false, error: 'La duración mínima es 15 minutos.' }, 400);
        const profileTz = profile.timezone ?? 'America/Santiago';
        const startsAt = parseDateTimeInTimezone(String(body.startsAt), profileTz);
        if (Number.isNaN(startsAt.getTime())) return c.json({ ok: false, error: 'Fecha de inicio inválida' }, 400);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const rawFreq = typeof body.recurrenceFrequency === 'string' ? body.recurrenceFrequency : null;
        const frequency: 'weekly'|'biweekly'|'monthly'|null = rawFreq === 'weekly' || rawFreq === 'biweekly' || rawFreq === 'monthly' ? rawFreq : null;
        const legacyRepeat = typeof body.repeatWeekly === 'number' && body.repeatWeekly > 0 ? Math.min(body.repeatWeekly, 52) : 0;
        const recurrenceCount = typeof body.recurrenceCount === 'number' && body.recurrenceCount > 1 ? Math.min(body.recurrenceCount, 52) : (frequency ? 1 : 0);
        const effectiveFrequency = frequency ?? (legacyRepeat > 0 ? 'weekly' as const : null);
        const totalOccurrences = effectiveFrequency ? (frequency ? recurrenceCount : legacyRepeat + 1) : 1;
        const seriesId = totalOccurrences > 1 ? randomUUID() : null;
        const clientPackId = typeof body.clientPackId === 'string' && body.clientPackId ? body.clientPackId : null;
        if (clientPackId) {
            const bClientId = appointmentClientId;
            if (!bClientId) return c.json({ ok: false, error: 'Para usar un bono, selecciona primero un cliente.' }, 400);
            const clientPack = await db.query.agendaClientPacks.findFirst({ where: and(eq(agendaClientPacks.id, clientPackId), eq(agendaClientPacks.professionalId, profile.id), eq(agendaClientPacks.clientId, bClientId)) }) ?? null;
            if (!clientPack) return c.json({ ok: false, error: 'Bono no encontrado para este cliente.' }, 404);
            if (clientPack.status !== 'active') return c.json({ ok: false, error: 'Este bono ya no está activo.' }, 400);
            if (clientPack.expiresAt && clientPack.expiresAt < new Date()) return c.json({ ok: false, error: 'Este bono ya expiró.' }, 400);
            const remaining = clientPack.sessionsTotal - clientPack.sessionsUsed;
            if (remaining < totalOccurrences) return c.json({ ok: false, error: `Al bono le quedan ${remaining} sesión(es), necesitas ${totalOccurrences}.` }, 400);
            if (clientPack.appliesTo === 'services') { const svcId = typeof body.serviceId === 'string' ? body.serviceId : null; const list = Array.isArray(clientPack.serviceIds) ? clientPack.serviceIds : []; if (!svcId || !list.includes(svcId)) return c.json({ ok: false, error: 'Este bono no aplica al servicio elegido.' }, 400); }
        }
        let bookingModality: 'online' | 'presential' = body.modality === 'presential' ? 'presential' : 'online';
        const panelServiceId = typeof body.serviceId === 'string' && body.serviceId ? body.serviceId : null;
        if (panelServiceId) {
            const svc = await db.query.agendaServices.findFirst({
                where: and(
                    eq(agendaServices.id, panelServiceId),
                    eq(agendaServices.professionalId, profile.id),
                    eq(agendaServices.kind, 'appointment'),
                ),
            });
            if (!svc) return c.json({ ok: false, error: 'Servicio no disponible.' }, 400);
            const resolved = resolveBookingModality(svc, typeof body.modality === 'string' ? body.modality : null);
            if (!resolved) return c.json({ ok: false, error: 'Modalidad no disponible para este servicio.' }, 400);
            bookingModality = resolved;
        }
        const addOffset = (base: Date, idx: number, freq: string|null): Date => {
            if (!freq || idx === 0) return new Date(base.getTime());
            const d = new Date(base.getTime());
            if (freq === 'weekly') d.setDate(d.getDate() + idx * 7);
            else if (freq === 'biweekly') d.setDate(d.getDate() + idx * 14);
            else if (freq === 'monthly') d.setMonth(d.getMonth() + idx);
            return d;
        };
        const creation = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (isFreePlan(current)) {
                const limitError = await checkAppointmentLimit(current.id, totalOccurrences);
                if (limitError) return { kind: 'limit' as const, error: limitError };
            }
            if (appointmentClientId) {
                const [currentClient] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                    eq(agendaClients.id, appointmentClientId),
                    eq(agendaClients.professionalId, current.id),
                )).limit(1).for('update');
                if (!currentClient) return { kind: 'client_missing' as const };
            }
            let currentPack: any = null;
            if (clientPackId) {
                const [pack] = await tx.select().from(agendaClientPacks).where(and(
                    eq(agendaClientPacks.id, clientPackId),
                    eq(agendaClientPacks.professionalId, current.id),
                    eq(agendaClientPacks.clientId, appointmentClientId!),
                )).limit(1).for('update');
                if (!pack) return { kind: 'pack_missing' as const };
                if (pack.status !== 'active') return { kind: 'pack_inactive' as const };
                if (pack.expiresAt && pack.expiresAt < new Date()) return { kind: 'pack_expired' as const };
                const remaining = pack.sessionsTotal - pack.sessionsUsed;
                if (remaining < totalOccurrences) return { kind: 'pack_insufficient' as const, remaining };
                if (pack.appliesTo === 'services') {
                    const services = Array.isArray(pack.serviceIds) ? pack.serviceIds : [];
                    if (!panelServiceId || !services.includes(panelServiceId)) return { kind: 'pack_service_mismatch' as const };
                }
                currentPack = pack;
            }
            let currentBookingModality = bookingModality;
            if (panelServiceId) {
                const [service] = await tx.select().from(agendaServices).where(and(
                    eq(agendaServices.id, panelServiceId),
                    eq(agendaServices.professionalId, current.id),
                    eq(agendaServices.kind, 'appointment'),
                )).limit(1).for('update');
                if (!service) return { kind: 'service_missing' as const };
                const resolved = resolveBookingModality(service, typeof body.modality === 'string' ? body.modality : null);
                if (!resolved) return { kind: 'modality_unavailable' as const };
                currentBookingModality = resolved;
            }

            const appointments: any[] = [];
            for (let i = 0; i < totalOccurrences; i++) {
                const occStart = addOffset(startsAt, i, effectiveFrequency);
                const occEnd = addOffset(endsAt, i, effectiveFrequency);
                const [appointment] = await tx.insert(agendaAppointments).values({
                    professionalId: current.id,
                    serviceId: panelServiceId,
                    clientId: appointmentClientId,
                    clientName: typeof body.clientName === 'string' ? body.clientName || null : null,
                    clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail || null : null,
                    clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone || null : null,
                    startsAt: occStart,
                    endsAt: occEnd,
                    durationMinutes,
                    modality: currentBookingModality,
                    location: typeof body.location === 'string' ? body.location || null : null,
                    status: 'confirmed',
                    price: currentPack ? null : (typeof body.price === 'string' && body.price ? body.price : null),
                    currency: current.currency,
                    internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes || null : null,
                    seriesId,
                    recurrenceFrequency: seriesId ? effectiveFrequency : null,
                    clientPackId: currentPack?.id ?? null,
                }).returning();
                appointments.push(appointment);
            }

            let consumedPack: { id: string; clientId: string; sessionsUsed: number; sessionsTotal: number } | null = null;
            if (currentPack) {
                const sessionsUsed = currentPack.sessionsUsed + totalOccurrences;
                await tx.update(agendaClientPacks).set({
                    sessionsUsed,
                    status: sessionsUsed >= currentPack.sessionsTotal ? 'completed' : currentPack.status,
                    updatedAt: new Date(),
                }).where(and(
                    eq(agendaClientPacks.id, currentPack.id),
                    eq(agendaClientPacks.professionalId, current.id),
                ));
                consumedPack = {
                    id: currentPack.id,
                    clientId: currentPack.clientId,
                    sessionsUsed,
                    sessionsTotal: currentPack.sessionsTotal,
                };
            }
            return { kind: 'created' as const, appointments, consumedPack };
        });
        if (!creation) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (creation.kind === 'limit') return c.json({ ok: false, error: creation.error }, 403);
        if (creation.kind === 'client_missing') return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        if (creation.kind === 'pack_missing') return c.json({ ok: false, error: 'Bono no encontrado para este cliente.' }, 404);
        if (creation.kind === 'pack_inactive') return c.json({ ok: false, error: 'Este bono ya no está activo.' }, 400);
        if (creation.kind === 'pack_expired') return c.json({ ok: false, error: 'Este bono ya expiró.' }, 400);
        if (creation.kind === 'pack_insufficient') return c.json({ ok: false, error: `Al bono le quedan ${creation.remaining} sesión(es), necesitas ${totalOccurrences}.` }, 400);
        if (creation.kind === 'pack_service_mismatch') return c.json({ ok: false, error: 'Este bono no aplica al servicio elegido.' }, 400);
        if (creation.kind === 'service_missing') return c.json({ ok: false, error: 'Servicio no disponible.' }, 400);
        if (creation.kind === 'modality_unavailable') return c.json({ ok: false, error: 'Modalidad no disponible para este servicio.' }, 400);
        const appointmentsList = creation.appointments;
        const consumedPack = creation.consumedPack;
        const firstAppt = appointmentsList[0];
        const calendarEvent = await syncToGoogleCalendar(profile, { ...firstAppt, googleEventId: null, modality: firstAppt.modality }, 'create');
        if (calendarEvent?.eventId) {
            await db.update(agendaAppointments).set({ googleEventId: calendarEvent.eventId }).where(and(
                eq(agendaAppointments.id, firstAppt.id),
                eq(agendaAppointments.professionalId, profile.id),
            ));
        }
        if (consumedPack) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'pack.session_consumed',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(consumedPack.clientId),
                subject: { kind: 'agenda_client_pack', id: consumedPack.id },
                actor: 'professional',
                payload: { sessionsUsed: consumedPack.sessionsUsed, sessionsTotal: consumedPack.sessionsTotal, appointments: totalOccurrences },
            });
        }
        const tz = profile.timezone ?? 'America/Santiago';
        const fmtT = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
        const fmtD = (d: Date) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
        void sendPushToUser(user.id, { title: '📅 Nueva cita agendada', body: `${firstAppt.clientName ?? 'Paciente'} — ${fmtD(firstAppt.startsAt)} a las ${fmtT(firstAppt.startsAt)}`, url: '/panel/agenda' });
        if (firstAppt.clientEmail) {
            const agendaAppUrl = asString(process.env.AGENDA_APP_URL) || 'https://simpleagenda.app';
            let svcName: string|null = null;
            if (firstAppt.serviceId) { const svc = await db.query.agendaServices.findFirst({ where: eq(agendaServices.id, firstAppt.serviceId) }); svcName = svc?.name ?? null; }
            void sendBookingConfirmationEmail(firstAppt.clientEmail, { appointmentId: firstAppt.id, clientName: firstAppt.clientName ?? 'Paciente', professionalName: profile.displayName ?? 'el profesional', slug: profile.slug, serviceName: svcName, startsAt: firstAppt.startsAt, endsAt: firstAppt.endsAt, durationMinutes: firstAppt.durationMinutes, modality: firstAppt.modality, price: firstAppt.price, currency: firstAppt.currency, timezone: tz, status: 'confirmed', seriesDates: seriesId ? appointmentsList.map((a: any) => a.startsAt) : null, seriesFrequency: seriesId ? effectiveFrequency : null, paymentMethods: null, cancelUrl: `${agendaAppUrl}/cancelar?appt=${firstAppt.id}&slug=${profile.slug}`, appUrl: agendaAppUrl }).catch((err: any) => console.error('[agenda] Failed to send confirmation email:', err));
        }
        const { insertPlatformNotifications } = await import('../platform/notifications-service.js');
        void insertPlatformNotifications({
            userId: user.id,
            vertical: 'agenda',
            type: 'appointment.new_booking',
            title: 'Nueva cita agendada',
            body: `${firstAppt.clientName ?? 'Paciente'} — ${fmtD(firstAppt.startsAt)} a las ${fmtT(firstAppt.startsAt)}`,
            actionUrl: '/panel/agenda',
            entityType: 'appointment',
            entityId: firstAppt.id,
        });
        for (const appt of appointmentsList) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'booking.confirmed',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(appt.clientId),
                subject: { kind: 'agenda_appointment', id: appt.id },
                actor: 'professional',
                payload: {
                    status: appt.status,
                    startsAt: appt.startsAt instanceof Date ? appt.startsAt.toISOString() : appt.startsAt,
                    source: 'panel',
                },
            });
        }
        return c.json({ ok: true, appointment: appointmentsList[0], appointments: appointmentsList });
    });

    app.put('/appointments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (body.startsAt) {
            const profileTz = profile.timezone ?? 'America/Santiago';
            const s = parseDateTimeInTimezone(String(body.startsAt), profileTz);
            const dur = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
            patch.startsAt = s;
            patch.endsAt = new Date(s.getTime() + dur * 60_000);
            patch.durationMinutes = dur;
        } else if (body.durationMinutes) { patch.durationMinutes = body.durationMinutes; }
        if ('clientId' in body) {
            if (body.clientId === null || body.clientId === '') patch.clientId = null;
            else if (typeof body.clientId === 'string') {
                const client = await db.query.agendaClients.findFirst({
                    where: and(
                        eq(agendaClients.id, body.clientId),
                        eq(agendaClients.professionalId, profile.id),
                    ),
                });
                if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
                patch.clientId = client.id;
            } else return c.json({ ok: false, error: 'Cliente inválido' }, 400);
        }
        if ('serviceId' in body) {
            if (body.serviceId === null || body.serviceId === '') patch.serviceId = null;
            else if (typeof body.serviceId === 'string') {
                const service = await db.query.agendaServices.findFirst({
                    where: and(
                        eq(agendaServices.id, body.serviceId),
                        eq(agendaServices.professionalId, profile.id),
                        eq(agendaServices.kind, 'appointment'),
                    ),
                });
                if (!service) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
                patch.serviceId = service.id;
            } else return c.json({ ok: false, error: 'Servicio inválido' }, 400);
        }
        for (const key of ['clientName','clientEmail','clientPhone','modality','price','internalNotes'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (typeof patch.clientId === 'string') {
                const [client] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                    eq(agendaClients.id, patch.clientId),
                    eq(agendaClients.professionalId, current.id),
                )).limit(1);
                if (!client) return { kind: 'client_missing' as const };
            }
            if (typeof patch.serviceId === 'string') {
                const [service] = await tx.select({ id: agendaServices.id }).from(agendaServices).where(and(
                    eq(agendaServices.id, patch.serviceId),
                    eq(agendaServices.professionalId, current.id),
                    eq(agendaServices.kind, 'appointment'),
                )).limit(1);
                if (!service) return { kind: 'service_missing' as const };
            }
            const [updated] = await tx.update(agendaAppointments).set(patch).where(and(
                eq(agendaAppointments.id, id),
                eq(agendaAppointments.professionalId, current.id),
            )).returning();
            return updated ? { kind: 'updated' as const, appointment: updated } : { kind: 'appointment_missing' as const };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'client_missing') return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        if (result.kind === 'service_missing') return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        if (result.kind === 'appointment_missing') return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        void syncToGoogleCalendar(profile, result.appointment, 'update');
        return c.json({ ok: true, appointment: result.appointment });
    });

    app.patch('/appointments/:id/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const status = String(body.status ?? '');
        if (!['pending','confirmed','completed','cancelled','no_show'].includes(status)) return c.json({ ok: false, error: 'Estado inválido' }, 400);
        const patch: Record<string, unknown> = { status, updatedAt: new Date() };
        if (status === 'cancelled') { patch.cancelledAt = new Date(); patch.cancelledBy = 'professional'; if (typeof body.cancellationReason === 'string') patch.cancellationReason = body.cancellationReason; }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [prev] = await tx.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.id, id),
                eq(agendaAppointments.professionalId, current.id),
            )).limit(1).for('update');
            if (!prev) return { kind: 'missing' as const };
            const [updated] = await tx.update(agendaAppointments).set(patch).where(and(
                eq(agendaAppointments.id, id),
                eq(agendaAppointments.professionalId, current.id),
            )).returning();
            if (!updated) return { kind: 'missing' as const };
            if (status === 'cancelled' && prev.status !== 'cancelled' && prev.clientPackId) {
                const [pack] = await tx.select().from(agendaClientPacks).where(and(
                    eq(agendaClientPacks.id, prev.clientPackId),
                    eq(agendaClientPacks.professionalId, current.id),
                )).limit(1).for('update');
                if (pack && pack.sessionsUsed > 0) {
                    const sessionsUsed = Math.max(0, pack.sessionsUsed - 1);
                    await tx.update(agendaClientPacks).set({
                        sessionsUsed,
                        status: pack.status === 'completed' && sessionsUsed < pack.sessionsTotal ? 'active' : pack.status,
                        updatedAt: new Date(),
                    }).where(and(
                        eq(agendaClientPacks.id, pack.id),
                        eq(agendaClientPacks.professionalId, current.id),
                    ));
                }
            }
            return { kind: 'updated' as const, prev, appointment: updated };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'missing') return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        const { prev, appointment: updated } = result;
        if (status === 'cancelled') { void syncToGoogleCalendar(profile, updated, 'delete'); }
        else { void syncToGoogleCalendar(profile, updated, 'update'); }
        if (status === 'completed' && !isFreePlan(profile)) {
            void (async () => {
                try {
                    const out = await ensureNpsForAppointment(profile.id, updated.id, updated.clientId);
                    if (!out?.token || !updated.clientEmail) return;
                    const existingNps = await db.query.agendaNpsResponses.findFirst({
                        where: eq(agendaNpsResponses.token, out.token),
                    });
                    if (existingNps?.sentAt || existingNps?.submittedAt) return;
                    const { baseUrl } = resolvePublicProfileUrls(profile);
                    const { sendAppointmentReviewEmail } = await import('../../lib/auth-email.js');
                    const sent = await sendAppointmentReviewEmail(updated.clientEmail, {
                        clientName: updated.clientName ?? 'Paciente',
                        professionalName: profile.displayName ?? 'tu profesional',
                        reviewUrl: `${baseUrl}/nps/${out.token}`,
                    });
                    if (sent) {
                        await db.update(agendaNpsResponses)
                            .set({ sentAt: new Date() })
                            .where(eq(agendaNpsResponses.token, out.token));
                    }
                } catch {
                    // No bloquea el cierre de cita si falla el correo
                }
            })();
        }
        emitTimelineEvent(db, timelineEvents, {
            type: 'booking.status_changed',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(updated.clientId),
            subject: { kind: 'agenda_appointment', id: updated.id },
            actor: 'professional',
            payload: { from: prev.status, to: status },
        });
        return c.json({ ok: true, appointment: updated });
    });

    app.post('/appointments/:id/cancel-series', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const scope = body.scope === 'all' ? 'all' : 'future';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [anchor] = await tx.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.id, id),
                eq(agendaAppointments.professionalId, current.id),
            )).limit(1).for('update');
            if (!anchor) return { kind: 'missing' as const, cancelled: [] as any[] };
            if (!anchor.seriesId) return { kind: 'not_series' as const, cancelled: [] as any[] };
            const conditions: SQL[] = [
                eq(agendaAppointments.professionalId, current.id),
                eq(agendaAppointments.seriesId, anchor.seriesId),
                or(eq(agendaAppointments.status, 'confirmed'), eq(agendaAppointments.status, 'pending')),
            ];
            if (scope === 'future') conditions.push(gte(agendaAppointments.startsAt, anchor.startsAt));
            const cancelled = await tx.update(agendaAppointments).set({
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: 'professional',
                cancellationReason: typeof body.cancellationReason === 'string' ? body.cancellationReason : null,
                updatedAt: new Date(),
            }).where(and(...conditions)).returning();
            return { kind: 'cancelled' as const, cancelled };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'missing') return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        if (result.kind === 'not_series') return c.json({ ok: false, error: 'La cita no pertenece a una serie' }, 400);
        const { cancelled } = result;
        for (const appt of cancelled) {
            void syncToGoogleCalendar(profile, appt, 'delete');
            emitTimelineEvent(db, timelineEvents, {
                type: 'booking.status_changed',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(appt.clientId),
                subject: { kind: 'agenda_appointment', id: appt.id },
                actor: 'professional',
                payload: { from: 'confirmed', to: 'cancelled', scope },
            });
        }
        return c.json({ ok: true, count: cancelled.length, cancelled });
    });

    // ── Stats & Analytics ─────────────────────────────────────────────────────
    app.get('/stats', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, stats: { todayCount: 0, activeClients: 0, pendingPayments: 0, nextAppointment: null, weeklyData: [], thisMonthRevenue: 0, lastMonthRevenue: 0, thisMonthAppointments: 0, hasServices: false, hasRules: false, hasLocations: false } });
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
        const dow = now.getDay(); const dtm = dow === 0 ? -6 : 1-dow;
        const weekStart = new Date(now); weekStart.setDate(now.getDate()+dtm); weekStart.setHours(0,0,0,0);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6); weekEnd.setHours(23,59,59,999);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23,59,59,999);
        const [todayAppts,activeClientsResult,pendingPaymentsResult,nextAppt,weeklyAppts,thisMonthPaid,lastMonthPaid,thisMonthApptCount,servicesCount,rulesCount,locationsCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(agendaAppointments).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,todayStart),lte(agendaAppointments.startsAt,todayEnd),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)),
            db.select({ count: sql<number>`count(*)` }).from(agendaClients).where(and(eq(agendaClients.professionalId,profile.id),eq(agendaClients.status,'active'))),
            db.select({ total: sql<string>`coalesce(sum(amount),0)` }).from(agendaPayments).where(and(eq(agendaPayments.professionalId,profile.id),eq(agendaPayments.status,'pending'))),
            db.select().from(agendaAppointments).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,now),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)).orderBy(asc(agendaAppointments.startsAt)).limit(1),
            db.select({ day: sql<string>`DATE(${agendaAppointments.startsAt})`, count: sql<number>`count(*)` }).from(agendaAppointments).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,weekStart),lte(agendaAppointments.startsAt,weekEnd),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)).groupBy(sql`DATE(${agendaAppointments.startsAt})`),
            db.select({ total: sql<string>`coalesce(sum(amount),0)` }).from(agendaPayments).where(and(eq(agendaPayments.professionalId,profile.id),eq(agendaPayments.status,'paid'),gte(agendaPayments.paidAt,monthStart),lte(agendaPayments.paidAt,monthEnd))),
            db.select({ total: sql<string>`coalesce(sum(amount),0)` }).from(agendaPayments).where(and(eq(agendaPayments.professionalId,profile.id),eq(agendaPayments.status,'paid'),gte(agendaPayments.paidAt,lastMonthStart),lte(agendaPayments.paidAt,lastMonthEnd))),
            db.select({ count: sql<number>`count(*)` }).from(agendaAppointments).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,monthStart),lte(agendaAppointments.startsAt,monthEnd),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)),
            db.select({ count: sql<number>`count(*)` }).from(agendaServices).where(and(eq(agendaServices.professionalId,profile.id),eq(agendaServices.isActive,true))),
            db.select({ count: sql<number>`count(*)` }).from(agendaAvailabilityRules).where(and(eq(agendaAvailabilityRules.professionalId,profile.id),eq(agendaAvailabilityRules.isActive,true))),
            db.select({ count: sql<number>`count(*)` }).from(agendaLocations).where(and(eq(agendaLocations.professionalId,profile.id),eq(agendaLocations.isActive,true))),
        ]);
        const DAY_LABELS = ['L','M','X','J','V','S','D'];
        const weeklyMap = new Map(weeklyAppts.map((r:any)=>[r.day,Number(r.count)]));
        const todayStr = todayStart.toISOString().slice(0,10);
        const weeklyData = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); const ds=d.toISOString().slice(0,10); return {label:DAY_LABELS[i],date:ds,count:weeklyMap.get(ds)??0,isToday:ds===todayStr}; });
        const hasProAccess = !isFreePlan(profile);
        return c.json({ ok:true, stats:{ todayCount:Number(todayAppts[0]?.count??0), activeClients:Number(activeClientsResult[0]?.count??0), pendingPayments:hasProAccess?Number(pendingPaymentsResult[0]?.total??0):0, nextAppointment:nextAppt[0]??null, weeklyData, thisMonthRevenue:hasProAccess?Number(thisMonthPaid[0]?.total??0):0, lastMonthRevenue:hasProAccess?Number(lastMonthPaid[0]?.total??0):0, thisMonthAppointments:Number(thisMonthApptCount[0]?.count??0), hasServices:Number(servicesCount[0]?.count??0)>0, hasRules:Number(rulesCount[0]?.count??0)>0, hasLocations:Number(locationsCount[0]?.count??0)>0 } });
    });

    app.get('/analytics', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (profile && proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        if (!profile) return c.json({ ok: true, analytics: { monthly:[], byService:[], topClients:[], noShowRate:0, totalCompleted:0, totalCancelled:0, totalNoShow:0, nps:{avg:null,promoters:0,passives:0,detractors:0,count:0,score:null} } });
        const now = new Date(); const twelveMonthsAgo = new Date(now.getFullYear(),now.getMonth()-11,1);
        const [monthlyRows,serviceRows,topClientsRows,statusCountsRows,npsRows] = await Promise.all([
            db.select({ month: sql<string>`to_char(${agendaPayments.paidAt},'YYYY-MM')`, revenue: sql<string>`coalesce(sum(${agendaPayments.amount}),0)` }).from(agendaPayments).where(and(eq(agendaPayments.professionalId,profile.id),eq(agendaPayments.status,'paid'),gte(agendaPayments.paidAt,twelveMonthsAgo))).groupBy(sql`to_char(${agendaPayments.paidAt},'YYYY-MM')`).orderBy(sql`to_char(${agendaPayments.paidAt},'YYYY-MM')`),
            db.select({ serviceId:agendaServices.id, serviceName:agendaServices.name, count:sql<number>`count(${agendaAppointments.id})`, revenue:sql<string>`coalesce(sum(${agendaAppointments.price}),0)` }).from(agendaAppointments).leftJoin(agendaServices,eq(agendaAppointments.serviceId,agendaServices.id)).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,twelveMonthsAgo),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)).groupBy(agendaServices.id,agendaServices.name).orderBy(sql`count(${agendaAppointments.id}) DESC`).limit(10),
            db.select({ clientId:agendaAppointments.clientId, clientName:agendaAppointments.clientName, count:sql<number>`count(*)` }).from(agendaAppointments).where(and(eq(agendaAppointments.professionalId,profile.id),gte(agendaAppointments.startsAt,twelveMonthsAgo),sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)).groupBy(agendaAppointments.clientId,agendaAppointments.clientName).orderBy(sql`count(*) DESC`).limit(10),
            db.select({ status:agendaAppointments.status, count:sql<number>`count(*)` }).from(agendaAppointments).where(eq(agendaAppointments.professionalId,profile.id)).groupBy(agendaAppointments.status),
            db.select({ score:agendaNpsResponses.score }).from(agendaNpsResponses).where(and(eq(agendaNpsResponses.professionalId,profile.id),sql`${agendaNpsResponses.submittedAt} IS NOT NULL`)),
        ]);
        const monthlyMap = new Map<string, number>(monthlyRows.map((r:any)=>[String(r.month),Number(r.revenue)]));
        const MONTH_LABELS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const monthly: any[] = [];
        for (let i=11;i>=0;i--) { const d=new Date(now.getFullYear(),now.getMonth()-i,1); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; monthly.push({month:key,label:MONTH_LABELS[d.getMonth()],revenue:monthlyMap.get(key)??0}); }
        const statusMap = new Map<string, number>(statusCountsRows.map((r:any)=>[String(r.status),Number(r.count)]));
        const totalCompleted=statusMap.get('completed')??0; const totalCancelled=statusMap.get('cancelled')??0; const totalNoShow=statusMap.get('no_show')??0;
        let promoters=0,passives=0,detractors=0,sum=0;
        for (const r of npsRows) { const s=(r as any).score??-1; if(s<0) continue; sum+=s; if(s>=9) promoters++; else if(s>=7) passives++; else detractors++; }
        const npsCount=promoters+passives+detractors; const finished=totalCompleted+totalNoShow;
        return c.json({ ok:true, analytics:{ monthly, byService:serviceRows.map((r:any)=>({serviceId:r.serviceId??null,serviceName:r.serviceName??'Sin servicio',count:Number(r.count??0),revenue:Number(r.revenue??0)})), topClients:topClientsRows.map((r:any)=>({clientId:r.clientId,clientName:r.clientName??'—',count:Number(r.count??0)})), noShowRate:finished>0?totalNoShow/finished:0, totalCompleted, totalCancelled, totalNoShow, nps:{avg:npsCount>0?sum/npsCount:null,promoters,passives,detractors,count:npsCount,score:npsCount>0?Math.round(((promoters-detractors)/npsCount)*100):null} } });
    });

    // ── NPS ───────────────────────────────────────────────────────────────────
    app.get('/nps', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (profile && proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        if (!profile) return c.json({ ok: true, responses: [] });
        const rows = await db.select({
            id: agendaNpsResponses.id,
            score: agendaNpsResponses.score,
            ratingStars: agendaNpsResponses.ratingStars,
            comment: agendaNpsResponses.comment,
            publicConsent: agendaNpsResponses.publicConsent,
            isPublic: agendaNpsResponses.isPublic,
            submittedAt: agendaNpsResponses.submittedAt,
            sentAt: agendaNpsResponses.sentAt,
            appointmentId: agendaNpsResponses.appointmentId,
            clientName: agendaAppointments.clientName,
        }).from(agendaNpsResponses).leftJoin(agendaAppointments,eq(agendaNpsResponses.appointmentId,agendaAppointments.id)).where(and(eq(agendaNpsResponses.professionalId,profile.id),sql`${agendaNpsResponses.submittedAt} IS NOT NULL`)).orderBy(desc(agendaNpsResponses.submittedAt)).limit(100);
        return c.json({ ok: true, responses: rows });
    });

    app.patch('/nps/:id/visibility', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const isPublic = body.isPublic === true;

        const record = await db.query.agendaNpsResponses.findFirst({
            where: and(eq(agendaNpsResponses.id, id), eq(agendaNpsResponses.professionalId, profile.id)),
        });
        if (!record || !record.submittedAt) return c.json({ ok: false, error: 'Reseña no encontrada' }, 404);
        if (isPublic && !record.publicConsent) {
            return c.json({ ok: false, error: 'El paciente no autorizó publicar esta opinión.' }, 400);
        }

        await db.update(agendaNpsResponses)
            .set({ isPublic })
            .where(eq(agendaNpsResponses.id, record.id));
        return c.json({ ok: true, isPublic });
    });

    app.post('/nps/for-appointment', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : '';
        if (!appointmentId) return c.json({ ok: false, error: 'appointmentId requerido' }, 400);
        const appt = await db.query.agendaAppointments.findFirst({ where: and(eq(agendaAppointments.id,appointmentId),eq(agendaAppointments.professionalId,profile.id)) });
        if (!appt) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        const out = await ensureNpsForAppointment(profile.id,appointmentId,appt.clientId);
        return c.json({ ok: true, token: out?.token ?? null });
    });

    // ── Referrals ─────────────────────────────────────────────────────────────
    app.get('/referrals', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, referrals: [], stats: { total:0, converted:0, pending:0, rewarded:0 } });
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const rows = await db.select({ id:agendaReferrals.id, referrerClientId:agendaReferrals.referrerClientId, refereeClientId:agendaReferrals.refereeClientId, refereeName:agendaReferrals.refereeName, refereePhone:agendaReferrals.refereePhone, status:agendaReferrals.status, rewardNote:agendaReferrals.rewardNote, createdAt:agendaReferrals.createdAt, convertedAt:agendaReferrals.convertedAt, rewardedAt:agendaReferrals.rewardedAt, referrerFirstName:agendaClients.firstName, referrerLastName:agendaClients.lastName }).from(agendaReferrals).leftJoin(agendaClients,eq(agendaReferrals.referrerClientId,agendaClients.id)).where(eq(agendaReferrals.professionalId,profile.id)).orderBy(desc(agendaReferrals.createdAt)).limit(200);
        const stats={total:rows.length,converted:0,pending:0,rewarded:0};
        for (const r of rows) { if(r.status==='converted') stats.converted++; else if(r.status==='pending') stats.pending++; else if(r.status==='rewarded') stats.rewarded++; }
        return c.json({ ok: true, referrals: rows, stats });
    });

    app.post('/referrals', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const referrerClientId = typeof body.referrerClientId === 'string' ? body.referrerClientId : '';
        if (!referrerClientId) return c.json({ ok: false, error: 'Selecciona quién refirió' }, 400);
        const refereeName = typeof body.refereeName === 'string' ? body.refereeName.trim().slice(0,200) : '';
        const refereeClientId = typeof body.refereeClientId === 'string' && body.refereeClientId ? body.refereeClientId : null;
        if (!refereeName && !refereeClientId) return c.json({ ok: false, error: 'Indica el nombre del referido' }, 400);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [referrer] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                eq(agendaClients.id, referrerClientId),
                eq(agendaClients.professionalId, current.id),
            )).limit(1);
            if (!referrer) return { kind: 'referrer_missing' as const };
            if (refereeClientId) {
                const [referee] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                    eq(agendaClients.id, refereeClientId),
                    eq(agendaClients.professionalId, current.id),
                )).limit(1);
                if (!referee) return { kind: 'referee_missing' as const };
            }
            const [referral] = await tx.insert(agendaReferrals).values({
                professionalId: current.id,
                referrerClientId,
                refereeClientId,
                refereeName: refereeName || null,
                refereePhone: typeof body.refereePhone === 'string' ? body.refereePhone.trim().slice(0, 40) : null,
                rewardNote: typeof body.rewardNote === 'string' ? body.rewardNote.slice(0, 500) : null,
            }).returning();
            return { kind: 'created' as const, referral };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'referrer_missing') return c.json({ ok: false, error: 'Paciente no encontrado' }, 404);
        if (result.kind === 'referee_missing') return c.json({ ok: false, error: 'Paciente referido no encontrado' }, 404);
        const created = result.referral;
        emitTimelineEvent(db, timelineEvents, {
            type: 'referral.created',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(referrerClientId),
            subject: { kind: 'agenda_referral', id: created.id },
            actor: 'professional',
            payload: { refereeName: created.refereeName, refereeClientId: created.refereeClientId },
        });
        return c.json({ ok: true, referral: created });
    });

    app.patch('/referrals/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        if (typeof body.status==='string' && (REFERRAL_STATUSES as readonly string[]).includes(body.status)) { patch.status=body.status; if(body.status==='converted') patch.convertedAt=new Date(); else if(body.status==='rewarded') patch.rewardedAt=new Date(); }
        if (typeof body.rewardNote==='string') patch.rewardNote=body.rewardNote.slice(0,500);
        if (typeof body.refereeClientId==='string') patch.refereeClientId = body.refereeClientId || null;
        if (Object.keys(patch).length===0) return c.json({ ok: false, error: 'Sin cambios' }, 400);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (typeof patch.refereeClientId === 'string') {
                const [referee] = await tx.select({ id: agendaClients.id }).from(agendaClients).where(and(
                    eq(agendaClients.id, patch.refereeClientId),
                    eq(agendaClients.professionalId, current.id),
                )).limit(1);
                if (!referee) return { kind: 'referee_missing' as const };
            }
            const [updated] = await tx.update(agendaReferrals).set(patch).where(and(
                eq(agendaReferrals.id, id),
                eq(agendaReferrals.professionalId, current.id),
            )).returning();
            return updated ? { kind: 'updated' as const, referral: updated } : { kind: 'missing' as const };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'referee_missing') return c.json({ ok: false, error: 'Paciente referido no encontrado' }, 404);
        if (result.kind === 'missing') return c.json({ ok: false, error: 'Referido no encontrado' }, 404);
        const updated = result.referral;
        if (body.status === 'converted' || body.status === 'rewarded') {
            emitTimelineEvent(db, timelineEvents, {
                type: body.status === 'converted' ? 'referral.converted' : 'referral.rewarded',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(updated.referrerClientId),
                subject: { kind: 'agenda_referral', id: updated.id },
                actor: 'professional',
                payload: { status: updated.status },
            });
        }
        return c.json({ ok: true, referral: updated });
    });

    app.delete('/referrals/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaReferrals).where(and(
                eq(agendaReferrals.id, id),
                eq(agendaReferrals.professionalId, current.id),
            )).returning({ id: agendaReferrals.id });
            return { deleted: Boolean(deleted) };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.deleted) return c.json({ ok: false, error: 'Referido no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Promotions ────────────────────────────────────────────────────────────
    app.get('/promotions', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const rows = await db.select().from(agendaPromotions).where(eq(agendaPromotions.professionalId, profile.id)).orderBy(desc(agendaPromotions.createdAt));
        return c.json({ ok: true, promotions: rows });
    });

    app.post('/promotions', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        if (!label) return c.json({ ok: false, error: 'Falta el nombre de la promoción.' }, 400);
        const discountType = typeof body.discountType === 'string' && PROMOTION_DISCOUNT_TYPES.has(body.discountType) ? body.discountType : 'percent';
        const discountValue = parseOptionalNumber(body.discountValue);
        if (discountValue === null || discountValue <= 0) return c.json({ ok: false, error: 'El descuento debe ser mayor a 0.' }, 400);
        if (discountType === 'percent' && discountValue > 100) return c.json({ ok: false, error: 'El porcentaje no puede superar 100.' }, 400);
        const appliesTo = typeof body.appliesTo === 'string' && PROMOTION_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        if (!await areProfileAppointmentServices(profile.id, serviceIds)) return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
        if (appliesTo === 'services' && serviceIds.length === 0) return c.json({ ok: false, error: 'Selecciona al menos un servicio.' }, 400);
        const code = normalizePromoCode(body.code);
        const startsAt = parseOptionalDate(body.startsAt); const endsAt = parseOptionalDate(body.endsAt);
        if (startsAt && endsAt && endsAt < startsAt) return c.json({ ok: false, error: 'La fecha de fin es anterior al inicio.' }, 400);
        const minAmountN = parseOptionalNumber(body.minAmount); const maxUsesN = parseOptionalNumber(body.maxUses);
        try {
            const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
                if (!await areProfileAppointmentServices(current.id, serviceIds, tx)) return { kind: 'service_missing' as const };
                const [created] = await tx.insert(agendaPromotions).values({
                    professionalId: current.id,
                    code,
                    label,
                    description: typeof body.description === 'string' ? body.description : null,
                    discountType,
                    discountValue: String(discountValue),
                    appliesTo,
                    serviceIds,
                    minAmount: minAmountN !== null ? String(minAmountN) : null,
                    maxUses: maxUsesN !== null ? Math.floor(maxUsesN) : null,
                    startsAt,
                    endsAt,
                    isActive: body.isActive === false ? false : true,
                }).returning();
                return { kind: 'created' as const, promotion: created };
            });
            if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
            if (result.kind === 'service_missing') return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
            const created = result.promotion;
            await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: created.id, action: 'create', metadata: { code, discountType, discountValue }, ctx: c });
            return c.json({ ok: true, promotion: created });
        } catch (err: unknown) { if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') return c.json({ ok: false, error: 'Ya existe un cupón con ese código.' }, 409); throw err; }
    });

    app.patch('/promotions/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const existing = await db.query.agendaPromotions.findFirst({ where: and(eq(agendaPromotions.id, id), eq(agendaPromotions.professionalId, profile.id)) });
        if (!existing) return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.label === 'string') { const l = body.label.trim(); if (!l) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.label = l; }
        if ('description' in body) patch.description = typeof body.description === 'string' ? body.description : null;
        if (typeof body.code !== 'undefined') patch.code = normalizePromoCode(body.code);
        if (typeof body.discountType === 'string' && PROMOTION_DISCOUNT_TYPES.has(body.discountType)) patch.discountType = body.discountType;
        if ('discountValue' in body) { const v = parseOptionalNumber(body.discountValue); if (v === null || v <= 0) return c.json({ ok: false, error: 'Descuento inválido.' }, 400); if ((patch.discountType ?? existing.discountType) === 'percent' && v > 100) return c.json({ ok: false, error: 'El porcentaje no puede superar 100.' }, 400); patch.discountValue = String(v); }
        if (typeof body.appliesTo === 'string' && PROMOTION_APPLIES_TO.has(body.appliesTo)) patch.appliesTo = body.appliesTo;
        if (Array.isArray(body.serviceIds)) {
            const serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
            if (!await areProfileAppointmentServices(profile.id, serviceIds)) return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
            patch.serviceIds = serviceIds;
        }
        if ('minAmount' in body) { const v = parseOptionalNumber(body.minAmount); patch.minAmount = v !== null ? String(v) : null; }
        if ('maxUses' in body) { const v = parseOptionalNumber(body.maxUses); patch.maxUses = v !== null ? Math.floor(v) : null; }
        if ('startsAt' in body) patch.startsAt = parseOptionalDate(body.startsAt);
        if ('endsAt' in body) patch.endsAt = parseOptionalDate(body.endsAt);
        if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
        try {
            const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
                const [currentPromotion] = await tx.select().from(agendaPromotions).where(and(
                    eq(agendaPromotions.id, id),
                    eq(agendaPromotions.professionalId, current.id),
                )).limit(1).for('update');
                if (!currentPromotion) return { kind: 'missing' as const };
                if (typeof patch.discountValue === 'string'
                    && (patch.discountType ?? currentPromotion.discountType) === 'percent'
                    && Number(patch.discountValue) > 100) {
                    return { kind: 'invalid_discount' as const };
                }
                if (Array.isArray(patch.serviceIds)
                    && !await areProfileAppointmentServices(current.id, patch.serviceIds as string[], tx)) {
                    return { kind: 'service_missing' as const };
                }
                const [updated] = await tx.update(agendaPromotions).set(patch).where(and(
                    eq(agendaPromotions.id, id),
                    eq(agendaPromotions.professionalId, current.id),
                )).returning();
                return updated ? { kind: 'updated' as const, promotion: updated } : { kind: 'missing' as const };
            });
            if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
            if (result.kind === 'missing') return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
            if (result.kind === 'service_missing') return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
            if (result.kind === 'invalid_discount') return c.json({ ok: false, error: 'El porcentaje no puede superar 100.' }, 400);
            const updated = result.promotion;
            await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
            return c.json({ ok: true, promotion: updated });
        } catch (err: unknown) { if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') return c.json({ ok: false, error: 'Ya existe un cupón con ese código.' }, 409); throw err; }
    });

    app.delete('/promotions/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaPromotions).where(and(
                eq(agendaPromotions.id, id),
                eq(agendaPromotions.professionalId, current.id),
            )).returning();
            return { promotion: deleted ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.promotion) return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
        const deleted = result.promotion;
        await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: id, action: 'delete', metadata: { code: deleted.code, label: deleted.label }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Packs ─────────────────────────────────────────────────────────────────
    app.get('/packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const rows = await db.select().from(agendaPacks).where(eq(agendaPacks.professionalId, profile.id)).orderBy(agendaPacks.position, desc(agendaPacks.createdAt));
        return c.json({ ok: true, packs: rows });
    });

    app.post('/packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) return c.json({ ok: false, error: 'Falta el nombre del pack.' }, 400);
        const sessionsCount = parseOptionalNumber(body.sessionsCount);
        if (sessionsCount === null || sessionsCount <= 0) return c.json({ ok: false, error: 'Indica cuántas sesiones incluye el pack.' }, 400);
        const price = parseOptionalNumber(body.price);
        if (price === null || price < 0) return c.json({ ok: false, error: 'El precio del pack es inválido.' }, 400);
        const appliesTo = typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        if (!await areProfileAppointmentServices(profile.id, serviceIds)) return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
        if (appliesTo === 'services' && serviceIds.length === 0) return c.json({ ok: false, error: 'Selecciona al menos un servicio para este pack.' }, 400);
        const validityDays = parseOptionalNumber(body.validityDays); const position = parseOptionalNumber(body.position);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (!await areProfileAppointmentServices(current.id, serviceIds, tx)) return { kind: 'service_missing' as const };
            const [pack] = await tx.insert(agendaPacks).values({
                professionalId: current.id,
                name,
                description: typeof body.description === 'string' ? body.description : null,
                sessionsCount: Math.floor(sessionsCount),
                price: String(price),
                currency: typeof body.currency === 'string' ? body.currency : 'CLP',
                appliesTo,
                serviceIds,
                validityDays: validityDays !== null ? Math.floor(validityDays) : null,
                isActive: body.isActive === false ? false : true,
                position: position !== null ? Math.floor(position) : 0,
            }).returning();
            return { kind: 'created' as const, pack };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'service_missing') return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
        const created = result.pack;
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: created.id, action: 'create', metadata: { name, sessionsCount: created.sessionsCount, price: created.price }, ctx: c });
        return c.json({ ok: true, pack: created });
    });

    app.patch('/packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const existing = await db.query.agendaPacks.findFirst({ where: and(eq(agendaPacks.id, id), eq(agendaPacks.professionalId, profile.id)) });
        if (!existing) return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.name = n; }
        if ('description' in body) patch.description = typeof body.description === 'string' ? body.description : null;
        if ('sessionsCount' in body) { const v = parseOptionalNumber(body.sessionsCount); if (v === null || v <= 0) return c.json({ ok: false, error: 'Cantidad de sesiones inválida.' }, 400); patch.sessionsCount = Math.floor(v); }
        if ('price' in body) { const v = parseOptionalNumber(body.price); if (v === null || v < 0) return c.json({ ok: false, error: 'Precio inválido.' }, 400); patch.price = String(v); }
        if (typeof body.currency === 'string') patch.currency = body.currency;
        if (typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo)) patch.appliesTo = body.appliesTo;
        if (Array.isArray(body.serviceIds)) {
            const serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
            if (!await areProfileAppointmentServices(profile.id, serviceIds)) return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
            patch.serviceIds = serviceIds;
        }
        if ('validityDays' in body) { const v = parseOptionalNumber(body.validityDays); patch.validityDays = v !== null ? Math.floor(v) : null; }
        if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
        if ('position' in body) { const v = parseOptionalNumber(body.position); if (v !== null) patch.position = Math.floor(v); }
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            if (Array.isArray(patch.serviceIds)
                && !await areProfileAppointmentServices(current.id, patch.serviceIds as string[], tx)) {
                return { kind: 'service_missing' as const };
            }
            const [updated] = await tx.update(agendaPacks).set(patch).where(and(
                eq(agendaPacks.id, id),
                eq(agendaPacks.professionalId, current.id),
            )).returning();
            return updated ? { kind: 'updated' as const, pack: updated } : { kind: 'missing' as const };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (result.kind === 'missing') return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        if (result.kind === 'service_missing') return c.json({ ok: false, error: 'Uno o más servicios no pertenecen a este espacio.' }, 400);
        const updated = result.pack;
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
        return c.json({ ok: true, pack: updated });
    });

    app.delete('/packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaPacks).where(and(
                eq(agendaPacks.id, id),
                eq(agendaPacks.professionalId, current.id),
            )).returning();
            return { pack: deleted ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!result.pack) return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        const deleted = result.pack;
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: id, action: 'delete', metadata: { name: deleted.name }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Client Packs ──────────────────────────────────────────────────────────
    app.get('/client-packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.query('clientId'); const status = c.req.query('status');
        const conditions: SQL[] = [eq(agendaClientPacks.professionalId, profile.id)];
        if (clientId) conditions.push(eq(agendaClientPacks.clientId, clientId));
        if (status && CLIENT_PACK_STATUS.has(status)) conditions.push(eq(agendaClientPacks.status, status));
        const rows = await db.select().from(agendaClientPacks).where(and(...conditions)).orderBy(desc(agendaClientPacks.purchasedAt));
        return c.json({ ok: true, clientPacks: rows });
    });

    app.post('/client-packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const clientId = typeof body.clientId === 'string' ? body.clientId : '';
        if (!clientId) return c.json({ ok: false, error: 'Selecciona un cliente.' }, 400);
        const packId = typeof body.packId === 'string' ? body.packId : null;
        let name = typeof body.name === 'string' ? body.name.trim() : '';
        let sessionsTotal = parseOptionalNumber(body.sessionsTotal);
        let pricePaid = parseOptionalNumber(body.pricePaid);
        let currency = typeof body.currency === 'string' ? body.currency : 'CLP';
        let appliesTo = typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        let serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        let expiresAt = parseOptionalDate(body.expiresAt);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const client = await tx.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, current.id)) });
            if (!client) return { error: 'Cliente no encontrado.', status: 404 as const };
            if (packId) {
                const pack = await tx.query.agendaPacks.findFirst({ where: and(eq(agendaPacks.id, packId), eq(agendaPacks.professionalId, current.id)) });
                if (!pack) return { error: 'Pack no encontrado.', status: 404 as const };
                if (!name) name = pack.name;
                if (sessionsTotal === null) sessionsTotal = pack.sessionsCount;
                if (pricePaid === null && pack.price) pricePaid = Number(pack.price);
                currency = pack.currency; appliesTo = pack.appliesTo;
                if (serviceIds.length === 0) serviceIds = Array.isArray(pack.serviceIds) ? pack.serviceIds : [];
                if (!expiresAt && pack.validityDays && pack.validityDays > 0) expiresAt = addDays(new Date(), pack.validityDays);
            }
            if (!await areProfileAppointmentServices(current.id, serviceIds, tx)) return { error: 'Uno o más servicios no pertenecen a este espacio.', status: 400 as const };
            if (!name) return { error: 'Falta el nombre del pack.', status: 400 as const };
            if (sessionsTotal === null || sessionsTotal <= 0) return { error: 'Indica cuántas sesiones incluye el pack.', status: 400 as const };
            const [created] = await tx.insert(agendaClientPacks).values({ professionalId: current.id, packId: packId ?? null, clientId, name, sessionsTotal: Math.floor(sessionsTotal), sessionsUsed: 0, pricePaid: pricePaid !== null ? String(pricePaid) : null, currency, appliesTo, serviceIds, expiresAt, status: 'active', notes: typeof body.notes === 'string' ? body.notes : null }).returning();
            return { created };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { created } = result;
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: created.id, action: 'create', metadata: { clientId, packId, name, sessionsTotal: created.sessionsTotal }, ctx: c });
        emitTimelineEvent(db, timelineEvents, {
            type: 'pack.purchased',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(clientId),
            subject: { kind: 'agenda_client_pack', id: created.id },
            actor: 'professional',
            payload: { name: created.name, sessionsTotal: created.sessionsTotal, pricePaid: created.pricePaid },
        });
        return c.json({ ok: true, clientPack: created });
    });

    app.patch('/client-packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.name = n; }
        let sessionsTotal: number | null = null;
        if ('sessionsTotal' in body) { const v = parseOptionalNumber(body.sessionsTotal); if (v === null || v <= 0) return c.json({ ok: false, error: 'Total de sesiones inválido.' }, 400); sessionsTotal = Math.floor(v); patch.sessionsTotal = sessionsTotal; }
        if ('pricePaid' in body) { const v = parseOptionalNumber(body.pricePaid); patch.pricePaid = v !== null ? String(v) : null; }
        if (typeof body.currency === 'string') patch.currency = body.currency;
        if (typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo)) patch.appliesTo = body.appliesTo;
        if (Array.isArray(body.serviceIds)) {
            const serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
            patch.serviceIds = serviceIds;
        }
        if ('expiresAt' in body) patch.expiresAt = parseOptionalDate(body.expiresAt);
        if (typeof body.status === 'string' && CLIENT_PACK_STATUS.has(body.status)) patch.status = body.status;
        if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes : null;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [existing] = await tx.select().from(agendaClientPacks).where(and(
                eq(agendaClientPacks.id, id),
                eq(agendaClientPacks.professionalId, current.id),
            )).limit(1).for('update');
            if (!existing) return { error: 'Bono no encontrado', status: 404 as const };
            if (sessionsTotal !== null && sessionsTotal < existing.sessionsUsed) return { error: 'El total no puede ser menor a las sesiones ya usadas.', status: 400 as const };
            if (Array.isArray(patch.serviceIds) && !await areProfileAppointmentServices(current.id, patch.serviceIds as string[], tx)) {
                return { error: 'Uno o más servicios no pertenecen a este espacio.', status: 400 as const };
            }
            const [updated] = await tx.update(agendaClientPacks).set(patch).where(and(eq(agendaClientPacks.id, id), eq(agendaClientPacks.professionalId, current.id))).returning();
            return { updated };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { updated } = result;
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
        return c.json({ ok: true, clientPack: updated });
    });

    app.delete('/client-packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);
        const id = c.req.param('id') ?? '';
        const deleted = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [pack] = await tx.delete(agendaClientPacks)
                .where(and(eq(agendaClientPacks.id, id), eq(agendaClientPacks.professionalId, current.id)))
                .returning();
            if (!pack) return { pack: null };
            await tx.update(agendaAppointments)
                .set({ clientPackId: null })
                .where(and(
                    eq(agendaAppointments.clientPackId, id),
                    eq(agendaAppointments.professionalId, current.id),
                ));
            return { pack };
        });
        if (!deleted) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if (!deleted.pack) return c.json({ ok: false, error: 'Bono no encontrado' }, 404);
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: id, action: 'delete', metadata: { clientId: deleted.pack.clientId, name: deleted.pack.name }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Asistentes (servicios group_event) ────────────────────────────────────
    app.post('/services/:id/attendees', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const serviceId = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
        let clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
        let clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : '';
        let clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : '';
        const pricePaid = parseOptionalNumber(body.pricePaid);
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [service] = await tx.select().from(agendaServices).where(and(
                eq(agendaServices.id, serviceId),
                eq(agendaServices.professionalId, current.id),
            )).limit(1).for('update');
            if (!service || service.kind !== 'group_event') return { error: 'Servicio grupal no encontrado', status: 404 as const };
            if (service.sessionStatus === 'cancelled') return { error: 'Esta sesión está cancelada.', status: 400 as const };
            if (clientId) {
                const cl = await tx.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, current.id)) });
                if (!cl) return { error: 'Cliente no encontrado.', status: 404 as const };
                if (!clientName) clientName = `${cl.firstName} ${cl.lastName ?? ''}`.trim();
                if (!clientEmail) clientEmail = cl.email ?? '';
                if (!clientPhone) clientPhone = cl.phone ?? '';
            }
            if (!clientName) return { error: 'Falta el nombre del asistente.', status: 400 as const };
            const currentCount = await tx.select({ count: sql<number>`count(*)::int` }).from(agendaGroupAttendees).where(and(
                eq(agendaGroupAttendees.sessionId, serviceId),
                eq(agendaGroupAttendees.professionalId, current.id),
                sql`${agendaGroupAttendees.status} <> 'cancelled'`,
            ));
            if (Number(currentCount[0]?.count ?? 0) >= (service.capacity ?? 0)) return { error: 'No hay cupos disponibles en esta sesión.', status: 409 as const };
            const [created] = await tx.insert(agendaGroupAttendees).values({ sessionId: serviceId, professionalId: current.id, clientId, clientName, clientEmail: clientEmail || null, clientPhone: clientPhone || null, status: 'registered', pricePaid: pricePaid !== null ? String(pricePaid) : null, paidAt: pricePaid !== null ? new Date() : null, notes: typeof body.notes === 'string' ? body.notes : null }).returning();
            return { created };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { created } = result;
        await logAudit({ professionalId: profile.id, entityType: 'group_attendee', entityId: created.id, action: 'create', metadata: { serviceId, clientName, clientId }, ctx: c });
        emitTimelineEvent(db, timelineEvents, {
            type: 'group.attendee_registered',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(clientId),
            subject: { kind: 'agenda_group_attendee', id: created.id },
            actor: 'professional',
            payload: { serviceId, clientName },
        });
        return c.json({ ok: true, attendee: created });
    });

    app.patch('/group-attendees/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.status === 'string' && GROUP_ATTENDEE_STATUS.has(body.status)) patch.status = body.status;
        if (typeof body.clientName === 'string') { const v = body.clientName.trim(); if (!v) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.clientName = v; }
        if ('clientEmail' in body) patch.clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail : null;
        if ('clientPhone' in body) patch.clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone : null;
        const nextPricePaid = 'pricePaid' in body ? parseOptionalNumber(body.pricePaid) : undefined;
        if (nextPricePaid !== undefined) patch.pricePaid = nextPricePaid !== null ? String(nextPricePaid) : null;
        if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes : null;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [existing] = await tx.select().from(agendaGroupAttendees).where(and(
                eq(agendaGroupAttendees.id, id),
                eq(agendaGroupAttendees.professionalId, current.id),
            )).limit(1).for('update');
            if (!existing) return { error: 'Asistente no encontrado', status: 404 as const };
            if (nextPricePaid !== undefined) {
                if (nextPricePaid !== null && !existing.paidAt) patch.paidAt = new Date();
                if (nextPricePaid === null) patch.paidAt = null;
            }
            const [updated] = await tx.update(agendaGroupAttendees).set(patch).where(and(eq(agendaGroupAttendees.id, id), eq(agendaGroupAttendees.professionalId, current.id))).returning();
            return { updated, previousStatus: existing.status };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { updated, previousStatus } = result;
        if (typeof body.status === 'string' && body.status !== previousStatus) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'group.attendee_status_changed',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(updated.clientId),
                subject: { kind: 'agenda_group_attendee', id: updated.id },
                actor: 'professional',
                payload: { from: previousStatus, to: updated.status },
            });
        }
        return c.json({ ok: true, attendee: updated });
    });

    app.delete('/group-attendees/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaGroupAttendees).where(and(eq(agendaGroupAttendees.id, id), eq(agendaGroupAttendees.professionalId, current.id))).returning();
            return { deleted: deleted ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        const { deleted } = result;
        if (!deleted) return c.json({ ok: false, error: 'Asistente no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Payments ──────────────────────────────────────────────────────────────
    app.get('/payments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, payments: [] });
        if (isFreePlan(profile)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const payments = await db.select().from(agendaPayments).where(eq(agendaPayments.professionalId, profile.id)).orderBy(desc(agendaPayments.createdAt));
        return c.json({ ok: true, payments });
    });

    async function recordSettledAppointmentPayment(tx: any, professionalId: string, payment: any) {
        if (payment.status !== 'paid' || !payment.appointmentId) return null;
        const [appointment] = await tx.select().from(agendaAppointments).where(and(
            eq(agendaAppointments.id, payment.appointmentId),
            eq(agendaAppointments.professionalId, professionalId),
            eq(agendaAppointments.paymentStatus, 'pending'),
        )).limit(1).for('update');
        if (!appointment || appointment.bookingPaymentMethod === 'mp') return null;

        const [ledger] = await tx.select({ total: sql<string>`coalesce(sum(${agendaPayments.amount}), 0)` })
            .from(agendaPayments)
            .where(and(
                eq(agendaPayments.appointmentId, appointment.id),
                eq(agendaPayments.professionalId, professionalId),
                eq(agendaPayments.status, 'paid'),
                eq(agendaPayments.currency, appointment.currency),
            ));
        const due = Number(appointment.price);
        if (!Number.isFinite(due) || due <= 0 || Number(ledger?.total ?? 0) < due) return null;
        const [updated] = await tx.update(agendaAppointments)
            .set({ paymentStatus: 'paid', updatedAt: new Date() })
            .where(eq(agendaAppointments.id, appointment.id)).returning();
        return updated;
    }

    async function notifySettledAppointment(profile: any, appointment: any) {
        if (!appointment?.clientEmail || !['confirmed', 'pending'].includes(appointment.status)) return;
        let serviceName: string | null = null;
        if (appointment.serviceId) {
            const svc = await db.query.agendaServices.findFirst({
                where: eq(agendaServices.id, appointment.serviceId),
                columns: { name: true },
            }).catch(() => null);
            serviceName = svc?.name ?? null;
        }
        const { baseUrl } = resolvePublicProfileUrls(profile);
        void sendBookingConfirmationEmail(appointment.clientEmail, {
            ...appointment,
            clientName: appointment.clientName ?? 'Cliente',
            professionalName: profile.displayName ?? 'el profesional',
            timezone: profile.timezone ?? 'America/Santiago',
            serviceName,
            cancelUrl: `${baseUrl}/cancelar?appt=${appointment.id}&slug=${profile.slug}`,
            appUrl: baseUrl,
        }).catch((error: unknown) => console.error('[agenda] Payment confirmation email error:', error));
    }

    app.post('/payments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.amount) return c.json({ ok: false, error: 'El monto es requerido' }, 400);
        const requestedAppointmentId = typeof body.appointmentId === 'string' && body.appointmentId ? body.appointmentId : null;
        const requestedClientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            let linkedAppointment: typeof agendaAppointments.$inferSelect | null = null;
            if (requestedAppointmentId) {
                const [lockedAppointment] = await tx.select().from(agendaAppointments).where(and(
                    eq(agendaAppointments.id, requestedAppointmentId),
                    eq(agendaAppointments.professionalId, current.id),
                )).limit(1).for('update');
                linkedAppointment = lockedAppointment ?? null;
                if (!linkedAppointment) return { error: 'Cita no encontrada', status: 404 as const };
            }
            if (requestedClientId) {
                const client = await tx.query.agendaClients.findFirst({
                    where: and(
                        eq(agendaClients.id, requestedClientId),
                        eq(agendaClients.professionalId, current.id),
                    ),
                });
                if (!client) return { error: 'Cliente no encontrado', status: 404 as const };
            }
            if (linkedAppointment?.clientId && requestedClientId && linkedAppointment.clientId !== requestedClientId) {
                return { error: 'El cliente no corresponde a esta cita', status: 400 as const };
            }
            const paymentClientId = requestedClientId ?? linkedAppointment?.clientId ?? null;
            const [payment] = await tx.insert(agendaPayments).values({ professionalId: current.id, appointmentId: requestedAppointmentId, clientId: paymentClientId, amount: String(body.amount), currency: typeof body.currency === 'string' ? body.currency : current.currency, method: typeof body.method === 'string' ? body.method||null : null, status: typeof body.status === 'string' ? body.status : 'pending', paidAt: body.status === 'paid' ? new Date() : null, notes: typeof body.notes === 'string' ? body.notes||null : null }).returning();
            const settledAppointment = await recordSettledAppointmentPayment(tx, current.id, payment);
            return { payment, settledAppointment };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);
        const { payment, settledAppointment } = result;
        notifySettledAppointment(profile, settledAppointment);
        emitTimelineEvent(db, timelineEvents, {
            type: 'payment.recorded',
            business: agendaBusiness(profile.id),
            person: agendaClientPerson(payment.clientId),
            subject: { kind: 'agenda_payment', id: payment.id },
            actor: 'professional',
            payload: { amount: payment.amount, status: payment.status, method: payment.method },
        });
        if (payment.status === 'paid') {
            emitTimelineEvent(db, timelineEvents, {
                type: 'payment.paid',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(payment.clientId),
                subject: { kind: 'agenda_payment', id: payment.id },
                actor: 'professional',
                payload: { amount: payment.amount, method: payment.method },
            });
        }
        return c.json({ ok: true, payment });
    });

    app.patch('/payments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['amount','method','status','notes'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        if (body.status === 'paid' && !body.paidAt) patch.paidAt = new Date();
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaPayments).set(patch).where(and(eq(agendaPayments.id, id), eq(agendaPayments.professionalId, current.id))).returning();
            const settledAppointment = updated ? await recordSettledAppointmentPayment(tx, current.id, updated) : null;
            return { updated: updated ?? null, settledAppointment };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        const { updated, settledAppointment } = result;
        if (!updated) return c.json({ ok: false, error: 'Cobro no encontrado' }, 404);
        notifySettledAppointment(profile, settledAppointment);
        if (body.status === 'paid') {
            emitTimelineEvent(db, timelineEvents, {
                type: 'payment.paid',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(updated.clientId),
                subject: { kind: 'agenda_payment', id: updated.id },
                actor: 'professional',
                payload: { amount: updated.amount, method: updated.method },
            });
        } else if (body.status === 'refunded') {
            emitTimelineEvent(db, timelineEvents, {
                type: 'payment.refunded',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(updated.clientId),
                subject: { kind: 'agenda_payment', id: updated.id },
                actor: 'professional',
                payload: { amount: updated.amount },
            });
        }
        return c.json({ ok: true, payment: updated });
    });

    app.delete('/payments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const id = c.req.param('id') ?? '';
        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [deleted] = await tx.delete(agendaPayments).where(and(eq(agendaPayments.id, id), eq(agendaPayments.professionalId, current.id))).returning({ id: agendaPayments.id });
            return { deleted: deleted ?? null };
        });
        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        const { deleted } = result;
        if (!deleted) return c.json({ ok: false, error: 'Cobro no encontrado' }, 404);
        return c.json({ ok: true });
    });

    app.post('/appointments/:id/mark-paid', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

        const id = c.req.param('id') ?? '';
        const parsed = z.object({
            method: z.enum(['cash', 'transfer', 'link', 'other']).default('cash'),
            amount: z.number().positive().optional(),
            notes: z.string().max(300).optional(),
        }).safeParse(await c.req.json().catch(() => ({})));
        if (!parsed.success) return c.json({ ok: false, error: 'Datos de pago inválidos.' }, 400);

        const result = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [appt] = await tx.select().from(agendaAppointments)
                .where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, current.id)))
                .limit(1)
                .for('update');
            if (!appt) return { error: 'Cita no encontrada.', status: 404 as const };
            if (appt.status === 'cancelled') return { error: 'No se puede registrar pago en una cita cancelada.', status: 400 as const };

            const wasPending = appt.paymentStatus === 'pending';
            const resolvedAmount = parsed.data.amount ?? (Number(appt.price) > 0 ? Number(appt.price) : 0);
            const now = new Date();

            const [existingPending] = await tx.select().from(agendaPayments)
                .where(and(
                    eq(agendaPayments.appointmentId, appt.id),
                    eq(agendaPayments.professionalId, current.id),
                    eq(agendaPayments.status, 'pending'),
                ))
                .limit(1);

            let paymentRecord: any = null;
            if (existingPending) {
                const [updatedPay] = await tx.update(agendaPayments).set({
                    status: 'paid',
                    method: parsed.data.method,
                    paidAt: now,
                    ...(parsed.data.amount ? { amount: String(parsed.data.amount) } : {}),
                    ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
                    updatedAt: now,
                }).where(eq(agendaPayments.id, existingPending.id)).returning();
                paymentRecord = updatedPay ?? null;
            } else if (resolvedAmount > 0) {
                const [insertedPay] = await tx.insert(agendaPayments).values({
                    professionalId: current.id,
                    appointmentId: appt.id,
                    clientId: appt.clientId ?? null,
                    amount: String(resolvedAmount),
                    currency: appt.currency,
                    method: parsed.data.method,
                    status: 'paid',
                    paidAt: now,
                    notes: parsed.data.notes ?? null,
                }).returning();
                paymentRecord = insertedPay ?? null;
            }

            const [updatedAppt] = await tx.update(agendaAppointments).set({
                paymentStatus: 'paid',
                updatedAt: now,
            }).where(eq(agendaAppointments.id, appt.id)).returning();

            return { appointment: updatedAppt, payment: paymentRecord, wasPending };
        });

        if (!result) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        if ('error' in result) return c.json({ ok: false, error: result.error }, result.status);

        if (result.wasPending) {
            notifySettledAppointment(profile, result.appointment);
        }
        if (result.payment) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'payment.paid',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(result.payment.clientId),
                subject: { kind: 'agenda_payment', id: result.payment.id },
                actor: 'professional',
                payload: { amount: result.payment.amount, method: result.payment.method },
            });
        }
        return c.json({ ok: true, appointment: result.appointment, payment: result.payment });
    });

    // ── Google Calendar ───────────────────────────────────────────────────────
    app.get('/google-calendar/auth', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        if (isFreePlan(profile)) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=upgrade`);
        const oauth2Client = getGoogleOAuth2Client();
        const state = buildAgendaOAuthState(SESSION_SECRET, {
            profileId: profile.id,
            userId: user.id,
            accountId: profile.accountId ?? null,
        }, randomBytes(16).toString('hex'));
        const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar'], state, prompt: 'consent' });
        return c.redirect(url);
    });

    app.get('/google-calendar/callback', async (c) => {
        const code = c.req.query('code'); const state = c.req.query('state');
        if (!code || !state) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('Faltan parámetros')}`);
        const oauthContext = verifyAgendaOAuthState(SESSION_SECRET, state);
        if (!oauthContext) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('La autorización venció. Intenta conectar de nuevo.')}`);
        try {
            if (!await getAgendaOAuthProfile(oauthContext)) {
                return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('Tu acceso al perfil o espacio cambió. Inicia la conexión nuevamente.')}`);
            }
            const oauth2Client = getGoogleOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
            const calList = await calendarApi.calendarList.list({ minAccessRole: 'owner' });
            const primaryCal = calList.data.items?.find((c: any) => c.primary) ?? calList.data.items?.[0];
            const saved = await saveAgendaOAuthProfileTokens(oauthContext, {
                googleCalendarId: primaryCal?.id ?? null,
                googleAccessToken: tokens.access_token ?? null,
                googleRefreshToken: tokens.refresh_token ?? null,
                googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            });
            if (!saved) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('Tu acceso al perfil o espacio cambió. Inicia la conexión nuevamente.')}`);
            return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=connected`);
        } catch (e) { const msg = e instanceof Error ? e.message : 'Error desconocido'; return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent(msg)}`); }
    });

    app.delete('/google-calendar/disconnect', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const disconnected = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ googleCalendarId: null, googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, updatedAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return Boolean(updated);
        });
        if (!disconnected) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    app.get('/google-calendar/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        return c.json({ ok: true, connected: !!(profile?.googleAccessToken), calendarId: profile?.googleCalendarId ?? null });
    });

    // ── MercadoPago OAuth ─────────────────────────────────────────────────────
    app.get('/mercadopago/auth', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const mpProfile = await ensureAgendaProfile(user);
        if (isFreePlan(mpProfile)) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=upgrade`);
        const appId = process.env.MP_AGENDA_APP_ID;
        if (!appId) return c.json({ ok: false, error: 'MP_AGENDA_APP_ID no configurado' }, 500);
        const redirectUri = encodeURIComponent(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`);
        const state = encodeURIComponent(buildAgendaOAuthState(SESSION_SECRET, {
            profileId: mpProfile.id,
            userId: user.id,
            accountId: mpProfile.accountId ?? null,
        }, randomBytes(16).toString('hex')));
        return c.redirect(`https://auth.mercadopago.cl/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`);
    });

    app.get('/mercadopago/callback', async (c) => {
        const code = c.req.query('code'); const state = c.req.query('state');
        if (!code || !state) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
        const oauthContext = verifyAgendaOAuthState(SESSION_SECRET, state);
        if (!oauthContext) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
        try {
            if (!await getAgendaOAuthProfile(oauthContext)) {
                return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error&message=${encodeURIComponent('Tu acceso al perfil o espacio cambió. Inicia la conexión nuevamente.')}`);
            }
            const appId = process.env.MP_AGENDA_APP_ID; const appSecret = process.env.MP_AGENDA_APP_SECRET;
            if (!appId || !appSecret) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
            const redirectUri = `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`;
            const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ client_id: appId, client_secret: appSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }) });
            if (!tokenRes.ok) throw new Error('MP token exchange failed');
            const tokens = await tokenRes.json() as { access_token: string; public_key: string; refresh_token?: string; user_id?: number };
            const saved = await saveAgendaOAuthProfileTokens(oauthContext, {
                mpAccessToken: tokens.access_token,
                mpPublicKey: tokens.public_key ?? null,
                mpUserId: tokens.user_id ? String(tokens.user_id) : null,
                mpRefreshToken: tokens.refresh_token ?? null,
            });
            if (!saved) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error&message=${encodeURIComponent('Tu acceso al perfil o espacio cambió. Inicia la conexión nuevamente.')}`);
            return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=connected`);
        } catch (e) { console.error('[agenda] MP OAuth callback error:', e); return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`); }
    });

    app.delete('/mercadopago/disconnect', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const disconnected = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ mpAccessToken: null, mpPublicKey: null, mpUserId: null, mpRefreshToken: null, updatedAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return Boolean(updated);
        });
        if (!disconnected) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    app.post('/mercadopago/webhook', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
            const bodyData = (body.data ?? {}) as Record<string, unknown>;
            const topic = String(c.req.query('topic') ?? c.req.query('type') ?? body.type ?? '');
            const paymentId = String(c.req.query('data.id') ?? bodyData.id ?? c.req.query('id') ?? body.id ?? '');

            const signature = verifyMercadoPagoWebhookSignature({
                xSignature: c.req.header('x-signature'),
                xRequestId: c.req.header('x-request-id'),
                dataId: paymentId || null,
            });
            if (signature === false || (signature === 'unsigned' && process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED !== 'true')) {
                return c.json({ ok: false, error: 'Firma de webhook inválida o ausente.' }, 401);
            }
            if ((topic !== 'payment' && body.type !== 'payment') || !paymentId) return c.json({ ok: true });

            let payment: Record<string, unknown> | null = null;
            const appointmentHint = c.req.query('appointment');
            if (!appointmentHint) {
                try {
                    payment = await getPaymentById(paymentId);
                } catch {
                    // En el flujo anterior no siempre está disponible el identificador de la cita.
                }
            }

            const appointmentId = z.string().uuid().safeParse(
                appointmentHint ?? payment?.external_reference
                    ?? (signature === 'unsigned' ? body.external_reference ?? bodyData.external_reference : null),
            );
            if (!appointmentId.success) return c.json({ ok: true });
            const initial = await db.query.agendaAppointments.findFirst({ where: eq(agendaAppointments.id, appointmentId.data) });
            if (!initial) return c.json({ ok: true });
            const profile = await db.query.agendaProfessionalProfiles.findFirst({
                where: eq(agendaProfessionalProfiles.id, initial.professionalId),
            });
            if (!profile) return c.json({ ok: true });
            if (profile.mpAccessToken) {
                try {
                    payment = await getPaymentById(paymentId, { accessToken: profile.mpAccessToken });
                } catch (err) {
                    const refreshedToken = await refreshAgendaMpToken(db, agendaProfessionalProfiles, eq, profile);
                    if (!refreshedToken) throw err;
                    payment = await getPaymentById(paymentId, { accessToken: refreshedToken });
                }
            }
            if (!payment || payment.status !== 'approved' || String(payment.external_reference) !== initial.id) {
                return c.json({ ok: true });
            }

            const receivedAmount = Number(payment.transaction_amount);
            const receivedCurrency = String(payment.currency_id ?? '');
            if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) return c.json({ ok: true });

            const credited = await db.transaction(async (tx: any) => {
                const [appointment] = await tx.select().from(agendaAppointments)
                    .where(and(eq(agendaAppointments.id, initial.id), eq(agendaAppointments.professionalId, profile.id)))
                    .limit(1).for('update');
                if (!appointment || appointment.paymentStatus !== 'pending' || !appointment.price
                    || (appointment.bookingPaymentMethod && appointment.bookingPaymentMethod !== 'mp')
                    || Number(appointment.price) !== receivedAmount || appointment.currency !== receivedCurrency) {
                    return null;
                }
                const [updated] = await tx.update(agendaAppointments)
                    .set({ paymentStatus: 'paid', updatedAt: new Date() })
                    .where(eq(agendaAppointments.id, appointment.id)).returning();
                const prior = await tx.select({ id: agendaPayments.id }).from(agendaPayments)
                    .where(and(eq(agendaPayments.appointmentId, appointment.id), eq(agendaPayments.status, 'paid')))
                    .limit(1);
                if (prior.length) return { appointment: updated, payment: null };
                const [record] = await tx.insert(agendaPayments).values({
                    professionalId: appointment.professionalId,
                    appointmentId: appointment.id,
                    clientId: appointment.clientId ?? null,
                    amount: appointment.price,
                    currency: appointment.currency,
                    method: 'mercadopago',
                    status: 'paid',
                    paidAt: new Date(),
                    notes: `Pago automático MP ref: ${paymentId}`,
                }).returning();
                return { appointment: updated, payment: record };
            });
            if (!credited) return c.json({ ok: true });
            const appt = credited.appointment;
            if (credited.payment) {
                emitTimelineEvent(db, timelineEvents, {
                    idempotencyKey: `agenda:mercadopago:payment-paid:${appt.id}`,
                    type: 'payment.paid',
                    business: agendaBusiness(appt.professionalId),
                    person: agendaClientPerson(appt.clientId),
                    subject: { kind: 'agenda_payment', id: credited.payment.id },
                    actor: 'system',
                    payload: { amount: credited.payment.amount, method: 'mercadopago', source: 'webhook' },
                });
            }
            if (appt.status === 'confirmed') {
                emitTimelineEvent(db, timelineEvents, {
                    idempotencyKey: `agenda:mercadopago:booking-confirmed:${appt.id}`,
                    type: 'booking.confirmed',
                    business: agendaBusiness(appt.professionalId),
                    person: agendaClientPerson(appt.clientId),
                    subject: { kind: 'agenda_appointment', id: appt.id },
                    actor: 'system',
                    payload: { source: 'mercadopago_webhook' },
                });
            }
            void notifySettledAppointment(profile, appt);
            void sendPushToUser(profile.userId, {
                title: '💳 Pago confirmado',
                body: `${appt.clientName ?? 'Cliente'} pagó su cita por MercadoPago.`,
                url: '/panel/agenda',
            });
            return c.json({ ok: true });
        } catch (error) {
            console.error('[agenda] MP webhook error:', error);
            return c.json({ ok: false, error: 'No se pudo registrar la notificación de pago.' }, 503);
        }
    });

    app.get('/mercadopago/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        return c.json({ ok: true, connected: !!(profile?.mpAccessToken), userId: profile?.mpUserId ?? null });
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    app.get('/notifications/history', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, events: [] });
        const limitRaw = Number(c.req.query('limit') ?? 50);
        const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 50, 1), 200);
        const events = await db.select().from(agendaNotificationEvents).where(eq(agendaNotificationEvents.professionalId, profile.id)).orderBy(desc(agendaNotificationEvents.createdAt)).limit(limit);
        return c.json({ ok: true, events });
    });

    app.post('/whatsapp-pack/checkout', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (proGateError(profile)) return c.json({ ok: false, error: proGateError(profile) }, 403);

        const { baseUrl } = resolvePublicProfileUrls(profile);
        const returnBase = `${baseUrl}/panel/mi-negocio/agenda`;
        const amount = addChileVat(AGENDA_PRICING.whatsappPackNetClp);
        const pref = await createCheckoutPreference({
            externalReference: `wa-pack:${profile.id}:${randomUUID()}`,
            title: `Recarga +${AGENDA_PRICING.whatsappPackSize} recordatorios WhatsApp`,
            amount,
            currencyId: 'CLP',
            payerEmail: user.email ?? 'profesional@simpleagenda.app',
            payerName: profile.displayName ?? undefined,
            backUrls: {
                success: `${returnBase}?wa_pack=success`,
                failure: `${returnBase}?wa_pack=failure`,
                pending: `${returnBase}?wa_pack=pending`,
            },
        });
        const checkoutUrl = pref.initPoint || pref.sandboxInitPoint || null;
        if (!checkoutUrl) {
            return c.json({ ok: false, error: 'No pudimos iniciar el pago de la recarga.' }, 502);
        }
        return c.json({ ok: true, checkoutUrl, amount });
    });

    app.post('/whatsapp-pack/confirm', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as { paymentId?: string };
        const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
        if (!paymentId) return c.json({ ok: false, error: 'paymentId requerido' }, 400);

        const payment = await getPaymentById(paymentId);
        if (
            !payment
            || payment.status !== 'approved'
            || typeof payment.external_reference !== 'string'
            || !payment.external_reference.startsWith(`wa-pack:${profile.id}:`)
        ) {
            return c.json({ ok: false, error: 'El pago aún no figura aprobado para tu cuenta.' }, 400);
        }

        const alreadyCredited = await db.select({ id: agendaNotificationEvents.id })
            .from(agendaNotificationEvents)
            .where(and(
                eq(agendaNotificationEvents.professionalId, profile.id),
                eq(agendaNotificationEvents.eventType, 'whatsapp_pack_purchase'),
                sql`${agendaNotificationEvents.payload}->>'paymentId' = ${paymentId}`,
            ))
            .limit(1);
        if (alreadyCredited.length > 0) {
            const quota = await getAgendaWhatsappQuota(profile);
            return c.json({ ok: true, alreadyCredited: true, whatsappQuota: quota });
        }

        await db.transaction(async (tx: any) => {
            await tx.update(agendaProfessionalProfiles)
                .set({
                    whatsappExtraCredits: sql`${agendaProfessionalProfiles.whatsappExtraCredits} + ${AGENDA_PRICING.whatsappPackSize}`,
                    updatedAt: new Date(),
                })
                .where(eq(agendaProfessionalProfiles.id, profile.id));
            await tx.insert(agendaNotificationEvents).values({
                professionalId: profile.id,
                channel: 'whatsapp',
                eventType: 'whatsapp_pack_purchase',
                status: 'sent',
                payload: { paymentId, creditsAdded: AGENDA_PRICING.whatsappPackSize },
            });
        });

        const updatedProfile = await getCurrentAgendaProfile(user.id);
        const quota = updatedProfile ? await getAgendaWhatsappQuota(updatedProfile) : null;
        return c.json({ ok: true, creditsAdded: AGENDA_PRICING.whatsappPackSize, whatsappQuota: quota });
    });

    app.get('/notifications', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, items: [], lastSeenAt: null });
        const { listPlatformNotificationsForUser } = await import('../platform/notifications-service.js');
        const items = await listPlatformNotificationsForUser(user.id, { vertical: 'agenda', limit: 30 });
        return c.json({
            ok: true,
            items: items.map((row) => ({
                id: row.id,
                type: row.type,
                title: row.title,
                body: row.body ?? '',
                createdAt: row.createdAt.getTime(),
                actionUrl: row.actionUrl,
            })),
            lastSeenAt: profile.notificationsLastSeenAt ? profile.notificationsLastSeenAt.getTime() : null,
        });
    });

    app.post('/notifications/seen', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getCurrentAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const marked = await withCurrentAgendaProfileWrite(user.id, profile, async (tx, current) => {
            const [updated] = await tx.update(agendaProfessionalProfiles)
                .set({ notificationsLastSeenAt: new Date() })
                .where(and(
                    eq(agendaProfessionalProfiles.id, current.id),
                    eq(agendaProfessionalProfiles.userId, user.id),
                    eq(agendaProfessionalProfiles.accountId, current.accountId),
                ))
                .returning({ id: agendaProfessionalProfiles.id });
            return Boolean(updated);
        });
        if (!marked) return c.json({ ok: false, error: 'El espacio activo cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        return c.json({ ok: true });
    });

    // ── Push ──────────────────────────────────────────────────────────────────
    app.get('/push/vapid-public-key', requireVerifiedSession, async (c) => {
        return c.json({ ok: true, key: VAPID_PUBLIC_KEY || null });
    });

    app.post('/push/subscribe', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
        const keys = body.keys && typeof body.keys === 'object' ? body.keys as Record<string, string> : null;
        if (!endpoint || !keys?.p256dh || !keys?.auth) return c.json({ ok: false, error: 'Suscripción inválida' }, 400);
        const ua = c.req.header('user-agent')?.slice(0, 500) ?? null;
        await db.insert(pushSubscriptions).values({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua }).onConflictDoNothing();
        return c.json({ ok: true });
    });

    app.post('/push/unsubscribe', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
        if (!endpoint) return c.json({ ok: false, error: 'endpoint requerido' }, 400);
        await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
        return c.json({ ok: true });
    });

    // ── Reminders Cron ────────────────────────────────────────────────────────
    app.post('/reminders/send', async (c) => {
        const cronSecret = asString(process.env.CRON_SECRET);
        if (!cronSecret) return c.json({ ok: false, error: 'Recordatorios cron no configurados' }, 503);
        const authHeader = c.req.header('authorization') ?? '';
        if (authHeader !== `Bearer ${cronSecret}`) return c.json({ ok: false, error: 'No autorizado' }, 401);
        const now = new Date();
        const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const appts = await db.select().from(agendaAppointments).where(and(gte(agendaAppointments.startsAt, windowStart), lte(agendaAppointments.startsAt, windowEnd), eq(agendaAppointments.status, 'confirmed'), isNull(agendaAppointments.reminderSentAt)));
        let sent = 0;
        let failed = 0;
        const agendaAppUrl = asString(process.env.AGENDA_APP_URL) || 'https://simpleagenda.app';
        for (const appt of appts) {
            const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.id, appt.professionalId) });
            if (!profile || (isFreePlan(profile) && profile.plan !== 'free')) continue;
            const [claimed] = await db.update(agendaAppointments).set({ reminderSentAt: now }).where(and(
                eq(agendaAppointments.id, appt.id),
                eq(agendaAppointments.status, 'confirmed'),
                eq(agendaAppointments.startsAt, appt.startsAt),
                eq(agendaAppointments.updatedAt, appt.updatedAt),
                gte(agendaAppointments.startsAt, windowStart),
                lte(agendaAppointments.startsAt, windowEnd),
                isNull(agendaAppointments.reminderSentAt),
            )).returning({ id: agendaAppointments.id });
            if (!claimed) continue;
            const tz = profile.timezone ?? 'America/Santiago';
            const fmtT = (d: Date) => d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz });
            const fmtD = (d: Date) => d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', timeZone:tz });
            const dateLabel = `${fmtD(appt.startsAt)} a las ${fmtT(appt.startsAt)}`;
            const cancelUrl = `${agendaAppUrl}/cancelar?appt=${appt.id}&slug=${profile.slug}`;
            try {
                if (appt.clientEmail) await sendAppointmentReminderEmail(appt.clientEmail, { clientName: appt.clientName ?? 'Paciente', professionalName: profile.displayName ?? 'el profesional', dateLabel, modality: appt.modality, meetingUrl: appt.meetingUrl, location: appt.location, cancelUrl });
                sent++;
            } catch (error) {
                failed++;
                console.error('[agenda] manual 24h reminder failed for', appt.id, ':', error);
            }
        }
        return c.json({ ok: true, sent, failed });
    });

    async function findAgendaSubscriptionForTrial(queryable: any, userId: string, accountId: string) {
        const [account] = await queryable.select({
            isPersonal: accounts.isPersonal,
            ownerUserId: accounts.ownerUserId,
        })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);

        const scopes = [eq(subscriptions.accountId, accountId)];
        if (account?.isPersonal && account.ownerUserId === userId) {
            // Legacy subscriptions without account_id belong only to their owner's personal workspace.
            scopes.push(and(isNull(subscriptions.accountId), eq(subscriptions.userId, userId)));
        }

        const [subscription] = await queryable.select({ id: subscriptions.id })
            .from(subscriptions)
            .where(and(
                eq(subscriptions.vertical, 'agenda'),
                or(...scopes),
            ))
            .limit(1);

        return subscription ?? null;
    }

    // ── Optional Pro trial ───────────────────────────────────────────────────
    app.get('/subscription/trial', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id)
            : null;
        const accountId = deps.getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await getPrimaryAccountIdForUser(user.id);
        const currentMembership = membership?.accountId === accountId
            ? membership
            : accountId
                ? deps.getAccountMembershipsForUser(user.id).find((item: any) => item.accountId === accountId)
                : null;
        if (!accountId) return c.json({ ok: false, error: 'No pudimos identificar el negocio activo.' }, 404);

        const now = new Date();
        const [trial] = await db.select().from(agendaAccountTrials)
            .where(eq(agendaAccountTrials.accountId, accountId))
            .limit(1);
        const profiles: Array<{ plan: string; planExpiresAt: Date | null }> = await db.select({
            plan: agendaProfessionalProfiles.plan,
            planExpiresAt: agendaProfessionalProfiles.planExpiresAt,
        }).from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.accountId, accountId));
        const subscription = await findAgendaSubscriptionForTrial(db, user.id, accountId);

        let state: 'available' | 'active' | 'used' = 'available';
        let endsAt: Date | null = trial?.endsAt ?? null;
        if (subscription) {
            // A paid subscription consumes the optional trial, even if a legacy
            // or concurrent activation left its end date in the future.
            state = 'used';
            if (endsAt && endsAt.getTime() > now.getTime()) endsAt = now;
        } else if (trial) {
            state = trial.endsAt.getTime() > now.getTime() ? 'active' : 'used';
        } else {
            const legacyActiveTrial = profiles
                .filter((profile) => profile.plan === 'free' && profile.planExpiresAt && profile.planExpiresAt.getTime() > now.getTime())
                .sort((left, right) => right.planExpiresAt!.getTime() - left.planExpiresAt!.getTime())[0];
            const legacyTrialHistory = profiles.some((profile) => profile.planExpiresAt !== null);
            const paidPlanHistory = profiles.some((profile) => profile.plan === 'pro' || profile.plan === 'pro_plus');
            if (legacyActiveTrial) {
                state = 'active';
                endsAt = legacyActiveTrial.planExpiresAt;
            } else if (legacyTrialHistory || paidPlanHistory) {
                state = 'used';
            }
        }

        const remainingDays = state === 'active' && endsAt
            ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000))
            : null;
        return c.json({
            ok: true,
            trial: {
                state,
                endsAt: endsAt?.toISOString() ?? null,
                remainingDays,
                canManage: canManageAccountRole(currentMembership?.role),
            },
        });
    });

    app.post('/subscription/trial/activate', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id)
            : null;
        const accountId = deps.getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await getPrimaryAccountIdForUser(user.id);
        if (!accountId) return c.json({ ok: false, error: 'No pudimos identificar el negocio activo.' }, 404);

        const result = await runAccountManagerWrite(db, { userId: user.id, accountId }, async (tx) => {
            const now = new Date();
            const subscription = await findAgendaSubscriptionForTrial(tx, user.id, accountId);
            if (subscription) {
                return { ok: false as const, error: 'La prueba Pro no está disponible para este negocio.' };
            }

            const [existingTrial] = await tx.select().from(agendaAccountTrials)
                .where(eq(agendaAccountTrials.accountId, accountId))
                .limit(1)
                .for('update');
            if (existingTrial) {
                if (existingTrial.endsAt.getTime() > now.getTime()) {
                    return { ok: true as const, state: 'active' as const, endsAt: existingTrial.endsAt };
                }
                return { ok: false as const, error: 'La prueba Pro de este negocio ya fue utilizada.' };
            }

            const profiles: Array<{ id: string; plan: string; planExpiresAt: Date | null }> = await tx.select({
                id: agendaProfessionalProfiles.id,
                plan: agendaProfessionalProfiles.plan,
                planExpiresAt: agendaProfessionalProfiles.planExpiresAt,
            }).from(agendaProfessionalProfiles)
                .where(eq(agendaProfessionalProfiles.accountId, accountId))
                .for('update');

            const legacyHistory = profiles.some((profile) => profile.planExpiresAt !== null);
            const paidPlan = profiles.some((profile) => profile.plan === 'pro' || profile.plan === 'pro_plus');
            if (legacyHistory || paidPlan) {
                return { ok: false as const, error: 'La prueba Pro no está disponible para este negocio.' };
            }

            const endsAt = new Date(now.getTime() + AGENDA_PRICING.trialDays * 86_400_000);
            await tx.insert(agendaAccountTrials).values({
                accountId,
                startedByUserId: user.id,
                startedAt: now,
                endsAt,
            });
            await tx.update(agendaProfessionalProfiles)
                .set({ planExpiresAt: endsAt, updatedAt: now })
                .where(and(
                    eq(agendaProfessionalProfiles.accountId, accountId),
                    eq(agendaProfessionalProfiles.plan, 'free'),
                ));

            return { ok: true as const, state: 'active' as const, endsAt };
        });

        if (!result.ok) return c.json({ ok: false, error: 'Solo quien administra este negocio puede activar la prueba Pro.' }, 403);
        if (!result.value.ok) return c.json({ ok: false, error: result.value.error }, 409);
        const remainingDays = Math.max(0, Math.ceil((result.value.endsAt.getTime() - Date.now()) / 86_400_000));
        return c.json({
            ok: true,
            trial: { state: result.value.state, endsAt: result.value.endsAt.toISOString(), remainingDays },
        });
    });

    // ── Subscription Self-cancel ──────────────────────────────────────────────
    app.post('/subscription/cancel', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id)
            : null;
        const accountId = deps.getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await deps.getPrimaryAccountIdForUser(user.id);
        const currentMembership = membership?.accountId === accountId
            ? membership
            : accountId
                ? deps.getAccountMembershipsForUser(user.id).find((item: any) => item.accountId === accountId)
                : null;
        if (!accountId || !canManageAccountRole(currentMembership?.role)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede cambiar su plan.' }, 403);
        }
        const [account] = await db.select({ isPersonal: accounts.isPersonal })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);
        if (!account) {
            return c.json({ ok: false, error: 'No pudimos identificar el espacio activo.' }, 404);
        }
        const { cancelAgendaProSubscription } = await import('./cancel-subscription.js');
        const result = await cancelAgendaProSubscription(user.id, accountId, account.isPersonal, undefined, user.id);
        if (!result.ok) return c.json({ ok: false, error: result.error }, result.status as 400 | 403 | 404 | 502);
        deps.cancelActiveSubscriptionForUser(user.id, 'agenda', accountId);
        console.info(`[agenda] User self-cancelled plan: userId=${user.id}`);
        return c.json({ ok: true, message: result.message });
    });

    return app;
}

export function createAgendaBookingSchedule(deps: Pick<AgendaRouterDeps, 'db' | 'sql' | 'tables' | 'dbHelpers' | 'generateSlots'>) {
    const { db, sql, generateSlots, dbHelpers: { eq, and, lt } } = deps;
    const { agendaAvailabilityRules, agendaBlockedSlots, agendaAppointments } = deps.tables;

    function localDateKey(date: Date, timezone: string): string {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date);
        const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
        return `${value('year')}-${value('month')}-${value('day')}`;
    }

    function zonedLocalMidnight(dateStr: string, timezone: string): Date {
        const [year, month, day] = dateStr.split('-').map(Number);
        const targetWallTime = Date.UTC(year, month - 1, day, 0, 0, 0);
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        });
        const wallTimeAt = (instant: Date) => {
            const parts = formatter.formatToParts(instant);
            const value = (type: string) => Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10);
            return Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
        };

        let candidate = targetWallTime;
        for (let attempt = 0; attempt < 4; attempt++) {
            const correction = targetWallTime - wallTimeAt(new Date(candidate));
            if (correction === 0) return new Date(candidate);
            candidate += correction;
        }

        // Some zones skip midnight when daylight saving time begins. Use the
        // first instant that belongs to the requested local date in that case.
        const searchStart = candidate - 6 * 60 * 60 * 1000;
        for (let minute = 0; minute <= 12 * 60; minute++) {
            const instant = new Date(searchStart + minute * 60_000);
            if (localDateKey(instant, timezone) === dateStr) return instant;
        }
        throw new Error(`No pudimos resolver la medianoche local para ${dateStr}.`);
    }

    function nextLocalDateKey(dateStr: string): string {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    }

    async function getPublicBookingSlots(
        profile: any,
        dateStr: string,
        durationMinutes: number,
        queryable: any = db,
        excludeAppointmentId?: string,
    ) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
        const dateAtNoon = new Date(`${dateStr}T12:00:00Z`);
        if (Number.isNaN(dateAtNoon.getTime()) || dateAtNoon.toISOString().slice(0, 10) !== dateStr) return [];

        const timezone = profile.timezone ?? 'America/Santiago';
        const dayOfWeek = dateAtNoon.getUTCDay();
        const dayStart = zonedLocalMidnight(dateStr, timezone);
        const dayEnd = zonedLocalMidnight(nextLocalDateKey(dateStr), timezone);
        const dayStartParts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(dayStart);
        const startHour = Number.parseInt(dayStartParts.find((part) => part.type === 'hour')?.value ?? '0', 10);
        const startMinute = Number.parseInt(dayStartParts.find((part) => part.type === 'minute')?.value ?? '0', 10);
        const slotAnchor = new Date(dayStart.getTime() - (startHour * 60 + startMinute) * 60_000);
        const previousDayOfWeek = (dayOfWeek + 6) % 7;

        let expandedRules;
        if (profile.alwaysOpen) {
            expandedRules = expandWeeklyRulesToDaySegments(BUSINESS_SCHEDULE_ALWAYS_OPEN_RULES, dayOfWeek);
        } else {
            const [todayRules, spilloverRules] = await Promise.all([
                queryable.select().from(agendaAvailabilityRules).where(and(
                    eq(agendaAvailabilityRules.professionalId, profile.id),
                    eq(agendaAvailabilityRules.dayOfWeek, dayOfWeek),
                    eq(agendaAvailabilityRules.isActive, true),
                )),
                queryable.select().from(agendaAvailabilityRules).where(and(
                    eq(agendaAvailabilityRules.professionalId, profile.id),
                    eq(agendaAvailabilityRules.dayOfWeek, previousDayOfWeek),
                    eq(agendaAvailabilityRules.isActive, true),
                )),
            ]);
            expandedRules = expandWeeklyRulesToDaySegments([...todayRules, ...spilloverRules], dayOfWeek);
        }
        if (expandedRules.length === 0) return [];

        const [existingAppointments, blockedSlots] = await Promise.all([
            queryable.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.professionalId, profile.id),
                lt(agendaAppointments.startsAt, dayEnd),
                gt(agendaAppointments.endsAt, dayStart),
                sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`,
                excludeAppointmentId ? sql`${agendaAppointments.id} <> ${excludeAppointmentId}` : undefined,
            )),
            queryable.select().from(agendaBlockedSlots).where(and(
                eq(agendaBlockedSlots.professionalId, profile.id),
                lt(agendaBlockedSlots.startsAt, dayEnd),
                gt(agendaBlockedSlots.endsAt, dayStart),
            )),
        ]);
        return generateSlots(expandedRules, durationMinutes, slotAnchor, existingAppointments, blockedSlots, timezone);
    }

    return { localDateKey, getPublicBookingSlots };
}

// ── Public Agenda Router ──────────────────────────────────────────────────────
export function createPublicAgendaRouter(deps: AgendaRouterDeps) {
    const {
        db, sql, tables, dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        asString, randomUUID,
        isFreePlan, checkClientLimit, checkAppointmentLimit,
        logAudit, logNotification, syncToGoogleCalendar, sendPushToUser,
        sendBookingConfirmationEmail,
        ensureNpsForAppointment, createCheckoutPreference, rateLimit,
    } = deps;

    const {
        agendaProfessionalProfiles, agendaServices, agendaAvailabilityRules, agendaBlockedSlots,
        agendaLocations, agendaClients, agendaAppointments, agendaPayments, agendaPromotions, agendaPacks, agendaNpsResponses, users,
        pushSubscriptions, timelineEvents,
    } = tables;

    async function requirePublicBookingProfile(slug: string) {
        let profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.slug, slug),
        });
        if (!profile) {
            return { ok: false as const, status: 404 as const, body: { ok: false, error: 'Perfil no encontrado' } };
        }
        profile = await ensureAgendaProfileTrial(profile);
        if (!profile.isPublished) {
            return {
                ok: false as const,
                status: 403 as const,
                body: {
                    ok: false,
                    error: 'Este perfil aún no está publicado.',
                    reason: 'not_published',
                    displayName: profile.displayName,
                },
            };
        }
        return { ok: true as const, profile };
    }

    const publicReadLimit = rateLimit({ name: 'agenda-read', limit: 60, windowMs: 60_000 });
    const publicSlotsLimit = rateLimit({ name: 'agenda-slots', limit: 30, windowMs: 60_000 });
    const publicBookLimit = rateLimit({ name: 'agenda-book', limit: 5, windowMs: 60_000 });
    const publicCancelLimit = rateLimit({ name: 'agenda-cancel', limit: 10, windowMs: 60_000 });
    const publicCheckoutLimit = rateLimit({ name: 'agenda-checkout', limit: 10, windowMs: 60_000 });
    const bookingIdSchema = z.string().uuid();

    async function syncPublicAppointmentCalendar(profile: any, appointment: any, action: 'create' | 'update') {
        try {
            const result = await syncToGoogleCalendar(profile, appointment, action, { persistMeetingUrl: false });
            if (!result?.eventId) return;
            const [matched] = await db.update(agendaAppointments).set({
                googleEventId: result.eventId,
                ...(result.meetingUrl ? { meetingUrl: result.meetingUrl } : {}),
            }).where(and(
                eq(agendaAppointments.id, appointment.id),
                eq(agendaAppointments.startsAt, appointment.startsAt),
                inArray(agendaAppointments.status, ['pending', 'confirmed']),
                appointment.googleEventId
                    ? eq(agendaAppointments.googleEventId, appointment.googleEventId)
                    : isNull(agendaAppointments.googleEventId),
            )).returning({ id: agendaAppointments.id });
            if (!matched && !appointment.googleEventId) {
                await syncToGoogleCalendar(profile, { ...appointment, googleEventId: result.eventId }, 'delete');
            }
            if (matched && result.meetingUrl) appointment.meetingUrl = result.meetingUrl;
        } catch (error) {
            console.error('[agenda] Booking calendar sync error:', error);
        }
    }

    async function ensureBookingCheckout(profile: any, appointmentId: string): Promise<string | null> {
        if (!profile.acceptsMp || !profile.mpAccessToken) return null;

        return db.transaction(async (tx: any) => {
            const [appointment] = await tx.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.id, appointmentId),
                eq(agendaAppointments.professionalId, profile.id),
                eq(agendaAppointments.paymentStatus, 'pending'),
                inArray(agendaAppointments.status, ['pending', 'confirmed']),
                sql`${agendaAppointments.startsAt} > now()`,
            )).limit(1).for('update');
            if (!appointment || (appointment.bookingPaymentMethod && appointment.bookingPaymentMethod !== 'mp')) return null;
            if (appointment.mpCheckoutUrl) return appointment.mpCheckoutUrl;
            const amount = Number(appointment.price);
            if (!Number.isFinite(amount) || amount <= 0) return null;

            const apiUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
            const { bookingUrl } = resolvePublicProfileUrls(profile);
            const prefPayload = {
                externalReference: appointment.id,
                title: `Sesión con ${profile.displayName ?? 'el profesional'}`,
                amount,
                currencyId: appointment.currency,
                payerEmail: appointment.clientEmail ?? 'paciente@simpleagenda.app',
                payerName: appointment.clientName ?? undefined,
                backUrls: {
                    success: `${bookingUrl}?payment=success&appt=${appointment.id}`,
                    failure: `${bookingUrl}?payment=failure&appt=${appointment.id}`,
                    pending: `${bookingUrl}?payment=pending&appt=${appointment.id}`,
                },
                notificationUrl: `${apiUrl}/api/agenda/mercadopago/webhook?appointment=${appointment.id}`,
                accessToken: profile.mpAccessToken,
                signal: AbortSignal.timeout(8_000),
            };
            let pref: { initPoint: string | null; sandboxInitPoint?: string | null; [key: string]: any };
            try {
                pref = await createCheckoutPreference(prefPayload);
            } catch (err) {
                const refreshedToken = await refreshAgendaMpToken(db, agendaProfessionalProfiles, eq, profile);
                if (!refreshedToken) throw err;
                pref = await createCheckoutPreference({ ...prefPayload, accessToken: refreshedToken });
            }
            const resolvedInitPoint = pref.initPoint || pref.sandboxInitPoint || null;
            if (!resolvedInitPoint) return null;
            await tx.update(agendaAppointments)
                .set({ mpCheckoutUrl: resolvedInitPoint })
                .where(eq(agendaAppointments.id, appointment.id));
            return resolvedInitPoint;
        });
    }

    const { localDateKey, getPublicBookingSlots } = createAgendaBookingSchedule(deps);

    const app = new Hono();

    app.get('/by-domain', publicReadLimit, async (c) => {
        const rawHost = (c.req.query('host') ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '');
        if (!rawHost) return c.json({ ok: false, error: 'Host requerido.' }, 400);
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: and(
                eq(agendaProfessionalProfiles.customDomain, rawHost),
                eq(agendaProfessionalProfiles.customDomainStatus, 'verified'),
            ),
        });
        if (!profile || !profile.isPublished || !hasAgendaProPlusAccess(profile)) {
            return c.json({ ok: false, error: 'Dominio no encontrado.' }, 404);
        }
        c.header('Cache-Control', 'public, max-age=60');
        return c.json({ ok: true, slug: profile.slug });
    });

    app.get('/marketplace/professionals', publicReadLimit, async (c) => {
        const country = c.req.query('country')?.trim() || c.req.query('pais')?.trim();
        const region = c.req.query('region')?.trim();
        const regionId = c.req.query('regionId')?.trim();
        const locality = c.req.query('locality')?.trim() || c.req.query('comuna')?.trim();
        const localityId = c.req.query('localityId')?.trim();
        const profession = c.req.query('profession')?.trim() || c.req.query('rubro')?.trim();
        const q = c.req.query('q')?.trim();
        const modalityRaw = c.req.query('modality')?.trim() || c.req.query('modalidad')?.trim();
        const modality = modalityRaw === 'online' || modalityRaw === 'presential' ? modalityRaw : 'all';
        const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 24), 1), 60);
        const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

        const rows = await db
            .select({
                slug: agendaProfessionalProfiles.slug,
                plan: agendaProfessionalProfiles.plan,
                planExpiresAt: agendaProfessionalProfiles.planExpiresAt,
                displayName: agendaProfessionalProfiles.displayName,
                profession: agendaProfessionalProfiles.profession,
                headline: agendaProfessionalProfiles.headline,
                bio: agendaProfessionalProfiles.bio,
                avatarUrl: agendaProfessionalProfiles.avatarUrl,
                city: agendaProfessionalProfiles.city,
                region: agendaProfessionalProfiles.region,
                countryCode: agendaProfessionalProfiles.countryCode,
                regionId: agendaProfessionalProfiles.regionId,
                localityId: agendaProfessionalProfiles.localityId,
                serviceLocalities: agendaProfessionalProfiles.serviceLocalities,
                servesOnline: agendaProfessionalProfiles.servesOnline,
                servesPresential: agendaProfessionalProfiles.servesPresential,
                timezone: agendaProfessionalProfiles.timezone,
            })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.isPublished, true))
            .orderBy(asc(agendaProfessionalProfiles.displayName));

        const filtered = filterAgendaMarketplaceProfiles(rows, {
            country,
            region,
            regionId,
            locality,
            localityId,
            profession,
            q,
            modality,
        });
        const page = filtered.slice(offset, offset + limit).map(mapAgendaProfileToMarketplaceItem);
        return c.json({
            ok: true,
            items: page,
            total: filtered.length,
            hasMore: offset + limit < filtered.length,
            nextOffset: offset + limit < filtered.length ? offset + limit : null,
        });
    });

    app.get('/nps/:token', async (c) => {
        const token = c.req.param('token') ?? '';
        if (!token) return c.json({ ok: false, error: 'Token inválido' }, 400);
        const record = await db.query.agendaNpsResponses.findFirst({ where: eq(agendaNpsResponses.token, token) });
        if (!record) return c.json({ ok: false, error: 'Encuesta no encontrada' }, 404);
        const appt = await db.query.agendaAppointments.findFirst({ where: eq(agendaAppointments.id, record.appointmentId) });
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.id, record.professionalId) });
        return c.json({ ok: true, alreadySubmitted: !!record.submittedAt, professional: profile ? { displayName: profile.displayName, slug: profile.slug, avatarUrl: profile.avatarUrl } : null, appointment: appt ? { startsAt: appt.startsAt, clientName: appt.clientName } : null, response: record.submittedAt ? { score: record.score, comment: record.comment } : null });
    });

    app.post('/nps/:token', async (c) => {
        const token = c.req.param('token') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const rawStars = typeof body.ratingStars === 'number' ? Math.max(1, Math.min(5, Math.round(body.ratingStars))) : null;
        const rawScore = typeof body.score === 'number' ? Math.max(0, Math.min(10, Math.round(body.score))) : null;
        const ratingStars = rawStars ?? (rawScore !== null ? Math.max(1, Math.min(5, Math.round(rawScore / 2))) : null);
        const score = rawScore ?? (rawStars !== null ? rawStars * 2 : null);
        if (score === null || ratingStars === null) return c.json({ ok: false, error: 'Puntuación inválida (1–5 estrellas)' }, 400);
        const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) || null : null;
        const publicConsent = body.publicConsent === true;
        const record = await db.query.agendaNpsResponses.findFirst({ where: eq(agendaNpsResponses.token, token) });
        if (!record) return c.json({ ok: false, error: 'Encuesta no encontrada' }, 404);
        if (record.submittedAt) return c.json({ ok: false, error: 'Esta encuesta ya fue respondida' }, 409);
        await db.update(agendaNpsResponses).set({ score, ratingStars, comment, publicConsent, submittedAt: new Date() }).where(eq(agendaNpsResponses.id, record.id));
        emitTimelineEvent(db, timelineEvents, {
            type: 'nps.submitted',
            business: agendaBusiness(record.professionalId),
            person: agendaClientPerson(record.clientId),
            subject: { kind: 'agenda_appointment', id: record.appointmentId },
            actor: 'client',
            payload: { score, ratingStars, npsResponseId: record.id },
        });
        return c.json({ ok: true });
    });

    app.post('/:slug/validate-promo', publicReadLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const access = await requirePublicBookingProfile(slug);
        if (!access.ok) return c.json(access.body, access.status);
        const profile = access.profile;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const code = normalizePromoCode(body.code);
        if (!code) return c.json({ ok: false, error: 'Ingresa un código.' }, 400);
        const serviceId = typeof body.serviceId === 'string' ? body.serviceId : null;
        let basePrice = parseOptionalNumber(body.basePrice) ?? 0;
        if (serviceId) {
            const service = await db.query.agendaServices.findFirst({
                where: and(
                    eq(agendaServices.id, serviceId),
                    eq(agendaServices.professionalId, profile.id),
                    eq(agendaServices.kind, 'appointment'),
                    eq(agendaServices.isActive, true),
                ),
            });
            if (!service) return c.json({ ok: false, error: 'Servicio no disponible.' }, 400);
            basePrice = service.price ? Number(service.price) : 0;
        }
        const promo = await db.query.agendaPromotions.findFirst({ where: and(eq(agendaPromotions.professionalId, profile.id), sql`lower(${agendaPromotions.code}) = lower(${code})`) });
        if (!promo) return c.json({ ok: false, error: 'Cupón no válido.' }, 404);
        const result = applyPromotionToPrice(promo, basePrice, serviceId);
        if (!result.ok) return c.json({ ok: false, error: result.message }, 400);
        return c.json({ ok: true, promotion: { id: result.promotion.id, code: result.promotion.code, label: result.promotion.label, discountType: result.promotion.discountType, discountValue: result.promotion.discountValue }, originalPrice: result.originalPrice, discountAmount: result.discountAmount, finalPrice: result.finalPrice });
    });

    app.get('/:slug', publicReadLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const access = await requirePublicBookingProfile(slug);
        if (!access.ok) {
            if (access.status === 404) return c.json(access.body, 404);
            return c.json(access.body, access.status);
        }
        const profile = access.profile;
        const [services, locations, rules, packRows, promotionRows, operationalTz, publicReviewRows, teamRows] = await Promise.all([
            db.select().from(agendaServices).where(and(eq(agendaServices.professionalId, profile.id), eq(agendaServices.isActive, true), eq(agendaServices.kind, 'appointment'))).orderBy(asc(agendaServices.position)),
            db.select().from(agendaLocations).where(and(eq(agendaLocations.professionalId, profile.id), eq(agendaLocations.isActive, true))).orderBy(asc(agendaLocations.position)),
            db.select().from(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, profile.id)).orderBy(asc(agendaAvailabilityRules.dayOfWeek)),
            db.select().from(agendaPacks).where(and(eq(agendaPacks.professionalId, profile.id), eq(agendaPacks.isActive, true))).orderBy(asc(agendaPacks.position), desc(agendaPacks.createdAt)),
            db.select().from(agendaPromotions).where(eq(agendaPromotions.professionalId, profile.id)).orderBy(desc(agendaPromotions.createdAt)),
            resolveAgendaProfessionalTimezone(profile.userId, profile as Record<string, unknown>),
            db.select({
                id: agendaNpsResponses.id,
                ratingStars: agendaNpsResponses.ratingStars,
                score: agendaNpsResponses.score,
                comment: agendaNpsResponses.comment,
                submittedAt: agendaNpsResponses.submittedAt,
                clientName: agendaAppointments.clientName,
            })
                .from(agendaNpsResponses)
                .leftJoin(agendaAppointments, eq(agendaNpsResponses.appointmentId, agendaAppointments.id))
                .where(and(
                    eq(agendaNpsResponses.professionalId, profile.id),
                    eq(agendaNpsResponses.isPublic, true),
                    eq(agendaNpsResponses.publicConsent, true),
                    isNotNull(agendaNpsResponses.submittedAt),
                ))
                .orderBy(desc(agendaNpsResponses.submittedAt))
                .limit(12),
            profile.accountId
                ? db.select({
                    id: agendaProfessionalProfiles.id,
                    slug: agendaProfessionalProfiles.slug,
                    displayName: agendaProfessionalProfiles.displayName,
                    profession: agendaProfessionalProfiles.profession,
                    avatarUrl: agendaProfessionalProfiles.avatarUrl,
                })
                    .from(agendaProfessionalProfiles)
                    .where(and(
                        eq(agendaProfessionalProfiles.accountId, profile.accountId),
                        eq(agendaProfessionalProfiles.isPublished, true),
                    ))
                    .orderBy(asc(agendaProfessionalProfiles.createdAt))
                : Promise.resolve([]),
        ]);
        const operatingLocation = operatingLocationFromAgendaProfile(profile);
        const promotions = promotionRows.filter((promo: typeof promotionRows[number]) => isPublicAgendaPromotionVisible(promo));
        const reviews: Array<{
            id: string;
            stars: number;
            comment: string | null;
            authorLabel: string;
            submittedAt: string | null;
        }> = publicReviewRows.map((row: typeof publicReviewRows[number]) => ({
            id: row.id,
            stars: resolveStarsFromNps(row),
            comment: row.comment ?? null,
            authorLabel: formatPublicReviewAuthor(row.clientName),
            submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
        }));
        const reviewSummary = reviews.length > 0
            ? {
                count: reviews.length,
                averageStars: Number((reviews.reduce((sum: number, r) => sum + r.stars, 0) / reviews.length).toFixed(1)),
            }
            : null;
        const publicProfile = {
            ...mapPublicAgendaProfile(profile, {
                services,
                locations,
                rules,
                packs: packRows,
                promotions,
                operationalTz,
                operatingLocation,
            }),
            reviews,
            reviewSummary,
            teamProfessionals: teamRows.length > 1 ? teamRows : [],
            whatsappRemindersAvailable: getAgendaWhatsappMonthlyLimit(profile) > 0
                && profile.whatsappRemindersEnabled !== false
                && isWhatsAppCloudConfigured(),
        };
        if (isFreePlan(profile)) {
            publicProfile.coverUrl = null;
            publicProfile.landingPage = null;
            publicProfile.packs = [];
            publicProfile.promotions = [];
            publicProfile.allowsRecurrentBooking = false;
            publicProfile.customDomain = null;
            publicProfile.appearance = {
                layout: 'booking',
                colorMode: 'system',
                accentColor: 'auto',
            };
        } else if (!hasAgendaProPlusAccess(profile)) {
            publicProfile.customDomain = null;
        }
        return c.json({
            ok: true,
            profile: publicProfile,
        });
    });

    app.get('/:slug/slots', publicSlotsLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const dateStr = c.req.query('date'); const serviceId = c.req.query('serviceId');
        if (!dateStr) return c.json({ ok: false, error: 'Fecha requerida' }, 400);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return c.json({ ok: false, error: 'Fecha inválida' }, 400);
        const access = await requirePublicBookingProfile(slug);
        if (!access.ok) return c.json(access.body, access.status);
        const profile = access.profile;
        let durationMinutes = 60;
        if (serviceId) {
            const service = await db.query.agendaServices.findFirst({
                where: and(
                    eq(agendaServices.id, serviceId),
                    eq(agendaServices.professionalId, profile.id),
                    eq(agendaServices.isActive, true),
                    eq(agendaServices.kind, 'appointment'),
                ),
                columns: { durationMinutes: true },
            });
            if (!service) return c.json({ ok: false, error: 'Servicio no disponible.' }, 400);
            durationMinutes = service.durationMinutes;
        }
        const slots = await getPublicBookingSlots(profile, dateStr, durationMinutes);
        return c.json({ ok: true, slots });
    });

    app.get('/:slug/next-available', publicSlotsLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const access = await requirePublicBookingProfile(slug);
        if (!access.ok) return c.json(access.body, access.status);
        const profile = access.profile;

        const candidates = profile.accountId
            ? await db.select()
                .from(agendaProfessionalProfiles)
                .where(and(
                    eq(agendaProfessionalProfiles.accountId, profile.accountId),
                    eq(agendaProfessionalProfiles.isPublished, true),
                ))
                .orderBy(asc(agendaProfessionalProfiles.createdAt))
                .limit(20)
            : [profile];

        let earliest: {
            slug: string;
            displayName: string;
            profession: string | null;
            startsAt: string;
        } | null = null;

        const tz = profile.timezone ?? 'America/Santiago';
        for (let offset = 0; offset < 7; offset += 1) {
            const targetDate = new Date(Date.now() + offset * 86_400_000);
            const dateStr = localDateKey(targetDate, tz);
            for (const candidate of candidates) {
                const slots = await getPublicBookingSlots(candidate, dateStr, 60);
                const first = slots[0];
                if (first && (!earliest || first.startsAt < earliest.startsAt)) {
                    earliest = {
                        slug: candidate.slug,
                        displayName: candidate.displayName || 'Profesional',
                        profession: candidate.profession ?? null,
                        startsAt: first.startsAt,
                    };
                }
            }
            if (earliest) break;
        }

        return c.json({ ok: true, nextAvailable: earliest });
    });

    app.get('/appointments/:id/receipt', async (c) => {
        const id = bookingIdSchema.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Comprobante no encontrado.' }, 404);
        const [entry] = await db.select({
            appointment: agendaAppointments,
            professional: agendaProfessionalProfiles,
            serviceName: agendaServices.name,
        }).from(agendaAppointments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
            .leftJoin(agendaServices, eq(agendaAppointments.serviceId, agendaServices.id))
            .where(eq(agendaAppointments.id, id.data))
            .limit(1);
        if (!entry) return c.json({ ok: false, error: 'Comprobante no encontrado.' }, 404);

        const { appointment, professional, serviceName } = entry;
        return c.json({
            ok: true,
            receipt: {
                id: appointment.id,
                clientName: appointment.clientName ?? 'Paciente',
                professionalName: professional.displayName ?? 'Profesional',
                professionalProfession: professional.profession ?? null,
                professionalSlug: professional.slug,
                serviceName: serviceName ?? 'Sesión profesional',
                startsAt: appointment.startsAt.toISOString(),
                endsAt: appointment.endsAt.toISOString(),
                durationMinutes: appointment.durationMinutes,
                modality: appointment.modality,
                location: appointment.location ?? null,
                price: appointment.price ?? null,
                currency: appointment.currency,
                paymentStatus: appointment.paymentStatus,
                status: appointment.status,
                timezone: professional.timezone ?? 'America/Santiago',
            },
        });
    });

    function rescheduleContext(profile: any, appointment: any) {
        const timezone = profile.timezone ?? 'America/Santiago';
        const now = Date.now();
        const minimumAdvance = Math.max(0, Number(profile.cancellationHours ?? 0));
        const minimumDate = localDateKey(new Date(now), timezone);
        const maximumDay = new Date(`${minimumDate}T12:00:00Z`);
        maximumDay.setUTCDate(maximumDay.getUTCDate() + (profile.bookingWindowDays ?? 30));
        return {
            timezone,
            minimumDate,
            maximumDate: maximumDay.toISOString().slice(0, 10),
            canChange: ['pending', 'confirmed'].includes(appointment.status)
                && appointment.startsAt.getTime() > now
                && appointment.startsAt.getTime() - now >= minimumAdvance * 3_600_000,
        };
    }

    app.get('/:slug/bookings/:id/reschedule', publicSlotsLimit, async (c) => {
        const id = bookingIdSchema.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const [entry] = await db.select({
            profile: agendaProfessionalProfiles,
            appointment: agendaAppointments,
        }).from(agendaAppointments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
            .where(and(eq(agendaAppointments.id, id.data), eq(agendaProfessionalProfiles.slug, c.req.param('slug'))))
            .limit(1);
        c.header('Cache-Control', 'no-store');
        if (!entry) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const { profile, appointment } = entry;
        const { timezone, minimumDate, maximumDate, canChange } = rescheduleContext(profile, appointment);
        if (!canChange) {
            return c.json({ ok: false, error: 'Contacta al profesional para cambiar esta cita.' }, 409);
        }
        const date = c.req.query('date');
        const slots = date && date >= minimumDate && date <= maximumDate
            ? await getPublicBookingSlots(profile, date, appointment.durationMinutes, db, appointment.id)
            : [];
        return c.json({
            ok: true,
            startsAt: appointment.startsAt,
            timezone,
            minimumDate,
            maximumDate,
            slots: slots.filter((slot: { startsAt: string }) => new Date(slot.startsAt).getTime() !== appointment.startsAt.getTime()),
        });
    });

    app.post('/:slug/bookings/:id/reschedule', publicCancelLimit, async (c) => {
        const id = bookingIdSchema.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const parsed = z.object({
            startsAt: z.string().datetime({ offset: true }),
            expectedStartsAt: z.string().datetime({ offset: true }),
        }).safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return c.json({ ok: false, error: 'La fecha elegida no es válida.' }, 400);
        const expectedStartsAt = new Date(parsed.data.expectedStartsAt);
        const moved = await db.transaction(async (tx: any) => {
            // Usar el mismo orden de bloqueo que la creación pública para serializar ambas operaciones.
            const [profile] = await tx.select().from(agendaProfessionalProfiles)
                .where(eq(agendaProfessionalProfiles.slug, c.req.param('slug'))).limit(1).for('update');
            if (!profile) return { ok: false as const, status: 404 as const, error: 'Cita no encontrada.' };
            const startsAt = parseDateTimeInTimezone(parsed.data.startsAt, profile.timezone ?? 'America/Santiago');
            const [appointment] = await tx.select().from(agendaAppointments)
                .where(and(eq(agendaAppointments.id, id.data), eq(agendaAppointments.professionalId, profile.id)))
                .limit(1).for('update');
            if (!appointment) return { ok: false as const, status: 404 as const, error: 'Cita no encontrada.' };
            const { timezone, minimumDate, maximumDate, canChange } = rescheduleContext(profile, appointment);
            if (!canChange) {
                return { ok: false as const, status: 409 as const, error: 'Contacta al profesional para cambiar esta cita.' };
            }
            if (appointment.startsAt.getTime() === startsAt.getTime()) {
                return { ok: true as const, updated: appointment, original: appointment, profile, unchanged: true };
            }
            if (appointment.startsAt.getTime() !== expectedStartsAt.getTime()) {
                return { ok: false as const, status: 409 as const, error: 'La cita cambió. Vuelve a consultar sus horarios.' };
            }
            const date = localDateKey(startsAt, timezone);
            if (date < minimumDate || date > maximumDate) {
                return { ok: false as const, status: 400 as const, error: 'La fecha está fuera del período de reserva.' };
            }
            const slots = await getPublicBookingSlots(profile, date, appointment.durationMinutes, tx, appointment.id);
            const nextSlot = slots.find((slot: { startsAt: string; endsAt: string }) =>
                new Date(slot.startsAt).getTime() === startsAt.getTime());
            if (!nextSlot) {
                return { ok: false as const, status: 409 as const, error: 'Esa hora ya no está disponible. Tu cita mantiene el horario original.' };
            }
            const [updated] = await tx.update(agendaAppointments).set({
                startsAt,
                endsAt: new Date(nextSlot.endsAt),
                reminderSentAt: null,
                reminder30minSentAt: null,
                updatedAt: new Date(),
            }).where(eq(agendaAppointments.id, appointment.id)).returning();
            return { ok: true as const, updated, original: appointment, profile, unchanged: false };
        });
        if (!moved.ok) return c.json({ ok: false, error: moved.error }, moved.status);

        const { updated, original, profile } = moved;
        const timezone = profile.timezone ?? 'America/Santiago';
        if (!moved.unchanged) {
            await logAudit({
                professionalId: profile.id, entityType: 'appointment', entityId: updated.id, action: 'reschedule',
                metadata: { source: 'client_reschedule', from: original.startsAt, to: updated.startsAt }, ctx: c,
            });
            if (profile.googleAccessToken && profile.googleCalendarId) {
                await syncPublicAppointmentCalendar(profile, updated, 'update');
            }
            const dateLabel = updated.startsAt.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone });
            void sendPushToUser(profile.userId, { title: 'Cita reprogramada', body: `Nuevo horario: ${dateLabel}`, url: '/panel/agenda' });
            if (updated.clientEmail) {
                const { baseUrl } = resolvePublicProfileUrls(profile);
                void sendBookingConfirmationEmail(updated.clientEmail, {
                    ...updated,
                    clientName: updated.clientName ?? 'Cliente',
                    professionalName: profile.displayName ?? 'el profesional',
                    timezone,
                    serviceName: null,
                    rescheduled: true,
                    paymentMethods: updated.paymentStatus === 'pending' ? {
                        requiresAdvancePayment: true,
                        mpConnected: Boolean(profile.acceptsMp && profile.mpAccessToken),
                        checkoutUrl: updated.mpCheckoutUrl,
                        paymentLinkUrl: (!updated.bookingPaymentMethod || updated.bookingPaymentMethod === 'link') && profile.acceptsPaymentLink
                            ? profile.paymentLinkUrl : null,
                        bankTransferData: (!updated.bookingPaymentMethod || updated.bookingPaymentMethod === 'transfer') && profile.acceptsTransfer
                            ? profile.bankTransferData : null,
                        instructions: profile.advancePaymentInstructions ?? null,
                    } : null,
                    cancelUrl: `${baseUrl}/cancelar?appt=${updated.id}&slug=${profile.slug}`,
                    appUrl: baseUrl,
                }).catch((error: unknown) => console.error('[agenda] Reschedule confirmation email error:', error));
            }
        }
        return c.json({ ok: true, startsAt: updated.startsAt, timezone });
    });

    app.post('/appointments/:id/cancel', publicCancelLimit, async (c) => {
        const parsedId = bookingIdSchema.safeParse(c.req.param('id'));
        if (!parsedId.success) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const id = parsedId.data;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const appt = await db.query.agendaAppointments.findFirst({ where: eq(agendaAppointments.id, id) });
        if (!appt || appt.status === 'cancelled') return c.json({ ok: false, error: 'Cita no encontrada o ya cancelada.' }, 404);
        if (appt.status === 'completed' || appt.status === 'no_show') return c.json({ ok: false, error: 'No se puede cancelar una cita ya finalizada.' }, 400);
        if (appt.startsAt.getTime() <= Date.now()) return c.json({ ok: false, error: 'No puedes cancelar una cita cuya hora ya pasó.' }, 400);
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.id, appt.professionalId) });
        if (profile?.cancellationHours) { const hoursUntil = (appt.startsAt.getTime() - Date.now()) / (1000 * 60 * 60); if (hoursUntil < profile.cancellationHours) return c.json({ ok: false, error: `La cancelación debe hacerse con al menos ${profile.cancellationHours} horas de anticipación.` }, 400); }
        const [updated] = await db.update(agendaAppointments)
            .set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'client', cancellationReason: typeof body.reason === 'string' ? body.reason || null : null, updatedAt: new Date() })
            .where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.status, appt.status), eq(agendaAppointments.startsAt, appt.startsAt)))
            .returning();
        if (!updated) return c.json({ ok: false, error: 'La cita cambió. Actualiza la página e inténtalo nuevamente.' }, 409);
        await logAudit({ professionalId: updated.professionalId, entityType: 'appointment', entityId: updated.id, action: 'cancel', metadata: { source: 'client_self_cancel', reason: typeof body.reason === 'string' ? body.reason.slice(0,200) : null }, ctx: c });
        if (profile) void syncToGoogleCalendar(profile, updated, 'delete');
        emitTimelineEvent(db, timelineEvents, {
            type: 'booking.status_changed',
            business: agendaBusiness(updated.professionalId),
            person: agendaClientPerson(updated.clientId),
            subject: { kind: 'agenda_appointment', id: updated.id },
            actor: 'client',
            payload: { from: appt.status, to: 'cancelled', cancelledBy: 'client' },
        });
        if (profile) {
            const tz2 = profile.timezone ?? 'America/Santiago';
            const fmtT2 = (d: Date) => d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz2 });
            const fmtD2 = (d: Date) => d.toLocaleDateString('es-CL', { weekday:'short', day:'numeric', month:'short', timeZone:tz2 });
            const profUser = await db.query.users.findFirst({ where: eq(users.id, profile.userId) });
            if (profUser) void sendPushToUser(profUser.id, { title: '❌ Cita cancelada', body: `${updated.clientName ?? 'Paciente'} canceló para el ${fmtD2(updated.startsAt)} a las ${fmtT2(updated.startsAt)}`, url: '/panel/agenda' });
            void import('../../lib/agenda-email.js').then(({ sendAgendaProfessionalCancellationEmailForUser }) =>
                sendAgendaProfessionalCancellationEmailForUser(profile.userId, {
                    clientName: updated.clientName ?? 'Paciente',
                    dateLabel: `${fmtD2(updated.startsAt)} a las ${fmtT2(updated.startsAt)}`,
                    reason: typeof body.reason === 'string' ? body.reason.trim() || null : null,
                }).catch((err: unknown) => console.error('[agenda] Failed to send professional cancellation email:', err)),
            );
        }
        return c.json({ ok: true, message: 'Cita cancelada correctamente.' });
    });

    app.get('/:slug/bookings/:id/payment-status', publicReadLimit, async (c) => {
        const id = bookingIdSchema.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const [booking] = await db.select({
            status: agendaAppointments.status,
            paymentStatus: agendaAppointments.paymentStatus,
            startsAt: agendaAppointments.startsAt,
            endsAt: agendaAppointments.endsAt,
            modality: agendaAppointments.modality,
            meetingUrl: agendaAppointments.meetingUrl,
            location: agendaAppointments.location,
            bookingPaymentMethod: agendaAppointments.bookingPaymentMethod,
        }).from(agendaAppointments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
            .where(and(eq(agendaAppointments.id, id.data), eq(agendaProfessionalProfiles.slug, c.req.param('slug'))))
            .limit(1);
        c.header('Cache-Control', 'no-store');
        if (!booking) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        return c.json({ ok: true, ...booking });
    });

    app.post('/:slug/bookings/:id/checkout', publicCheckoutLimit, async (c) => {
        const id = bookingIdSchema.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        const profile = await db.query.agendaProfessionalProfiles.findFirst({
            where: eq(agendaProfessionalProfiles.slug, c.req.param('slug')),
        });
        if (!profile) return c.json({ ok: false, error: 'Cita no encontrada.' }, 404);
        try {
            const checkoutUrl = await ensureBookingCheckout(profile, id.data);
            if (!checkoutUrl) return c.json({ ok: false, error: 'El pago en línea no está disponible para esta cita.' }, 409);
            return c.json({ ok: true, checkoutUrl });
        } catch (error) {
            console.error('[agenda] MP checkout retry error:', error);
            return c.json({ ok: false, error: 'No se pudo abrir Mercado Pago. Vuelve a intentarlo.' }, 502);
        }
    });

    app.post('/:slug/book', publicBookLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const access = await requirePublicBookingProfile(slug);
        if (!access.ok) return c.json(access.body, access.status);
        let profile = access.profile;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
        if (!body.startsAt || !clientName) return c.json({ ok: false, error: 'Datos requeridos: startsAt, clientName' }, 400);
        const profileTz = profile.timezone ?? 'America/Santiago';
        const startsAt = parseDateTimeInTimezone(String(body.startsAt), profileTz);
        if (Number.isNaN(startsAt.getTime())) return c.json({ ok: false, error: 'La fecha seleccionada no es válida.' }, 400);
        const requestedServiceId = typeof body.serviceId === 'string' && body.serviceId ? body.serviceId : null;
        const paymentMethod = z.enum(['mp', 'link', 'transfer', 'manual']).optional().safeParse(body.paymentMethod);
        if (!paymentMethod.success) return c.json({ ok: false, error: 'Medio de pago inválido.' }, 400);
        const promoCode = normalizePromoCode(body.promotionCode);
        const rawFreq = typeof body.recurrenceFrequency === 'string' ? body.recurrenceFrequency : null;
        const requestedFrequency: 'weekly'|'biweekly'|'monthly'|null = rawFreq === 'weekly' || rawFreq === 'biweekly' || rawFreq === 'monthly' ? rawFreq : null;
        const recurrenceCountRaw = typeof body.recurrenceCount === 'number' && Number.isFinite(body.recurrenceCount)
            ? Math.floor(body.recurrenceCount)
            : 1;
        const publicTotalOccurrences = requestedFrequency ? Math.max(2, Math.min(recurrenceCountRaw, 26)) : 1;
        const publicSeriesId = publicTotalOccurrences > 1 ? randomUUID() : null;
        const bookingEmail = typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : null;
        const bookingPhone = typeof body.clientPhone === 'string' && body.clientPhone.trim() ? body.clientPhone.trim() : null;
        const whatsappReminderOptIn = body.whatsappReminderOptIn === true
            && profile.whatsappRemindersEnabled !== false
            && getAgendaWhatsappMonthlyLimit(profile) > 0
            && isWhatsAppCloudConfigured();
        const normalizedWhatsappOptInPhone = whatsappReminderOptIn ? normalizeWhatsAppRecipient(bookingPhone) : null;
        if (whatsappReminderOptIn && !normalizedWhatsappOptInPhone) {
            return c.json({ ok: false, error: 'Ingresa un teléfono válido para recibir recordatorios por WhatsApp.' }, 400);
        }
        const whatsappReminderOptInAt = whatsappReminderOptIn ? new Date() : null;
        const nameParts = clientName.split(/\s+/);
        const bookingFirstName = nameParts[0] ?? clientName;
        const bookingLastName = nameParts.slice(1).join(' ') || null;
        const booking = await db.transaction(async (tx: any) => {
            const [currentProfile] = await tx.select().from(agendaProfessionalProfiles)
                .where(eq(agendaProfessionalProfiles.id, profile.id))
                .limit(1)
                .for('update');
            if (!currentProfile || currentProfile.slug !== slug || !currentProfile.isPublished) {
                return { ok: false as const, status: 409 as const, error: 'Este perfil dejó de aceptar reservas. Actualiza la página.' };
            }
            if (requestedFrequency && (isFreePlan(currentProfile) || !currentProfile.allowsRecurrentBooking)) {
                return { ok: false as const, status: 403 as const, error: 'Este profesional no permite reservar sesiones recurrentes.' };
            }

            let currentService: any = null;
            if (requestedServiceId) {
                const [service] = await tx.select().from(agendaServices).where(and(
                    eq(agendaServices.id, requestedServiceId),
                    eq(agendaServices.professionalId, currentProfile.id),
                    eq(agendaServices.isActive, true),
                    eq(agendaServices.kind, 'appointment'),
                )).limit(1).for('update');
                if (!service) return { ok: false as const, status: 400 as const, error: 'Servicio no disponible.' };
                currentService = service;
            }

            const durationMinutes = currentService?.durationMinutes ?? 60;
            const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
            let price: string | null = currentService?.price ?? null;
            const serviceName: string | null = currentService?.name ?? null;
            const preconsultFields = currentService
                ? normalizePreconsultFields(currentService.preconsultFields, randomUUID)
                : [];
            const preconsultResponses = normalizePreconsultResponses(body.preconsultResponses, preconsultFields);
            if (preconsultResponses) {
                const rawMap = body.preconsultResponses && typeof body.preconsultResponses === 'object'
                    ? (body.preconsultResponses as Record<string, unknown>)
                    : {};
                for (let i = 0; i < preconsultFields.length; i++) {
                    const field = preconsultFields[i];
                    if (field.required) {
                        const missing = field.type === 'checkbox'
                            ? rawMap[field.id] !== true
                            : !preconsultResponses[i].value.trim();
                        if (missing) {
                            return { ok: false as const, status: 400 as const, error: `Falta responder: ${field.label}` };
                        }
                    }
                }
            }

            let appliedPromotion: any = null;
            let originalPriceForPromo: number | null = null;
            let discountAmount: number | null = null;
            if (promoCode) {
                const [promotion] = await tx.select().from(agendaPromotions).where(and(
                    eq(agendaPromotions.professionalId, currentProfile.id),
                    sql`lower(${agendaPromotions.code}) = lower(${promoCode})`,
                )).limit(1).for('update');
                if (!promotion) return { ok: false as const, status: 400 as const, error: 'Cupón no válido.' };
                const result = applyPromotionToPrice(promotion, price ? Number(price) : 0, requestedServiceId);
                if (!result.ok) return { ok: false as const, status: 400 as const, error: result.message };
                if (result.promotion.maxUses !== null && result.promotion.usesCount + publicTotalOccurrences > result.promotion.maxUses) {
                    return { ok: false as const, status: 400 as const, error: 'El cupón no tiene suficientes usos disponibles para todas las sesiones.' };
                }
                appliedPromotion = result.promotion;
                originalPriceForPromo = result.originalPrice;
                discountAmount = result.discountAmount;
                price = String(result.finalPrice);
            }

            const hasAdvance = currentProfile.requiresAdvancePayment && Number(price) > 0;
            const hasMp = Boolean(currentProfile.acceptsMp && currentProfile.mpAccessToken);
            const hasLink = Boolean(currentProfile.acceptsPaymentLink && currentProfile.paymentLinkUrl);
            const hasTransfer = Boolean(currentProfile.acceptsTransfer && currentProfile.bankTransferData);
            const paymentMethodAllowed = {
                mp: hasMp,
                link: hasLink,
                transfer: hasTransfer,
                manual: Boolean(currentProfile.advancePaymentInstructions) || !(hasMp || hasLink || hasTransfer),
            };
            const chosenMethod = hasAdvance ? paymentMethod.data : undefined;
            if (chosenMethod && !paymentMethodAllowed[chosenMethod]) {
                return { ok: false as const, status: 400 as const, error: 'El medio de pago elegido ya no está disponible. Revisa las opciones de la cita.' };
            }
            const requiresPayment = hasAdvance && (hasMp || hasLink || hasTransfer || Boolean(currentProfile.advancePaymentInstructions));
            const status = currentProfile.confirmationMode === 'manual' ? 'pending' : 'confirmed';
            const occurrences: Array<{ startsAt: Date; endsAt: Date }> = [];
            for (let i = 0; i < publicTotalOccurrences; i++) {
                const timezone = currentProfile.timezone ?? 'America/Santiago';
                const occurrenceStart = recurringBookingStart(startsAt, i, requestedFrequency, timezone);
                if (!occurrenceStart) {
                    return { ok: false as const, status: 409 as const, error: 'Una sesión coincide con un cambio de hora. Elige otro horario.' };
                }
                const occurrence = {
                    startsAt: occurrenceStart,
                    endsAt: new Date(occurrenceStart.getTime() + durationMinutes * 60_000),
                };
                if (occurrences.some((previous) => (
                    occurrence.startsAt < previous.endsAt && occurrence.endsAt > previous.startsAt
                ))) {
                    return {
                        ok: false as const,
                        status: 409 as const,
                        error: 'Los horarios recurrentes se superponen. Reduce la duración o elige otra frecuencia.',
                    };
                }
                const occurrenceDate = localDateKey(occurrence.startsAt, timezone);
                const availableSlots = await getPublicBookingSlots(currentProfile, occurrenceDate, durationMinutes, tx);
                const isAvailable = availableSlots.some((slot: { startsAt: string }) => (
                    new Date(slot.startsAt).getTime() === occurrence.startsAt.getTime()
                ));
                if (!isAvailable) {
                    return {
                        ok: false as const,
                        status: 409 as const,
                        error: publicTotalOccurrences > 1
                            ? 'Uno de los horarios recurrentes ya no está disponible. Reduce la serie o elige otra fecha.'
                            : 'El horario seleccionado ya no está disponible. Elige otro.',
                    };
                }
                occurrences.push(occurrence);
            }

            if (isFreePlan(currentProfile)) {
                const limitError = await checkAppointmentLimit(currentProfile.id, publicTotalOccurrences, tx);
                if (limitError) {
                    return { ok: false as const, status: 403 as const, error: 'Esta agenda alcanzó su límite mensual de citas. Contacta directamente al profesional para consultar disponibilidad.' };
                }
            }

            if (normalizedWhatsappOptInPhone) {
                await tx.delete(agendaWhatsappOptOuts)
                    .where(eq(agendaWhatsappOptOuts.phoneNumber, normalizedWhatsappOptInPhone));
            }

            let existingClient: any = null;
            if (bookingEmail) {
                const [client] = await tx.select().from(agendaClients).where(and(
                    eq(agendaClients.email, bookingEmail),
                    eq(agendaClients.professionalId, currentProfile.id),
                )).limit(1).for('update');
                existingClient = client ?? null;
            }
            if (!existingClient && bookingPhone) {
                const [client] = await tx.select().from(agendaClients).where(and(
                    eq(agendaClients.phone, bookingPhone),
                    eq(agendaClients.professionalId, currentProfile.id),
                )).limit(1).for('update');
                existingClient = client ?? null;
            }
            if (!existingClient && isFreePlan(currentProfile)) {
                const clientLimit = await checkClientLimit(currentProfile.id, 1, tx);
                if (clientLimit) {
                    return { ok: false as const, status: 403 as const, error: 'Este profesional ha alcanzado el límite de pacientes de su plan actual. Intenta más adelante.' };
                }
            }

            let bookingModality: 'online' | 'presential' = 'online';
            if (currentService) {
                const resolved = resolveBookingModality(currentService, typeof body.modality === 'string' ? body.modality : null);
                if (!resolved) return { ok: false as const, status: 400 as const, error: 'Modalidad no disponible para este servicio.' };
                bookingModality = resolved;
            } else if (body.modality === 'presential') {
                bookingModality = 'presential';
            }

            let resolvedLocationLabel: string | null = null;
            if (bookingModality === 'presential') {
                const requestedLocationId = typeof body.locationId === 'string' && body.locationId.trim() ? body.locationId.trim() : null;
                const activeLocations = await tx.select().from(agendaLocations)
                    .where(and(eq(agendaLocations.professionalId, currentProfile.id), eq(agendaLocations.isActive, true)))
                    .orderBy(asc(agendaLocations.createdAt));
                const matchedLoc = requestedLocationId
                    ? activeLocations.find((loc: any) => loc.id === requestedLocationId)
                    : activeLocations.length === 1
                        ? activeLocations[0]
                        : null;
                if (matchedLoc) {
                    const parts = [matchedLoc.name, matchedLoc.addressLine, matchedLoc.city].filter(Boolean);
                    resolvedLocationLabel = parts.join(' — ').slice(0, 255) || null;
                } else if (currentProfile.address) {
                    resolvedLocationLabel = [currentProfile.address, currentProfile.city].filter(Boolean).join(', ').slice(0, 255) || null;
                }
            }

            const insertedAppointments: Array<{ id: string; startsAt: Date; [key: string]: any }> = [];
            for (const occurrence of occurrences) {
                const [inserted] = await tx.insert(agendaAppointments).values({
                    professionalId: currentProfile.id,
                    serviceId: currentService?.id ?? null,
                    clientName,
                    clientEmail: bookingEmail,
                    clientPhone: bookingPhone,
                    whatsappReminderOptIn,
                    whatsappReminderOptInAt,
                    clientNotes: typeof body.clientNotes === 'string' ? body.clientNotes || null : null,
                    startsAt: occurrence.startsAt,
                    endsAt: occurrence.endsAt,
                    durationMinutes,
                    modality: bookingModality,
                    location: resolvedLocationLabel,
                    status,
                    price,
                    currency: currentProfile.currency,
                    policyAgreed: body.policyAgreed === true,
                    policyAgreedAt: body.policyAgreed === true ? new Date() : null,
                    paymentStatus: requiresPayment ? 'pending' : 'not_required',
                    bookingPaymentMethod: chosenMethod ?? null,
                    seriesId: publicSeriesId,
                    recurrenceFrequency: publicSeriesId ? requestedFrequency : null,
                    preconsultResponses: preconsultResponses ?? null,
                    promotionId: appliedPromotion?.id ?? null,
                    promotionCode: appliedPromotion?.code ?? null,
                    originalPrice: originalPriceForPromo !== null ? String(originalPriceForPromo) : null,
                    discountAmount: discountAmount !== null ? String(discountAmount) : null,
                }).returning();
                if (inserted) insertedAppointments.push(inserted);
            }

            if (appliedPromotion) {
                const promoIncrement = Math.max(1, insertedAppointments.length);
                await tx.update(agendaPromotions)
                    .set({ usesCount: sql`${agendaPromotions.usesCount} + ${promoIncrement}`, updatedAt: new Date() })
                    .where(eq(agendaPromotions.id, appliedPromotion.id));
            }

            let resolvedClientId: string | null = existingClient?.id ?? null;
            let clientCreated = false;
            if (!existingClient) {
                const [newClient] = await tx.insert(agendaClients).values({
                    professionalId: currentProfile.id,
                    firstName: bookingFirstName,
                    lastName: bookingLastName,
                    email: bookingEmail,
                    phone: bookingPhone,
                }).returning({ id: agendaClients.id });
                if (newClient) {
                    resolvedClientId = newClient.id;
                    clientCreated = true;
                }
            }
            if (resolvedClientId) {
                await tx.update(agendaAppointments)
                    .set({ clientId: resolvedClientId })
                    .where(inArray(agendaAppointments.id, insertedAppointments.map((item) => item.id)));
            }

            if (requiresPayment && Number(price) > 0 && chosenMethod && chosenMethod !== 'mp') {
                for (const item of insertedAppointments) {
                    await tx.insert(agendaPayments).values({
                        professionalId: currentProfile.id,
                        appointmentId: item.id,
                        clientId: resolvedClientId,
                        amount: String(price),
                        currency: currentProfile.currency,
                        method: chosenMethod,
                        status: 'pending',
                    });
                }
            }

            return {
                ok: true as const,
                profile: currentProfile,
                durationMinutes,
                endsAt,
                status,
                serviceId: currentService?.id ?? null,
                serviceName,
                price,
                appliedPromotion,
                originalPriceForPromo,
                discountAmount,
                bookingModality,
                insertedAppointments,
                resolvedClientId,
                clientCreated,
            };
        });

        if (!booking.ok) return c.json({ ok: false, error: booking.error }, booking.status);
        profile = booking.profile;
        const {
            durationMinutes,
            endsAt,
            status,
            serviceId,
            serviceName,
            price,
            appliedPromotion,
            bookingModality,
            insertedAppointments,
            resolvedClientId,
            clientCreated,
        } = booking;
        const appointment = insertedAppointments[0];
        if (!appointment) return c.json({ ok: false, error: 'No pudimos guardar la reserva. Intenta nuevamente.' }, 500);
        if (clientCreated && resolvedClientId) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'relationship.created',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(resolvedClientId),
                subject: { kind: 'agenda_client', id: resolvedClientId },
                actor: 'client',
                payload: { source: 'public_booking' },
            });
        }
        if (appliedPromotion && resolvedClientId) {
            emitTimelineEvent(db, timelineEvents, {
                type: 'offer.applied',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(resolvedClientId),
                subject: { kind: 'agenda_appointment', id: appointment.id },
                actor: 'client',
                payload: { promotionId: appliedPromotion.id, code: appliedPromotion.code },
            });
        }
        for (const inserted of insertedAppointments) {
            emitTimelineEvent(db, timelineEvents, {
                type: status === 'pending' || inserted.paymentStatus === 'pending' ? 'booking.requested' : 'booking.confirmed',
                business: agendaBusiness(profile.id),
                person: agendaClientPerson(resolvedClientId),
                subject: { kind: 'agenda_appointment', id: inserted.id },
                actor: 'client',
                payload: { status, paymentStatus: inserted.paymentStatus, source: 'public', startsAt: inserted.startsAt instanceof Date ? inserted.startsAt.toISOString() : inserted.startsAt },
            });
        }
        if (profile.googleAccessToken && profile.googleCalendarId) {
            if (bookingModality === 'online') await syncPublicAppointmentCalendar(profile, appointment, 'create');
            const remaining = bookingModality === 'online' ? insertedAppointments.slice(1) : insertedAppointments;
            void (async () => {
                for (const entry of remaining) await syncPublicAppointmentCalendar(profile, entry, 'create');
            })();
        }
        const tz3 = profile.timezone ?? 'America/Santiago';
        const fmtT3 = (d: Date) => d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz3 });
        const fmtD3 = (d: Date) => d.toLocaleDateString('es-CL', { weekday:'short', day:'numeric', month:'short', timeZone:tz3 });
        const { insertPlatformNotifications } = await import('../platform/notifications-service.js');
        void insertPlatformNotifications({
            userId: profile.userId,
            vertical: 'agenda',
            type: 'appointment.new_booking',
            title: 'Nueva cita online',
            body: `${String(body.clientName)} — ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}`,
            actionUrl: '/panel/agenda',
            entityType: 'appointment',
            entityId: appointment.id,
        });
        void sendPushToUser(profile.userId, { title: '📅 Nueva cita agendada', body: `${String(body.clientName)} — ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}`, url: '/panel/agenda' });
        void import('../../lib/agenda-email.js').then(({ sendAgendaProfessionalNewBookingEmailForUser }) =>
            sendAgendaProfessionalNewBookingEmailForUser(profile.userId, {
                title: appointment.paymentStatus === 'pending'
                    ? 'Nueva cita pendiente de pago'
                    : status === 'pending' ? 'Nueva cita pendiente de aprobación' : 'Nueva cita online confirmada',
                message: `${String(body.clientName)} reservó para ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}${serviceName ? ` (${serviceName})` : ''}.`,
            }).catch((err: unknown) => console.error('[agenda] Failed to send professional new booking email:', err)),
        );
        let checkoutUrl: string|null = null;
        if (appointment.paymentStatus === 'pending') {
            try {
                checkoutUrl = await ensureBookingCheckout(profile, appointment.id);
            } catch (error) {
                console.error('[agenda] MP checkout creation error:', error);
            }
        }
        const clientEmail2 = typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : null;
        if (clientEmail2) {
            const { baseUrl } = resolvePublicProfileUrls(profile);
            void sendBookingConfirmationEmail(clientEmail2, { appointmentId: appointment.id, clientName: String(body.clientName), professionalName: profile.displayName ?? 'el profesional', slug: profile.slug, serviceName, startsAt, endsAt, durationMinutes, modality: bookingModality, price, currency: profile.currency, meetingUrl: appointment.meetingUrl, location: appointment.location, timezone: profile.timezone ?? 'America/Santiago', status, paymentStatus: appointment.paymentStatus, seriesDates: publicSeriesId ? insertedAppointments.map((a: { startsAt: Date }) => a.startsAt) : null, seriesFrequency: publicSeriesId ? requestedFrequency : null, paymentMethods: {
                requiresAdvancePayment: appointment.paymentStatus === 'pending',
                mpConnected: !!(profile.acceptsMp && profile.mpAccessToken),
                paymentLinkUrl: (!appointment.bookingPaymentMethod || appointment.bookingPaymentMethod === 'link') && profile.acceptsPaymentLink ? (profile.paymentLinkUrl ?? null) : null,
                bankTransferData: (!appointment.bookingPaymentMethod || appointment.bookingPaymentMethod === 'transfer') && profile.acceptsTransfer ? ((profile.bankTransferData ?? null) as Record<string,string>|null) : null,
                instructions: profile.advancePaymentInstructions ?? null,
                checkoutUrl,
            }, cancelUrl: `${baseUrl}/cancelar?appt=${appointment.id}&slug=${profile.slug}`, appUrl: baseUrl }).catch((err: any) => console.error('[agenda] Failed to send booking confirmation email:', err));
        }
        await logAudit({ professionalId: profile.id, entityType: 'appointment', entityId: appointment.id, action: 'create', metadata: { source: 'public_booking', seriesId: publicSeriesId, occurrences: insertedAppointments.length, serviceId, serviceName, clientName: typeof body.clientName === 'string' ? body.clientName.slice(0,100) : null }, ctx: c });
        void (async () => {
            try {
                const buyerUserId = await (await import('../messages/message-thread-context.js')).findUserIdByEmail(clientEmail2);
                if (!buyerUserId || buyerUserId === profile.userId) return;
                const { getMinimalMessageServiceDeps } = await import('../messages/message-service-factory.js');
                const { ensureAgendaAppointmentMessageThread } = await import('../messages/platform-context-threads.js');
                const notes = typeof body.clientNotes === 'string' ? body.clientNotes : null;
                await ensureAgendaAppointmentMessageThread(getMinimalMessageServiceDeps(), {
                    appointmentId: appointment.id,
                    professionalUserId: profile.userId,
                    buyerUserId,
                    initialMessage: notes,
                });
            } catch (error) {
                console.error('[agenda] No se pudo crear el hilo de mensajes:', error);
            }
        })();
        return c.json({ ok: true, appointment, appointments: insertedAppointments, seriesId: publicSeriesId, checkoutUrl });
    });

    app.get('/whatsapp/webhook', (c) => {
        const mode = c.req.query('hub.mode');
        const token = c.req.query('hub.verify_token');
        const challenge = c.req.query('hub.challenge') ?? '';
        const expected = getWhatsAppWebhookVerifyToken();
        if (!expected) return c.json({ ok: false, error: 'El webhook de WhatsApp aún no está configurado.' }, 503);
        if (mode === 'subscribe' && expected && token === expected) {
            return c.text(challenge, 200);
        }
        return c.json({ ok: false, error: 'Verificación inválida' }, 403);
    });

    app.post('/whatsapp/webhook', async (c) => {
        if (!isWhatsAppWebhookConfigured()) {
            return c.json({ ok: false, error: 'El webhook de WhatsApp aún no está configurado.' }, 503);
        }
        const rawBody = await c.req.text();
        const sig = c.req.header('x-hub-signature-256');
        if (!verifyWhatsAppWebhookSignature(rawBody, sig)) {
            return c.json({ ok: false, error: 'Firma inválida' }, 403);
        }
        let payload: unknown = null;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return c.json({ ok: false, error: 'JSON inválido' }, 400);
        }

        if (!isWhatsAppWebhookForConfiguredAssets(payload)) {
            return c.json({ ok: true, ignored: true });
        }

        const optOuts = extractWhatsAppOptOuts(payload);
        for (const optOut of optOuts) {
            const phoneNumber = normalizeWhatsAppRecipient(optOut.from);
            if (!phoneNumber) continue;
            await db.insert(agendaWhatsappOptOuts)
                .values({ phoneNumber, sourceMessageId: optOut.messageId })
                .onConflictDoUpdate({
                    target: agendaWhatsappOptOuts.phoneNumber,
                    set: { optedOutAt: new Date(), sourceMessageId: optOut.messageId },
                });
        }

        const actions = extractWhatsAppButtonActions(payload);
        let processedActions = 0;
        for (const item of actions) {
            const appt = await db.query.agendaAppointments.findFirst({
                where: eq(agendaAppointments.id, item.appointmentId),
            });
            if (
                !appt
                || !appt.whatsappReminderOptIn
                || !item.from
                || !['pending', 'confirmed'].includes(appt.status)
            ) continue;

            const sender = normalizeWhatsAppRecipient(item.from);
            const client = appt.clientId
                ? await db.query.agendaClients.findFirst({
                    where: and(
                        eq(agendaClients.id, appt.clientId),
                        eq(agendaClients.professionalId, appt.professionalId),
                    ),
                })
                : null;
            const allowedSenders = [appt.clientPhone, client?.whatsapp, client?.phone]
                .map((phone) => normalizeWhatsAppRecipient(phone))
                .filter((phone): phone is string => Boolean(phone));
            if (!sender || !allowedSenders.includes(sender)) continue;

            const prof = await db.query.agendaProfessionalProfiles.findFirst({
                where: eq(agendaProfessionalProfiles.id, appt.professionalId),
            });

            if (item.action === 'confirm') {
                if (appt.status !== 'pending') continue;
                const [updated] = await db.update(agendaAppointments)
                    .set({
                        clientConfirmedAt: new Date(),
                        clientConfirmedVia: 'whatsapp',
                        status: 'confirmed',
                        updatedAt: new Date(),
                    })
                    .where(and(eq(agendaAppointments.id, appt.id), eq(agendaAppointments.status, 'pending')))
                    .returning({ id: agendaAppointments.id });
                if (!updated) continue;
                processedActions += 1;
                if (prof) {
                    void insertPlatformNotifications({
                        userId: prof.userId,
                        vertical: 'agenda',
                        type: 'appointment.whatsapp_confirmed',
                        title: 'Cita confirmada por WhatsApp',
                        body: `${appt.clientName ?? 'Paciente'} confirmó su asistencia desde WhatsApp.`,
                        actionUrl: '/panel/agenda',
                        entityType: 'appointment',
                        entityId: appt.id,
                    }).catch(() => {});
                }
            } else if (item.action === 'cancel') {
                const [updated] = await db.update(agendaAppointments)
                    .set({
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        cancelledBy: 'client',
                        cancellationReason: 'Cancelada desde botón de WhatsApp',
                        updatedAt: new Date(),
                    })
                    .where(and(
                        eq(agendaAppointments.id, appt.id),
                        inArray(agendaAppointments.status, ['pending', 'confirmed']),
                    ))
                    .returning({ id: agendaAppointments.id });
                if (!updated) continue;
                processedActions += 1;
                if (prof) {
                    void insertPlatformNotifications({
                        userId: prof.userId,
                        vertical: 'agenda',
                        type: 'appointment.cancelled',
                        title: 'Cita cancelada por WhatsApp',
                        body: `${appt.clientName ?? 'Paciente'} canceló su cita desde WhatsApp.`,
                        actionUrl: '/panel/agenda',
                        entityType: 'appointment',
                        entityId: appt.id,
                    }).catch(() => {});
                }
            }
        }

        return c.json({ ok: true, processed: processedActions, optOuts: optOuts.length });
    });

    return app;
}
