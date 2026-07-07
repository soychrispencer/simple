import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, gt, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { google } from 'googleapis';
import { z } from 'zod';
import { getSerenatasGoogleCalendarOAuthClient } from '../../lib/google-auth.js';
import { db } from '../../db/index.js';
import {
    serenataOwners,
    serenataClients,
    serenataGroupInvites,
    serenataGroupMembers,
    serenataGroupServices,
    serenataGroups,
    serenataMusicians,
    serenataOffers,
    serenataProviderGroupMemberInvites,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenatas,
    users,
} from '../../db/schema.js';
import { tryAutoAcceptMarketplaceSerenata } from './auto-accept.js';
import {
    acceptMarketplaceSerenata,
    createMarketplaceSerenata,
    marketplaceSerenataSchema,
    registerMarketplaceRoutes,
    recordProviderGroupRating,
    rejectMarketplaceSerenata,
} from './marketplace.js';
import { scheduleSerenataMessageThread } from '../messages/platform-context-threads.js';
import { assertNoWorkProfileForClientAccount } from './marketplace-client-policy.js';
import {
    assertCanActivateSerenataProfile,
    reconcileExclusiveSerenataProfiles,
    removeSerenataProfilesExcept,
} from './profile-exclusivity.js';
import {
    clientSongSelectionSchema,
    registerRepertoireRoutes,
    syncOwnerSerenataSongSelections,
} from './repertoire.js';
import { listOwnerSerenatas, listMusicianAgenda, listMusicianSerenatas } from './owner-listings.js';
import {
    cancelClientPendingSerenata,
    listOwnerSerenatasNeedingClosure,
    loadOwnerScheduledForReminders,
    maybeSendClosureReminders,
    eventDateYmd,
    resolveOwnerUserId,
    runPendingSerenataLifecycle,
    validateCancelTransition,
    validateClientConfirmTransition,
    validateCompleteTransition,
} from './lifecycle.js';
import {
    toDateRange,
    toNumber,
    validateOwnerAvailability,
    validateGroupForSerenata,
    computeMarketplaceResponseDueAt,
    resolveSlaHours,
} from './availability.js';
import { assignSerenataMusicianGroup } from './assign-group.js';
import {
    OWNER_COLLECTION_METHODS,
    validateOwnerCollectionMethod,
} from './owner-collection-method.js';
import { insertInAppNotifications } from '../../lib/platform-in-app-notifications.js';
import { getUserNotificationPrefs, shouldCreateInAppNotification } from '../../lib/user-notification-prefs.js';
import {
    deliverSerenataAgendaNotification,
    deliverSerenataInvitation,
    deliverSerenataPaymentPendingNotification,
    deliverSerenataRequestNotification,
    flushAssignGroupSideEffects,
} from '../../lib/serenatas-notification-delivery.js';
import {
    listPlatformNotificationsForUser,
    markAllPlatformNotificationsRead,
    markPlatformNotificationRead,
} from '../platform/notifications-service.js';
import { isMercadoPagoConfigured } from '../mercadopago/service.js';
import { APP_COMMISSION_FREE_BPS, COMMISSION_VAT_BPS, defaultSerenataTrialEndsAt } from './plan-config.js';
import { listSerenataBillingHistory } from './billing-history.js';
import {
    listMusicianPayouts,
    listOwnerMusicianPayouts,
    listSerenataMusicianPayouts,
    replaceSerenataMusicianPayouts,
} from './musician-payouts.js';
import { cancelSerenatasProSubscription } from './cancel-subscription.js';
import { buildSerenataMePlanResponse, resolveActiveSerenataBillingPlan } from './plan.js';
import { normalizeTrialEndsAtForDisplay } from '../billing/trial-config.js';
import { loadCurrentSubscriptionFromDb } from '../subscriptions/persist-db.js';
import { sendSerenataGuestGroupInviteEmail } from '../../lib/serenatas-email.js';
import {
    buildGroupInviteSignupUrl,
    buildGroupInviteWhatsAppMessage,
    buildGroupInviteWhatsAppUrl,
    createGroupInviteToken,
    normalizeChileWhatsAppNumber,
} from '../../lib/serenata-group-invite.js';

type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
};

type SerenatasRouterDeps = {
    authUser: (c: Context) => Promise<AuthUser | null>;
    requireVerifiedSession: (c: Context, next: () => Promise<void>) => Promise<Response | void>;
    sanitizeUser?: (user: Record<string, unknown>) => Record<string, unknown>;
    cancelActiveSubscriptionForUser?: (userId: string, vertical: 'serenatas') => void;
};

export type SerenataPaymentTarget = typeof serenatas.$inferSelect;

/** Default false: bloquea POST /client/serenatas por paquetes; marketplace sigue habilitado. */
export function legacySerenataPackagesEnabled(): boolean {
    const raw = process.env.SERENATAS_LEGACY_PACKAGES?.trim().toLowerCase();
    if (!raw) return false;
    return raw === 'true' || raw === '1' || raw === 'yes';
}

const emptyStringToNull = z.preprocess((value) => value === '' ? null : value, z.string().nullable().optional());
const optionalNumber = z.preprocess((value) => value === '' || value == null ? null : Number(value), z.number().finite().nullable().optional());
const optionalInt = z.preprocess((value) => value === '' || value == null ? null : Number(value), z.number().int().nullable().optional());
const dateString = z.string().min(1).transform((value, ctx) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00.000Z`)
        : new Date(value);
    if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Fecha inválida' });
        return z.NEVER;
    }
    return date;
});

const musicianProfileSchema = z.object({
    instrument: emptyStringToNull,
    instruments: z.array(z.string().min(1)).default([]),
    bio: emptyStringToNull,
    comuna: emptyStringToNull,
    region: emptyStringToNull,
    lat: optionalNumber,
    lng: optionalNumber,
    isAvailable: z.boolean().default(true),
    availableNow: z.boolean().default(false),
    experienceYears: z.number().int().min(0).max(80).default(0),
    workZones: z.array(z.string().min(1)).default([]),
    hasInstrument: z.boolean().default(false),
    hasMariachiAttire: z.boolean().default(false),
});

/** PUT parcial: solo valida campos enviados (sin defaults que pisen el perfil existente). */
const musicianProfileUpdateSchema = z.object({
    instrument: emptyStringToNull,
    instruments: z.array(z.string().min(1)).optional(),
    bio: emptyStringToNull,
    comuna: emptyStringToNull,
    region: emptyStringToNull,
    lat: optionalNumber,
    lng: optionalNumber,
    isAvailable: z.boolean().optional(),
    availableNow: z.boolean().optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    workZones: z.array(z.string().min(1)).optional(),
    hasInstrument: z.boolean().optional(),
    hasMariachiAttire: z.boolean().optional(),
});

const ownerProfileSchema = z.object({
    bio: emptyStringToNull,
    comuna: emptyStringToNull,
    region: emptyStringToNull,
    workingComunas: z.array(z.string().min(1)).default([]),
    acceptsUrgent: z.boolean().default(false),
    minPrice: optionalInt,
    maxPrice: optionalInt,
});

const clientProfileSchema = z.object({
    phone: emptyStringToNull,
    comuna: emptyStringToNull,
    region: emptyStringToNull,
});

const optionalUuid = z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.string().uuid().optional(),
);

const serenataWriteSchema = z.object({
    groupId: emptyStringToNull,
    packageCode: emptyStringToNull,
    selectedServiceId: optionalUuid,
    recipientName: z.string().min(2),
    clientPhone: emptyStringToNull,
    address: z.string().min(4),
    comuna: emptyStringToNull,
    region: emptyStringToNull,
    lat: optionalNumber,
    lng: optionalNumber,
    eventDate: dateString,
    eventTime: z.string().min(4).max(10),
    duration: z.number().int().min(15).max(240).default(45),
    price: optionalInt,
    eventType: emptyStringToNull,
    message: emptyStringToNull,
    ownerCollectionMethod: z.enum(OWNER_COLLECTION_METHODS).nullable().optional(),
    songSelections: z.array(clientSongSelectionSchema).max(30).optional(),
});

const serenataPackages = {
    duo: {
        label: 'Dúo romántico',
        musicians: 2,
        duration: 25,
        price: 39000,
        description: 'Formato íntimo para una sorpresa breve y cercana.',
        idealFor: 'Aniversarios, reconciliaciones y celebraciones pequeñas.',
        bullets: ['2 músicos', '25 minutos', 'Precio final'],
    },
    trio: {
        label: 'Trío clásico',
        musicians: 3,
        duration: 30,
        price: 45000,
        description: 'El formato más equilibrado para contratar una serenata tradicional.',
        idealFor: 'Cumpleaños, aniversarios y sorpresas familiares.',
        bullets: ['3 músicos', '30 minutos', 'Más popular'],
        badge: 'Más popular',
    },
    cuarteto: {
        label: 'Cuarteto completo',
        musicians: 4,
        duration: 35,
        price: 60000,
        description: 'Más presencia musical para una experiencia con mayor impacto.',
        idealFor: 'Eventos familiares y celebraciones medianas.',
        bullets: ['4 músicos', '35 minutos', 'Sonido completo'],
    },
    quinteto: {
        label: 'Show premium',
        musicians: 5,
        duration: 45,
        price: 80000,
        description: 'Formato amplio para una presentación más robusta.',
        idealFor: 'Celebraciones especiales y eventos destacados.',
        bullets: ['5 músicos', '45 minutos', 'Formato premium'],
    },
} as const;

const serenataPackageCodeSchema = z.enum(['duo', 'trio', 'cuarteto', 'quinteto']);
type SerenataPackageCode = z.infer<typeof serenataPackageCodeSchema>;

const clientSerenataWriteSchema = serenataWriteSchema.omit({
    duration: true,
    eventType: true,
    price: true,
    packageCode: true,
}).extend({
    packageCode: serenataPackageCodeSchema,
});

const serenataPatchSchema = serenataWriteSchema.partial().extend({
    status: z.enum(['pending', 'scheduled', 'rejected', 'expired', 'cancelled', 'completed']).optional(),
});

const requiredInstrumentsSchema = z.array(z.string().trim().min(1).max(80)).min(1).max(40);

const groupWriteSchema = z.object({
    name: z.string().trim().min(2),
    date: dateString.optional(),
    status: z.enum(['draft', 'active', 'closed']).default('draft'),
    providerGroupId: optionalUuid,
    maxMusicians: z.number().int().min(1).max(40).nullable().optional(),
    requiredInstruments: requiredInstrumentsSchema.optional(),
});

const groupPatchSchema = z.object({
    name: z.string().trim().min(2).optional(),
    status: z.enum(['draft', 'active', 'closed']).optional(),
    requiredInstruments: requiredInstrumentsSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Indica al menos un campo para actualizar.' });

const memberInviteSchema = z.object({
    musicianId: z.string().uuid(),
    instrument: emptyStringToNull,
    slotIndex: z.number().int().min(0).max(39).optional(),
    message: emptyStringToNull,
});

const groupInviteCreateSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('email'),
        email: z.string().trim().email('Correo inválido'),
    }),
    z.object({
        mode: z.literal('whatsapp'),
        phone: z.string().trim().min(8, 'Indica un número de WhatsApp'),
    }),
    z.object({
        mode: z.literal('app'),
        musicianId: z.string().uuid(),
        instrument: emptyStringToNull,
        slotIndex: z.number().int().min(0).max(39).optional(),
    }),
]);

const serenataGroupAssignmentSchema = z.object({
    mode: z.enum(['existing', 'new']),
    groupId: emptyStringToNull,
    name: emptyStringToNull,
    musicianIds: z.array(z.string().uuid()).default([]),
    message: emptyStringToNull,
});

const memberStatusSchema = z.object({
    status: z.enum(['invited', 'accepted', 'rejected', 'cancelled']),
    message: emptyStringToNull,
});

const memberPatchSchema = z.object({
    status: z.enum(['invited', 'accepted', 'rejected', 'cancelled']).optional(),
    message: emptyStringToNull,
    instrument: emptyStringToNull,
    slotIndex: z.number().int().min(0).max(39).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Indica al menos un campo para actualizar.' });

const serenataCancelSchema = z.object({
    cancelReason: z.string().trim().min(3, 'Indica un motivo de al menos 3 caracteres'),
});

const ownerPayoutSchema = z.object({
    status: z.enum(['pending', 'paid']),
    amount: optionalInt,
    reference: emptyStringToNull,
});

function jsonError(
    c: Context,
    error: string,
    status: 400 | 401 | 403 | 404 | 409 | 500 | 503 = 400,
    detail?: string,
) {
    const body: { ok: false; error: string; detail?: string } = { ok: false, error };
    if (detail) body.detail = detail;
    return c.json(body, status);
}

function getNestedErrorMessage(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const parts = [err.message];
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) parts.push(cause.message);
    else if (typeof cause === 'string') parts.push(cause);
    return parts.join('\n');
}

function isSerenataSchemaError(message: string): boolean {
    return /column .* does not exist|relation .* does not exist|violates not-null constraint|null value in column|42703|42P01|23502/i.test(message);
}

function normalizeRequiredInstruments(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function resolveGroupRequiredInstruments(group: { requiredInstruments?: unknown; maxMusicians?: number | null }): string[] {
    const configured = normalizeRequiredInstruments(group.requiredInstruments);
    if (configured.length > 0) return configured;
    const capacity = Math.max(1, Math.min(40, group.maxMusicians ?? 3));
    return Array.from({ length: capacity }, (_, index) => `Músico ${index + 1}`);
}

async function assertGroupSlotAvailable(
    groupId: string,
    slotIndex: number,
    excludeMemberId?: string,
): Promise<string | null> {
    const slotFilters = [
        eq(serenataGroupMembers.groupId, groupId),
        eq(serenataGroupMembers.slotIndex, slotIndex),
        inArray(serenataGroupMembers.status, ['invited', 'accepted']),
    ];
    if (excludeMemberId) slotFilters.push(ne(serenataGroupMembers.id, excludeMemberId));
    const [conflict] = await db.select({ id: serenataGroupMembers.id }).from(serenataGroupMembers).where(and(...slotFilters)).limit(1);
    return conflict ? 'Ese cupo ya está ocupado.' : null;
}

async function getGroupOccupancy(groupId: string) {
    const [members, invites] = await Promise.all([
        db.select({ id: serenataGroupMembers.id }).from(serenataGroupMembers).where(and(
            eq(serenataGroupMembers.groupId, groupId),
            inArray(serenataGroupMembers.status, ['invited', 'accepted']),
        )),
        db.select({ id: serenataGroupInvites.id }).from(serenataGroupInvites).where(and(
            eq(serenataGroupInvites.groupId, groupId),
            eq(serenataGroupInvites.status, 'pending'),
        )),
    ]);
    return members.length + invites.length;
}

function zodFirstFieldError(error: z.ZodError): string {
    const issue = error.issues[0];
    if (!issue) return 'Datos inválidos';
    const field = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : null;
    const fieldLabels: Record<string, string> = {
        instrument: 'Instrumento',
        instruments: 'Instrumentos',
        bio: 'Bio',
        comuna: 'Comuna',
        region: 'Región',
        experienceYears: 'Años de experiencia',
        workZones: 'Zonas de trabajo',
        hasInstrument: 'Instrumento propio',
        hasMariachiAttire: 'Tenida de mariachi',
    };
    const label = field ? fieldLabels[field] ?? field : 'Campo';
    return `${label}: ${issue.message}`;
}

function packageForCode(code: string | null | undefined) {
    if (!code) return null;
    return serenataPackageCodeSchema.safeParse(code).success ? serenataPackages[code as SerenataPackageCode] : null;
}

async function ownerProviderGroup(ownerId: string) {
    return db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.ownerUserId, ownerId),
    });
}

async function activeServiceForProviderGroup(providerGroupId: string, serviceId: string) {
    return db.query.serenataGroupServices.findFirst({
        where: and(
            eq(serenataGroupServices.id, serviceId),
            eq(serenataGroupServices.providerGroupId, providerGroupId),
            eq(serenataGroupServices.isActive, true),
            gt(serenataGroupServices.price, 0),
        ),
    });
}

async function resolveSerenataServiceContext(
    ownerUserId: string,
    input: { selectedServiceId?: string | null; packageCode?: string | null; duration?: number; price?: number | null; eventType?: string | null },
) {
    const providerGroup = await ownerProviderGroup(ownerUserId);
    const legacyPackage = packageForCode(input.packageCode);
    if (input.selectedServiceId) {
        if (!providerGroup) {
            return { ok: false as const, error: 'Configura tu mariachi antes de registrar serenatas.', status: 400 };
        }
        const service = await activeServiceForProviderGroup(providerGroup.id, input.selectedServiceId);
        if (!service) {
            return { ok: false as const, error: 'Servicio no válido o inactivo.', status: 400 };
        }
        return {
            ok: true as const,
            providerGroup,
            service,
            legacyPackage: null,
            duration: service.durationMinutes,
            eventType: service.name,
            price: input.price ?? service.price,
            requiredMusicians: service.musiciansCount,
            packageCode: null,
            selectedServiceId: service.id,
        };
    }
    if (!legacySerenataPackagesEnabled() && !legacyPackage) {
        return {
            ok: false as const,
            error: 'Selecciona un servicio activo de Mi negocio → Servicios.',
            status: 400,
        };
    }
    return {
        ok: true as const,
        providerGroup,
        service: null,
        legacyPackage,
        duration: legacyPackage?.duration ?? input.duration ?? 45,
        eventType: legacyPackage?.label ?? input.eventType ?? null,
        price: input.price ?? legacyPackage?.price ?? null,
        requiredMusicians: legacyPackage?.musicians ?? 0,
        packageCode: legacyPackage ? input.packageCode ?? null : input.packageCode ?? null,
        selectedServiceId: null,
    };
}

async function createPlatformOffersForSerenata(serenata: { id: string; comuna: string | null; region: string | null; price: number | null; eventDate: Date }) {
    const owners = await db
        .select({
            id: serenataOwners.id,
            userId: serenataOwners.userId,
            comuna: serenataOwners.comuna,
            region: serenataOwners.region,
            workingComunas: serenataOwners.workingComunas,
            minPrice: serenataOwners.minPrice,
            name: users.name,
        })
        .from(serenataOwners)
        .innerJoin(users, eq(users.id, serenataOwners.userId));

    const candidates = owners
        .filter((owner) => {
            const workingComunas = Array.isArray(owner.workingComunas) ? owner.workingComunas : [];
            const matchesComuna = serenata.comuna
                ? workingComunas.includes(serenata.comuna) || owner.comuna === serenata.comuna
                : true;
            const matchesRegion = serenata.region ? owner.region === serenata.region || workingComunas.length > 0 : true;
            const matchesPrice = owner.minPrice == null || serenata.price == null || serenata.price >= owner.minPrice;
            return matchesComuna && matchesRegion && matchesPrice;
        })
        .sort((a, b) => {
            const aComunas = Array.isArray(a.workingComunas) ? a.workingComunas : [];
            const bComunas = Array.isArray(b.workingComunas) ? b.workingComunas : [];
            const aSame = serenata.comuna && (a.comuna === serenata.comuna || aComunas.includes(serenata.comuna)) ? 0 : 1;
            const bSame = serenata.comuna && (b.comuna === serenata.comuna || bComunas.includes(serenata.comuna)) ? 0 : 1;
            if (aSame !== bSame) return aSame - bSame;
            return a.name.localeCompare(b.name);
        })
        .slice(0, 3);

    if (candidates.length === 0) return [];
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const offers = await db.insert(serenataOffers).values(candidates.map((owner, index) => ({
        serenataId: serenata.id,
        ownerId: owner.id,
        status: 'offered',
        rank: index + 1,
        expiresAt,
    }))).onConflictDoNothing().returning();

    await insertInAppNotifications(
        candidates.map((owner) => ({
            userId: owner.userId,
            type: 'platform_serenata_offer',
            title: 'Nueva serenata de la aplicación',
            message: `${serenata.comuna ?? 'Comuna por confirmar'} · ${new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(serenata.eventDate)}.`,
            metadata: { serenataId: serenata.id },
        })),
        { onConflictDoNothing: true },
    );

    return offers;
}

export async function getSerenataPaymentTarget(userId: string, serenataId: string): Promise<SerenataPaymentTarget | null> {
    const [row] = await db
        .select({ item: serenatas })
        .from(serenatas)
        .innerJoin(serenataClients, eq(serenataClients.id, serenatas.clientId))
        .where(and(eq(serenatas.id, serenataId), eq(serenataClients.userId, userId)))
        .limit(1);
    return row?.item ?? null;
}

export async function attachSerenataPaymentOrder(userId: string, serenataId: string, orderId: string): Promise<SerenataPaymentTarget | null> {
    const target = await getSerenataPaymentTarget(userId, serenataId);
    if (!target || target.status !== 'payment_pending') return null;
    const [item] = await db.update(serenatas).set({
        paymentOrderId: orderId,
        paymentStatus: 'pending',
        updatedAt: new Date(),
    }).where(eq(serenatas.id, serenataId)).returning();
    return item ?? null;
}

export async function markSerenataPaymentFailed(userId: string, serenataId: string): Promise<SerenataPaymentTarget | null> {
    const target = await getSerenataPaymentTarget(userId, serenataId);
    if (!target || target.status !== 'payment_pending') return null;
    const [item] = await db.update(serenatas).set({
        paymentStatus: 'failed',
        updatedAt: new Date(),
    }).where(eq(serenatas.id, serenataId)).returning();
    return item ?? null;
}

async function notifyPaidMarketplaceSerenataToOwner(item: SerenataPaymentTarget) {
    if (!item.providerGroupId || !item.ownerId) return;
    const owner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.id, item.ownerId) });
    if (!owner) return;

    const requestTitle = item.flexibleSchedule ? 'Solicitud pagada sin hora definida' : 'Nueva solicitud pagada';
    const requestMessage = item.flexibleSchedule
        ? `${item.recipientName} · fecha ${eventDateYmd(item.eventDate) ?? 'por confirmar'} (horario por confirmar)`
        : `${item.comuna ?? 'Comuna por confirmar'} · ${item.recipientName}`;

    await insertInAppNotifications({
        userId: owner.userId,
        type: 'provider_group_request',
        title: requestTitle,
        message: requestMessage,
        metadata: { serenataId: item.id, providerGroupId: item.providerGroupId },
    });
    void deliverSerenataRequestNotification(owner.userId, {
        title: requestTitle,
        message: requestMessage,
        panelPath: `/panel/solicitudes?serenata=${encodeURIComponent(item.id)}`,
    });
}

export async function publishPaidSerenataToOwners(userId: string, serenataId: string, orderId: string): Promise<{ item: SerenataPaymentTarget; offersCount: number } | null> {
    const target = await getSerenataPaymentTarget(userId, serenataId);
    if (!target) return null;
    if (target.status !== 'payment_pending' && target.paymentStatus === 'paid') {
        return { item: target, offersCount: 0 };
    }
    if (target.status !== 'payment_pending') return null;

    let responseDueAt: Date | undefined;
    if (target.providerGroupId) {
        const group = await db.query.serenataProviderGroups.findFirst({
            where: eq(serenataProviderGroups.id, target.providerGroupId),
        });
        responseDueAt = computeMarketplaceResponseDueAt(new Date(), group?.slaHours);
    }

    const [item] = await db.update(serenatas).set({
        status: target.flexibleSchedule ? 'pending_open' : 'pending',
        paymentStatus: 'paid',
        paymentOrderId: orderId,
        paidAt: new Date(),
        ...(responseDueAt ? { responseDueAt } : {}),
        updatedAt: new Date(),
    }).where(and(eq(serenatas.id, serenataId), eq(serenatas.status, 'payment_pending'))).returning();
    if (!item) return null;

    if (item.providerGroupId) {
        await notifyPaidMarketplaceSerenataToOwner(item);
        if (item.ownerId) {
            await tryAutoAcceptMarketplaceSerenata(item.ownerId, item.id, validateOwnerAvailability);
        }
        return { item, offersCount: 0 };
    }
    if (!legacySerenataPackagesEnabled()) {
        return { item, offersCount: 0 };
    }

    const offers = await createPlatformOffersForSerenata({
        id: item.id,
        comuna: item.comuna,
        region: item.region,
        price: item.price,
        eventDate: item.eventDate,
    });
    return { item, offersCount: offers.length };
}


function relativeNotificationTime(createdAt: Date) {
    const diffMs = Date.now() - createdAt.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60_000));
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} d`;
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(createdAt);
}

function notificationHref(metadata: Record<string, unknown> | null, type?: string) {
    const serenataId = typeof metadata?.serenataId === 'string' ? metadata.serenataId : null;
    if (serenataId) {
        if (type?.startsWith('client_')) {
            return `/panel/serenatas?serenata=${encodeURIComponent(serenataId)}`;
        }
        return `/panel/solicitudes?serenata=${encodeURIComponent(serenataId)}`;
    }
    if (type === 'provider_group_invitation' || type === 'group_invitation') {
        return '/panel/invitaciones';
    }
    return '/panel';
}

async function getProfiles(userId: string) {
    const [client, musician, owner] = await Promise.all([
        db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, userId) }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId) }),
        db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId) }),
    ]);
    return {
        client: client ?? null,
        musician: musician ?? null,
        owner: owner ?? null,
    };
}

type SerenataActorRole = 'client' | 'musician' | 'owner';

function resolveActorRole(
    requested: string | undefined,
    profiles: Awaited<ReturnType<typeof getProfiles>>,
): SerenataActorRole | null {
    if (requested === 'client' && profiles.client) return 'client';
    if (requested === 'musician' && profiles.musician) return 'musician';
    if (requested === 'owner' && profiles.owner) return 'owner';
    return null;
}

/** Sin `as`, dueño tiene prioridad (una cuenta = un perfil). */
function defaultActorRole(profiles: Awaited<ReturnType<typeof getProfiles>>): SerenataActorRole | null {
    if (profiles.owner) return 'owner';
    if (profiles.musician) return 'musician';
    if (profiles.client) return 'client';
    return null;
}

function resolveActorRoleFromRequest(
    c: Context,
    profiles: Awaited<ReturnType<typeof getProfiles>>,
): SerenataActorRole | null {
    return resolveActorRole(c.req.query('as'), profiles) ?? defaultActorRole(profiles);
}

async function requireOwner(c: Context, userId: string): Promise<
    | { ok: false; response: Response }
    | { ok: true; owner: typeof serenataOwners.$inferSelect }
> {
    const owner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId) });
    if (!owner) {
        return {
            ok: false as const,
            response: jsonError(
                c,
                'Activa tu perfil de dueño desde Mi cuenta antes de continuar.',
                403,
            ),
        };
    }
    return { ok: true as const, owner };
}

async function requireMusician(c: Context, userId: string) {
    const musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId) });
    if (!musician) return { ok: false as const, response: jsonError(c, 'Activa el perfil músico para continuar.', 403) };
    return { ok: true as const, musician };
}

async function ensureClientProfile(user: AuthUser, fallback: { phone?: string | null; comuna?: string | null; region?: string | null } = {}) {
    const existing = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
    if (existing) return existing;
    const [profile] = await db.insert(serenataClients).values({
        userId: user.id,
        phone: fallback.phone ?? null,
        comuna: fallback.comuna ?? null,
        region: fallback.region ?? null,
    }).returning();
    return profile;
}

async function notifySerenataClient(clientId: string | null, payload: { type: string; title: string; message: string; serenataId: string }) {
    if (!clientId) return;
    const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, clientId) });
    if (!client) return;
    await insertInAppNotifications({
        userId: client.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: { serenataId: payload.serenataId },
    });
    void deliverSerenataRequestNotification(client.userId, {
        title: payload.title,
        message: payload.message,
        panelPath: `/panel/serenatas?serenata=${encodeURIComponent(payload.serenataId)}`,
    });
}

export function createSerenatasRouter(deps: SerenatasRouterDeps) {
    const app = new Hono();

    app.use('*', async (c, next) => {
        if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'OPTIONS') {
            return next();
        }
        return deps.requireVerifiedSession(c, next);
    });

    app.get('/notifications', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const prefs = await getUserNotificationPrefs(user.id);
        if (!shouldCreateInAppNotification(prefs)) {
            return c.json({ ok: true, items: [] });
        }
        const rows = await listPlatformNotificationsForUser(user.id, {
            unreadOnly: true,
            limit: 10,
            vertical: 'serenatas',
        });
        return c.json({
            ok: true,
            items: rows.map((item) => ({
                id: item.id,
                kind: item.type,
                type:
                    item.type === 'group_invitation'
                    || item.type === 'provider_group_invitation'
                    || item.type === 'provider_group_application_approved'
                    || item.type === 'provider_group_application_rejected'
                        ? 'message_thread'
                        : 'activity',
                title: item.title,
                time: relativeNotificationTime(item.createdAt),
                href: notificationHref(item.metadata ?? null, item.type),
                createdAt: item.createdAt.getTime(),
                isRead: item.isRead,
            })),
        });
    });

    app.post('/notifications/:id/read', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const notificationId = c.req.param('id');
        const ok = await markPlatformNotificationRead(user.id, notificationId);
        if (!ok) return jsonError(c, 'Notificación no encontrada', 404);
        return c.json({ ok: true });
    });

    app.post('/notifications/mark-all-read', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        await markAllPlatformNotificationsRead(user.id);
        return c.json({ ok: true });
    });

    app.get('/profiles', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        await reconcileExclusiveSerenataProfiles(user.id);
        const profiles = await getProfiles(user.id);
        const publicUser = deps.sanitizeUser ? deps.sanitizeUser(user as Record<string, unknown>) : user;
        return c.json({ ok: true, user: publicUser, profiles });
    });

    app.get('/me/plan', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        let plan: Awaited<ReturnType<typeof resolveActiveSerenataBillingPlan>> = 'free';
        try {
            const dbSub = await loadCurrentSubscriptionFromDb(user.id, 'serenatas');
            if (!dbSub && deps.cancelActiveSubscriptionForUser) {
                deps.cancelActiveSubscriptionForUser(user.id, 'serenatas');
            }
            plan = await resolveActiveSerenataBillingPlan(user.id);
        } catch (err) {
            console.error('[serenatas/me/plan] DB error:', err);
            return jsonError(
                c,
                'No pudimos consultar tu suscripción. Si acabas de actualizar el servidor, aplica las migraciones pendientes.',
                503,
            );
        }
        const ownerProfile = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
        let trialEndsAt = ownerProfile?.trialEndsAt ?? null;
        if (ownerProfile && plan === 'free' && !trialEndsAt) {
            trialEndsAt = defaultSerenataTrialEndsAt(ownerProfile.createdAt ?? new Date());
            await db
                .update(serenataOwners)
                .set({ trialEndsAt, updatedAt: new Date() })
                .where(eq(serenataOwners.id, ownerProfile.id));
        } else if (ownerProfile && plan === 'free' && trialEndsAt) {
            trialEndsAt = normalizeTrialEndsAtForDisplay(
                trialEndsAt,
                ownerProfile.createdAt ?? new Date(),
            );
        }
        return c.json({
            ok: true,
            ...buildSerenataMePlanResponse(plan, {
                proCheckoutAvailable: isMercadoPagoConfigured(),
                trialEndsAt,
            }),
        });
    });

    app.post('/me/subscription/cancel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const result = await cancelSerenatasProSubscription(user.id, {
            clearInMemorySubscription: deps.cancelActiveSubscriptionForUser
                ? (uid) => deps.cancelActiveSubscriptionForUser!(uid, 'serenatas')
                : undefined,
        });
        if (!result.ok) return jsonError(c, result.error, 400);
        return c.json({ ok: true, message: result.message });
    });

    app.get('/me/billing-history', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const items = await listSerenataBillingHistory(user.id);
        return c.json({ ok: true, items });
    });

    app.get('/serenatas/owner/musician-payouts', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const statusRaw = c.req.query('status')?.trim();
        const status = statusRaw === 'pending' || statusRaw === 'paid' ? statusRaw : undefined;
        const items = await listOwnerMusicianPayouts(required.owner.id, status);
        return c.json({ ok: true, items });
    });

    app.get('/serenatas/musician/payouts', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireMusician(c, user.id);
        if (!required.ok) return required.response;
        const statusRaw = c.req.query('status')?.trim();
        const status = statusRaw === 'pending' || statusRaw === 'paid' ? statusRaw : undefined;
        const items = await listMusicianPayouts(required.musician.id, status);
        return c.json({ ok: true, items });
    });

    app.get('/serenatas/:id/payouts', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const items = await listSerenataMusicianPayouts(c.req.param('id'), required.owner.id);
        return c.json({ ok: true, items });
    });

    app.put('/serenatas/:id/payouts', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const body = await c.req.json().catch(() => null);
        const lines = Array.isArray(body?.lines) ? body.lines : [];
        const parsed = z.array(z.object({
            musicianId: z.string().uuid().nullable().optional(),
            musicianName: z.string().max(160).nullable().optional(),
            amount: z.number().int().min(1),
            status: z.enum(['pending', 'paid']).optional(),
            paymentMethod: z.string().max(24).nullable().optional(),
            notes: z.string().max(500).nullable().optional(),
        })).safeParse(lines);
        if (!parsed.success) return jsonError(c, 'Datos de pago inválidos', 400);
        const result = await replaceSerenataMusicianPayouts(required.owner.id, c.req.param('id'), parsed.data);
        if (!result.ok) return jsonError(c, result.error, 404);
        return c.json({ ok: true, items: result.items });
    });

    app.get('/packages', async (c) => {
        const items = Object.entries(serenataPackages).map(([code, item]) => ({ code, ...item }));
        return c.json({ ok: true, items });
    });

    app.put('/profiles/client', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const clientPolicy = await assertNoWorkProfileForClientAccount(user.id);
        if (!clientPolicy.ok) return jsonError(c, clientPolicy.error, clientPolicy.status);
        const parsed = clientProfileSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Perfil cliente inválido');
        const existing = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        const values = { ...parsed.data, updatedAt: new Date() };
        const [profile] = existing
            ? await db.update(serenataClients).set(values).where(eq(serenataClients.id, existing.id)).returning()
            : await db.insert(serenataClients).values({ userId: user.id, ...values }).returning();
        return c.json({ ok: true, profile });
    });

    app.put('/profiles/musician', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const exclusivity = await assertCanActivateSerenataProfile(user.id, 'musician');
        if (!exclusivity.ok) return jsonError(c, exclusivity.error, exclusivity.status);
        const parsed = musicianProfileUpdateSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) {
            return c.json(
                { ok: false, error: zodFirstFieldError(parsed.error), details: parsed.error.flatten() },
                400,
            );
        }
        const existing = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
        const patch = parsed.data;
        const nextInstrument = patch.instrument !== undefined ? patch.instrument : existing?.instrument ?? null;
        const nextInstruments = patch.instruments !== undefined
            ? patch.instruments
            : patch.instrument !== undefined
                ? (patch.instrument ? [patch.instrument] : [])
                : existing?.instruments ?? [];
        const values = {
            instrument: nextInstrument,
            instruments: nextInstruments,
            bio: patch.bio !== undefined ? patch.bio : existing?.bio ?? null,
            comuna: patch.comuna !== undefined ? patch.comuna : existing?.comuna ?? null,
            region: patch.region !== undefined ? patch.region : existing?.region ?? null,
            lat: patch.lat !== undefined
                ? (patch.lat == null ? null : String(patch.lat))
                : existing?.lat ?? null,
            lng: patch.lng !== undefined
                ? (patch.lng == null ? null : String(patch.lng))
                : existing?.lng ?? null,
            isAvailable: patch.isAvailable !== undefined ? patch.isAvailable : existing?.isAvailable ?? true,
            availableNow: patch.availableNow !== undefined ? patch.availableNow : existing?.availableNow ?? false,
            experienceYears: patch.experienceYears !== undefined ? patch.experienceYears : existing?.experienceYears ?? 0,
            workZones: patch.workZones !== undefined ? patch.workZones : existing?.workZones ?? [],
            hasInstrument: patch.hasInstrument !== undefined ? patch.hasInstrument : existing?.hasInstrument ?? false,
            hasMariachiAttire: patch.hasMariachiAttire !== undefined ? patch.hasMariachiAttire : existing?.hasMariachiAttire ?? false,
            updatedAt: new Date(),
        };
        if (values.hasInstrument === false) {
            values.instrument = null;
            values.instruments = [];
        }
        const [profile] = existing
            ? await db.update(serenataMusicians).set(values).where(eq(serenataMusicians.id, existing.id)).returning()
            : await db.insert(serenataMusicians).values({ userId: user.id, ...values }).returning();
        return c.json({ ok: true, profile });
    });

    const upsertOwnerProfile = async (c: Context) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const exclusivity = await assertCanActivateSerenataProfile(user.id, 'owner');
        if (!exclusivity.ok) return jsonError(c, exclusivity.error, exclusivity.status);
        const parsed = ownerProfileSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Perfil de dueño inválido');
        const values = { ...parsed.data, updatedAt: new Date() };
        const existing = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
        const [profile] = existing
            ? await db.update(serenataOwners).set(values).where(eq(serenataOwners.id, existing.id)).returning()
            : await db.insert(serenataOwners).values({
                userId: user.id,
                ...values,
                subscriptionStatus: 'trialing',
                subscriptionPrice: 0,
                trialEndsAt: defaultSerenataTrialEndsAt(),
            }).returning();
        return c.json({ ok: true, profile });
    };

    app.put('/profiles/owner', upsertOwnerProfile);

    const startOwnerTrial = async (c: Context) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const existing = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
        if (existing) return c.json({ ok: true, profile: existing });

        const musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
        const exclusivity = await assertCanActivateSerenataProfile(user.id, 'owner');
        if (!exclusivity.ok) return jsonError(c, exclusivity.error, exclusivity.status);

        const [profile] = await db.insert(serenataOwners).values({
            userId: user.id,
            bio: musician?.bio ?? null,
            comuna: musician?.comuna ?? null,
            region: musician?.region ?? null,
            workingComunas: musician && musician.workZones.length > 0
                ? musician.workZones
                : musician?.comuna
                    ? [musician.comuna]
                    : [],
            subscriptionStatus: 'trialing',
            subscriptionPrice: 0,
            commissionRateBps: APP_COMMISSION_FREE_BPS,
            commissionVatRateBps: COMMISSION_VAT_BPS,
            trialEndsAt: defaultSerenataTrialEndsAt(),
        }).returning();
        await removeSerenataProfilesExcept(user.id, 'owner');
        return c.json({ ok: true, profile }, 201);
    };

    app.post('/subscriptions/owner/start-trial', startOwnerTrial);

    app.get('/musicians', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const rows = await db
            .select({
                id: serenataMusicians.id,
                userId: serenataMusicians.userId,
                name: users.name,
                avatarUrl: users.avatarUrl,
                instrument: serenataMusicians.instrument,
                instruments: serenataMusicians.instruments,
                bio: serenataMusicians.bio,
                comuna: serenataMusicians.comuna,
                region: serenataMusicians.region,
                workZones: serenataMusicians.workZones,
                isAvailable: serenataMusicians.isAvailable,
                availableNow: serenataMusicians.availableNow,
                experienceYears: serenataMusicians.experienceYears,
            })
            .from(serenataMusicians)
            .innerJoin(users, eq(users.id, serenataMusicians.userId))
            .orderBy(asc(users.name));
        return c.json({ ok: true, items: rows });
    });

    app.get('/musicians/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const musicianId = c.req.param('id');
        const [row] = await db
            .select({
                id: serenataMusicians.id,
                userId: serenataMusicians.userId,
                name: users.name,
                avatarUrl: users.avatarUrl,
                instrument: serenataMusicians.instrument,
                instruments: serenataMusicians.instruments,
                bio: serenataMusicians.bio,
                comuna: serenataMusicians.comuna,
                region: serenataMusicians.region,
                workZones: serenataMusicians.workZones,
                isAvailable: serenataMusicians.isAvailable,
                availableNow: serenataMusicians.availableNow,
                experienceYears: serenataMusicians.experienceYears,
            })
            .from(serenataMusicians)
            .innerJoin(users, eq(users.id, serenataMusicians.userId))
            .where(eq(serenataMusicians.id, musicianId))
            .limit(1);
        if (!row) return jsonError(c, 'Músico no encontrado', 404);
        return c.json({ ok: true, item: row });
    });

    app.get('/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);

        const serenataListDbError = (err: unknown, phase: string) => {
            const message = getNestedErrorMessage(err);
            const missingSchema = isSerenataSchemaError(message);
            console.error('[serenatas] list failed', { phase, userId: user.id, message, err });
            return jsonError(
                c,
                missingSchema
                    ? 'El servidor necesita aplicar migraciones de Serenatas. Intenta en unos minutos o contacta soporte.'
                    : 'No pudimos cargar las serenatas.',
                missingSchema ? 503 : 500,
                message,
            );
        };

        let profiles: Awaited<ReturnType<typeof getProfiles>>;
        try {
            profiles = await getProfiles(user.id);
        } catch (err) {
            return serenataListDbError(err, 'getProfiles');
        }

        const role = resolveActorRoleFromRequest(c, profiles);
        const range = toDateRange(c.req.query('date'));

        if (role === 'owner' && profiles.owner) {
            try {
                await runPendingSerenataLifecycle();
            } catch (lifecycleErr) {
                const msg = lifecycleErr instanceof Error ? lifecycleErr.message : String(lifecycleErr);
                console.error('[serenatas] lifecycle on list failed (non-blocking)', { message: msg, err: lifecycleErr });
            }

            try {
                if (c.req.query('needsClosure') === '1') {
                    const items = await listOwnerSerenatasNeedingClosure(profiles.owner.id);
                    return c.json({ ok: true, items });
                }
                const items = await listOwnerSerenatas(profiles.owner, range);
                try {
                    const ownerUserId = await resolveOwnerUserId(profiles.owner.id);
                    if (ownerUserId) {
                        const reminderCandidates = await loadOwnerScheduledForReminders(profiles.owner.id);
                        await maybeSendClosureReminders(ownerUserId, reminderCandidates);
                    }
                } catch (reminderErr) {
                    const msg = reminderErr instanceof Error ? reminderErr.message : String(reminderErr);
                    console.error('[serenatas] closure reminders on list failed (non-blocking)', { message: msg, err: reminderErr });
                }
                return c.json({ ok: true, items });
            } catch (err) {
                return serenataListDbError(err, 'listOwner');
            }
        }

        if (role === 'musician' && profiles.musician) {
            try {
                const items = await listMusicianSerenatas(profiles.musician, range);
                return c.json({ ok: true, items });
            } catch (err) {
                return serenataListDbError(err, 'listMusician');
            }
        }

        return c.json({ ok: true, items: [] });
    });

    app.get('/client/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const clientPolicy = await assertNoWorkProfileForClientAccount(user.id);
        if (!clientPolicy.ok) return c.json({ ok: true, items: [] });
        await runPendingSerenataLifecycle();
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return c.json({ ok: true, items: [] });
        const range = toDateRange(c.req.query('date'));
        const conditions = [eq(serenatas.clientId, client.id)];
        if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
        const rows = await db
            .select({
                item: serenatas,
                providerGroupSlug: serenataProviderGroups.slug,
            })
            .from(serenatas)
            .leftJoin(serenataProviderGroups, eq(serenataProviderGroups.id, serenatas.providerGroupId))
            .where(and(...conditions))
            .orderBy(desc(serenatas.eventDate), asc(serenatas.eventTime));
        return c.json({
            ok: true,
            items: rows.map((row) => ({
                ...row.item,
                providerGroupSlug: row.providerGroupSlug ?? null,
            })),
        });
    });

    app.post('/client/serenatas/:id/cancel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const clientPolicy = await assertNoWorkProfileForClientAccount(user.id);
        if (!clientPolicy.ok) return jsonError(c, clientPolicy.error, clientPolicy.status);
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return jsonError(c, 'Perfil de cliente no encontrado', 404);
        const parsed = z.object({ cancelReason: z.string().trim().optional() }).safeParse(await c.req.json().catch(() => ({})));
        const result = await cancelClientPendingSerenata(
            client.id,
            user.id,
            c.req.param('id'),
            parsed.success ? parsed.data.cancelReason : undefined,
        );
        if (!result.ok) return jsonError(c, result.error, result.status);
        return c.json({ ok: true, item: result.item });
    });

    app.post('/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        const serviceContext = await resolveSerenataServiceContext(user.id, parsed.data);
        if (!serviceContext.ok) return jsonError(c, serviceContext.error, 400);
        const conflict = await validateGroupForSerenata(db, {
            ownerId: required.owner.id,
            groupId: parsed.data.groupId,
            requiredMusicians: serviceContext.requiredMusicians,
            eventDate: parsed.data.eventDate,
            eventTime: parsed.data.eventTime,
            duration: serviceContext.duration,
        });
        if (conflict) return jsonError(c, conflict, 409);
        const { songSelections = [], ownerCollectionMethod, ...serenataFields } = parsed.data;
        if (songSelections.length > 0) {
            if (!serviceContext.service || !serviceContext.providerGroup) {
                return jsonError(c, 'Selecciona un servicio para registrar canciones del repertorio.', 400);
            }
        }
        const collectionCheck = validateOwnerCollectionMethod(ownerCollectionMethod);
        if (!collectionCheck.ok) return jsonError(c, collectionCheck.error, 400);
        const songsIncludedAtBooking = serviceContext.service
            ? Math.max(serviceContext.service.songsIncluded ?? 0, songSelections.length)
            : 0;
        const hasRepertoire = songsIncludedAtBooking > 0;
        const [item] = await db.insert(serenatas).values({
            ...serenataFields,
            ownerId: required.owner.id,
            providerGroupId: serviceContext.providerGroup?.id ?? null,
            selectedServiceId: serviceContext.selectedServiceId,
            packageCode: serviceContext.packageCode,
            ownerCollectionMethod: collectionCheck.method,
            source: 'own_lead',
            status: 'scheduled',
            duration: serviceContext.duration,
            eventType: serviceContext.eventType,
            price: serviceContext.price,
            setlistStatus: 'confirmed',
            songsIncludedAtBooking: hasRepertoire ? songsIncludedAtBooking : 0,
            setlistConfirmedAt: new Date(),
            lat: parsed.data.lat == null ? null : String(parsed.data.lat),
            lng: parsed.data.lng == null ? null : String(parsed.data.lng),
        }).returning();
        if (item && serviceContext.service && serviceContext.providerGroup && songSelections.length > 0) {
            const songSync = await syncOwnerSerenataSongSelections(
                item.id,
                serviceContext.providerGroup.id,
                serviceContext.service,
                songSelections,
            );
            if (!songSync.ok) return jsonError(c, songSync.error, 400);
        }
        if (item) {
            scheduleSerenataMessageThread({
                id: item.id,
                ownerId: item.ownerId,
                clientId: item.clientId,
                providerGroupId: item.providerGroupId,
                message: item.message,
            });
        }
        return c.json({ ok: true, item }, 201);
    });

    app.post('/client/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const clientPolicy = await assertNoWorkProfileForClientAccount(user.id);
        if (!clientPolicy.ok) return jsonError(c, clientPolicy.error, clientPolicy.status);
        const rawBody = await c.req.json().catch(() => null);
        const marketplaceParsed = marketplaceSerenataSchema.safeParse(rawBody);
        if (marketplaceParsed.success) {
            const result = await createMarketplaceSerenata(user, marketplaceParsed.data, { ensureClientProfile });
            if (!result.ok) return jsonError(c, result.error, result.status ?? 409);
            return c.json({ ok: true, item: result.item, offersCount: 0 }, 201);
        }
        const parsed = clientSerenataWriteSchema.safeParse(rawBody);
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        if (!legacySerenataPackagesEnabled()) {
            return jsonError(
                c,
                'El contrato por paquetes legacy está deshabilitado. Solicita una serenata desde el marketplace de grupos.',
                400,
            );
        }
        const serenataPackage = serenataPackages[parsed.data.packageCode];
        const { packageCode: _packageCode, ...payload } = parsed.data;
        if (!payload.comuna || !payload.region) {
            return jsonError(c, 'Selecciona una dirección completa con comuna y región.');
        }
        const client = await ensureClientProfile(user, {
            phone: payload.clientPhone,
            comuna: payload.comuna,
            region: payload.region,
        });
        const [item] = await db.insert(serenatas).values({
            ...payload,
            clientId: client.id,
            clientPhone: payload.clientPhone ?? client.phone,
            ownerId: null,
            groupId: null,
            packageCode: parsed.data.packageCode,
            duration: serenataPackage.duration,
            eventType: serenataPackage.label,
            price: serenataPackage.price,
            source: 'platform_lead',
            status: 'payment_pending',
            paymentStatus: 'pending',
            lat: payload.lat == null ? null : String(payload.lat),
            lng: payload.lng == null ? null : String(payload.lng),
        }).returning();
        void deliverSerenataPaymentPendingNotification(user.id, {
            title: 'Completa el pago de tu serenata',
            message: `Finaliza el pago para publicar la serenata de ${item.recipientName}.`,
            serenataLabel: item.recipientName,
            panelPath: `/panel/serenatas?serenata=${encodeURIComponent(item.id)}`,
        });
        scheduleSerenataMessageThread({
            id: item.id,
            ownerId: item.ownerId,
            clientId: item.clientId,
            providerGroupId: item.providerGroupId,
            message: item.message,
        });
        return c.json({ ok: true, item, offersCount: 0 }, 201);
    });

    app.post('/serenatas/platform', async (c) => {
        const user = await deps.authUser(c);
        if (!user || !['admin', 'superadmin'].includes(user.role)) return jsonError(c, 'No autorizado', 403);
        const parsed = serenataWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        const [item] = await db.insert(serenatas).values({
            ...parsed.data,
            ownerId: null,
            source: 'platform_lead',
            status: 'pending',
            lat: parsed.data.lat == null ? null : String(parsed.data.lat),
            lng: parsed.data.lng == null ? null : String(parsed.data.lng),
        }).returning();
        const offers = legacySerenataPackagesEnabled()
            ? await createPlatformOffersForSerenata({
                id: item.id,
                comuna: item.comuna,
                region: item.region,
                price: item.price,
                eventDate: item.eventDate,
            })
            : [];
        return c.json({ ok: true, item, offers }, 201);
    });

    app.post('/serenatas/:id/accept-offer', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const marketplaceSerenata = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (marketplaceSerenata?.providerGroupId) {
            const marketplaceResult = await acceptMarketplaceSerenata(
                required.owner.id,
                id,
                validateOwnerAvailability,
            );
            if (marketplaceResult.ok) {
                return c.json({ ok: true, item: marketplaceResult.item });
            }
            return jsonError(c, marketplaceResult.error, 409);
        }
        const result = await db.transaction(async (tx) => {
            const offer = await tx.query.serenataOffers.findFirst({
                where: and(eq(serenataOffers.serenataId, id), eq(serenataOffers.ownerId, required.owner.id), eq(serenataOffers.status, 'offered')),
            });
            if (!offer) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };
            const pendingSerenata = await tx.query.serenatas.findFirst({
                where: and(eq(serenatas.id, id), eq(serenatas.source, 'platform_lead'), eq(serenatas.status, 'pending')),
            });
            if (!pendingSerenata) return { ok: false as const, error: 'Esta solicitud ya fue tomada por otro grupo.' };
            const availabilityError = await validateOwnerAvailability(tx, {
                ownerId: required.owner.id,
                serenata: { ...pendingSerenata, ownerId: required.owner.id },
            });
            if (availabilityError) return { ok: false as const, error: availabilityError };
            const [item] = await tx.update(serenatas).set({
                ownerId: required.owner.id,
                status: 'accepted_pending_group',
                updatedAt: new Date(),
            }).where(and(eq(serenatas.id, id), eq(serenatas.source, 'platform_lead'), eq(serenatas.status, 'pending'))).returning();
            if (!item) return { ok: false as const, error: 'Esta solicitud ya fue tomada por otro grupo.' };
            await tx.update(serenataOffers).set({ status: 'accepted', respondedAt: new Date(), updatedAt: new Date() }).where(eq(serenataOffers.id, offer.id));
            await tx.update(serenataOffers).set({ status: 'expired', updatedAt: new Date() }).where(and(eq(serenataOffers.serenataId, id), eq(serenataOffers.status, 'offered')));
            if (item.clientId) {
                const client = await tx.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
                if (client) {
                    await insertInAppNotifications({
                        userId: client.userId,
                        type: 'client_serenata_accepted',
                        title: 'Grupo asignado',
                        message: 'El grupo aceptó tu serenata y está organizando el evento.',
                        metadata: { serenataId: item.id },
                    }, { tx });
                }
            }
            return { ok: true as const, item };
        });
        if (!result.ok) return jsonError(c, result.error, 409);
        if (result.item) {
            scheduleSerenataMessageThread({
                id: result.item.id,
                ownerId: result.item.ownerId,
                clientId: result.item.clientId,
                providerGroupId: result.item.providerGroupId,
                message: result.item.message,
            });
        }
        return c.json({ ok: true, item: result.item });
    });

    app.post('/serenatas/:id/reject-offer', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const parsed = z.object({
            reason: z.string().trim().min(3).max(500).optional(),
        }).safeParse(await c.req.json().catch(() => ({})));
        if (!parsed.success) return jsonError(c, 'Motivo de rechazo inválido');
        const rejectReason = parsed.data.reason ?? null;
        const marketplaceSerenata = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (marketplaceSerenata?.providerGroupId) {
            const marketplaceResult = await rejectMarketplaceSerenata(required.owner.id, id, rejectReason);
            if (marketplaceResult.ok) {
                return c.json({ ok: true, item: marketplaceResult.item });
            }
            return jsonError(c, marketplaceResult.error, 409);
        }
        const [offer] = await db.update(serenataOffers).set({ status: 'rejected', respondedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(serenataOffers.serenataId, id), eq(serenataOffers.ownerId, required.owner.id), eq(serenataOffers.status, 'offered'))).returning();
        if (!offer) return jsonError(c, 'Esta solicitud ya no está disponible.', 409);
        return c.json({ ok: true, offer });
    });

    app.patch('/serenatas/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({ where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)) });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const parsed = serenataPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        const nextStatus = current.status === 'accepted_pending_group' && parsed.data.groupId ? 'scheduled' : undefined;
        const nextEventDate = parsed.data.eventDate ?? current.eventDate;
        const nextEventTime = parsed.data.eventTime ?? current.eventTime;
        const nextDuration = parsed.data.duration ?? current.duration;
        const nextPackageCode = parsed.data.packageCode ?? current.packageCode;
        const nextGroupId = parsed.data.groupId === undefined ? current.groupId : parsed.data.groupId;
        const nextServiceId = parsed.data.selectedServiceId === undefined
            ? current.selectedServiceId
            : parsed.data.selectedServiceId;
        const serviceContext = await resolveSerenataServiceContext(user.id, {
            selectedServiceId: nextServiceId,
            packageCode: nextPackageCode,
            duration: nextDuration,
            price: parsed.data.price ?? current.price,
            eventType: parsed.data.eventType ?? current.eventType,
        });
        if (!serviceContext.ok) return jsonError(c, serviceContext.error, 400);
        const conflict = nextEventTime
            ? await validateGroupForSerenata(db, {
                ownerId: required.owner.id,
                serenataId: current.id,
                groupId: nextGroupId,
                requiredMusicians: serviceContext.requiredMusicians,
                eventDate: nextEventDate,
                eventTime: nextEventTime,
                duration: serviceContext.duration,
            })
            : null;
        if (conflict) return jsonError(c, conflict, 409);
        const { songSelections, ownerCollectionMethod, ...patchFields } = parsed.data;
        let nextOwnerCollectionMethod: string | null | undefined;
        if (ownerCollectionMethod !== undefined) {
            if (current.source !== 'own_lead') {
                return jsonError(c, 'La forma de pago solo aplica a serenatas propias.', 400);
            }
            const collectionCheck = validateOwnerCollectionMethod(ownerCollectionMethod);
            if (!collectionCheck.ok) return jsonError(c, collectionCheck.error, 400);
            nextOwnerCollectionMethod = collectionCheck.method;
        }
        const [item] = await db.update(serenatas).set({
            ...patchFields,
            ...(nextOwnerCollectionMethod !== undefined ? { ownerCollectionMethod: nextOwnerCollectionMethod } : {}),
            ...(nextStatus ? { status: nextStatus } : {}),
            providerGroupId: serviceContext.providerGroup?.id ?? current.providerGroupId,
            selectedServiceId: serviceContext.selectedServiceId,
            packageCode: serviceContext.packageCode,
            duration: serviceContext.duration,
            eventType: serviceContext.eventType,
            price: serviceContext.price,
            lat: parsed.data.lat == null ? undefined : String(parsed.data.lat),
            lng: parsed.data.lng == null ? undefined : String(parsed.data.lng),
            updatedAt: new Date(),
        }).where(eq(serenatas.id, id)).returning();
        if (songSelections !== undefined) {
            if (!serviceContext.service || !serviceContext.providerGroup) {
                return jsonError(c, 'Selecciona un servicio para actualizar el repertorio.', 400);
            }
            const songSync = await syncOwnerSerenataSongSelections(
                id,
                serviceContext.providerGroup.id,
                serviceContext.service,
                songSelections,
            );
            if (!songSync.ok) return jsonError(c, songSync.error, 400);
        }
        if (nextStatus === 'scheduled') {
            await notifySerenataClient(item.clientId, {
                type: 'client_serenata_scheduled',
                title: 'Serenata confirmada',
                message: 'El grupo confirmó el evento para tu serenata.',
                serenataId: item.id,
            });
        }
        return c.json({ ok: true, item });
    });

    /**
     * Grupo de músicos (`serenata_groups`): base de integrantes para invitaciones/agenda/mapa.
     * Si la serenata tiene `providerGroupId`, `musicianIds` deben ser integrantes activos del mariachi.
     * Ver `apps/simpleserenatas/src/lib/serenata-group-model.ts`.
     */
    app.post('/serenatas/:id/assign-group', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataGroupAssignmentSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Asignación inválida');
        const id = c.req.param('id');
        if (parsed.data.mode === 'new') {
            const current = await db.query.serenatas.findFirst({
                where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
            });
            if (current?.providerGroupId) {
                const [sameDayGroup] = await db.select({ id: serenataGroups.id }).from(serenataGroups).where(and(
                    eq(serenataGroups.ownerId, required.owner.id),
                    eq(serenataGroups.providerGroupId, current.providerGroupId),
                    eq(serenataGroups.status, 'active'),
                    sql`date_trunc('day', ${serenataGroups.date}) = date_trunc('day', ${current.eventDate})`,
                )).limit(1);
                if (!sameDayGroup) {
                    const limitReached = await freePlanGroupLimitReached(user.id, required.owner.id);
                    if (limitReached) return jsonError(c, FREE_GROUP_LIMIT_MESSAGE, 409);
                }
            }
        }

        const result = await db.transaction(async (tx) => assignSerenataMusicianGroup(tx, {
            ownerId: required.owner.id,
            serenataId: id,
            input: parsed.data,
            requiredMusiciansForPackage: (code) => packageForCode(code)?.musicians ?? 0,
        }));

        if (!result.ok) return jsonError(c, result.error, result.status);
        flushAssignGroupSideEffects(result.sideEffects);
        return c.json({ ok: true, item: result.item, group: result.group });
    });

    app.post('/serenatas/:id/cancel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataCancelSchema.safeParse(await c.req.json().catch(() => ({})));
        if (!parsed.success) return jsonError(c, parsed.error.issues[0]?.message ?? 'Motivo inválido');
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const transitionError = validateCancelTransition(current, parsed.data.cancelReason);
        if (transitionError) return jsonError(c, transitionError, 409);
        const now = new Date();
        const [item] = await db.update(serenatas).set({
            status: 'cancelled',
            cancelReason: parsed.data.cancelReason.trim(),
            cancelledAt: now,
            cancelledBy: user.id,
            updatedAt: now,
        }).where(and(
            eq(serenatas.id, id),
            eq(serenatas.ownerId, required.owner.id),
            inArray(serenatas.status, ['scheduled', 'accepted_pending_group']),
        )).returning();
        if (!item) return jsonError(c, 'No se pudo cancelar la serenata.', 409);
        await notifySerenataClient(item.clientId, {
            type: 'client_serenata_cancelled',
            title: 'Serenata cancelada',
            message: 'El grupo canceló esta serenata.',
            serenataId: item.id,
        });
        return c.json({ ok: true, item });
    });

    app.post('/serenatas/:id/complete', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const transitionError = validateCompleteTransition(current);
        if (transitionError) return jsonError(c, transitionError, 409);
        const now = new Date();
        const [item] = await db.update(serenatas).set({
            status: 'completed',
            completedAt: now,
            completedBy: user.id,
            updatedAt: now,
        }).where(and(
            eq(serenatas.id, id),
            eq(serenatas.ownerId, required.owner.id),
            eq(serenatas.status, 'scheduled'),
        )).returning();
        if (!item) return jsonError(c, 'No se pudo completar la serenata.', 409);
        await notifySerenataClient(item.clientId, {
            type: 'client_serenata_completed',
            title: 'Serenata completada',
            message: 'Tu serenata fue marcada como completada. Confirma si se realizó correctamente.',
            serenataId: item.id,
        });
        return c.json({ ok: true, item });
    });

    app.post('/serenatas/:id/owner-payout', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        if (!['admin', 'superadmin'].includes(user.role)) {
            return jsonError(c, 'No autorizado', 403);
        }
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = ownerPayoutSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Datos de liquidación inválidos', 400);
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        if (current.source !== 'platform_lead') {
            return jsonError(c, 'La liquidación al dueño aplica solo a serenatas de la app.', 409);
        }
        const now = new Date();
        const [item] = await db.update(serenatas).set({
            ownerPayoutStatus: parsed.data.status,
            ownerPayoutAt: parsed.data.status === 'paid' ? now : null,
            ownerPayoutAmount: parsed.data.amount ?? current.ownerPayoutAmount ?? current.price ?? null,
            ownerPayoutReference: parsed.data.reference ?? null,
            updatedAt: now,
        }).where(and(
            eq(serenatas.id, id),
            eq(serenatas.ownerId, required.owner.id),
        )).returning();
        if (!item) return jsonError(c, 'No se pudo actualizar la liquidación.', 409);
        return c.json({ ok: true, item });
    });

    app.post('/serenatas/:id/client-confirm', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return jsonError(c, 'Perfil de cliente no encontrado', 403);
        const id = c.req.param('id');
        const body = await c.req.json().catch(() => ({})) as { rating?: unknown; comment?: unknown };
        const rating = typeof body.rating === 'number' && Number.isFinite(body.rating)
            ? Math.round(body.rating)
            : null;
        const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 800) : '';
        const current = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.clientId, client.id)),
        });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const transitionError = validateClientConfirmTransition(current);
        if (transitionError) return jsonError(c, transitionError, 409);
        const now = new Date();
        const [item] = await db.update(serenatas).set({
            clientConfirmedAt: now,
            clientRating: rating != null && rating >= 1 && rating <= 5 ? rating : null,
            clientReviewComment: comment || null,
            updatedAt: now,
        }).where(and(
            eq(serenatas.id, id),
            eq(serenatas.clientId, client.id),
            eq(serenatas.status, 'completed'),
        )).returning();
        if (!item) return jsonError(c, 'No se pudo confirmar la serenata.', 409);
        if (item.providerGroupId && item.clientRating != null) {
            await recordProviderGroupRating(item.providerGroupId);
        }
        return c.json({ ok: true, item });
    });

    const groupDbError = (c: Context, err: unknown, phase: string, userId: string) => {
        const message = getNestedErrorMessage(err);
        const missingSchema = isSerenataSchemaError(message);
        console.error('[serenatas] groups failed', { phase, userId, message, err });
        return jsonError(
            c,
            missingSchema
                ? 'El servidor necesita aplicar migraciones de Serenatas. Intenta en unos minutos o contacta soporte.'
                : 'No pudimos procesar los grupos.',
            missingSchema ? 503 : 500,
            message,
        );
    };

    const FREE_MUSICIAN_GROUP_LIMIT = 1;
    const FREE_GROUP_LIMIT_MESSAGE =
        'Durante la prueba tienes acceso completo. Activa Pro para crear más grupos.';

    async function freePlanGroupLimitReached(
        userId: string,
        ownerId: string,
        options: { excludeGroupId?: string | null } = {},
    ) {
        const plan = await resolveActiveSerenataBillingPlan(userId);
        if (plan === 'pro') return false;
        const owner = await db.query.serenataOwners.findFirst({
            where: eq(serenataOwners.id, ownerId),
        });
        const trialActive = Boolean(!owner?.trialEndsAt || owner.trialEndsAt.getTime() >= Date.now());
        if (plan === 'free' && trialActive) return false;
        const filters = [
            eq(serenataGroups.ownerId, ownerId),
            inArray(serenataGroups.status, ['draft', 'active']),
        ];
        if (options.excludeGroupId) filters.push(ne(serenataGroups.id, options.excludeGroupId));
        const rows = await db
            .select({ id: serenataGroups.id })
            .from(serenataGroups)
            .where(and(...filters))
            .limit(FREE_MUSICIAN_GROUP_LIMIT);
        return rows.length >= FREE_MUSICIAN_GROUP_LIMIT;
    }

    app.get('/groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        try {
            const providerGroupId = c.req.query('providerGroupId')?.trim();
            const groupFilters = [eq(serenataGroups.ownerId, required.owner.id)];
            if (providerGroupId) groupFilters.push(eq(serenataGroups.providerGroupId, providerGroupId));
            const groups = await db.select().from(serenataGroups).where(and(...groupFilters)).orderBy(desc(serenataGroups.updatedAt));
            const groupIds = groups.map((group) => group.id);
            const members = groupIds.length > 0
                ? await db.select({
                    id: serenataGroupMembers.id,
                    groupId: serenataGroupMembers.groupId,
                    musicianId: serenataGroupMembers.musicianId,
                    instrument: serenataGroupMembers.instrument,
                    instruments: serenataMusicians.instruments,
                    status: serenataGroupMembers.status,
                    message: serenataGroupMembers.message,
                    musicianName: users.name,
                    avatarUrl: users.avatarUrl,
                    slotIndex: serenataGroupMembers.slotIndex,
                    availableNow: serenataMusicians.availableNow,
                    comuna: serenataMusicians.comuna,
                    region: serenataMusicians.region,
                }).from(serenataGroupMembers)
                    .innerJoin(serenataMusicians, eq(serenataMusicians.id, serenataGroupMembers.musicianId))
                    .innerJoin(users, eq(users.id, serenataMusicians.userId))
                    .where(inArray(serenataGroupMembers.groupId, groupIds))
                : [];
            const pendingInvites = groupIds.length > 0
                ? await db.select().from(serenataGroupInvites).where(and(
                    inArray(serenataGroupInvites.groupId, groupIds),
                    eq(serenataGroupInvites.status, 'pending'),
                ))
                : [];
            return c.json({
                ok: true,
                items: groups.map((group) => ({
                    ...group,
                    members: members.filter((member) => member.groupId === group.id),
                    pendingInvites: pendingInvites
                        .filter((invite) => invite.groupId === group.id)
                        .map((invite) => ({
                            id: invite.id,
                            groupId: invite.groupId,
                            displayName: invite.displayName,
                            email: invite.email,
                            phone: invite.phone,
                            status: invite.status,
                            createdAt: invite.createdAt,
                        })),
                })),
            });
        } catch (err) {
            return groupDbError(c, err, 'list', user.id);
        }
    });

    app.post('/groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const body = await c.req.json().catch(() => null);
        const parsed = groupWriteSchema.safeParse(body);
        if (!parsed.success) return jsonError(c, zodFirstFieldError(parsed.error));
        if (parsed.data.providerGroupId) {
            const providerGroup = await db.query.serenataProviderGroups.findFirst({
                where: and(
                    eq(serenataProviderGroups.id, parsed.data.providerGroupId),
                    eq(serenataProviderGroups.ownerUserId, user.id),
                ),
            });
            if (!providerGroup) {
                return jsonError(c, 'El mariachi seleccionado no pertenece a tu cuenta.', 403);
            }
        }
        try {
            const limitReached = await freePlanGroupLimitReached(user.id, required.owner.id);
            if (limitReached) return jsonError(c, FREE_GROUP_LIMIT_MESSAGE, 409);
            const groupDate = parsed.data.date instanceof Date ? parsed.data.date : new Date();
            const requiredInstruments = parsed.data.requiredInstruments?.length
                ? parsed.data.requiredInstruments
                : null;
            const maxMusicians = requiredInstruments?.length ?? parsed.data.maxMusicians ?? 3;
            const [item] = await db.insert(serenataGroups).values({
                name: parsed.data.name,
                status: parsed.data.status,
                providerGroupId: parsed.data.providerGroupId ?? null,
                maxMusicians,
                requiredInstruments: requiredInstruments ?? [],
                date: groupDate,
                ownerId: required.owner.id,
            }).returning();
            return c.json({ ok: true, item }, 201);
        } catch (err) {
            return groupDbError(c, err, 'create', user.id);
        }
    });

    app.patch('/groups/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = groupPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, zodFirstFieldError(parsed.error));
        const groupId = c.req.param('id');
        const updates: Partial<typeof serenataGroups.$inferInsert> = { updatedAt: new Date() };
        if (parsed.data.name !== undefined) updates.name = parsed.data.name;
        if (parsed.data.status !== undefined) updates.status = parsed.data.status;
        if (parsed.data.requiredInstruments !== undefined) {
            updates.requiredInstruments = parsed.data.requiredInstruments;
            updates.maxMusicians = parsed.data.requiredInstruments.length;
        }
        if (parsed.data.status === 'draft' || parsed.data.status === 'active') {
            const current = await db.query.serenataGroups.findFirst({
                where: and(eq(serenataGroups.id, groupId), eq(serenataGroups.ownerId, required.owner.id)),
            });
            if (!current) return jsonError(c, 'Grupo no encontrado', 404);
            const limitReached = await freePlanGroupLimitReached(user.id, required.owner.id, {
                excludeGroupId: current.id,
            });
            if (limitReached) return jsonError(c, FREE_GROUP_LIMIT_MESSAGE, 409);
        }
        const [item] = await db.update(serenataGroups).set(updates).where(and(
            eq(serenataGroups.id, groupId),
            eq(serenataGroups.ownerId, required.owner.id),
        )).returning();
        if (!item) return jsonError(c, 'Grupo no encontrado', 404);
        return c.json({ ok: true, item });
    });

    app.delete('/groups/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const groupId = c.req.param('id');
        const linkedSerenatas = await db
            .select({ id: serenatas.id })
            .from(serenatas)
            .where(and(
                eq(serenatas.groupId, groupId),
                inArray(serenatas.status, ['accepted_pending_group', 'scheduled']),
            ))
            .limit(1);
        if (linkedSerenatas.length > 0) {
            return jsonError(c, 'No puedes eliminar un grupo con serenatas activas asignadas.', 409);
        }
        const deleted = await db.delete(serenataGroups).where(and(
            eq(serenataGroups.id, groupId),
            eq(serenataGroups.ownerId, required.owner.id),
        )).returning({ id: serenataGroups.id });
        if (deleted.length === 0) return jsonError(c, 'Grupo no encontrado', 404);
        return c.json({ ok: true });
    });

    app.post('/groups/:id/invites', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({
            where: and(eq(serenataGroups.id, c.req.param('id')), eq(serenataGroups.ownerId, required.owner.id)),
        });
        if (!group) return jsonError(c, 'Grupo no encontrado', 404);
        const parsed = groupInviteCreateSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, zodFirstFieldError(parsed.error));
        if (group.maxMusicians != null) {
            const occupied = await getGroupOccupancy(group.id);
            if (occupied >= group.maxMusicians) {
                return jsonError(c, `Este grupo tiene cupo máximo de ${group.maxMusicians} músicos.`, 409);
            }
        }

        if (parsed.data.mode === 'app') {
            const musician = await db.query.serenataMusicians.findFirst({
                where: eq(serenataMusicians.id, parsed.data.musicianId),
            });
            if (!musician) return jsonError(c, 'Músico no encontrado', 404);
            const slots = resolveGroupRequiredInstruments(group);
            const slotIndex = parsed.data.slotIndex;
            if (slotIndex != null && (slotIndex < 0 || slotIndex >= slots.length)) {
                return jsonError(c, 'El cupo seleccionado no existe en este grupo.', 400);
            }
            const slotInstrument = slotIndex != null
                ? slots[slotIndex]
                : (parsed.data.instrument ?? null);
            if (slotIndex != null) {
                const slotConflict = await assertGroupSlotAvailable(group.id, slotIndex);
                if (slotConflict) return jsonError(c, slotConflict, 409);
            } else if (group.maxMusicians != null) {
                const occupied = await getGroupOccupancy(group.id);
                if (occupied >= group.maxMusicians) {
                    return jsonError(c, `Este grupo tiene cupo máximo de ${group.maxMusicians} músicos.`, 409);
                }
            }
            const [member] = await db.insert(serenataGroupMembers).values({
                groupId: group.id,
                musicianId: musician.id,
                instrument: slotInstrument,
                slotIndex: slotIndex ?? null,
                status: 'invited',
            }).onConflictDoUpdate({
                target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
                set: {
                    status: 'invited',
                    instrument: slotInstrument,
                    slotIndex: slotIndex ?? null,
                    updatedAt: new Date(),
                },
            }).returning();
            await insertInAppNotifications({
                userId: musician.userId,
                type: 'group_invitation',
                title: 'Nueva invitación',
                message: `Te invitaron al grupo ${group.name}.`,
            });
            void deliverSerenataInvitation(musician.userId, {
                title: 'Nueva invitación',
                message: `Te invitaron al grupo ${group.name}.`,
                groupName: group.name,
                panelPath: '/panel/invitations',
            });
            return c.json({ ok: true, mode: 'app', member });
        }

        const ownerName = user.name?.trim() || 'El dueño del mariachi';
        const token = createGroupInviteToken();
        const signupUrl = buildGroupInviteSignupUrl(token);

        if (parsed.data.mode === 'email') {
            const email = parsed.data.email.toLowerCase();
            const [invite] = await db.insert(serenataGroupInvites).values({
                groupId: group.id,
                invitedByUserId: user.id,
                email,
                token,
                status: 'pending',
            }).returning();
            const musicianName = email.split('@')[0] || 'Músico';
            try {
                const emailDelivery = await sendSerenataGuestGroupInviteEmail(email, {
                    musicianName,
                    groupName: group.name,
                    ownerName,
                    signupUrl,
                });
                return c.json({
                    ok: true,
                    mode: 'email',
                    invite,
                    emailSent: emailDelivery === 'sent',
                    signupUrl: emailDelivery === 'skipped_dev' ? signupUrl : undefined,
                });
            } catch (error) {
                await db.delete(serenataGroupInvites).where(eq(serenataGroupInvites.id, invite.id));
                console.error('[serenatas] group invite email failed', { email, error });
                const detail = error instanceof Error ? error.message : '';
                const message = detail && (detail.includes('SMTP') || detail.includes('rechazado') || detail.includes('configured'))
                    ? detail
                    : 'No pudimos enviar el correo de invitación. Revisa la dirección o intenta más tarde.';
                return jsonError(c, message, 500);
            }
        }

        const phoneDigits = normalizeChileWhatsAppNumber(parsed.data.phone);
        if (!phoneDigits) return jsonError(c, 'Número de WhatsApp inválido. Usa un móvil chileno.', 400);
        const message = buildGroupInviteWhatsAppMessage({ groupName: group.name, ownerName, signupUrl });
        const whatsappUrl = buildGroupInviteWhatsAppUrl(parsed.data.phone, message);
        if (!whatsappUrl) return jsonError(c, 'No pudimos armar el enlace de WhatsApp.', 400);
        const [invite] = await db.insert(serenataGroupInvites).values({
            groupId: group.id,
            invitedByUserId: user.id,
            phone: phoneDigits,
            token,
            status: 'pending',
        }).returning();
        return c.json({ ok: true, mode: 'whatsapp', invite, whatsappUrl });
    });

    app.delete('/groups/:groupId/invites/:inviteId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({
            where: and(eq(serenataGroups.id, c.req.param('groupId')), eq(serenataGroups.ownerId, required.owner.id)),
        });
        if (!group) return jsonError(c, 'Grupo no encontrado', 404);
        const [invite] = await db.update(serenataGroupInvites).set({
            status: 'cancelled',
            updatedAt: new Date(),
        }).where(and(
            eq(serenataGroupInvites.id, c.req.param('inviteId')),
            eq(serenataGroupInvites.groupId, group.id),
            eq(serenataGroupInvites.status, 'pending'),
        )).returning();
        if (!invite) return jsonError(c, 'Invitación no encontrada', 404);
        return c.json({ ok: true });
    });

    app.post('/group-invites/claim', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireMusician(c, user.id);
        if (!required.ok) return required.response;
        const parsed = z.object({ token: z.string().trim().min(8) }).safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Invitación inválida');
        const invite = await db.query.serenataGroupInvites.findFirst({
            where: and(
                eq(serenataGroupInvites.token, parsed.data.token),
                eq(serenataGroupInvites.status, 'pending'),
            ),
        });
        if (!invite) {
            const providerInvite = await db.query.serenataProviderGroupMemberInvites.findFirst({
                where: and(
                    eq(serenataProviderGroupMemberInvites.token, parsed.data.token),
                    eq(serenataProviderGroupMemberInvites.status, 'pending'),
                ),
            });
            if (!providerInvite) return jsonError(c, 'Invitación no encontrada o expirada', 404);
            const providerGroup = await db.query.serenataProviderGroups.findFirst({
                where: eq(serenataProviderGroups.id, providerInvite.providerGroupId),
            });
            if (!providerGroup) return jsonError(c, 'Mariachi no encontrado', 404);
            const [member] = await db.insert(serenataProviderGroupMembers).values({
                providerGroupId: providerGroup.id,
                musicianId: required.musician.id,
                role: 'musician',
                instruments: required.musician.instrument ? [required.musician.instrument] : [],
                status: 'active',
                invitedByUserId: providerInvite.invitedByUserId,
                respondedAt: new Date(),
            }).onConflictDoUpdate({
                target: [serenataProviderGroupMembers.providerGroupId, serenataProviderGroupMembers.musicianId],
                set: {
                    status: 'active',
                    respondedAt: new Date(),
                    updatedAt: new Date(),
                },
            }).returning();
            await db.update(serenataProviderGroupMemberInvites).set({
                status: 'accepted',
                musicianId: required.musician.id,
                updatedAt: new Date(),
            }).where(eq(serenataProviderGroupMemberInvites.id, providerInvite.id));
            return c.json({ ok: true, member, providerGroupId: providerGroup.id });
        }
        const group = await db.query.serenataGroups.findFirst({ where: eq(serenataGroups.id, invite.groupId) });
        if (!group) return jsonError(c, 'Grupo no encontrado', 404);
        if (group.providerGroupId) {
            await db.insert(serenataProviderGroupMembers).values({
                providerGroupId: group.providerGroupId,
                musicianId: required.musician.id,
                role: 'musician',
                instruments: required.musician.instrument ? [required.musician.instrument] : [],
                status: 'active',
                invitedByUserId: invite.invitedByUserId,
                respondedAt: new Date(),
            }).onConflictDoUpdate({
                target: [serenataProviderGroupMembers.providerGroupId, serenataProviderGroupMembers.musicianId],
                set: {
                    status: 'active',
                    respondedAt: new Date(),
                    updatedAt: new Date(),
                },
            });
        }
        const [member] = await db.insert(serenataGroupMembers).values({
            groupId: invite.groupId,
            musicianId: required.musician.id,
            status: 'accepted',
        }).onConflictDoUpdate({
            target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
            set: { status: 'accepted', updatedAt: new Date() },
        }).returning();
        await db.update(serenataGroupInvites).set({
            status: 'accepted',
            musicianId: required.musician.id,
            updatedAt: new Date(),
        }).where(eq(serenataGroupInvites.id, invite.id));
        return c.json({ ok: true, member, groupId: invite.groupId });
    });

    app.post('/groups/:id/members', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({ where: and(eq(serenataGroups.id, c.req.param('id')), eq(serenataGroups.ownerId, required.owner.id)) });
        if (!group) return jsonError(c, 'Grupo no encontrado', 404);
        const parsed = memberInviteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Invitación inválida');
        const musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.id, parsed.data.musicianId) });
        if (!musician) return jsonError(c, 'Músico no encontrado', 404);
        if (group.providerGroupId) {
            const rosterMember = await db.query.serenataProviderGroupMembers.findFirst({
                where: and(
                    eq(serenataProviderGroupMembers.providerGroupId, group.providerGroupId),
                    eq(serenataProviderGroupMembers.musicianId, musician.id),
                    eq(serenataProviderGroupMembers.status, 'active'),
                ),
            });
            if (!rosterMember) {
                return jsonError(c, 'Agrega primero este músico a los integrantes activos del mariachi.', 409);
            }
        }
        const slots = resolveGroupRequiredInstruments(group);
        const slotIndex = parsed.data.slotIndex;
        if (slotIndex != null && (slotIndex < 0 || slotIndex >= slots.length)) {
            return jsonError(c, 'El cupo seleccionado no existe en este grupo.', 400);
        }
        const slotInstrument = slotIndex != null
            ? slots[slotIndex]
            : (parsed.data.instrument ?? null);
        if (slotIndex != null) {
            const slotConflict = await assertGroupSlotAvailable(group.id, slotIndex);
            if (slotConflict) return jsonError(c, slotConflict, 409);
        }
        const [member] = await db.insert(serenataGroupMembers).values({
            groupId: group.id,
            musicianId: musician.id,
            instrument: slotInstrument,
            slotIndex: slotIndex ?? null,
            message: parsed.data.message,
            status: 'invited',
        }).onConflictDoUpdate({
            target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
            set: {
                instrument: slotInstrument,
                slotIndex: slotIndex ?? null,
                message: parsed.data.message,
                status: 'invited',
                updatedAt: new Date(),
            },
        }).returning();
        await insertInAppNotifications({
            userId: musician.userId,
            type: 'group_invitation',
            title: 'Nueva invitación',
            message: `Te invitaron al grupo ${group.name}.`,
        });
        void deliverSerenataInvitation(musician.userId, {
            title: 'Nueva invitación',
            message: `Te invitaron al grupo ${group.name}.`,
            groupName: group.name,
            panelPath: '/panel/invitations',
        });
        return c.json({ ok: true, member }, 201);
    });

    app.patch('/groups/:groupId/members/:memberId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({ where: and(eq(serenataGroups.id, c.req.param('groupId')), eq(serenataGroups.ownerId, required.owner.id)) });
        if (!group) return jsonError(c, 'Grupo no encontrado', 404);
        const body = await c.req.json().catch(() => null);
        const ownerPatch = memberPatchSchema.safeParse(body);
        const statusOnlyPatch = memberStatusSchema.safeParse(body);
        const parsed = ownerPatch.success ? ownerPatch : statusOnlyPatch;
        if (!parsed.success) return jsonError(c, 'Datos inválidos');
        const existing = await db.query.serenataGroupMembers.findFirst({
            where: and(
                eq(serenataGroupMembers.id, c.req.param('memberId')),
                eq(serenataGroupMembers.groupId, group.id),
            ),
        });
        if (!existing) return jsonError(c, 'Integrante no encontrado', 404);
        const slots = resolveGroupRequiredInstruments(group);
        const updates: Partial<typeof serenataGroupMembers.$inferInsert> = { updatedAt: new Date() };
        if ('status' in parsed.data && parsed.data.status !== undefined) updates.status = parsed.data.status;
        if ('message' in parsed.data && parsed.data.message !== undefined) updates.message = parsed.data.message;
        if ('slotIndex' in parsed.data && parsed.data.slotIndex !== undefined) {
            const nextSlotIndex = parsed.data.slotIndex;
            if (nextSlotIndex != null && (nextSlotIndex < 0 || nextSlotIndex >= slots.length)) {
                return jsonError(c, 'El cupo seleccionado no existe en este grupo.', 400);
            }
            if (nextSlotIndex != null) {
                const slotConflict = await assertGroupSlotAvailable(group.id, nextSlotIndex, existing.id);
                if (slotConflict) return jsonError(c, slotConflict, 409);
            }
            updates.slotIndex = nextSlotIndex;
            updates.instrument = nextSlotIndex != null ? slots[nextSlotIndex] : existing.instrument;
        } else if ('instrument' in parsed.data && parsed.data.instrument !== undefined) {
            updates.instrument = parsed.data.instrument;
        }
        const [member] = await db.update(serenataGroupMembers).set(updates)
            .where(and(eq(serenataGroupMembers.id, existing.id), eq(serenataGroupMembers.groupId, group.id))).returning();
        if (!member) return jsonError(c, 'Integrante no encontrado', 404);
        return c.json({ ok: true, member });
    });

    app.get('/invitations', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireMusician(c, user.id);
        if (!required.ok) return required.response;
        const eventRows = await db.select({
            id: serenataGroupMembers.id,
            kind: sql`'event'`,
            groupId: serenataGroupMembers.groupId,
            status: serenataGroupMembers.status,
            instrument: serenataGroupMembers.instrument,
            message: serenataGroupMembers.message,
            groupName: serenataGroups.name,
            groupDate: serenataGroups.date,
            serenataId: serenatas.id,
            recipientName: serenatas.recipientName,
            eventDate: serenatas.eventDate,
            eventTime: serenatas.eventTime,
            address: serenatas.address,
            comuna: serenatas.comuna,
            ownerName: users.name,
        }).from(serenataGroupMembers)
            .innerJoin(serenataGroups, eq(serenataGroups.id, serenataGroupMembers.groupId))
            .leftJoin(serenatas, eq(serenatas.groupId, serenataGroups.id))
            .leftJoin(serenataOwners, eq(serenataOwners.id, serenataGroups.ownerId))
            .leftJoin(users, eq(users.id, serenataOwners.userId))
            .where(eq(serenataGroupMembers.musicianId, required.musician.id))
            .orderBy(desc(serenataGroups.date));

        const providerRows = await db.select({
            id: serenataProviderGroupMembers.id,
            kind: sql`'provider'`,
            groupId: serenataProviderGroupMembers.providerGroupId,
            status: serenataProviderGroupMembers.status,
            instrument: serenataProviderGroupMembers.instruments,
            message: serenataProviderGroupMembers.message,
            groupName: serenataProviderGroups.name,
            groupDate: serenataProviderGroupMembers.createdAt,
            serenataId: sql<string | null>`NULL`,
            recipientName: sql<string | null>`NULL`,
            eventDate: sql<Date | null>`NULL`,
            eventTime: sql<string | null>`NULL`,
            address: sql<string | null>`NULL`,
            comuna: serenataProviderGroups.comunaBase,
            ownerName: users.name,
        }).from(serenataProviderGroupMembers)
            .innerJoin(serenataProviderGroups, eq(serenataProviderGroups.id, serenataProviderGroupMembers.providerGroupId))
            .innerJoin(users, eq(users.id, serenataProviderGroups.ownerUserId))
            .where(eq(serenataProviderGroupMembers.musicianId, required.musician.id))
            .orderBy(desc(serenataProviderGroupMembers.createdAt));

        const rows = [...providerRows, ...eventRows].map((row) => ({
            ...row,
            instrument: Array.isArray(row.instrument) ? row.instrument.join(', ') : row.instrument,
        }));
        const byId = new Map<string, typeof rows[number]>();
        for (const row of rows) {
            const existing = byId.get(row.id);
            if (!existing || (!existing.serenataId && row.serenataId)) {
                byId.set(row.id, row);
            }
        }
        const items = Array.from(byId.values()).sort((a, b) => {
            const aPending = a.status === 'invited' ? 0 : 1;
            const bPending = b.status === 'invited' ? 0 : 1;
            if (aPending !== bPending) return aPending - bPending;
            const aDate = a.eventDate ?? a.groupDate;
            const bDate = b.eventDate ?? b.groupDate;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        return c.json({ ok: true, items });
    });

    app.post('/invitations/:id/respond', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireMusician(c, user.id);
        if (!required.ok) return required.response;
        const parsed = z.object({ status: z.enum(['accepted', 'rejected']) }).safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Respuesta inválida');
        const [providerMember] = await db.update(serenataProviderGroupMembers).set({
            status: parsed.data.status === 'accepted' ? 'active' : 'rejected',
            respondedAt: new Date(),
            updatedAt: new Date(),
        }).where(and(eq(serenataProviderGroupMembers.id, c.req.param('id')), eq(serenataProviderGroupMembers.musicianId, required.musician.id))).returning();
        if (providerMember) return c.json({ ok: true, member: providerMember });
        const [member] = await db.update(serenataGroupMembers).set({ status: parsed.data.status, updatedAt: new Date() })
            .where(and(eq(serenataGroupMembers.id, c.req.param('id')), eq(serenataGroupMembers.musicianId, required.musician.id))).returning();
        if (!member) return jsonError(c, 'Invitación no encontrada', 404);
        if (parsed.data.status === 'accepted') {
            const group = await db.query.serenataGroups.findFirst({ where: eq(serenataGroups.id, member.groupId) });
            if (group?.providerGroupId) {
                await db.insert(serenataProviderGroupMembers).values({
                    providerGroupId: group.providerGroupId,
                    musicianId: required.musician.id,
                    role: 'musician',
                    instruments: required.musician.instrument ? [required.musician.instrument] : [],
                    status: 'active',
                    respondedAt: new Date(),
                }).onConflictDoUpdate({
                    target: [serenataProviderGroupMembers.providerGroupId, serenataProviderGroupMembers.musicianId],
                    set: {
                        status: 'active',
                        respondedAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }
        }
        return c.json({ ok: true, member });
    });

    app.get('/agenda', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10);
        const range = toDateRange(date);
        if (!range) return jsonError(c, 'Fecha inválida');
        const profiles = await getProfiles(user.id);
        const role = resolveActorRoleFromRequest(c, profiles);

        if (role === 'owner' && profiles.owner) {
            const ownerUserId = await resolveOwnerUserId(profiles.owner.id);
            if (ownerUserId) {
                const reminderCandidates = await loadOwnerScheduledForReminders(profiles.owner.id);
                await maybeSendClosureReminders(ownerUserId, reminderCandidates);
            }
            const items = await db.select().from(serenatas)
                .where(and(
                    eq(serenatas.ownerId, profiles.owner.id),
                    inArray(serenatas.status, ['scheduled', 'completed']),
                    gte(serenatas.eventDate, range.start),
                    lte(serenatas.eventDate, range.end),
                ))
                .orderBy(asc(serenatas.eventTime));
            return c.json({ ok: true, items });
        }
        if (role === 'musician' && profiles.musician) {
            const items = await listMusicianAgenda(profiles.musician, range);
            return c.json({ ok: true, items });
        }
        return c.json({ ok: true, items: [] });
    });

    app.get('/route', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const range = toDateRange(c.req.query('date') ?? new Date().toISOString().slice(0, 10));
        if (!range) return jsonError(c, 'Fecha inválida');
        const rows = await db.select().from(serenatas)
            .where(and(eq(serenatas.ownerId, required.owner.id), eq(serenatas.status, 'scheduled'), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
            .orderBy(asc(serenatas.eventTime));
        const withCoordinates = rows.filter((item) => toNumber(item.lat) != null && toNumber(item.lng) != null);
        const withoutCoordinates = rows.filter((item) => toNumber(item.lat) == null || toNumber(item.lng) == null);
        return c.json({ ok: true, items: [...withCoordinates, ...withoutCoordinates] });
    });

    const marketplaceDeps = {
        authUser: deps.authUser,
        jsonError,
        ensureClientProfile,
        requireOwner,
        validateOwnerAvailability,
    };
    registerMarketplaceRoutes(app, marketplaceDeps);
    registerRepertoireRoutes(app, marketplaceDeps);

    const serenatasIntegrationsUrl = (params: Record<string, string>) => {
        const base = (process.env.SERENATAS_APP_URL ?? 'http://localhost:3005').replace(/\/$/, '');
        const url = new URL('/panel/cuenta', base);
        url.searchParams.set('account_tab', 'integrations');
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        return url.toString();
    };

    // ── Google Calendar (OAuth + tokens; sync de eventos pendiente) ─────────────
    app.get('/google-calendar/auth', deps.requireVerifiedSession, async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const oauth2Client = getSerenatasGoogleCalendarOAuthClient();
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
            state: user.id,
            prompt: 'consent',
        });
        return c.redirect(url);
    });

    app.get('/google-calendar/callback', async (c) => {
        const code = c.req.query('code');
        const state = c.req.query('state');
        if (!code || !state) {
            return c.redirect(serenatasIntegrationsUrl({
                gc: 'error',
                message: 'Faltan parámetros de Google',
            }));
        }
        try {
            const oauth2Client = getSerenatasGoogleCalendarOAuthClient();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
            const calList = await calendarApi.calendarList.list({ minAccessRole: 'owner' });
            const primaryCal = calList.data.items?.find((item) => item.primary) ?? calList.data.items?.[0];
            const [updated] = await db.update(users).set({
                googleCalendarId: primaryCal?.id ?? null,
                googleCalendarAccessToken: tokens.access_token ?? null,
                googleCalendarRefreshToken: tokens.refresh_token ?? null,
                googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                updatedAt: new Date(),
            }).where(eq(users.id, state)).returning({ id: users.id });
            if (!updated) {
                return c.redirect(serenatasIntegrationsUrl({
                    gc: 'error',
                    message: 'Usuario no encontrado',
                }));
            }
            return c.redirect(serenatasIntegrationsUrl({ gc: 'connected' }));
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            return c.redirect(serenatasIntegrationsUrl({ gc: 'error', message: msg }));
        }
    });

    app.delete('/google-calendar/disconnect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        await db.update(users).set({
            googleCalendarId: null,
            googleCalendarAccessToken: null,
            googleCalendarRefreshToken: null,
            googleCalendarTokenExpiry: null,
            updatedAt: new Date(),
        }).where(eq(users.id, user.id));
        return c.json({ ok: true });
    });

    app.get('/google-calendar/status', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const row = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: {
                googleCalendarId: true,
                googleCalendarAccessToken: true,
            },
        });
        return c.json({
            ok: true,
            connected: !!(row?.googleCalendarAccessToken),
            calendarId: row?.googleCalendarId ?? null,
        });
    });

    return app;
}
