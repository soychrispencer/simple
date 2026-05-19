import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import {
    serenataOwners,
    serenataClients,
    serenataGroupMembers,
    serenataGroupServices,
    serenataGroups,
    serenataMusicians,
    serenataNotifications,
    serenataOffers,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenatas,
    users,
} from '../../db/schema.js';
import {
    acceptMarketplaceSerenata,
    createMarketplaceSerenata,
    marketplaceSerenataSchema,
    registerMarketplaceRoutes,
    rejectMarketplaceSerenata,
} from './marketplace.js';
import { listOwnerSerenatas, listMusicianAgenda, listMusicianSerenatas } from './owner-listings.js';
import {
    cancelClientPendingSerenata,
    listOwnerSerenatasNeedingClosure,
    loadOwnerScheduledForReminders,
    maybeSendClosureReminders,
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
} from './availability.js';
import { assignSerenataOperationalGroup } from './assign-group.js';

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

const serenataWriteSchema = z.object({
    groupId: emptyStringToNull,
    packageCode: emptyStringToNull,
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

const groupWriteSchema = z.object({
    name: z.string().min(2),
    date: dateString,
    status: z.enum(['draft', 'active', 'closed']).default('draft'),
});

const memberInviteSchema = z.object({
    musicianId: z.string().uuid(),
    instrument: emptyStringToNull,
    message: emptyStringToNull,
});

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

const serenataCancelSchema = z.object({
    cancelReason: z.string().trim().min(3, 'Indica un motivo de al menos 3 caracteres'),
});

function jsonError(c: Context, error: string, status: 400 | 401 | 403 | 404 | 409 | 500 = 400) {
    return c.json({ ok: false, error }, status);
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
    };
    const label = field ? fieldLabels[field] ?? field : 'Campo';
    return `${label}: ${issue.message}`;
}

function packageForCode(code: string | null | undefined) {
    if (!code) return null;
    return serenataPackageCodeSchema.safeParse(code).success ? serenataPackages[code as SerenataPackageCode] : null;
}

async function createPlatformOffersForSerenata(serenata: { id: string; comuna: string | null; region: string | null; price: number | null; eventDate: Date }) {
    const admins = await db
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

    const candidates = admins
        .filter((admin) => {
            const workingComunas = Array.isArray(admin.workingComunas) ? admin.workingComunas : [];
            const matchesComuna = serenata.comuna
                ? workingComunas.includes(serenata.comuna) || admin.comuna === serenata.comuna
                : true;
            const matchesRegion = serenata.region ? admin.region === serenata.region || workingComunas.length > 0 : true;
            const matchesPrice = admin.minPrice == null || serenata.price == null || serenata.price >= admin.minPrice;
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
    const offers = await db.insert(serenataOffers).values(candidates.map((admin, index) => ({
        serenataId: serenata.id,
        ownerId: admin.id,
        status: 'offered',
        rank: index + 1,
        expiresAt,
    }))).onConflictDoNothing().returning();

    await db.insert(serenataNotifications).values(candidates.map((admin) => ({
        userId: admin.userId,
        type: 'platform_serenata_offer',
        title: 'Nueva serenata de la aplicación',
        message: `${serenata.comuna ?? 'Comuna por confirmar'} · ${new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(serenata.eventDate)}.`,
        metadata: { serenataId: serenata.id },
    }))).onConflictDoNothing();

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

export async function publishPaidSerenataToOwners(userId: string, serenataId: string, orderId: string): Promise<{ item: SerenataPaymentTarget; offersCount: number } | null> {
    const target = await getSerenataPaymentTarget(userId, serenataId);
    if (!target) return null;
    if (target.status !== 'payment_pending' && target.paymentStatus === 'paid') {
        return { item: target, offersCount: 0 };
    }
    if (target.status !== 'payment_pending') return null;

    const [item] = await db.update(serenatas).set({
        status: 'pending',
        paymentStatus: 'paid',
        paymentOrderId: orderId,
        paidAt: new Date(),
        updatedAt: new Date(),
    }).where(and(eq(serenatas.id, serenataId), eq(serenatas.status, 'payment_pending'))).returning();
    if (!item) return null;

    if (item.providerGroupId) {
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

/** @deprecated Usar `publishPaidSerenataToOwners`. */
export const publishPaidSerenataToAdmins = publishPaidSerenataToOwners;

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

function notificationHref(metadata: Record<string, unknown> | null) {
    const serenataId = typeof metadata?.serenataId === 'string' ? metadata.serenataId : null;
    if (serenataId) {
        return `/panel/solicitudes?serenata=${encodeURIComponent(serenataId)}`;
    }
    return '/panel/solicitudes';
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
    if ((requested === 'owner' || requested === 'admin') && profiles.owner) return 'owner';
    return null;
}

/** Sin `as`, músico tiene prioridad sobre dueño (evita mezclar datos en cuentas duales). */
function defaultActorRole(profiles: Awaited<ReturnType<typeof getProfiles>>): SerenataActorRole | null {
    if (profiles.musician) return 'musician';
    if (profiles.owner) return 'owner';
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
                'Activa tu perfil de dueño en /para-duenos antes de continuar.',
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
    await db.insert(serenataNotifications).values({
        userId: client.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: { serenataId: payload.serenataId },
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
        const rows = await db.query.serenataNotifications.findMany({
            where: eq(serenataNotifications.userId, user.id),
            orderBy: desc(serenataNotifications.createdAt),
            limit: 10,
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
                        : 'service_lead',
                title: item.title,
                time: relativeNotificationTime(item.createdAt),
                href: notificationHref(item.metadata ?? null),
                createdAt: item.createdAt.getTime(),
            })),
        });
    });

    app.get('/profiles', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const profiles = await getProfiles(user.id);
        return c.json({ ok: true, user, profiles });
    });

    app.get('/packages', async (c) => {
        const items = Object.entries(serenataPackages).map(([code, item]) => ({ code, ...item }));
        return c.json({ ok: true, items });
    });

    app.put('/profiles/client', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
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
            updatedAt: new Date(),
        };
        const [profile] = existing
            ? await db.update(serenataMusicians).set(values).where(eq(serenataMusicians.id, existing.id)).returning()
            : await db.insert(serenataMusicians).values({ userId: user.id, ...values }).returning();
        return c.json({ ok: true, profile });
    });

    const upsertOwnerProfile = async (c: Context) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const parsed = ownerProfileSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Perfil de dueño inválido');
        const values = { ...parsed.data, updatedAt: new Date() };
        const existing = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
        const [profile] = existing
            ? await db.update(serenataOwners).set(values).where(eq(serenataOwners.id, existing.id)).returning()
            : await db.insert(serenataOwners).values({
                userId: user.id,
                ...values,
                subscriptionStatus: 'active',
                subscriptionPrice: 0,
                trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
            }).returning();
        return c.json({ ok: true, profile });
    };

    app.put('/profiles/owner', upsertOwnerProfile);
    /** @deprecated Usar `PUT /profiles/owner`. */
    app.put('/profiles/admin', upsertOwnerProfile);

    const startOwnerTrial = async (c: Context) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const existing = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
        if (existing) return c.json({ ok: true, profile: existing });

        const musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
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
            subscriptionStatus: 'active',
            subscriptionPrice: 0,
            commissionRateBps: 800,
            commissionVatRateBps: 1900,
            trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
        }).returning();
        return c.json({ ok: true, profile }, 201);
    };

    app.post('/subscriptions/owner/start-trial', startOwnerTrial);
    /** @deprecated Usar `POST /subscriptions/owner/start-trial`. */
    app.post('/subscriptions/admin/start-trial', startOwnerTrial);

    app.get('/musicians', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const rows = await db
            .select({
                id: serenataMusicians.id,
                userId: serenataMusicians.userId,
                name: users.name,
                instrument: serenataMusicians.instrument,
                instruments: serenataMusicians.instruments,
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

    app.get('/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const profiles = await getProfiles(user.id);
        const role = resolveActorRoleFromRequest(c, profiles);
        const range = toDateRange(c.req.query('date'));

        if (role === 'owner' && profiles.owner) {
            await runPendingSerenataLifecycle();
            if (c.req.query('needsClosure') === '1') {
                const items = await listOwnerSerenatasNeedingClosure(profiles.owner.id);
                return c.json({ ok: true, items });
            }
            const items = await listOwnerSerenatas(profiles.owner, range);
            const ownerUserId = await resolveOwnerUserId(profiles.owner.id);
            if (ownerUserId) {
                const reminderCandidates = await loadOwnerScheduledForReminders(profiles.owner.id);
                await maybeSendClosureReminders(ownerUserId, reminderCandidates);
            }
            return c.json({ ok: true, items });
        }

        if (role === 'musician' && profiles.musician) {
            const items = await listMusicianSerenatas(profiles.musician, range);
            return c.json({ ok: true, items });
        }

        return c.json({ ok: true, items: [] });
    });

    app.get('/client/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        await runPendingSerenataLifecycle();
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return c.json({ ok: true, items: [] });
        const range = toDateRange(c.req.query('date'));
        const conditions = [eq(serenatas.clientId, client.id)];
        if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
        const items = await db.select().from(serenatas).where(and(...conditions)).orderBy(desc(serenatas.eventDate), asc(serenatas.eventTime));
        return c.json({ ok: true, items });
    });

    app.post('/client/serenatas/:id/cancel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
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
        const selectedPackage = packageForCode(parsed.data.packageCode);
        const duration = selectedPackage?.duration ?? parsed.data.duration;
        const conflict = await validateGroupForSerenata(db, {
            ownerId: required.owner.id,
            groupId: parsed.data.groupId,
            requiredMusicians: selectedPackage?.musicians ?? 0,
            eventDate: parsed.data.eventDate,
            eventTime: parsed.data.eventTime,
            duration,
        });
        if (conflict) return jsonError(c, conflict, 409);
        const [item] = await db.insert(serenatas).values({
            ...parsed.data,
            ownerId: required.owner.id,
            source: 'own_lead',
            status: 'scheduled',
            duration,
            eventType: selectedPackage?.label ?? parsed.data.eventType,
            price: parsed.data.price ?? selectedPackage?.price ?? null,
            lat: parsed.data.lat == null ? null : String(parsed.data.lat),
            lng: parsed.data.lng == null ? null : String(parsed.data.lng),
        }).returning();
        return c.json({ ok: true, item }, 201);
    });

    app.post('/client/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
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
                    await tx.insert(serenataNotifications).values({
                        userId: client.userId,
                        type: 'client_serenata_accepted',
                        title: 'Grupo asignado',
                        message: 'El grupo aceptó tu serenata y está organizando el evento.',
                        metadata: { serenataId: item.id },
                    });
                }
            }
            return { ok: true as const, item };
        });
        if (!result.ok) return jsonError(c, result.error, 409);
        return c.json({ ok: true, item: result.item });
    });

    app.post('/serenatas/:id/reject-offer', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const marketplaceSerenata = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.ownerId, required.owner.id)),
        });
        if (marketplaceSerenata?.providerGroupId) {
            const marketplaceResult = await rejectMarketplaceSerenata(required.owner.id, id);
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
        const conflict = nextEventTime
            ? await validateGroupForSerenata(db, {
                ownerId: required.owner.id,
                serenataId: current.id,
                groupId: nextGroupId,
                requiredMusicians: packageForCode(nextPackageCode)?.musicians ?? 0,
                eventDate: nextEventDate,
                eventTime: nextEventTime,
                duration: nextDuration,
            })
            : null;
        if (conflict) return jsonError(c, conflict, 409);
        const [item] = await db.update(serenatas).set({
            ...parsed.data,
            ...(nextStatus ? { status: nextStatus } : {}),
            lat: parsed.data.lat == null ? undefined : String(parsed.data.lat),
            lng: parsed.data.lng == null ? undefined : String(parsed.data.lng),
            updatedAt: new Date(),
        }).where(eq(serenatas.id, id)).returning();
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
     * Jornada operativa (`serenata_groups`): contenedor del día para invitaciones/agenda/mapa.
     * Si la serenata tiene `providerGroupId`, `musicianIds` deben ser del plantel activo del proveedor.
     * Ver `apps/simpleserenatas/src/lib/serenata-operational-groups.ts`.
     */
    app.post('/serenatas/:id/assign-group', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataGroupAssignmentSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Asignación inválida');
        const id = c.req.param('id');

        const result = await db.transaction(async (tx) => assignSerenataOperationalGroup(tx, {
            ownerId: required.owner.id,
            serenataId: id,
            input: parsed.data,
            requiredMusiciansForPackage: (code) => packageForCode(code)?.musicians ?? 0,
        }));

        if (!result.ok) return jsonError(c, result.error, result.status);
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

    app.post('/serenatas/:id/client-confirm', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return jsonError(c, 'Perfil de cliente no encontrado', 403);
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({
            where: and(eq(serenatas.id, id), eq(serenatas.clientId, client.id)),
        });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const transitionError = validateClientConfirmTransition(current);
        if (transitionError) return jsonError(c, transitionError, 409);
        const now = new Date();
        const [item] = await db.update(serenatas).set({
            clientConfirmedAt: now,
            updatedAt: now,
        }).where(and(
            eq(serenatas.id, id),
            eq(serenatas.clientId, client.id),
            eq(serenatas.status, 'completed'),
        )).returning();
        if (!item) return jsonError(c, 'No se pudo confirmar la serenata.', 409);
        return c.json({ ok: true, item });
    });

    app.get('/groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const groups = await db.select().from(serenataGroups).where(eq(serenataGroups.ownerId, required.owner.id)).orderBy(desc(serenataGroups.date));
        const groupIds = groups.map((group) => group.id);
        const members = groupIds.length > 0
            ? await db.select({
                id: serenataGroupMembers.id,
                groupId: serenataGroupMembers.groupId,
                musicianId: serenataGroupMembers.musicianId,
                instrument: serenataGroupMembers.instrument,
                status: serenataGroupMembers.status,
                message: serenataGroupMembers.message,
                musicianName: users.name,
                availableNow: serenataMusicians.availableNow,
            }).from(serenataGroupMembers)
                .innerJoin(serenataMusicians, eq(serenataMusicians.id, serenataGroupMembers.musicianId))
                .innerJoin(users, eq(users.id, serenataMusicians.userId))
                .where(inArray(serenataGroupMembers.groupId, groupIds))
            : [];
        return c.json({ ok: true, items: groups.map((group) => ({ ...group, members: members.filter((member) => member.groupId === group.id) })) });
    });

    app.post('/groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = groupWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Grupo inválido');
        const [item] = await db.insert(serenataGroups).values({ ...parsed.data, ownerId: required.owner.id }).returning();
        return c.json({ ok: true, item }, 201);
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
        const [member] = await db.insert(serenataGroupMembers).values({
            groupId: group.id,
            musicianId: musician.id,
            instrument: parsed.data.instrument,
            message: parsed.data.message,
            status: 'invited',
        }).onConflictDoUpdate({
            target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
            set: { instrument: parsed.data.instrument, message: parsed.data.message, status: 'invited', updatedAt: new Date() },
        }).returning();
        await db.insert(serenataNotifications).values({
            userId: musician.userId,
            type: 'group_invitation',
            title: 'Nueva invitación',
            message: `Te invitaron al grupo ${group.name}.`,
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
        const parsed = memberStatusSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Estado inválido');
        const [member] = await db.update(serenataGroupMembers).set({ ...parsed.data, updatedAt: new Date() })
            .where(and(eq(serenataGroupMembers.id, c.req.param('memberId')), eq(serenataGroupMembers.groupId, group.id))).returning();
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
                .where(and(eq(serenatas.ownerId, profiles.owner.id), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
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
            .where(and(eq(serenatas.ownerId, required.owner.id), inArray(serenatas.status, ['accepted_pending_group', 'scheduled']), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
            .orderBy(asc(serenatas.eventTime));
        const withCoordinates = rows.filter((item) => toNumber(item.lat) != null && toNumber(item.lng) != null);
        const withoutCoordinates = rows.filter((item) => toNumber(item.lat) == null || toNumber(item.lng) == null);
        return c.json({ ok: true, items: [...withCoordinates, ...withoutCoordinates] });
    });

    registerMarketplaceRoutes(app, {
        authUser: deps.authUser,
        jsonError,
        ensureClientProfile,
        requireOwner,
        validateOwnerAvailability,
    });

    return app;
}
