import { Hono } from 'hono';
import type { Context } from 'hono';
import type { SQL } from 'drizzle-orm';
import { cleanupReplacedMediaUrl } from '../media/stored-object.js';
import { getPaymentById, verifyMercadoPagoWebhookSignature } from '../mercadopago/service.js';
import { ensureAgendaProfileTrial, hasAgendaFullAccess, syncAgendaProfilePublishAccess } from './plan-limits.js';
import { resolveAgendaProfessionalTimezone, syncAgendaProfileTimezoneFromOperatingLocation } from '../../lib/sync-user-timezone.js';
import { agendaOperatingPatchFromBody, operatingLocationFromAgendaProfile } from '../../lib/structured-location.js';
import {
    filterAgendaMarketplaceProfiles,
    mapAgendaProfileToMarketplaceItem,
} from './marketplace.js';
import {
    normalizeOperatorSubtype,
    operatorBrandMediaMissing,
    operatorBrandMediaPublishError,
    isOperatorSubtypeOther,
    requiresOperatorSubtypeCustom,
    resolveOperatorDisplayLabel,
    expandWeeklyRulesToDaySegments,
    BUSINESS_SCHEDULE_ALWAYS_OPEN_RULES,
    resolveBookingModality,
    bookingTermsFromRecord,
    serializeBookingTermsWrite,
    normalizeOperatorSiteLayout,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteAccent,
    OPERATOR_SITE_LAYOUTS,
    OPERATOR_SITE_COLOR_MODES,
    OPERATOR_SITE_ACCENT_COLORS,
    type OperatorTier,
} from '@simple/utils';

export interface AgendaRouterDeps {
    authUser: (c: Context) => Promise<any>;
    requireVerifiedSession: any;
    asString: (v: any) => string;
    randomUUID: () => string;
    randomBytes: (n: number) => Buffer;
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
    };
    dbHelpers: { eq: any; and: any; or: any; asc: any; desc: any; gte: any; lte: any; lt: any; inArray: any; isNull: any };
    getAgendaProfile: (userId: string) => Promise<any>;
    ensureAgendaProfile: (user: any) => Promise<any>;
    isFreePlan: (profile: any, role?: string) => boolean;
    checkClientLimit: (profileId: string, additionalClients?: number) => Promise<string | null>;
    checkAppointmentLimit: (profileId: string, additionalAppointments?: number) => Promise<string | null>;
    generateSlots: (rules: any[], duration: number, dayStart: Date, existing: any[], blocked: any[], tz: string) => any[];
    isValidSlug: (slug: string) => { ok: boolean; error?: string };
    RESERVED_SLUGS: Set<string>;
    logAudit: (opts: any) => Promise<void>;
    logNotification: (opts: any) => Promise<void>;
    syncToGoogleCalendar: (profile: any, appt: any, action: 'create' | 'update' | 'delete') => Promise<any>;
    sendPushToUser: (userId: string, payload: any) => Promise<void>;
    sendBookingConfirmationEmail: (email: string, opts: any) => Promise<void>;
    sendAppointmentReminderEmail: (email: string, opts: any) => Promise<void>;
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
        city: profile.city,
        countryCode: operatingLocation.countryCode,
        region: profile.region,
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
        paymentMethods: {
            requiresAdvancePayment: profile.requiresAdvancePayment,
            acceptsMp: !!profile.acceptsMp,
            acceptsTransfer: !!profile.acceptsTransfer,
            acceptsPaymentLink: !!profile.acceptsPaymentLink,
            mpConnected: !!(profile.acceptsMp && profile.mpAccessToken),
            paymentLinkUrl: profile.acceptsPaymentLink ? (profile.paymentLinkUrl ?? null) : null,
            bankTransferData: profile.acceptsTransfer ? (profile.bankTransferData ?? null) : null,
        },
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
            accentColor: normalizeOperatorSiteAccent(profile.operatorSiteAccentColor),
        },
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

export function createAgendaRouter(deps: AgendaRouterDeps) {
    const {
        authUser, requireVerifiedSession, asString, randomUUID, randomBytes,
        db, sql, tables, dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        getAgendaProfile, ensureAgendaProfile, isFreePlan, checkClientLimit, checkAppointmentLimit, generateSlots,
        isValidSlug, logAudit, logNotification, syncToGoogleCalendar, sendPushToUser,
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
    } = tables;

    function getGoogleOAuth2Client() {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/google-calendar/callback`,
        );
    }

    const app = new Hono();

    // ── Profile ───────────────────────────────────────────────────────────────
    app.get('/profile', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        let profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        profile = await ensureAgendaProfileTrial(profile);
        profile = await syncAgendaProfilePublishAccess(profile, user.role);
        const operationalTz = await resolveAgendaProfessionalTimezone(user.id, profile as Record<string, unknown>);
        return c.json({
            ok: true,
            profile: {
                ...profile,
                bookingTermsText: bookingTermsFromRecord(profile),
                timezone: operationalTz,
                operatingLocation: operatingLocationFromAgendaProfile(profile),
            },
        });
    });

    app.patch('/profile', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if ('isPublished' in body && body.isPublished === true && !hasAgendaFullAccess(profile, user.role)) {
            return c.json(
                { ok: false, error: 'Activa Pro o mantén tu prueba activa para publicar tu perfil.' },
                403,
            );
        }
        if ('isPublished' in body && body.isPublished === true) {
            const nextAvatarUrl = 'avatarUrl' in body
                ? (body.avatarUrl === null
                    ? null
                    : typeof body.avatarUrl === 'string'
                      ? body.avatarUrl.trim() || null
                      : profile.avatarUrl ?? null)
                : profile.avatarUrl ?? null;
            const nextCoverUrl = 'coverUrl' in body
                ? (body.coverUrl === null
                    ? null
                    : typeof body.coverUrl === 'string'
                      ? body.coverUrl.trim() || null
                      : profile.coverUrl ?? null)
                : profile.coverUrl ?? null;
            const mediaMissing = operatorBrandMediaMissing({
                logoUrl: nextAvatarUrl,
                coverUrl: nextCoverUrl,
            });
            if (mediaMissing.length > 0) {
                return c.json({ ok: false, error: operatorBrandMediaPublishError(mediaMissing) }, 400);
            }
        }
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if ('bookingTermsText' in body) {
            patch.encuadre = serializeBookingTermsWrite(
                typeof body.bookingTermsText === 'string' ? body.bookingTermsText : null,
            ).bookingTermsText;
        }
        const allowed = ['displayName','profession','headline','bio','avatarUrl','address','city','region','countryCode','regionId','localityId','serviceLocalities','servesOnline','servesPresential','publicEmail','publicPhone','publicWhatsapp','isPublished','slug','currency','bookingWindowDays','cancellationHours','confirmationMode','encuadre','requiresAdvancePayment','advancePaymentInstructions','acceptsTransfer','acceptsMp','acceptsPaymentLink','paymentLinkUrl','bankTransferData','coverUrl','websiteUrl','instagramUrl','facebookUrl','linkedinUrl','tiktokUrl','youtubeUrl','twitterUrl','allowsRecurrentBooking','accountKind','operatorSubtype','operatorSiteLayout','operatorSiteColorMode','operatorSiteAccentColor'] as const;
        for (const key of allowed) {
            if (key === 'avatarUrl' || key === 'coverUrl' || key === 'accountKind' || key === 'operatorSubtype' || key === 'profession') continue;
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
            const accent = typeof body.operatorSiteAccentColor === 'string' ? body.operatorSiteAccentColor : '';
            if (!OPERATOR_SITE_ACCENT_COLORS.includes(accent as typeof OPERATOR_SITE_ACCENT_COLORS[number])) {
                return c.json({ ok: false, error: 'Color de acento no válido.' }, 400);
            }
            patch.operatorSiteAccentColor = accent;
        }
        if ('accountKind' in body || 'operatorSubtype' in body || 'profession' in body) {
            const rawKind = 'accountKind' in body ? body.accountKind : profile.accountKind;
            const nextKind: OperatorTier =
                rawKind === 'independent' || rawKind === 'company' || rawKind === 'individual'
                    ? rawKind
                    : 'individual';
            const rawSubtype = 'operatorSubtype' in body ? body.operatorSubtype : profile.operatorSubtype;
            const nextSubtype = normalizeOperatorSubtype('agenda', nextKind, typeof rawSubtype === 'string' ? rawSubtype : null);
            const customProfession = typeof body.profession === 'string' ? body.profession.trim() : '';
            patch.accountKind = nextKind;
            patch.operatorSubtype = nextSubtype;
            if (isOperatorSubtypeOther(nextSubtype)) {
                patch.profession = customProfession || profile.profession || null;
            } else {
                patch.profession = resolveOperatorDisplayLabel('agenda', nextKind, nextSubtype);
            }
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
            await cleanupReplacedMediaUrl(profile.avatarUrl, nextAvatarUrl);
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
            await cleanupReplacedMediaUrl(profile.coverUrl, nextCoverUrl);
            patch.coverUrl = nextCoverUrl;
        }
        const [updated] = await db.update(agendaProfessionalProfiles).set(patch).where(eq(agendaProfessionalProfiles.id, profile.id)).returning();
        const synced = updated
            ? await syncAgendaProfilePublishAccess(updated, user.role)
            : updated;
        if ('isPublished' in body && body.isPublished !== profile.isPublished) await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: body.isPublished ? 'publish' : 'unpublish', ctx: c });
        if (synced && !synced.isPublished && profile.isPublished && !('isPublished' in body)) {
            await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: 'unpublish', ctx: c });
        }
        if ('slug' in body && patch.slug && patch.slug !== profile.slug) await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'profile', entityId: profile.id, action: 'slug_change', metadata: { from: profile.slug, to: patch.slug }, ctx: c });
        await syncAgendaProfileTimezoneFromOperatingLocation(user.id, synced as Record<string, unknown>);
        const operationalTz = await resolveAgendaProfessionalTimezone(user.id, synced as Record<string, unknown>);
        return c.json({
            ok: true,
            profile: {
                ...synced,
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
        const profile = await getAgendaProfile(user.id);
        const isMine = profile && existing.length > 0 && existing[0].id === profile.id;
        return c.json({ ok: true, available: existing.length === 0 || isMine });
    });

    // ── Services ──────────────────────────────────────────────────────────────
    app.get('/services', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
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
        const [service] = await db.insert(agendaServices).values({
            professionalId: profile.id,
            name: String(body.name),
            description: typeof body.description === 'string' ? body.description : null,
            durationMinutes,
            price: typeof body.price === 'string' && body.price ? body.price : (typeof body.price === 'number' ? String(body.price) : null),
            currency: typeof body.currency === 'string' ? body.currency : profile.currency,
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
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: service.id, action: 'create', metadata: { name: service.name, kind: service.kind }, ctx: c });
        return c.json({ ok: true, service });
    });

    app.put('/services/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const [existing] = await db.select().from(agendaServices).where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id))).limit(1);
        if (!existing) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
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
        if ('startsAt' in body) {
            if (!body.startsAt) patch.startsAt = null;
            else {
                const d = new Date(String(body.startsAt));
                if (Number.isNaN(d.getTime())) return c.json({ ok: false, error: 'Fecha inválida.' }, 400);
                patch.startsAt = d;
            }
        }
        if ('imageUrl' in body) {
            const nextImageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null;
            await cleanupReplacedMediaUrl(existing.imageUrl, nextImageUrl);
            patch.imageUrl = nextImageUrl;
        }
        if ('preconsultFields' in body && (existing.kind ?? 'appointment') === 'appointment') {
            patch.preconsultFields = normalizePreconsultFields(body.preconsultFields, randomUUID);
        }
        const nextOnline = 'isOnline' in patch ? patch.isOnline === true : existing.isOnline !== false;
        const nextPresential = 'isPresential' in patch ? patch.isPresential === true : existing.isPresential === true;
        if (!nextOnline && !nextPresential) return c.json({ ok: false, error: 'Selecciona al menos una modalidad.' }, 400);
        const nextKind = typeof patch.kind === 'string' ? patch.kind : (existing.kind ?? 'appointment');
        const nextLocation = 'location' in patch ? patch.location : existing.location;
        if (nextKind === 'group_event' && nextPresential && !nextLocation) {
            return c.json({ ok: false, error: 'Indica la dirección del evento.' }, 400);
        }
        const nextDuration = 'durationMinutes' in patch ? Number(patch.durationMinutes) : existing.durationMinutes;
        if (Number.isFinite(nextDuration) && nextDuration < 15) {
            return c.json({ ok: false, error: 'La duración mínima es 15 minutos.' }, 400);
        }
        const [updated] = await db.update(agendaServices).set(patch).where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Servicio no encontrado' }, 404);
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: updated.id, action: 'update', metadata: { fields: Object.keys(body) }, ctx: c });
        return c.json({ ok: true, service: updated });
    });

    app.delete('/services/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        await db.update(agendaServices).set({ isActive: false, updatedAt: new Date() }).where(and(eq(agendaServices.id, id), eq(agendaServices.professionalId, profile.id)));
        await logAudit({ professionalId: profile.id, userId: user.id, entityType: 'service', entityId: id, action: 'delete', ctx: c });
        return c.json({ ok: true });
    });

    // ── Availability ──────────────────────────────────────────────────────────
    app.post('/availability/rules', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const [rule] = await db.insert(agendaAvailabilityRules).values({ professionalId: profile.id, dayOfWeek: Number(body.dayOfWeek), startTime: String(body.startTime ?? '09:00'), endTime: String(body.endTime ?? '18:00'), breakStart: typeof body.breakStart === 'string' ? body.breakStart : null, breakEnd: typeof body.breakEnd === 'string' ? body.breakEnd : null, isActive: body.isActive !== false }).returning();
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
        const [updated] = await db.update(agendaAvailabilityRules).set(patch).where(and(eq(agendaAvailabilityRules.id, id), eq(agendaAvailabilityRules.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Regla no encontrada' }, 404);
        return c.json({ ok: true, rule: updated });
    });

    app.delete('/availability/rules/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const id = c.req.param('id') ?? '';
        await db.delete(agendaAvailabilityRules).where(and(eq(agendaAvailabilityRules.id, id), eq(agendaAvailabilityRules.professionalId, profile.id)));
        return c.json({ ok: true });
    });

    app.post('/availability/blocked-slots', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const [slot] = await db.insert(agendaBlockedSlots).values({ professionalId: profile.id, startsAt: new Date(String(body.startsAt)), endsAt: new Date(String(body.endsAt)), reason: typeof body.reason === 'string' ? body.reason : null }).returning();
        return c.json({ ok: true, slot });
    });

    app.delete('/availability/blocked-slots/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await ensureAgendaProfile(user);
        const id = c.req.param('id') ?? '';
        await db.delete(agendaBlockedSlots).where(and(eq(agendaBlockedSlots.id, id), eq(agendaBlockedSlots.professionalId, profile.id)));
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

        if (typeof body.alwaysOpen === 'boolean' || body.scheduleNote !== undefined) {
            await db.update(agendaProfessionalProfiles).set({
                ...(typeof body.alwaysOpen === 'boolean' ? { alwaysOpen: body.alwaysOpen } : {}),
                ...(body.scheduleNote !== undefined
                    ? { scheduleNote: typeof body.scheduleNote === 'string' && body.scheduleNote.trim()
                        ? body.scheduleNote.trim().slice(0, 255)
                        : null }
                    : {}),
                updatedAt: new Date(),
            }).where(eq(agendaProfessionalProfiles.id, profile.id));
        }

        await db.delete(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, profile.id));

        if (rulesInput.length > 0) {
            await db.insert(agendaAvailabilityRules).values(
                rulesInput.map((raw) => {
                    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
                    return {
                        professionalId: profile.id,
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

        const [updatedProfile] = await db
            .select({
                alwaysOpen: agendaProfessionalProfiles.alwaysOpen,
                scheduleNote: agendaProfessionalProfiles.scheduleNote,
            })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.id, profile.id))
            .limit(1);
        const rules = await db
            .select()
            .from(agendaAvailabilityRules)
            .where(eq(agendaAvailabilityRules.professionalId, profile.id))
            .orderBy(asc(agendaAvailabilityRules.dayOfWeek));
        return c.json({
            ok: true,
            rules,
            alwaysOpen: Boolean(updatedProfile?.alwaysOpen),
            scheduleNote: updatedProfile?.scheduleNote ?? null,
        });
    });

    app.get('/availability', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, locations: [] });
        const locations = await db.select().from(agendaLocations).where(eq(agendaLocations.professionalId, profile.id)).orderBy(desc(agendaLocations.isDefault), asc(agendaLocations.position), asc(agendaLocations.createdAt));
        return c.json({ ok: true, locations });
    });

    app.post('/locations', requireVerifiedSession, async (c) => {
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
        if (isDefault) await db.update(agendaLocations).set({ isDefault: false, updatedAt: new Date() }).where(eq(agendaLocations.professionalId, profile.id));
        const [location] = await db.insert(agendaLocations).values({ professionalId: profile.id, name, addressLine, city: typeof body.city === 'string' ? body.city : null, region: typeof body.region === 'string' ? body.region : null, notes: typeof body.notes === 'string' ? body.notes : null, googleMapsUrl: typeof body.googleMapsUrl === 'string' ? body.googleMapsUrl : null, isDefault, isActive: body.isActive !== false }).returning();
        return c.json({ ok: true, location });
    });

    app.put('/locations/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n) return c.json({ ok: false, error: 'El nombre de la consulta es requerido.' }, 400); patch.name = n; }
        if (typeof body.addressLine === 'string') { const a = body.addressLine.trim(); if (!a) return c.json({ ok: false, error: 'La dirección es requerida.' }, 400); patch.addressLine = a; }
        for (const key of ['city','region','notes','googleMapsUrl'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        if ('isActive' in body) patch.isActive = body.isActive !== false;
        if (body.isDefault === true) { await db.update(agendaLocations).set({ isDefault: false, updatedAt: new Date() }).where(and(eq(agendaLocations.professionalId, profile.id), sql`id <> ${id}`)); patch.isDefault = true; } else if (body.isDefault === false) { patch.isDefault = false; }
        const [updated] = await db.update(agendaLocations).set(patch).where(and(eq(agendaLocations.id, id), eq(agendaLocations.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Consulta no encontrada.' }, 404);
        return c.json({ ok: true, location: updated });
    });

    app.delete('/locations/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        await db.delete(agendaLocations).where(and(eq(agendaLocations.id, id), eq(agendaLocations.professionalId, profile.id)));
        return c.json({ ok: true });
    });

    // ── Clients ───────────────────────────────────────────────────────────────
    app.get('/clients', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile, user.role)) { const limitError = await checkClientLimit(profile.id); if (limitError) return c.json({ ok: false, error: limitError }, 403); }
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.firstName) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        const [client] = await db.insert(agendaClients).values({ professionalId: profile.id, firstName: String(body.firstName), lastName: typeof body.lastName === 'string' ? body.lastName || null : null, email: typeof body.email === 'string' ? body.email || null : null, phone: typeof body.phone === 'string' ? body.phone || null : null, whatsapp: typeof body.whatsapp === 'string' ? body.whatsapp || null : null, rut: typeof body.rut === 'string' ? body.rut || null : null, dateOfBirth: typeof body.dateOfBirth === 'string' ? body.dateOfBirth || null : null, gender: typeof body.gender === 'string' ? body.gender || null : null, occupation: typeof body.occupation === 'string' ? body.occupation || null : null, city: typeof body.city === 'string' ? body.city || null : null, referredBy: typeof body.referredBy === 'string' ? body.referredBy || null : null, internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes || null : null }).returning();
        return c.json({ ok: true, client });
    });

    app.get('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const appointments = await db.select().from(agendaAppointments).where(and(eq(agendaAppointments.clientId, id), eq(agendaAppointments.professionalId, profile.id))).orderBy(desc(agendaAppointments.startsAt));
        const apptIds = appointments.map((a: any) => a.id);
        const sessionNotes = apptIds.length > 0 ? await db.select().from(agendaSessionNotes).where(inArray(agendaSessionNotes.appointmentId, apptIds)) : [];
        const notesByAppt: Record<string, string> = {};
        for (const n of sessionNotes) notesByAppt[n.appointmentId] = n.content;
        const tagRows = await db.select({ id: agendaClientTags.id, name: agendaClientTags.name, color: agendaClientTags.color }).from(agendaClientTagAssignments).innerJoin(agendaClientTags, eq(agendaClientTagAssignments.tagId, agendaClientTags.id)).where(eq(agendaClientTagAssignments.clientId, id));
        return c.json({ ok: true, client: { ...client, tags: tagRows }, appointments: appointments.map((a: any) => ({ ...a, sessionNote: notesByAppt[a.id] ?? null })) });
    });

    app.put('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['firstName','lastName','email','phone','whatsapp','rut','dateOfBirth','gender','occupation','address','city','emergencyContactName','emergencyContactPhone','referredBy','internalNotes','status'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        const [updated] = await db.update(agendaClients).set(patch).where(and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        return c.json({ ok: true, client: updated });
    });

    app.delete('/clients/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaClients).where(and(eq(agendaClients.id, id), eq(agendaClients.professionalId, profile.id))).returning({ id: agendaClients.id });
        if (!deleted) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Client Tags ────────────────────────────────────────────────────────────
    app.get('/client-tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, tags: [] });
        const tags = await db.select().from(agendaClientTags).where(eq(agendaClientTags.professionalId, profile.id)).orderBy(asc(agendaClientTags.position), asc(agendaClientTags.name));
        return c.json({ ok: true, tags });
    });

    app.post('/client-tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) return c.json({ ok: false, error: 'El nombre de la etiqueta es requerido' }, 400);
        if (name.length > 60) return c.json({ ok: false, error: 'Máx. 60 caracteres' }, 400);
        try {
            const [tag] = await db.insert(agendaClientTags).values({ professionalId: profile.id, name, color: typeof body.color === 'string' ? body.color || null : null, position: typeof body.position === 'number' ? body.position : 0 }).returning();
            return c.json({ ok: true, tag });
        } catch (err) { const msg = err instanceof Error ? err.message : String(err); if (msg.includes('unique')) return c.json({ ok: false, error: 'Ya existe una etiqueta con ese nombre.' }, 409); throw err; }
    });

    app.put('/client-tags/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n || n.length > 60) return c.json({ ok: false, error: 'Nombre inválido' }, 400); patch.name = n; }
        if ('color' in body) patch.color = typeof body.color === 'string' ? body.color || null : null;
        if (typeof body.position === 'number') patch.position = body.position;
        const [updated] = await db.update(agendaClientTags).set(patch).where(and(eq(agendaClientTags.id, id), eq(agendaClientTags.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Etiqueta no encontrada' }, 404);
        return c.json({ ok: true, tag: updated });
    });

    app.delete('/client-tags/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const tag = await db.query.agendaClientTags.findFirst({ where: and(eq(agendaClientTags.id, id), eq(agendaClientTags.professionalId, profile.id)) });
        if (!tag) return c.json({ ok: false, error: 'Etiqueta no encontrada' }, 404);
        await db.delete(agendaClientTagAssignments).where(eq(agendaClientTagAssignments.tagId, id));
        await db.delete(agendaClientTags).where(eq(agendaClientTags.id, id));
        return c.json({ ok: true });
    });

    app.post('/clients/:id/tags', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const tagId = typeof body.tagId === 'string' ? body.tagId : '';
        if (!tagId) return c.json({ ok: false, error: 'tagId requerido' }, 400);
        const [cl, tag] = await Promise.all([ db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) }), db.query.agendaClientTags.findFirst({ where: and(eq(agendaClientTags.id, tagId), eq(agendaClientTags.professionalId, profile.id)) }) ]);
        if (!cl || !tag) return c.json({ ok: false, error: 'Cliente o etiqueta no encontrado' }, 404);
        await db.insert(agendaClientTagAssignments).values({ clientId, tagId }).onConflictDoNothing();
        return c.json({ ok: true });
    });

    app.delete('/clients/:id/tags/:tagId', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const tagId = c.req.param('tagId') ?? '';
        const cl = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
        if (!cl) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        await db.delete(agendaClientTagAssignments).where(and(eq(agendaClientTagAssignments.clientId, clientId), eq(agendaClientTagAssignments.tagId, tagId)));
        return c.json({ ok: true });
    });

    // ── Client Attachments ────────────────────────────────────────────────────
    app.get('/clients/:id/attachments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, attachments: [] });
        const clientId = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const attachments = await db.select().from(agendaClientAttachments).where(eq(agendaClientAttachments.clientId, clientId)).orderBy(desc(agendaClientAttachments.uploadedAt));
        return c.json({ ok: true, attachments });
    });

    app.post('/clients/:id/attachments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const url = typeof body.url === 'string' ? body.url.trim() : '';
        const rawKind = typeof body.kind === 'string' ? body.kind : 'document';
        const kind = (ATTACHMENT_KINDS as readonly string[]).includes(rawKind) ? (rawKind as typeof ATTACHMENT_KINDS[number]) : 'document';
        if (!name) return c.json({ ok: false, error: 'El nombre es requerido' }, 400);
        if (!url) return c.json({ ok: false, error: 'El archivo es requerido' }, 400);
        const [attachment] = await db.insert(agendaClientAttachments).values({ professionalId: profile.id, clientId, name, url, mimeType: typeof body.mimeType === 'string' ? body.mimeType : null, sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null, kind }).returning();
        return c.json({ ok: true, attachment });
    });

    app.delete('/clients/:id/attachments/:aid', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const clientId = c.req.param('id') ?? '';
        const attachmentId = c.req.param('aid') ?? '';
        const [deleted] = await db.delete(agendaClientAttachments).where(and(eq(agendaClientAttachments.id, attachmentId), eq(agendaClientAttachments.clientId, clientId), eq(agendaClientAttachments.professionalId, profile.id))).returning({ id: agendaClientAttachments.id });
        if (!deleted) return c.json({ ok: false, error: 'Archivo no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Session Notes ─────────────────────────────────────────────────────────
    app.get('/notes/:appointmentId', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const appointmentId = c.req.param('appointmentId') ?? '';
        const note = await db.query.agendaSessionNotes.findFirst({ where: and(eq(agendaSessionNotes.appointmentId, appointmentId), eq(agendaSessionNotes.professionalId, profile.id)) });
        return c.json({ ok: true, note: note ?? null });
    });

    app.post('/notes', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.appointmentId || !body.content) return c.json({ ok: false, error: 'appointmentId y content requeridos' }, 400);
        const appt = await db.query.agendaAppointments.findFirst({ where: and(eq(agendaAppointments.id, String(body.appointmentId)), eq(agendaAppointments.professionalId, profile.id)) });
        if (!appt) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        const existing = await db.query.agendaSessionNotes.findFirst({ where: and(eq(agendaSessionNotes.appointmentId, String(body.appointmentId)), eq(agendaSessionNotes.professionalId, profile.id)) });
        let note;
        if (existing) { const [updated] = await db.update(agendaSessionNotes).set({ content: String(body.content), updatedAt: new Date() }).where(eq(agendaSessionNotes.id, existing.id)).returning(); note = updated; }
        else { const [created] = await db.insert(agendaSessionNotes).values({ appointmentId: String(body.appointmentId), professionalId: profile.id, clientId: appt.clientId ?? null, content: String(body.content) }).returning(); note = created; }
        return c.json({ ok: true, note });
    });

    // ── Appointments ──────────────────────────────────────────────────────────
    app.get('/appointments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.startsAt) return c.json({ ok: false, error: 'Fecha de inicio requerida' }, 400);
        const durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60;
        if (durationMinutes < 15) return c.json({ ok: false, error: 'La duración mínima es 15 minutos.' }, 400);
        const startsAt = new Date(String(body.startsAt));
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const rawFreq = typeof body.recurrenceFrequency === 'string' ? body.recurrenceFrequency : null;
        const frequency: 'weekly'|'biweekly'|'monthly'|null = rawFreq === 'weekly' || rawFreq === 'biweekly' || rawFreq === 'monthly' ? rawFreq : null;
        const legacyRepeat = typeof body.repeatWeekly === 'number' && body.repeatWeekly > 0 ? Math.min(body.repeatWeekly, 52) : 0;
        const recurrenceCount = typeof body.recurrenceCount === 'number' && body.recurrenceCount > 1 ? Math.min(body.recurrenceCount, 52) : (frequency ? 1 : 0);
        const effectiveFrequency = frequency ?? (legacyRepeat > 0 ? 'weekly' as const : null);
        const totalOccurrences = effectiveFrequency ? (frequency ? recurrenceCount : legacyRepeat + 1) : 1;
        if (isFreePlan(profile, user.role)) { const le = await checkAppointmentLimit(profile.id, totalOccurrences); if (le) return c.json({ ok: false, error: le }, 403); }
        const seriesId = totalOccurrences > 1 ? randomUUID() : null;
        const appointmentsList: any[] = [];
        const clientPackId = typeof body.clientPackId === 'string' && body.clientPackId ? body.clientPackId : null;
        let clientPack: any = null;
        if (clientPackId) {
            const bClientId = typeof body.clientId === 'string' ? body.clientId : null;
            if (!bClientId) return c.json({ ok: false, error: 'Para usar un bono, selecciona primero un cliente.' }, 400);
            clientPack = await db.query.agendaClientPacks.findFirst({ where: and(eq(agendaClientPacks.id, clientPackId), eq(agendaClientPacks.professionalId, profile.id), eq(agendaClientPacks.clientId, bClientId)) }) ?? null;
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
        for (let i = 0; i < totalOccurrences; i++) {
            const occStart = addOffset(startsAt, i, effectiveFrequency);
            const occEnd = addOffset(endsAt, i, effectiveFrequency);
            const [appt] = await db.insert(agendaAppointments).values({ professionalId: profile.id, serviceId: typeof body.serviceId === 'string' ? body.serviceId||null : null, clientId: typeof body.clientId === 'string' ? body.clientId||null : null, clientName: typeof body.clientName === 'string' ? body.clientName||null : null, clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail||null : null, clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone||null : null, startsAt: occStart, endsAt: occEnd, durationMinutes, modality: bookingModality, location: typeof body.location === 'string' ? body.location||null : null, status: 'confirmed', price: clientPack ? null : (typeof body.price === 'string' && body.price ? body.price : null), currency: profile.currency, internalNotes: typeof body.internalNotes === 'string' ? body.internalNotes||null : null, seriesId, recurrenceFrequency: seriesId ? effectiveFrequency : null, clientPackId: clientPack?.id ?? null }).returning();
            appointmentsList.push(appt);
            if (i === 0) { const sr = await syncToGoogleCalendar(profile, { ...appt, googleEventId: null, modality: appt.modality }, 'create'); if (sr?.eventId) await db.update(agendaAppointments).set({ googleEventId: sr.eventId }).where(eq(agendaAppointments.id, appt.id)); }
        }
        if (clientPack) { const nu = clientPack.sessionsUsed + totalOccurrences; await db.update(agendaClientPacks).set({ sessionsUsed: nu, status: nu >= clientPack.sessionsTotal ? 'completed' : clientPack.status, updatedAt: new Date() }).where(eq(agendaClientPacks.id, clientPack.id)); }
        const firstAppt = appointmentsList[0];
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
        return c.json({ ok: true, appointment: appointmentsList[0], appointments: appointmentsList });
    });

    app.put('/appointments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (body.startsAt) { const s = new Date(String(body.startsAt)); const dur = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60; patch.startsAt = s; patch.endsAt = new Date(s.getTime() + dur * 60_000); patch.durationMinutes = dur; } else if (body.durationMinutes) { patch.durationMinutes = body.durationMinutes; }
        for (const key of ['serviceId','clientId','clientName','clientEmail','clientPhone','modality','price','internalNotes'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        const [updated] = await db.update(agendaAppointments).set(patch).where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        void syncToGoogleCalendar(profile, updated, 'update');
        return c.json({ ok: true, appointment: updated });
    });

    app.patch('/appointments/:id/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const status = String(body.status ?? '');
        if (!['pending','confirmed','completed','cancelled','no_show'].includes(status)) return c.json({ ok: false, error: 'Estado inválido' }, 400);
        const patch: Record<string, unknown> = { status, updatedAt: new Date() };
        if (status === 'cancelled') { patch.cancelledAt = new Date(); patch.cancelledBy = 'professional'; if (typeof body.cancellationReason === 'string') patch.cancellationReason = body.cancellationReason; }
        const prev = await db.query.agendaAppointments.findFirst({ where: and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id)) });
        const [updated] = await db.update(agendaAppointments).set(patch).where(and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        if (status === 'cancelled' && prev && prev.status !== 'cancelled' && prev.clientPackId) {
            const pack = await db.query.agendaClientPacks.findFirst({ where: eq(agendaClientPacks.id, prev.clientPackId) });
            if (pack && pack.sessionsUsed > 0) { const nu = Math.max(0, pack.sessionsUsed - 1); await db.update(agendaClientPacks).set({ sessionsUsed: nu, status: pack.status === 'completed' && nu < pack.sessionsTotal ? 'active' : pack.status, updatedAt: new Date() }).where(eq(agendaClientPacks.id, pack.id)); }
        }
        if (status === 'cancelled') { void syncToGoogleCalendar(profile, updated, 'delete'); }
        else { void syncToGoogleCalendar(profile, updated, 'update'); }
        if (status === 'completed') void ensureNpsForAppointment(profile.id, updated.id, updated.clientId).catch(() => {});
        return c.json({ ok: true, appointment: updated });
    });

    app.post('/appointments/:id/cancel-series', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const scope = body.scope === 'all' ? 'all' : 'future';
        const anchor = await db.query.agendaAppointments.findFirst({ where: and(eq(agendaAppointments.id, id), eq(agendaAppointments.professionalId, profile.id)) });
        if (!anchor) return c.json({ ok: false, error: 'Cita no encontrada' }, 404);
        if (!anchor.seriesId) return c.json({ ok: false, error: 'La cita no pertenece a una serie' }, 400);
        const conditions: SQL[] = [eq(agendaAppointments.professionalId, profile.id), eq(agendaAppointments.seriesId, anchor.seriesId), or(eq(agendaAppointments.status, 'confirmed'), eq(agendaAppointments.status, 'pending'))];
        if (scope === 'future') conditions.push(gte(agendaAppointments.startsAt, anchor.startsAt));
        const cancelled = await db.update(agendaAppointments).set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'professional', cancellationReason: typeof body.cancellationReason === 'string' ? body.cancellationReason : null, updatedAt: new Date() }).where(and(...conditions)).returning();
        for (const appt of cancelled) void syncToGoogleCalendar(profile, appt, 'delete');
        return c.json({ ok: true, count: cancelled.length, cancelled });
    });

    // ── Stats & Analytics ─────────────────────────────────────────────────────
    app.get('/stats', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        return c.json({ ok:true, stats:{ todayCount:Number(todayAppts[0]?.count??0), activeClients:Number(activeClientsResult[0]?.count??0), pendingPayments:Number(pendingPaymentsResult[0]?.total??0), nextAppointment:nextAppt[0]??null, weeklyData, thisMonthRevenue:Number(thisMonthPaid[0]?.total??0), lastMonthRevenue:Number(lastMonthPaid[0]?.total??0), thisMonthAppointments:Number(thisMonthApptCount[0]?.count??0), hasServices:Number(servicesCount[0]?.count??0)>0, hasRules:Number(rulesCount[0]?.count??0)>0, hasLocations:Number(locationsCount[0]?.count??0)>0 } });
    });

    app.get('/analytics', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, responses: [] });
        const rows = await db.select({ id:agendaNpsResponses.id, score:agendaNpsResponses.score, comment:agendaNpsResponses.comment, submittedAt:agendaNpsResponses.submittedAt, sentAt:agendaNpsResponses.sentAt, appointmentId:agendaNpsResponses.appointmentId, clientName:agendaAppointments.clientName }).from(agendaNpsResponses).leftJoin(agendaAppointments,eq(agendaNpsResponses.appointmentId,agendaAppointments.id)).where(and(eq(agendaNpsResponses.professionalId,profile.id),sql`${agendaNpsResponses.submittedAt} IS NOT NULL`)).orderBy(desc(agendaNpsResponses.submittedAt)).limit(100);
        return c.json({ ok: true, responses: rows });
    });

    app.post('/nps/for-appointment', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, referrals: [], stats: { total:0, converted:0, pending:0, rewarded:0 } });
        const rows = await db.select({ id:agendaReferrals.id, referrerClientId:agendaReferrals.referrerClientId, refereeClientId:agendaReferrals.refereeClientId, refereeName:agendaReferrals.refereeName, refereePhone:agendaReferrals.refereePhone, status:agendaReferrals.status, rewardNote:agendaReferrals.rewardNote, createdAt:agendaReferrals.createdAt, convertedAt:agendaReferrals.convertedAt, rewardedAt:agendaReferrals.rewardedAt, referrerFirstName:agendaClients.firstName, referrerLastName:agendaClients.lastName }).from(agendaReferrals).leftJoin(agendaClients,eq(agendaReferrals.referrerClientId,agendaClients.id)).where(eq(agendaReferrals.professionalId,profile.id)).orderBy(desc(agendaReferrals.createdAt)).limit(200);
        const stats={total:rows.length,converted:0,pending:0,rewarded:0};
        for (const r of rows) { if(r.status==='converted') stats.converted++; else if(r.status==='pending') stats.pending++; else if(r.status==='rewarded') stats.rewarded++; }
        return c.json({ ok: true, referrals: rows, stats });
    });

    app.post('/referrals', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const referrerClientId = typeof body.referrerClientId === 'string' ? body.referrerClientId : '';
        if (!referrerClientId) return c.json({ ok: false, error: 'Selecciona quién refirió' }, 400);
        const referrer = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id,referrerClientId),eq(agendaClients.professionalId,profile.id)) });
        if (!referrer) return c.json({ ok: false, error: 'Paciente no encontrado' }, 404);
        const refereeName = typeof body.refereeName === 'string' ? body.refereeName.trim().slice(0,200) : '';
        const refereeClientId = typeof body.refereeClientId === 'string' && body.refereeClientId ? body.refereeClientId : null;
        if (!refereeName && !refereeClientId) return c.json({ ok: false, error: 'Indica el nombre del referido' }, 400);
        const [created] = await db.insert(agendaReferrals).values({ professionalId:profile.id, referrerClientId, refereeClientId, refereeName:refereeName||null, refereePhone:typeof body.refereePhone==='string'?body.refereePhone.trim().slice(0,40):null, rewardNote:typeof body.rewardNote==='string'?body.rewardNote.slice(0,500):null }).returning();
        return c.json({ ok: true, referral: created });
    });

    app.patch('/referrals/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        if (typeof body.status==='string' && (REFERRAL_STATUSES as readonly string[]).includes(body.status)) { patch.status=body.status; if(body.status==='converted') patch.convertedAt=new Date(); else if(body.status==='rewarded') patch.rewardedAt=new Date(); }
        if (typeof body.rewardNote==='string') patch.rewardNote=body.rewardNote.slice(0,500);
        if (typeof body.refereeClientId==='string') patch.refereeClientId=body.refereeClientId||null;
        if (Object.keys(patch).length===0) return c.json({ ok: false, error: 'Sin cambios' }, 400);
        const [updated] = await db.update(agendaReferrals).set(patch).where(and(eq(agendaReferrals.id,id),eq(agendaReferrals.professionalId,profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Referido no encontrado' }, 404);
        return c.json({ ok: true, referral: updated });
    });

    app.delete('/referrals/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaReferrals).where(and(eq(agendaReferrals.id,id),eq(agendaReferrals.professionalId,profile.id))).returning();
        if (!deleted) return c.json({ ok: false, error: 'Referido no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Promotions ────────────────────────────────────────────────────────────
    app.get('/promotions', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const rows = await db.select().from(agendaPromotions).where(eq(agendaPromotions.professionalId, profile.id)).orderBy(desc(agendaPromotions.createdAt));
        return c.json({ ok: true, promotions: rows });
    });

    app.post('/promotions', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const label = typeof body.label === 'string' ? body.label.trim() : '';
        if (!label) return c.json({ ok: false, error: 'Falta el nombre de la promoción.' }, 400);
        const discountType = typeof body.discountType === 'string' && PROMOTION_DISCOUNT_TYPES.has(body.discountType) ? body.discountType : 'percent';
        const discountValue = parseOptionalNumber(body.discountValue);
        if (discountValue === null || discountValue <= 0) return c.json({ ok: false, error: 'El descuento debe ser mayor a 0.' }, 400);
        if (discountType === 'percent' && discountValue > 100) return c.json({ ok: false, error: 'El porcentaje no puede superar 100.' }, 400);
        const appliesTo = typeof body.appliesTo === 'string' && PROMOTION_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        if (appliesTo === 'services' && serviceIds.length === 0) return c.json({ ok: false, error: 'Selecciona al menos un servicio.' }, 400);
        const code = normalizePromoCode(body.code);
        const startsAt = parseOptionalDate(body.startsAt); const endsAt = parseOptionalDate(body.endsAt);
        if (startsAt && endsAt && endsAt < startsAt) return c.json({ ok: false, error: 'La fecha de fin es anterior al inicio.' }, 400);
        const minAmountN = parseOptionalNumber(body.minAmount); const maxUsesN = parseOptionalNumber(body.maxUses);
        try {
            const [created] = await db.insert(agendaPromotions).values({ professionalId: profile.id, code, label, description: typeof body.description === 'string' ? body.description : null, discountType, discountValue: String(discountValue), appliesTo, serviceIds, minAmount: minAmountN !== null ? String(minAmountN) : null, maxUses: maxUsesN !== null ? Math.floor(maxUsesN) : null, startsAt, endsAt, isActive: body.isActive === false ? false : true }).returning();
            await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: created.id, action: 'create', metadata: { code, discountType, discountValue }, ctx: c });
            return c.json({ ok: true, promotion: created });
        } catch (err: unknown) { if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') return c.json({ ok: false, error: 'Ya existe un cupón con ese código.' }, 409); throw err; }
    });

    app.patch('/promotions/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
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
        if (Array.isArray(body.serviceIds)) patch.serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
        if ('minAmount' in body) { const v = parseOptionalNumber(body.minAmount); patch.minAmount = v !== null ? String(v) : null; }
        if ('maxUses' in body) { const v = parseOptionalNumber(body.maxUses); patch.maxUses = v !== null ? Math.floor(v) : null; }
        if ('startsAt' in body) patch.startsAt = parseOptionalDate(body.startsAt);
        if ('endsAt' in body) patch.endsAt = parseOptionalDate(body.endsAt);
        if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
        try {
            const [updated] = await db.update(agendaPromotions).set(patch).where(and(eq(agendaPromotions.id, id), eq(agendaPromotions.professionalId, profile.id))).returning();
            await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
            return c.json({ ok: true, promotion: updated });
        } catch (err: unknown) { if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') return c.json({ ok: false, error: 'Ya existe un cupón con ese código.' }, 409); throw err; }
    });

    app.delete('/promotions/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaPromotions).where(and(eq(agendaPromotions.id, id), eq(agendaPromotions.professionalId, profile.id))).returning();
        if (!deleted) return c.json({ ok: false, error: 'Promoción no encontrada' }, 404);
        await logAudit({ professionalId: profile.id, entityType: 'promotion', entityId: id, action: 'delete', metadata: { code: deleted.code, label: deleted.label }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Packs ─────────────────────────────────────────────────────────────────
    app.get('/packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const rows = await db.select().from(agendaPacks).where(eq(agendaPacks.professionalId, profile.id)).orderBy(agendaPacks.position, desc(agendaPacks.createdAt));
        return c.json({ ok: true, packs: rows });
    });

    app.post('/packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) return c.json({ ok: false, error: 'Falta el nombre del pack.' }, 400);
        const sessionsCount = parseOptionalNumber(body.sessionsCount);
        if (sessionsCount === null || sessionsCount <= 0) return c.json({ ok: false, error: 'Indica cuántas sesiones incluye el pack.' }, 400);
        const price = parseOptionalNumber(body.price);
        if (price === null || price < 0) return c.json({ ok: false, error: 'El precio del pack es inválido.' }, 400);
        const appliesTo = typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        const serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        if (appliesTo === 'services' && serviceIds.length === 0) return c.json({ ok: false, error: 'Selecciona al menos un servicio para este pack.' }, 400);
        const validityDays = parseOptionalNumber(body.validityDays); const position = parseOptionalNumber(body.position);
        const [created] = await db.insert(agendaPacks).values({ professionalId: profile.id, name, description: typeof body.description === 'string' ? body.description : null, sessionsCount: Math.floor(sessionsCount), price: String(price), currency: typeof body.currency === 'string' ? body.currency : 'CLP', appliesTo, serviceIds, validityDays: validityDays !== null ? Math.floor(validityDays) : null, isActive: body.isActive === false ? false : true, position: position !== null ? Math.floor(position) : 0 }).returning();
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: created.id, action: 'create', metadata: { name, sessionsCount: created.sessionsCount, price: created.price }, ctx: c });
        return c.json({ ok: true, pack: created });
    });

    app.patch('/packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
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
        if (Array.isArray(body.serviceIds)) patch.serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
        if ('validityDays' in body) { const v = parseOptionalNumber(body.validityDays); patch.validityDays = v !== null ? Math.floor(v) : null; }
        if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;
        if ('position' in body) { const v = parseOptionalNumber(body.position); if (v !== null) patch.position = Math.floor(v); }
        const [updated] = await db.update(agendaPacks).set(patch).where(and(eq(agendaPacks.id, id), eq(agendaPacks.professionalId, profile.id))).returning();
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
        return c.json({ ok: true, pack: updated });
    });

    app.delete('/packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaPacks).where(and(eq(agendaPacks.id, id), eq(agendaPacks.professionalId, profile.id))).returning();
        if (!deleted) return c.json({ ok: false, error: 'Pack no encontrado' }, 404);
        await logAudit({ professionalId: profile.id, entityType: 'pack', entityId: id, action: 'delete', metadata: { name: deleted.name }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Client Packs ──────────────────────────────────────────────────────────
    app.get('/client-packs', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const clientId = typeof body.clientId === 'string' ? body.clientId : '';
        if (!clientId) return c.json({ ok: false, error: 'Selecciona un cliente.' }, 400);
        const client = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
        if (!client) return c.json({ ok: false, error: 'Cliente no encontrado.' }, 404);
        const packId = typeof body.packId === 'string' ? body.packId : null;
        let name = typeof body.name === 'string' ? body.name.trim() : '';
        let sessionsTotal = parseOptionalNumber(body.sessionsTotal);
        let pricePaid = parseOptionalNumber(body.pricePaid);
        let currency = typeof body.currency === 'string' ? body.currency : 'CLP';
        let appliesTo = typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo) ? body.appliesTo : 'all';
        let serviceIds: string[] = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x): x is string => typeof x === 'string') : [];
        let expiresAt = parseOptionalDate(body.expiresAt);
        if (packId) {
            const pack = await db.query.agendaPacks.findFirst({ where: and(eq(agendaPacks.id, packId), eq(agendaPacks.professionalId, profile.id)) });
            if (!pack) return c.json({ ok: false, error: 'Pack no encontrado.' }, 404);
            if (!name) name = pack.name;
            if (sessionsTotal === null) sessionsTotal = pack.sessionsCount;
            if (pricePaid === null && pack.price) pricePaid = Number(pack.price);
            currency = pack.currency; appliesTo = pack.appliesTo;
            if (serviceIds.length === 0) serviceIds = Array.isArray(pack.serviceIds) ? pack.serviceIds : [];
            if (!expiresAt && pack.validityDays && pack.validityDays > 0) expiresAt = addDays(new Date(), pack.validityDays);
        }
        if (!name) return c.json({ ok: false, error: 'Falta el nombre del pack.' }, 400);
        if (sessionsTotal === null || sessionsTotal <= 0) return c.json({ ok: false, error: 'Indica cuántas sesiones incluye el pack.' }, 400);
        const [created] = await db.insert(agendaClientPacks).values({ professionalId: profile.id, packId: packId ?? null, clientId, name, sessionsTotal: Math.floor(sessionsTotal), sessionsUsed: 0, pricePaid: pricePaid !== null ? String(pricePaid) : null, currency, appliesTo, serviceIds, expiresAt, status: 'active', notes: typeof body.notes === 'string' ? body.notes : null }).returning();
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: created.id, action: 'create', metadata: { clientId, packId, name, sessionsTotal: created.sessionsTotal }, ctx: c });
        return c.json({ ok: true, clientPack: created });
    });

    app.patch('/client-packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const existing = await db.query.agendaClientPacks.findFirst({ where: and(eq(agendaClientPacks.id, id), eq(agendaClientPacks.professionalId, profile.id)) });
        if (!existing) return c.json({ ok: false, error: 'Bono no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.name === 'string') { const n = body.name.trim(); if (!n) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.name = n; }
        if ('sessionsTotal' in body) { const v = parseOptionalNumber(body.sessionsTotal); if (v === null || v <= 0) return c.json({ ok: false, error: 'Total de sesiones inválido.' }, 400); if (v < existing.sessionsUsed) return c.json({ ok: false, error: 'El total no puede ser menor a las sesiones ya usadas.' }, 400); patch.sessionsTotal = Math.floor(v); }
        if ('pricePaid' in body) { const v = parseOptionalNumber(body.pricePaid); patch.pricePaid = v !== null ? String(v) : null; }
        if (typeof body.currency === 'string') patch.currency = body.currency;
        if (typeof body.appliesTo === 'string' && PACK_APPLIES_TO.has(body.appliesTo)) patch.appliesTo = body.appliesTo;
        if (Array.isArray(body.serviceIds)) patch.serviceIds = body.serviceIds.filter((x): x is string => typeof x === 'string');
        if ('expiresAt' in body) patch.expiresAt = parseOptionalDate(body.expiresAt);
        if (typeof body.status === 'string' && CLIENT_PACK_STATUS.has(body.status)) patch.status = body.status;
        if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes : null;
        const [updated] = await db.update(agendaClientPacks).set(patch).where(and(eq(agendaClientPacks.id, id), eq(agendaClientPacks.professionalId, profile.id))).returning();
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: id, action: 'update', metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt') }, ctx: c });
        return c.json({ ok: true, clientPack: updated });
    });

    app.delete('/client-packs/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        await db.update(agendaAppointments).set({ clientPackId: null }).where(eq(agendaAppointments.clientPackId, id));
        const [deleted] = await db.delete(agendaClientPacks).where(and(eq(agendaClientPacks.id, id), eq(agendaClientPacks.professionalId, profile.id))).returning();
        if (!deleted) return c.json({ ok: false, error: 'Bono no encontrado' }, 404);
        await logAudit({ professionalId: profile.id, entityType: 'client_pack', entityId: id, action: 'delete', metadata: { clientId: deleted.clientId, name: deleted.name }, ctx: c });
        return c.json({ ok: true });
    });

    // ── Asistentes (servicios group_event) ────────────────────────────────────
    app.post('/services/:id/attendees', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const serviceId = c.req.param('id') ?? '';
        const service = await db.query.agendaServices.findFirst({ where: and(eq(agendaServices.id, serviceId), eq(agendaServices.professionalId, profile.id)) });
        if (!service || service.kind !== 'group_event') return c.json({ ok: false, error: 'Servicio grupal no encontrado' }, 404);
        if (service.sessionStatus === 'cancelled') return c.json({ ok: false, error: 'Esta sesión está cancelada.' }, 400);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
        let clientName = typeof body.clientName === 'string' ? body.clientName.trim() : '';
        let clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : '';
        let clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : '';
        if (clientId) {
            const cl = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.id, clientId), eq(agendaClients.professionalId, profile.id)) });
            if (!cl) return c.json({ ok: false, error: 'Cliente no encontrado.' }, 404);
            if (!clientName) clientName = `${cl.firstName} ${cl.lastName ?? ''}`.trim();
            if (!clientEmail) clientEmail = cl.email ?? '';
            if (!clientPhone) clientPhone = cl.phone ?? '';
        }
        if (!clientName) return c.json({ ok: false, error: 'Falta el nombre del asistente.' }, 400);
        const currentCount = await db.select({ count: sql<number>`count(*)::int` }).from(agendaGroupAttendees).where(and(eq(agendaGroupAttendees.sessionId, serviceId), sql`${agendaGroupAttendees.status} <> 'cancelled'`));
        if (Number(currentCount[0]?.count ?? 0) >= (service.capacity ?? 0)) return c.json({ ok: false, error: 'No hay cupos disponibles en esta sesión.' }, 409);
        const pricePaid = parseOptionalNumber(body.pricePaid);
        const [created] = await db.insert(agendaGroupAttendees).values({ sessionId: serviceId, professionalId: profile.id, clientId, clientName, clientEmail: clientEmail || null, clientPhone: clientPhone || null, status: 'registered', pricePaid: pricePaid !== null ? String(pricePaid) : null, paidAt: pricePaid !== null ? new Date() : null, notes: typeof body.notes === 'string' ? body.notes : null }).returning();
        await logAudit({ professionalId: profile.id, entityType: 'group_attendee', entityId: created.id, action: 'create', metadata: { serviceId, clientName, clientId }, ctx: c });
        return c.json({ ok: true, attendee: created });
    });

    app.patch('/group-attendees/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const existing = await db.query.agendaGroupAttendees.findFirst({ where: and(eq(agendaGroupAttendees.id, id), eq(agendaGroupAttendees.professionalId, profile.id)) });
        if (!existing) return c.json({ ok: false, error: 'Asistente no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (typeof body.status === 'string' && GROUP_ATTENDEE_STATUS.has(body.status)) patch.status = body.status;
        if (typeof body.clientName === 'string') { const v = body.clientName.trim(); if (!v) return c.json({ ok: false, error: 'El nombre no puede estar vacío.' }, 400); patch.clientName = v; }
        if ('clientEmail' in body) patch.clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail : null;
        if ('clientPhone' in body) patch.clientPhone = typeof body.clientPhone === 'string' ? body.clientPhone : null;
        if ('pricePaid' in body) { const v = parseOptionalNumber(body.pricePaid); patch.pricePaid = v !== null ? String(v) : null; if (v !== null && !existing.paidAt) patch.paidAt = new Date(); if (v === null) patch.paidAt = null; }
        if ('notes' in body) patch.notes = typeof body.notes === 'string' ? body.notes : null;
        const [updated] = await db.update(agendaGroupAttendees).set(patch).where(and(eq(agendaGroupAttendees.id, id), eq(agendaGroupAttendees.professionalId, profile.id))).returning();
        return c.json({ ok: true, attendee: updated });
    });

    app.delete('/group-attendees/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaGroupAttendees).where(and(eq(agendaGroupAttendees.id, id), eq(agendaGroupAttendees.professionalId, profile.id))).returning();
        if (!deleted) return c.json({ ok: false, error: 'Asistente no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Payments ──────────────────────────────────────────────────────────────
    app.get('/payments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, payments: [] });
        if (isFreePlan(profile, user.role)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const payments = await db.select().from(agendaPayments).where(eq(agendaPayments.professionalId, profile.id)).orderBy(desc(agendaPayments.createdAt));
        return c.json({ ok: true, payments });
    });

    app.post('/payments', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile, user.role)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.amount) return c.json({ ok: false, error: 'El monto es requerido' }, 400);
        const [payment] = await db.insert(agendaPayments).values({ professionalId: profile.id, appointmentId: typeof body.appointmentId === 'string' ? body.appointmentId||null : null, clientId: typeof body.clientId === 'string' ? body.clientId||null : null, amount: String(body.amount), currency: typeof body.currency === 'string' ? body.currency : profile.currency, method: typeof body.method === 'string' ? body.method||null : null, status: typeof body.status === 'string' ? body.status : 'pending', paidAt: body.status === 'paid' ? new Date() : null, notes: typeof body.notes === 'string' ? body.notes||null : null }).returning();
        return c.json({ ok: true, payment });
    });

    app.patch('/payments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile, user.role)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of ['amount','method','status','notes'] as const) { if (key in body) patch[key] = body[key] === '' ? null : body[key]; }
        if (body.status === 'paid' && !body.paidAt) patch.paidAt = new Date();
        const [updated] = await db.update(agendaPayments).set(patch).where(and(eq(agendaPayments.id, id), eq(agendaPayments.professionalId, profile.id))).returning();
        if (!updated) return c.json({ ok: false, error: 'Cobro no encontrado' }, 404);
        return c.json({ ok: true, payment: updated });
    });

    app.delete('/payments/:id', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (isFreePlan(profile, user.role)) return c.json({ ok: false, error: 'Activa Pro para continuar.' }, 403);
        const id = c.req.param('id') ?? '';
        const [deleted] = await db.delete(agendaPayments).where(and(eq(agendaPayments.id, id), eq(agendaPayments.professionalId, profile.id))).returning({ id: agendaPayments.id });
        if (!deleted) return c.json({ ok: false, error: 'Cobro no encontrado' }, 404);
        return c.json({ ok: true });
    });

    // ── Google Calendar ───────────────────────────────────────────────────────
    app.get('/google-calendar/auth', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (profile && isFreePlan(profile, user.role)) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=upgrade`);
        const oauth2Client = getGoogleOAuth2Client();
        const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar'], state: user.id, prompt: 'consent' });
        return c.redirect(url);
    });

    app.get('/google-calendar/callback', async (c) => {
        const code = c.req.query('code'); const state = c.req.query('state');
        if (!code || !state) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('Faltan parámetros')}`);
        try {
            const oauth2Client = getGoogleOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
            const calList = await calendarApi.calendarList.list({ minAccessRole: 'owner' });
            const primaryCal = calList.data.items?.find((c: any) => c.primary) ?? calList.data.items?.[0];
            const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.userId, state) });
            if (!profile) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent('Perfil no encontrado')}`);
            await db.update(agendaProfessionalProfiles).set({ googleCalendarId: primaryCal?.id ?? null, googleAccessToken: tokens.access_token ?? null, googleRefreshToken: tokens.refresh_token ?? null, googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null, updatedAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
            return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=connected`);
        } catch (e) { const msg = e instanceof Error ? e.message : 'Error desconocido'; return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?gc=error&message=${encodeURIComponent(msg)}`); }
    });

    app.delete('/google-calendar/disconnect', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        await db.update(agendaProfessionalProfiles).set({ googleCalendarId: null, googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, updatedAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
        return c.json({ ok: true });
    });

    app.get('/google-calendar/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        return c.json({ ok: true, connected: !!(profile?.googleAccessToken), calendarId: profile?.googleCalendarId ?? null });
    });

    // ── MercadoPago OAuth ─────────────────────────────────────────────────────
    app.get('/mercadopago/auth', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const mpProfile = await getAgendaProfile(user.id);
        if (mpProfile && isFreePlan(mpProfile, user.role)) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=upgrade`);
        const appId = process.env.MP_AGENDA_APP_ID;
        if (!appId) return c.json({ ok: false, error: 'MP_AGENDA_APP_ID no configurado' }, 500);
        const redirectUri = encodeURIComponent(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`);
        const state = encodeURIComponent(user.id);
        return c.redirect(`https://auth.mercadopago.cl/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`);
    });

    app.get('/mercadopago/callback', async (c) => {
        const code = c.req.query('code'); const state = c.req.query('state');
        if (!code || !state) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
        try {
            const appId = process.env.MP_AGENDA_APP_ID; const appSecret = process.env.MP_AGENDA_APP_SECRET;
            if (!appId || !appSecret) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
            const redirectUri = `${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/agenda/mercadopago/callback`;
            const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ client_id: appId, client_secret: appSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }) });
            if (!tokenRes.ok) throw new Error('MP token exchange failed');
            const tokens = await tokenRes.json() as { access_token: string; public_key: string; refresh_token?: string; user_id?: number };
            const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.userId, state) });
            if (!profile) return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`);
            await db.update(agendaProfessionalProfiles).set({ mpAccessToken: tokens.access_token, mpPublicKey: tokens.public_key ?? null, mpUserId: tokens.user_id ? String(tokens.user_id) : null, mpRefreshToken: tokens.refresh_token ?? null, updatedAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
            return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=connected`);
        } catch (e) { console.error('[agenda] MP OAuth callback error:', e); return c.redirect(`${process.env.AGENDA_APP_URL ?? 'http://localhost:3004'}/panel/mi-cuenta/integraciones?mp=error`); }
    });

    app.delete('/mercadopago/disconnect', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        await db.update(agendaProfessionalProfiles).set({ mpAccessToken: null, mpPublicKey: null, mpUserId: null, mpRefreshToken: null, updatedAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
        return c.json({ ok: true });
    });

    app.post('/mercadopago/webhook', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
            const bodyData = (body.data ?? {}) as Record<string, unknown>;
            const topic = String(c.req.query('topic') ?? c.req.query('type') ?? body.type ?? '');
            const paymentId = String(c.req.query('id') ?? bodyData.id ?? body.id ?? '');

            const signatureResult = verifyMercadoPagoWebhookSignature({
                xSignature: c.req.header('x-signature'),
                xRequestId: c.req.header('x-request-id'),
                dataId: paymentId || null,
            });
            if (signatureResult === false) {
                return c.json({ ok: false, error: 'Firma de webhook inválida' }, 401);
            }
            if (signatureResult === 'unsigned' && process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED !== 'true') {
                return c.json({ ok: false, error: 'Webhook sin firma no permitido' }, 401);
            }

            const isPayment = topic === 'payment' || String(body.type ?? '') === 'payment';
            if (!isPayment) return c.json({ ok: true });
            if (!paymentId) return c.json({ ok: true });

            let paymentPayload: Record<string, unknown> | null = null;
            try {
                paymentPayload = (await getPaymentById(paymentId)) as Record<string, unknown>;
            } catch (err) {
                console.warn('[agenda] MP webhook: consulta de pago con token global falló:', err);
            }

            let externalRef = String(paymentPayload?.external_reference ?? '');
            let paymentStatus = String(paymentPayload?.status ?? '');

            if (!externalRef && signatureResult === 'unsigned') {
                externalRef = String(body.external_reference ?? bodyData.external_reference ?? '');
            }
            if (!externalRef) return c.json({ ok: true });

            const appt = await db.query.agendaAppointments.findFirst({ where: eq(agendaAppointments.id, externalRef) });
            if (!appt) return c.json({ ok: true });

            const profile = await db.query.agendaProfessionalProfiles.findFirst({
                where: eq(agendaProfessionalProfiles.id, appt.professionalId),
            });
            if (profile?.mpAccessToken && (paymentStatus !== 'approved' || !paymentPayload)) {
                try {
                    paymentPayload = (await getPaymentById(paymentId, { accessToken: profile.mpAccessToken })) as Record<string, unknown>;
                    externalRef = String(paymentPayload.external_reference ?? externalRef);
                    paymentStatus = String(paymentPayload.status ?? '');
                } catch (err) {
                    console.error('[agenda] MP webhook: consulta con token del profesional falló:', err);
                    return c.json({ ok: true });
                }
            }

            if (paymentStatus !== 'approved') return c.json({ ok: true });
            if (externalRef !== appt.id) return c.json({ ok: true });

            await db.update(agendaAppointments).set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() }).where(eq(agendaAppointments.id, appt.id));
            const existingPayment = await db.query.agendaPayments.findFirst({ where: and(eq(agendaPayments.appointmentId, appt.id), eq(agendaPayments.status, 'paid')) });
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
                    notes: `Pago automático MP ref: ${paymentId}`,
                });
            }
            return c.json({ ok: true });
        } catch (e) {
            console.error('[agenda] MP webhook error:', e);
            return c.json({ ok: true });
        }
    });

    app.get('/mercadopago/status', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        return c.json({ ok: true, connected: !!(profile?.mpAccessToken), userId: profile?.mpUserId ?? null });
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    app.get('/notifications/history', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: true, events: [] });
        const limitRaw = Number(c.req.query('limit') ?? 50);
        const limit = Math.min(Math.max(isFinite(limitRaw) ? limitRaw : 50, 1), 200);
        const events = await db.select().from(agendaNotificationEvents).where(eq(agendaNotificationEvents.professionalId, profile.id)).orderBy(desc(agendaNotificationEvents.createdAt)).limit(limit);
        return c.json({ ok: true, events });
    });

    app.get('/notifications', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
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
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        await db.update(agendaProfessionalProfiles).set({ notificationsLastSeenAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
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
        if (cronSecret) { const authHeader = c.req.header('authorization') ?? ''; if (authHeader !== `Bearer ${cronSecret}`) return c.json({ ok: false, error: 'No autorizado' }, 401); }
        const now = new Date();
        const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const appts = await db.select().from(agendaAppointments).where(and(gte(agendaAppointments.startsAt, windowStart), lte(agendaAppointments.startsAt, windowEnd), eq(agendaAppointments.status, 'confirmed'), isNull(agendaAppointments.reminderSentAt)));
        let sent = 0;
        const agendaAppUrl = asString(process.env.AGENDA_APP_URL) || 'https://simpleagenda.app';
        for (const appt of appts) {
            const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.id, appt.professionalId) });
            if (!profile) continue;
            const tz = profile.timezone ?? 'America/Santiago';
            const fmtT = (d: Date) => d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz });
            const fmtD = (d: Date) => d.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', timeZone:tz });
            const dateLabel = `${fmtD(appt.startsAt)} a las ${fmtT(appt.startsAt)}`;
            const cancelUrl = `${agendaAppUrl}/cancelar?appt=${appt.id}&slug=${profile.slug}`;
            if (appt.clientEmail) void sendAppointmentReminderEmail(appt.clientEmail, { clientName: appt.clientName ?? 'Paciente', professionalName: profile.displayName ?? 'el profesional', dateLabel, modality: appt.modality, meetingUrl: appt.meetingUrl, location: appt.location, cancelUrl });
            await db.update(agendaAppointments).set({ reminderSentAt: new Date() }).where(eq(agendaAppointments.id, appt.id));
            sent++;
        }
        return c.json({ ok: true, sent });
    });

    // ── Subscription Self-cancel ──────────────────────────────────────────────
    app.post('/subscription/cancel', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const profile = await getAgendaProfile(user.id);
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (profile.plan === 'free') return c.json({ ok: false, error: 'No tienes un plan activo que cancelar' }, 400);
        await db.update(agendaProfessionalProfiles).set({ plan: 'free', planExpiresAt: null, updatedAt: new Date() }).where(eq(agendaProfessionalProfiles.id, profile.id));
        console.info(`[agenda] User self-cancelled plan: userId=${user.id} profileId=${profile.id}`);
        return c.json({ ok: true });
    });

    return app;
}

// ── Public Agenda Router ──────────────────────────────────────────────────────
export function createPublicAgendaRouter(deps: AgendaRouterDeps) {
    const {
        db, sql, tables, dbHelpers: { eq, and, or, asc, desc, gte, lte, lt, inArray, isNull },
        asString, randomUUID,
        isFreePlan, checkClientLimit, checkAppointmentLimit, generateSlots,
        logAudit, logNotification, syncToGoogleCalendar, sendPushToUser,
        sendBookingConfirmationEmail,
        ensureNpsForAppointment, createCheckoutPreference, rateLimit,
    } = deps;

    const {
        agendaProfessionalProfiles, agendaServices, agendaAvailabilityRules, agendaBlockedSlots,
        agendaLocations, agendaClients, agendaAppointments, agendaPromotions, agendaPacks, agendaNpsResponses, users,
        pushSubscriptions,
    } = tables;

    const publicReadLimit = rateLimit({ name: 'agenda-read', limit: 60, windowMs: 60_000 });
    const publicSlotsLimit = rateLimit({ name: 'agenda-slots', limit: 30, windowMs: 60_000 });
    const publicBookLimit = rateLimit({ name: 'agenda-book', limit: 5, windowMs: 60_000 });
    const publicCancelLimit = rateLimit({ name: 'agenda-cancel', limit: 10, windowMs: 60_000 });

    const app = new Hono();

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
        const score = typeof body.score === 'number' ? Math.max(0, Math.min(10, Math.round(body.score))) : null;
        if (score === null) return c.json({ ok: false, error: 'Puntuación inválida (0–10)' }, 400);
        const comment = typeof body.comment === 'string' ? body.comment.slice(0, 2000) : null;
        const record = await db.query.agendaNpsResponses.findFirst({ where: eq(agendaNpsResponses.token, token) });
        if (!record) return c.json({ ok: false, error: 'Encuesta no encontrada' }, 404);
        if (record.submittedAt) return c.json({ ok: false, error: 'Esta encuesta ya fue respondida' }, 409);
        await db.update(agendaNpsResponses).set({ score, comment, submittedAt: new Date() }).where(eq(agendaNpsResponses.id, record.id));
        return c.json({ ok: true });
    });

    app.post('/:slug/validate-promo', publicReadLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)) });
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const code = normalizePromoCode(body.code);
        if (!code) return c.json({ ok: false, error: 'Ingresa un código.' }, 400);
        const serviceId = typeof body.serviceId === 'string' ? body.serviceId : null;
        let basePrice = parseOptionalNumber(body.basePrice) ?? 0;
        if (serviceId && (!basePrice || basePrice <= 0)) { const svc = await db.query.agendaServices.findFirst({ where: eq(agendaServices.id, serviceId) }); if (svc?.price) basePrice = Number(svc.price); }
        const promo = await db.query.agendaPromotions.findFirst({ where: and(eq(agendaPromotions.professionalId, profile.id), sql`lower(${agendaPromotions.code}) = lower(${code})`) });
        if (!promo) return c.json({ ok: false, error: 'Cupón no válido.' }, 404);
        const result = applyPromotionToPrice(promo, basePrice, serviceId);
        if (!result.ok) return c.json({ ok: false, error: result.message }, 400);
        return c.json({ ok: true, promotion: { id: result.promotion.id, code: result.promotion.code, label: result.promotion.label, discountType: result.promotion.discountType, discountValue: result.promotion.discountValue }, originalPrice: result.originalPrice, discountAmount: result.discountAmount, finalPrice: result.finalPrice });
    });

    app.get('/:slug', publicReadLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.slug, slug) });
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        if (!profile.isPublished) {
            return c.json({
                ok: false,
                error: 'Este perfil aún no está publicado.',
                reason: 'not_published',
                displayName: profile.displayName,
            }, 403);
        }
        const [services, locations, rules, packRows, promotionRows, operationalTz] = await Promise.all([
            db.select().from(agendaServices).where(and(eq(agendaServices.professionalId, profile.id), eq(agendaServices.isActive, true), eq(agendaServices.kind, 'appointment'))).orderBy(asc(agendaServices.position)),
            db.select().from(agendaLocations).where(and(eq(agendaLocations.professionalId, profile.id), eq(agendaLocations.isActive, true))).orderBy(asc(agendaLocations.position)),
            db.select().from(agendaAvailabilityRules).where(eq(agendaAvailabilityRules.professionalId, profile.id)).orderBy(asc(agendaAvailabilityRules.dayOfWeek)),
            db.select().from(agendaPacks).where(and(eq(agendaPacks.professionalId, profile.id), eq(agendaPacks.isActive, true))).orderBy(asc(agendaPacks.position), desc(agendaPacks.createdAt)),
            db.select().from(agendaPromotions).where(eq(agendaPromotions.professionalId, profile.id)).orderBy(desc(agendaPromotions.createdAt)),
            resolveAgendaProfessionalTimezone(profile.userId, profile as Record<string, unknown>),
        ]);
        const operatingLocation = operatingLocationFromAgendaProfile(profile);
        const promotions = promotionRows.filter((promo: typeof promotionRows[number]) => isPublicAgendaPromotionVisible(promo));
        return c.json({
            ok: true,
            profile: mapPublicAgendaProfile(profile, {
                services,
                locations,
                rules,
                packs: packRows,
                promotions,
                operationalTz,
                operatingLocation,
            }),
        });
    });

    app.get('/:slug/slots', publicSlotsLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const dateStr = c.req.query('date'); const serviceId = c.req.query('serviceId');
        if (!dateStr) return c.json({ ok: false, error: 'Fecha requerida' }, 400);
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)) });
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const tz = profile.timezone ?? 'America/Santiago';
        const dayOfWeek = new Date(new Date(`${dateStr}T12:00:00`).toLocaleString('en-US', { timeZone: tz })).getDay();
        const localMidnight = new Date(`${dateStr}T00:00:00`);
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
        const parts = formatter.formatToParts(localMidnight);
        const getP = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0');
        const dayStart = new Date(Date.UTC(getP('year'), getP('month') - 1, getP('day'), getP('hour'), getP('minute'), getP('second')));
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        const prevDayOfWeek = (dayOfWeek + 6) % 7;
        let expandedRules;
        if (profile.alwaysOpen) {
            expandedRules = expandWeeklyRulesToDaySegments(BUSINESS_SCHEDULE_ALWAYS_OPEN_RULES, dayOfWeek);
        } else {
            const [todayRules, spilloverRules] = await Promise.all([
                db.select().from(agendaAvailabilityRules).where(and(eq(agendaAvailabilityRules.professionalId, profile.id), eq(agendaAvailabilityRules.dayOfWeek, dayOfWeek), eq(agendaAvailabilityRules.isActive, true))),
                db.select().from(agendaAvailabilityRules).where(and(eq(agendaAvailabilityRules.professionalId, profile.id), eq(agendaAvailabilityRules.dayOfWeek, prevDayOfWeek), eq(agendaAvailabilityRules.isActive, true))),
            ]);
            expandedRules = expandWeeklyRulesToDaySegments([...todayRules, ...spilloverRules], dayOfWeek);
        }
        if (expandedRules.length === 0) return c.json({ ok: true, slots: [] });
        let durationMinutes = 60;
        if (serviceId) { const svc = await db.query.agendaServices.findFirst({ where: eq(agendaServices.id, serviceId) }); if (svc) durationMinutes = svc.durationMinutes; }
        const [existingAppts, blockedSlots] = await Promise.all([
            db.select().from(agendaAppointments).where(and(eq(agendaAppointments.professionalId, profile.id), gte(agendaAppointments.startsAt, dayStart), lte(agendaAppointments.startsAt, dayEnd), sql`${agendaAppointments.status} NOT IN ('cancelled','no_show')`)),
            db.select().from(agendaBlockedSlots).where(and(eq(agendaBlockedSlots.professionalId, profile.id), lt(agendaBlockedSlots.startsAt, dayEnd), gte(agendaBlockedSlots.endsAt, dayStart))),
        ]);
        const slots = generateSlots(expandedRules, durationMinutes, dayStart, existingAppts, blockedSlots, tz);
        return c.json({ ok: true, slots });
    });

    app.post('/appointments/:id/cancel', publicCancelLimit, async (c) => {
        const id = c.req.param('id') ?? '';
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const appt = await db.query.agendaAppointments.findFirst({ where: eq(agendaAppointments.id, id) });
        if (!appt || appt.status === 'cancelled') return c.json({ ok: false, error: 'Cita no encontrada o ya cancelada.' }, 404);
        if (appt.status === 'completed') return c.json({ ok: false, error: 'No se puede cancelar una cita completada.' }, 400);
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: eq(agendaProfessionalProfiles.id, appt.professionalId) });
        if (profile?.cancellationHours) { const hoursUntil = (appt.startsAt.getTime() - Date.now()) / (1000 * 60 * 60); if (hoursUntil < profile.cancellationHours) return c.json({ ok: false, error: `La cancelación debe hacerse con al menos ${profile.cancellationHours} horas de anticipación.` }, 400); }
        const [updated] = await db.update(agendaAppointments).set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'client', cancellationReason: typeof body.reason === 'string' ? body.reason||null : null, updatedAt: new Date() }).where(eq(agendaAppointments.id, id)).returning();
        await logAudit({ professionalId: updated.professionalId, entityType: 'appointment', entityId: updated.id, action: 'cancel', metadata: { source: 'client_self_cancel', reason: typeof body.reason === 'string' ? body.reason.slice(0,200) : null }, ctx: c });
        if (profile) void syncToGoogleCalendar(profile, updated, 'delete');
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

    app.post('/:slug/book', publicBookLimit, async (c) => {
        const slug = c.req.param('slug') ?? '';
        const profile = await db.query.agendaProfessionalProfiles.findFirst({ where: and(eq(agendaProfessionalProfiles.slug, slug), eq(agendaProfessionalProfiles.isPublished, true)) });
        if (!profile) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        if (!body.startsAt || !body.clientName) return c.json({ ok: false, error: 'Datos requeridos: startsAt, clientName' }, 400);
        let durationMinutes = 60; let serviceId: string|null = null; let price: string|null = null; let serviceName: string|null = null;
        let preconsultFieldsForService: PreconsultField[] = [];
        if (typeof body.serviceId === 'string' && body.serviceId) {
            const svc = await db.query.agendaServices.findFirst({
                where: and(
                    eq(agendaServices.id, body.serviceId),
                    eq(agendaServices.professionalId, profile.id),
                    eq(agendaServices.isActive, true),
                    eq(agendaServices.kind, 'appointment'),
                ),
            });
            if (svc) {
                durationMinutes = svc.durationMinutes;
                serviceId = svc.id;
                price = svc.price ?? null;
                serviceName = svc.name;
                preconsultFieldsForService = normalizePreconsultFields(svc.preconsultFields, randomUUID);
            }
        }
        let appliedPromotion: any = null; let originalPriceForPromo: number|null = null; let discountAmount: number|null = null;
        const promoCode = normalizePromoCode(body.promotionCode);
        if (promoCode) {
            const basePrice = price ? Number(price) : 0;
            const promo = await db.query.agendaPromotions.findFirst({ where: and(eq(agendaPromotions.professionalId, profile.id), sql`lower(${agendaPromotions.code}) = lower(${promoCode})`) });
            if (!promo) return c.json({ ok: false, error: 'Cupón no válido.' }, 400);
            const result = applyPromotionToPrice(promo, basePrice, serviceId);
            if (!result.ok) return c.json({ ok: false, error: result.message }, 400);
            appliedPromotion = result.promotion; originalPriceForPromo = result.originalPrice; discountAmount = result.discountAmount; price = String(result.finalPrice);
        }
        const preconsultResponses = normalizePreconsultResponses(body.preconsultResponses, preconsultFieldsForService);
        if (preconsultResponses) { for (let i = 0; i < preconsultFieldsForService.length; i++) { const field = preconsultFieldsForService[i]; if (field.required && !preconsultResponses[i].value.trim()) return c.json({ ok: false, error: `Falta responder: ${field.label}` }, 400); } }
        const startsAt = new Date(String(body.startsAt));
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const status = profile.confirmationMode === 'auto' ? 'confirmed' : 'pending';
        const rawFreq = typeof body.recurrenceFrequency === 'string' ? body.recurrenceFrequency : null;
        const requestedFrequency: 'weekly'|'biweekly'|'monthly'|null = rawFreq === 'weekly' || rawFreq === 'biweekly' || rawFreq === 'monthly' ? rawFreq : null;
        if (requestedFrequency && !profile.allowsRecurrentBooking) return c.json({ ok: false, error: 'Este profesional no permite reservar sesiones recurrentes.' }, 403);
        const recurrenceCountRaw = typeof body.recurrenceCount === 'number' ? body.recurrenceCount : 1;
        const publicTotalOccurrences = requestedFrequency ? Math.max(2, Math.min(recurrenceCountRaw, 26)) : 1;
        if (isFreePlan(profile)) { const le = await checkAppointmentLimit(profile.id, publicTotalOccurrences); if (le) return c.json({ ok: false, error: 'Este profesional ha alcanzado el límite de citas de su plan actual. Intenta más adelante.' }, 403); }
        const publicSeriesId = publicTotalOccurrences > 1 ? randomUUID() : null;
        const bookingEmail = typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : null;
        const bookingPhone = typeof body.clientPhone === 'string' && body.clientPhone ? body.clientPhone : null;
        const clientFullName = String(body.clientName).trim();
        const nameParts = clientFullName.split(/\s+/);
        const bookingFirstName = nameParts[0] ?? clientFullName;
        const bookingLastName = nameParts.slice(1).join(' ') || null;
        let existingClient = null;
        if (bookingEmail) existingClient = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.email, bookingEmail), eq(agendaClients.professionalId, profile.id)) });
        if (!existingClient && bookingPhone) existingClient = await db.query.agendaClients.findFirst({ where: and(eq(agendaClients.phone, bookingPhone), eq(agendaClients.professionalId, profile.id)) });
        if (!existingClient && isFreePlan(profile)) {
            const clientLimit = await checkClientLimit(profile.id, 1);
            if (clientLimit) return c.json({ ok: false, error: 'Este profesional ha alcanzado el límite de pacientes de su plan actual. Intenta más adelante.' }, 403);
        }
        const addOffsetPub = (base: Date, idx: number, freq: string|null): Date => {
            if (!freq || idx === 0) return new Date(base.getTime());
            const d = new Date(base.getTime());
            if (freq === 'weekly') d.setDate(d.getDate() + idx * 7);
            else if (freq === 'biweekly') d.setDate(d.getDate() + idx * 14);
            else if (freq === 'monthly') d.setMonth(d.getMonth() + idx);
            return d;
        };
        const occurrences: Array<{ startsAt: Date; endsAt: Date }> = [];
        for (let i = 0; i < publicTotalOccurrences; i++) occurrences.push({ startsAt: addOffsetPub(startsAt, i, requestedFrequency), endsAt: addOffsetPub(endsAt, i, requestedFrequency) });
        const existingAppts = await db.select().from(agendaAppointments).where(and(eq(agendaAppointments.professionalId, profile.id), eq(agendaAppointments.status, 'confirmed')));
        for (let i = 0; i < occurrences.length; i++) {
            const occ = occurrences[i];
            const hasOverlap = existingAppts.some((appt: any) => occ.startsAt < appt.endsAt && occ.endsAt > appt.startsAt);
            if (hasOverlap) { const label = occ.startsAt.toLocaleString('es-CL', { day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit', timeZone: profile.timezone ?? 'America/Santiago' }); return c.json({ ok: false, error: publicTotalOccurrences > 1 ? `El horario del ${label} ya está reservado. Reduce la cantidad de sesiones o elige otro día.` : 'Este horario ya está reservado. Por favor selecciona otro.' }, 409); }
        }
        let bookingModality: 'online' | 'presential' = 'online';
        if (serviceId) {
            const svcForModality = await db.query.agendaServices.findFirst({
                where: and(eq(agendaServices.id, serviceId), eq(agendaServices.professionalId, profile.id)),
            });
            if (!svcForModality) return c.json({ ok: false, error: 'Servicio no disponible.' }, 400);
            const resolved = resolveBookingModality(svcForModality, typeof body.modality === 'string' ? body.modality : null);
            if (!resolved) return c.json({ ok: false, error: 'Modalidad no disponible para este servicio.' }, 400);
            bookingModality = resolved;
        } else if (body.modality === 'presential') {
            bookingModality = 'presential';
        }
        const insertedAppointments: any[] = [];
        for (const occ of occurrences) {
            const [inserted] = await db.insert(agendaAppointments).values({ professionalId: profile.id, serviceId, clientName: String(body.clientName), clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail||null : null, clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone||null : null, clientNotes: typeof body.clientNotes === 'string' ? body.clientNotes||null : null, startsAt: occ.startsAt, endsAt: occ.endsAt, durationMinutes, modality: bookingModality, status, price, currency: profile.currency, policyAgreed: body.policyAgreed === true, policyAgreedAt: body.policyAgreed === true ? new Date() : null, paymentStatus: (profile.requiresAdvancePayment && (profile.acceptsTransfer || profile.acceptsMp || profile.acceptsPaymentLink)) ? 'pending' : 'not_required', seriesId: publicSeriesId, recurrenceFrequency: publicSeriesId ? requestedFrequency : null, preconsultResponses: preconsultResponses ?? null, promotionId: appliedPromotion?.id ?? null, promotionCode: appliedPromotion?.code ?? null, originalPrice: originalPriceForPromo !== null ? String(originalPriceForPromo) : null, discountAmount: discountAmount !== null ? String(discountAmount) : null }).returning();
            insertedAppointments.push(inserted);
        }
        const appointment = insertedAppointments[0];
        if (appliedPromotion) await db.update(agendaPromotions).set({ usesCount: sql`${agendaPromotions.usesCount} + 1`, updatedAt: new Date() }).where(eq(agendaPromotions.id, appliedPromotion.id));
        const seriesApptIds = insertedAppointments.map((a) => a.id);
        if (!existingClient) { const [nc] = await db.insert(agendaClients).values({ professionalId: profile.id, firstName: bookingFirstName, lastName: bookingLastName, email: bookingEmail, phone: bookingPhone }).returning({ id: agendaClients.id }); if (nc) await db.update(agendaAppointments).set({ clientId: nc.id }).where(inArray(agendaAppointments.id, seriesApptIds)); }
        else { await db.update(agendaAppointments).set({ clientId: existingClient.id }).where(inArray(agendaAppointments.id, seriesApptIds)); }
        const isOnlineBooking = bookingModality === 'online';
        const gcConnected = !!(profile.googleAccessToken && profile.googleCalendarId);
        if (isOnlineBooking && gcConnected) {
            const sr = await syncToGoogleCalendar(profile, { ...appointment, googleEventId: null, modality: appointment.modality }, 'create');
            if (sr?.eventId) await db.update(agendaAppointments).set({ googleEventId: sr.eventId }).where(eq(agendaAppointments.id, appointment.id));
            if (sr?.meetingUrl) appointment.meetingUrl = sr.meetingUrl;
        }
        const tz3 = profile.timezone ?? 'America/Santiago';
        const fmtT3 = (d: Date) => d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:tz3 });
        const fmtD3 = (d: Date) => d.toLocaleDateString('es-CL', { weekday:'short', day:'numeric', month:'short', timeZone:tz3 });
        const { insertPlatformNotifications } = await import('../platform/notifications-service.js');
        void insertPlatformNotifications({
            userId: profile.userId,
            vertical: 'agenda',
            type: 'appointment.new_booking',
            title: 'Nueva reserva online',
            body: `${String(body.clientName)} — ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}`,
            actionUrl: '/panel/agenda',
            entityType: 'appointment',
            entityId: appointment.id,
        });
        if (!(isOnlineBooking && gcConnected)) void syncToGoogleCalendar(profile, { ...appointment, googleEventId: null, modality: appointment.modality }, 'create').then(async (result: any) => { if (result?.eventId) await db.update(agendaAppointments).set({ googleEventId: result.eventId }).where(eq(agendaAppointments.id, appointment.id)); });
        void sendPushToUser(profile.userId, { title: '📅 Nueva cita agendada', body: `${String(body.clientName)} — ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}`, url: '/panel/agenda' });
        void import('../../lib/agenda-email.js').then(({ sendAgendaProfessionalNewBookingEmailForUser }) =>
            sendAgendaProfessionalNewBookingEmailForUser(profile.userId, {
                title: status === 'pending' ? 'Nueva reserva pendiente de confirmación' : 'Nueva reserva online confirmada',
                message: `${String(body.clientName)} reservó para ${fmtD3(startsAt)} a las ${fmtT3(startsAt)}${serviceName ? ` (${serviceName})` : ''}.`,
            }).catch((err: unknown) => console.error('[agenda] Failed to send professional new booking email:', err)),
        );
        let checkoutUrl: string|null = null;
        if (profile.requiresAdvancePayment && profile.acceptsMp && profile.mpAccessToken && price) {
            try {
                const baseUrl = process.env.AGENDA_APP_URL ?? 'http://localhost:3004';
                const pref = await createCheckoutPreference({ externalReference: appointment.id, title: `Sesión con ${profile.displayName ?? 'el profesional'}`, amount: parseFloat(price), currencyId: profile.currency, payerEmail: typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : 'paciente@simpleagenda.app', payerName: String(body.clientName), backUrls: { success: `${baseUrl}/${slug}?payment=success&appt=${appointment.id}`, failure: `${baseUrl}/${slug}?payment=failure&appt=${appointment.id}`, pending: `${baseUrl}/${slug}?payment=pending&appt=${appointment.id}` }, accessToken: profile.mpAccessToken });
                checkoutUrl = pref.initPoint;
            } catch (e) { console.error('[agenda] MP checkout creation error:', e); }
        }
        const clientEmail2 = typeof body.clientEmail === 'string' && body.clientEmail ? body.clientEmail : null;
        if (clientEmail2) {
            const agendaAppUrl = asString(process.env.AGENDA_APP_URL) || 'https://simpleagenda.app';
            void sendBookingConfirmationEmail(clientEmail2, { appointmentId: appointment.id, clientName: String(body.clientName), professionalName: profile.displayName ?? 'el profesional', slug: profile.slug, serviceName, startsAt, endsAt, durationMinutes, modality: bookingModality, price, currency: profile.currency, meetingUrl: appointment.meetingUrl, location: appointment.location, timezone: profile.timezone ?? 'America/Santiago', status, seriesDates: publicSeriesId ? insertedAppointments.map((a) => a.startsAt) : null, seriesFrequency: publicSeriesId ? requestedFrequency : null, paymentMethods: { requiresAdvancePayment: profile.requiresAdvancePayment, mpConnected: !!(profile.acceptsMp && profile.mpAccessToken), paymentLinkUrl: profile.acceptsPaymentLink ? (profile.paymentLinkUrl ?? null) : null, bankTransferData: profile.acceptsTransfer ? ((profile.bankTransferData ?? null) as Record<string,string>|null) : null, checkoutUrl: checkoutUrl ?? null }, cancelUrl: `${agendaAppUrl}/cancelar?appt=${appointment.id}&slug=${profile.slug}`, appUrl: agendaAppUrl }).catch((err: any) => console.error('[agenda] Failed to send booking confirmation email:', err));
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
        return c.json({ ok: true, appointment, appointments: insertedAppointments, seriesId: publicSeriesId });
    });

    return app;
}
