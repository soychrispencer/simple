import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import {
    serenataCoordinators,
    serenataClients,
    serenataGroupMembers,
    serenataGroups,
    serenataMusicians,
    serenataNotifications,
    serenataOffers,
    serenatas,
    users,
} from '../../db/schema.js';

type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
};

type SerenatasRouterDeps = {
    authUser: (c: Context) => Promise<AuthUser | null>;
};

export type SerenataPaymentTarget = typeof serenatas.$inferSelect;

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
});

const coordinatorProfileSchema = z.object({
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

function jsonError(c: Context, error: string, status: 400 | 401 | 403 | 404 | 409 | 500 = 400) {
    return c.json({ ok: false, error }, status);
}

function toNumber(value: string | null): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toDateRange(rawDate: string | undefined): { start: Date; end: Date } | null {
    if (!rawDate) return null;
    const start = new Date(`${rawDate}T00:00:00.000Z`);
    const end = new Date(`${rawDate}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
}

function minutesFromTime(value: string) {
    const [rawHours, rawMinutes] = value.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

function rangesOverlap(startA: number, durationA: number, startB: number, durationB: number) {
    return startA < startB + durationB && startB < startA + durationA;
}

function estimatedTravelMinutes(a: typeof serenatas.$inferSelect, b: typeof serenatas.$inferSelect) {
    const aLat = toNumber(a.lat);
    const aLng = toNumber(a.lng);
    const bLat = toNumber(b.lat);
    const bLng = toNumber(b.lng);
    if (aLat == null || aLng == null || bLat == null || bLng == null) return 15;
    return Math.max(10, Math.ceil((distanceKm({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }) / 28) * 60) + 8);
}

function packageForCode(code: string | null | undefined) {
    if (!code) return null;
    return serenataPackageCodeSchema.safeParse(code).success ? serenataPackages[code as SerenataPackageCode] : null;
}

async function validateGroupForSerenata<TClient extends Pick<typeof db, 'query' | 'select'>>(
    tx: TClient,
    input: {
        coordinatorId: string;
        serenataId?: string;
        groupId: string | null | undefined;
        packageCode?: string | null;
        eventDate: Date;
        eventTime: string;
        duration: number;
    }
) {
    if (!input.groupId) return null;
    const group = await tx.query.serenataGroups.findFirst({
        where: and(eq(serenataGroups.id, input.groupId), eq(serenataGroups.coordinatorId, input.coordinatorId)),
    });
    if (!group) return 'Grupo no encontrado.';

    const requiredMusicians = packageForCode(input.packageCode)?.musicians ?? 0;
    if (requiredMusicians > 0) {
        const members = await tx.select({ id: serenataGroupMembers.id }).from(serenataGroupMembers)
            .where(eq(serenataGroupMembers.groupId, input.groupId));
        if (members.length < requiredMusicians) {
            return `Este servicio requiere ${requiredMusicians} músicos. El grupo seleccionado tiene ${members.length}.`;
        }
    }

    const eventDate = input.eventDate.toISOString().slice(0, 10);
    const range = toDateRange(eventDate);
    if (!range) return null;
    const currentStart = minutesFromTime(input.eventTime);
    if (currentStart == null) return null;
    const existing = await tx.select().from(serenatas).where(and(
        eq(serenatas.coordinatorId, input.coordinatorId),
        eq(serenatas.groupId, input.groupId),
        inArray(serenatas.status, ['accepted_pending_group', 'scheduled']),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));
    const conflicting = existing.find((item) => {
        if (input.serenataId && item.id === input.serenataId) return false;
        const otherStart = minutesFromTime(item.eventTime);
        return otherStart != null && rangesOverlap(currentStart, input.duration, otherStart, item.duration);
    });
    if (conflicting) {
        return `Ese grupo ya tiene una serenata a las ${conflicting.eventTime}. Ajusta horario o selecciona otro grupo.`;
    }

    return null;
}

async function validateCoordinatorAvailability(
    client: Pick<typeof db, 'select'>,
    input: {
        coordinatorId: string;
        serenata: typeof serenatas.$inferSelect;
        excludeId?: string;
    }
) {
    const eventDate = input.serenata.eventDate.toISOString().slice(0, 10);
    const range = toDateRange(eventDate);
    if (!range) return null;
    const start = minutesFromTime(input.serenata.eventTime);
    if (start == null) return null;
    const items = await client.select().from(serenatas).where(and(
        eq(serenatas.coordinatorId, input.coordinatorId),
        inArray(serenatas.status, ['accepted_pending_group', 'scheduled']),
        gte(serenatas.eventDate, range.start),
        lte(serenatas.eventDate, range.end),
    ));

    for (const item of items) {
        if (item.id === input.serenata.id || item.id === input.excludeId) continue;
        const otherStart = minutesFromTime(item.eventTime);
        if (otherStart == null) continue;
        const travel = estimatedTravelMinutes(input.serenata, item);
        const currentBeforeOther = start <= otherStart;
        const currentEndWithTravel = start + input.serenata.duration + travel;
        const otherEndWithTravel = otherStart + item.duration + travel;
        if ((currentBeforeOther && currentEndWithTravel > otherStart) || (!currentBeforeOther && otherEndWithTravel > start)) {
            return `No hay tiempo suficiente con ${item.recipientName} a las ${item.eventTime}. Considera otro horario o reordenar la ruta.`;
        }
    }

    return null;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const radius = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.asin(Math.sqrt(h));
}

async function createPlatformOffersForSerenata(serenata: { id: string; comuna: string | null; region: string | null; price: number | null; eventDate: Date }) {
    const coordinators = await db
        .select({
            id: serenataCoordinators.id,
            userId: serenataCoordinators.userId,
            comuna: serenataCoordinators.comuna,
            region: serenataCoordinators.region,
            workingComunas: serenataCoordinators.workingComunas,
            minPrice: serenataCoordinators.minPrice,
            subscriptionStatus: serenataCoordinators.subscriptionStatus,
            name: users.name,
        })
        .from(serenataCoordinators)
        .innerJoin(users, eq(users.id, serenataCoordinators.userId))
        .where(inArray(serenataCoordinators.subscriptionStatus, ['trialing', 'active']));

    const candidates = coordinators
        .filter((coordinator) => {
            const workingComunas = Array.isArray(coordinator.workingComunas) ? coordinator.workingComunas : [];
            const matchesComuna = serenata.comuna
                ? workingComunas.includes(serenata.comuna) || coordinator.comuna === serenata.comuna
                : true;
            const matchesRegion = serenata.region ? coordinator.region === serenata.region || workingComunas.length > 0 : true;
            const matchesPrice = coordinator.minPrice == null || serenata.price == null || serenata.price >= coordinator.minPrice;
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
    const offers = await db.insert(serenataOffers).values(candidates.map((coordinator, index) => ({
        serenataId: serenata.id,
        coordinatorId: coordinator.id,
        status: 'offered',
        rank: index + 1,
        expiresAt,
    }))).onConflictDoNothing().returning();

    await db.insert(serenataNotifications).values(candidates.map((coordinator) => ({
        userId: coordinator.userId,
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

export async function publishPaidSerenataToCoordinators(userId: string, serenataId: string, orderId: string): Promise<{ item: SerenataPaymentTarget; offersCount: number } | null> {
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

function notificationHref(metadata: Record<string, unknown> | null) {
    const serenataId = typeof metadata?.serenataId === 'string' ? metadata.serenataId : null;
    return serenataId ? `/?section=serenatas&serenata=${encodeURIComponent(serenataId)}` : '/?section=serenatas';
}

async function getProfiles(userId: string) {
    const [client, musician, coordinator] = await Promise.all([
        db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, userId) }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, userId) }),
        db.query.serenataCoordinators.findFirst({ where: eq(serenataCoordinators.userId, userId) }),
    ]);
    return { client: client ?? null, musician: musician ?? null, coordinator: coordinator ?? null };
}

async function requireCoordinator(c: Context, userId: string) {
    const coordinator = await db.query.serenataCoordinators.findFirst({ where: eq(serenataCoordinators.userId, userId) });
    if (!coordinator) return { ok: false as const, response: jsonError(c, 'Activa el perfil coordinador para continuar.', 403) };
    return { ok: true as const, coordinator };
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
                type: item.type === 'group_invitation' ? 'message_thread' : 'service_lead',
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
        const parsed = musicianProfileSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Perfil músico inválido');
        const existing = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
        const values = {
            ...parsed.data,
            lat: parsed.data.lat == null ? null : String(parsed.data.lat),
            lng: parsed.data.lng == null ? null : String(parsed.data.lng),
            updatedAt: new Date(),
        };
        const [profile] = existing
            ? await db.update(serenataMusicians).set(values).where(eq(serenataMusicians.id, existing.id)).returning()
            : await db.insert(serenataMusicians).values({ userId: user.id, ...values }).returning();
        return c.json({ ok: true, profile });
    });

    app.put('/profiles/coordinator', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const parsed = coordinatorProfileSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Perfil coordinador inválido');
        const existing = await db.query.serenataCoordinators.findFirst({ where: eq(serenataCoordinators.userId, user.id) });
        if (!existing) return jsonError(c, 'Suscríbete como coordinador para activar este perfil.', 403);
        const values = { ...parsed.data, updatedAt: new Date() };
        const [profile] = await db.update(serenataCoordinators).set(values).where(eq(serenataCoordinators.id, existing.id)).returning();
        return c.json({ ok: true, profile });
    });

    app.post('/subscriptions/coordinator/start-trial', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
        if (!musician) return jsonError(c, 'Debes registrarte como músico antes de suscribirte como coordinador.', 403);
        const existing = await db.query.serenataCoordinators.findFirst({ where: eq(serenataCoordinators.userId, user.id) });
        if (existing) return c.json({ ok: true, profile: existing });
        const [profile] = await db.insert(serenataCoordinators).values({
            userId: user.id,
            bio: musician.bio,
            comuna: musician.comuna,
            region: musician.region,
            workingComunas: musician.comuna ? [musician.comuna] : [],
            subscriptionStatus: 'trialing',
            subscriptionPrice: 19990,
            commissionRateBps: 800,
            commissionVatRateBps: 1900,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).returning();
        return c.json({ ok: true, profile }, 201);
    });

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
        const { coordinator, musician } = await getProfiles(user.id);
        const range = toDateRange(c.req.query('date'));

        if (coordinator) {
            const assignedConditions = [
                eq(serenatas.coordinatorId, coordinator.id),
                inArray(serenatas.status, ['accepted_pending_group']),
            ];
            if (range) assignedConditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
            const assigned = await db
                .select({ item: serenatas, offerId: serenataOffers.id, offerStatus: serenataOffers.status })
                .from(serenatas)
                .leftJoin(serenataOffers, and(eq(serenataOffers.serenataId, serenatas.id), eq(serenataOffers.coordinatorId, coordinator.id)))
                .where(and(...assignedConditions))
                .orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));

            const offerConditions = [
                eq(serenataOffers.coordinatorId, coordinator.id),
                inArray(serenataOffers.status, ['offered', 'accepted']),
            ];
            if (range) offerConditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
            const offered = await db
                .select({ item: serenatas, offerId: serenataOffers.id, offerStatus: serenataOffers.status })
                .from(serenataOffers)
                .innerJoin(serenatas, eq(serenatas.id, serenataOffers.serenataId))
                .where(and(...offerConditions))
                .orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));

            const seen = new Set<string>();
            const items = [...assigned, ...offered]
                .filter((row) => {
                    if (seen.has(row.item.id)) return false;
                    seen.add(row.item.id);
                    return true;
                })
                .sort((a, b) => {
                    const dateDiff = new Date(a.item.eventDate).getTime() - new Date(b.item.eventDate).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return a.item.eventTime.localeCompare(b.item.eventTime);
                })
                .map((row) => ({ ...row.item, offerId: row.offerId, offerStatus: row.offerStatus }));
            return c.json({ ok: true, items });
        }

        if (musician) {
            const memberRows = await db.select({ groupId: serenataGroupMembers.groupId }).from(serenataGroupMembers).where(eq(serenataGroupMembers.musicianId, musician.id));
            const groupIds = memberRows.map((row) => row.groupId);
            if (groupIds.length === 0) return c.json({ ok: true, items: [] });
            const conditions = [inArray(serenatas.groupId, groupIds)];
            if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
            const items = await db.select().from(serenatas).where(and(...conditions)).orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));
            return c.json({ ok: true, items });
        }

        return c.json({ ok: true, items: [] });
    });

    app.get('/client/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, user.id) });
        if (!client) return c.json({ ok: true, items: [] });
        const range = toDateRange(c.req.query('date'));
        const conditions = [eq(serenatas.clientId, client.id)];
        if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
        const items = await db.select().from(serenatas).where(and(...conditions)).orderBy(desc(serenatas.eventDate), asc(serenatas.eventTime));
        return c.json({ ok: true, items });
    });

    app.post('/serenatas', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        const selectedPackage = packageForCode(parsed.data.packageCode);
        const duration = selectedPackage?.duration ?? parsed.data.duration;
        const conflict = await validateGroupForSerenata(db, {
            coordinatorId: required.coordinator.id,
            groupId: parsed.data.groupId,
            packageCode: parsed.data.packageCode,
            eventDate: parsed.data.eventDate,
            eventTime: parsed.data.eventTime,
            duration,
        });
        if (conflict) return jsonError(c, conflict, 409);
        const [item] = await db.insert(serenatas).values({
            ...parsed.data,
            coordinatorId: required.coordinator.id,
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
        const parsed = clientSerenataWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
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
            coordinatorId: null,
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
            coordinatorId: null,
            source: 'platform_lead',
            status: 'pending',
            lat: parsed.data.lat == null ? null : String(parsed.data.lat),
            lng: parsed.data.lng == null ? null : String(parsed.data.lng),
        }).returning();
        const offers = await createPlatformOffersForSerenata({
            id: item.id,
            comuna: item.comuna,
            region: item.region,
            price: item.price,
            eventDate: item.eventDate,
        });
        return c.json({ ok: true, item, offers }, 201);
    });

    app.post('/serenatas/:id/accept-offer', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const result = await db.transaction(async (tx) => {
            const offer = await tx.query.serenataOffers.findFirst({
                where: and(eq(serenataOffers.serenataId, id), eq(serenataOffers.coordinatorId, required.coordinator.id), eq(serenataOffers.status, 'offered')),
            });
            if (!offer) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };
            const pendingSerenata = await tx.query.serenatas.findFirst({
                where: and(eq(serenatas.id, id), eq(serenatas.source, 'platform_lead'), eq(serenatas.status, 'pending')),
            });
            if (!pendingSerenata) return { ok: false as const, error: 'Esta solicitud ya fue tomada por otro coordinador.' };
            const availabilityError = await validateCoordinatorAvailability(tx, {
                coordinatorId: required.coordinator.id,
                serenata: { ...pendingSerenata, coordinatorId: required.coordinator.id },
            });
            if (availabilityError) return { ok: false as const, error: availabilityError };
            const [item] = await tx.update(serenatas).set({
                coordinatorId: required.coordinator.id,
                status: 'accepted_pending_group',
                updatedAt: new Date(),
            }).where(and(eq(serenatas.id, id), eq(serenatas.source, 'platform_lead'), eq(serenatas.status, 'pending'))).returning();
            if (!item) return { ok: false as const, error: 'Esta solicitud ya fue tomada por otro coordinador.' };
            await tx.update(serenataOffers).set({ status: 'accepted', respondedAt: new Date(), updatedAt: new Date() }).where(eq(serenataOffers.id, offer.id));
            await tx.update(serenataOffers).set({ status: 'expired', updatedAt: new Date() }).where(and(eq(serenataOffers.serenataId, id), eq(serenataOffers.status, 'offered')));
            if (item.clientId) {
                const client = await tx.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
                if (client) {
                    await tx.insert(serenataNotifications).values({
                        userId: client.userId,
                        type: 'client_serenata_accepted',
                        title: 'Coordinador asignado',
                        message: 'Un coordinador aceptó tu serenata y está asignando el grupo.',
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
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const [offer] = await db.update(serenataOffers).set({ status: 'rejected', respondedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(serenataOffers.serenataId, c.req.param('id')), eq(serenataOffers.coordinatorId, required.coordinator.id), eq(serenataOffers.status, 'offered'))).returning();
        if (!offer) return jsonError(c, 'Esta solicitud ya no está disponible.', 409);
        return c.json({ ok: true, offer });
    });

    app.patch('/serenatas/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const id = c.req.param('id');
        const current = await db.query.serenatas.findFirst({ where: and(eq(serenatas.id, id), eq(serenatas.coordinatorId, required.coordinator.id)) });
        if (!current) return jsonError(c, 'Serenata no encontrada', 404);
        const parsed = serenataPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Serenata inválida');
        const nextStatus = current.status === 'accepted_pending_group' && parsed.data.groupId ? 'scheduled' : undefined;
        const nextEventDate = parsed.data.eventDate ?? current.eventDate;
        const nextEventTime = parsed.data.eventTime ?? current.eventTime;
        const nextDuration = parsed.data.duration ?? current.duration;
        const nextPackageCode = parsed.data.packageCode ?? current.packageCode;
        const nextGroupId = parsed.data.groupId === undefined ? current.groupId : parsed.data.groupId;
        const conflict = await validateGroupForSerenata(db, {
            coordinatorId: required.coordinator.id,
            serenataId: current.id,
            groupId: nextGroupId,
            packageCode: nextPackageCode,
            eventDate: nextEventDate,
            eventTime: nextEventTime,
            duration: nextDuration,
        });
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
                message: 'El coordinador asignó el grupo para tu serenata.',
                serenataId: item.id,
            });
        }
        return c.json({ ok: true, item });
    });

    app.post('/serenatas/:id/assign-group', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const parsed = serenataGroupAssignmentSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Asignación inválida');
        const id = c.req.param('id');
        const musicianIds = Array.from(new Set(parsed.data.musicianIds));

        const result = await db.transaction(async (tx) => {
            const current = await tx.query.serenatas.findFirst({
                where: and(eq(serenatas.id, id), eq(serenatas.coordinatorId, required.coordinator.id)),
            });
            if (!current) return { ok: false as const, error: 'Serenata no encontrada', status: 404 as const };
            if (!['accepted_pending_group', 'scheduled'].includes(current.status)) {
                return { ok: false as const, error: 'Esta serenata no está lista para asignar grupo.', status: 409 as const };
            }

            let group: typeof serenataGroups.$inferSelect | undefined;
            if (parsed.data.mode === 'existing') {
                if (!parsed.data.groupId) return { ok: false as const, error: 'Selecciona un grupo.', status: 400 as const };
                group = await tx.query.serenataGroups.findFirst({
                    where: and(eq(serenataGroups.id, parsed.data.groupId), eq(serenataGroups.coordinatorId, required.coordinator.id)),
                });
                if (!group) return { ok: false as const, error: 'Grupo no encontrado', status: 404 as const };
            } else {
                const fallbackName = `Serenata ${current.recipientName}`;
                const [created] = await tx.insert(serenataGroups).values({
                    coordinatorId: required.coordinator.id,
                    name: parsed.data.name?.trim() || fallbackName,
                    date: current.eventDate,
                    status: 'active',
                }).returning();
                group = created;
            }

            const existingMembers = await tx.select({ musicianId: serenataGroupMembers.musicianId }).from(serenataGroupMembers).where(eq(serenataGroupMembers.groupId, group.id));
            if (existingMembers.length === 0 && musicianIds.length === 0) {
                return { ok: false as const, error: 'Agrega al menos un músico al grupo.', status: 400 as const };
            }

            if (musicianIds.length > 0) {
                const musicians = await tx.select({
                    id: serenataMusicians.id,
                    userId: serenataMusicians.userId,
                    instrument: serenataMusicians.instrument,
                }).from(serenataMusicians).where(inArray(serenataMusicians.id, musicianIds));
                if (musicians.length !== musicianIds.length) {
                    return { ok: false as const, error: 'Uno o más músicos no existen.', status: 404 as const };
                }

                await tx.insert(serenataGroupMembers).values(musicians.map((musician) => ({
                    groupId: group.id,
                    musicianId: musician.id,
                    instrument: musician.instrument,
                    message: parsed.data.message,
                    status: 'invited',
                }))).onConflictDoUpdate({
                    target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
                    set: { message: parsed.data.message, status: 'invited', updatedAt: new Date() },
                });

                await tx.insert(serenataNotifications).values(musicians.map((musician) => ({
                    userId: musician.userId,
                    type: 'group_invitation',
                    title: 'Nueva invitación',
                    message: `Te invitaron al grupo ${group.name}.`,
                    metadata: { serenataId: current.id, groupId: group.id },
                }))).onConflictDoNothing();
            }

            const nextMemberCount = existingMembers.length + musicianIds.filter((id) => !existingMembers.some((member) => member.musicianId === id)).length;
            const requiredMusicians = packageForCode(current.packageCode)?.musicians ?? 0;
            if (requiredMusicians > 0 && nextMemberCount < requiredMusicians) {
                return {
                    ok: false as const,
                    error: `Este servicio requiere ${requiredMusicians} músicos. Selecciona más integrantes antes de confirmar.`,
                    status: 409 as const,
                };
            }

            const conflict = await validateGroupForSerenata(tx, {
                coordinatorId: required.coordinator.id,
                serenataId: current.id,
                groupId: group.id,
                packageCode: current.packageCode,
                eventDate: current.eventDate,
                eventTime: current.eventTime,
                duration: current.duration,
            });
            if (conflict) return { ok: false as const, error: conflict, status: 409 as const };

            const [item] = await tx.update(serenatas).set({
                groupId: group.id,
                status: 'scheduled',
                updatedAt: new Date(),
            }).where(eq(serenatas.id, current.id)).returning();

            if (item.clientId) {
                const client = await tx.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
                if (client) {
                    await tx.insert(serenataNotifications).values({
                        userId: client.userId,
                        type: 'client_serenata_scheduled',
                        title: 'Serenata confirmada',
                        message: 'El coordinador asignó el grupo para tu serenata.',
                        metadata: { serenataId: item.id, groupId: group.id },
                    });
                }
            }

            return { ok: true as const, item, group };
        });

        if (!result.ok) return jsonError(c, result.error, result.status);
        return c.json({ ok: true, item: result.item, group: result.group });
    });

    app.post('/serenatas/:id/cancel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const [item] = await db.update(serenatas).set({ status: 'cancelled', updatedAt: new Date() })
            .where(and(eq(serenatas.id, c.req.param('id')), eq(serenatas.coordinatorId, required.coordinator.id))).returning();
        if (!item) return jsonError(c, 'Serenata no encontrada', 404);
        await notifySerenataClient(item.clientId, {
            type: 'client_serenata_cancelled',
            title: 'Serenata cancelada',
            message: 'El coordinador canceló esta serenata.',
            serenataId: item.id,
        });
        return c.json({ ok: true, item });
    });

    app.post('/serenatas/:id/complete', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const [item] = await db.update(serenatas).set({ status: 'completed', updatedAt: new Date() })
            .where(and(eq(serenatas.id, c.req.param('id')), eq(serenatas.coordinatorId, required.coordinator.id))).returning();
        if (!item) return jsonError(c, 'Serenata no encontrada', 404);
        await notifySerenataClient(item.clientId, {
            type: 'client_serenata_completed',
            title: 'Serenata completada',
            message: 'Tu serenata fue marcada como completada.',
            serenataId: item.id,
        });
        return c.json({ ok: true, item });
    });

    app.get('/groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const groups = await db.select().from(serenataGroups).where(eq(serenataGroups.coordinatorId, required.coordinator.id)).orderBy(desc(serenataGroups.date));
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
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const parsed = groupWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Grupo inválido');
        const [item] = await db.insert(serenataGroups).values({ ...parsed.data, coordinatorId: required.coordinator.id }).returning();
        return c.json({ ok: true, item }, 201);
    });

    app.post('/groups/:id/members', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({ where: and(eq(serenataGroups.id, c.req.param('id')), eq(serenataGroups.coordinatorId, required.coordinator.id)) });
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
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const group = await db.query.serenataGroups.findFirst({ where: and(eq(serenataGroups.id, c.req.param('groupId')), eq(serenataGroups.coordinatorId, required.coordinator.id)) });
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
        const rows = await db.select({
            id: serenataGroupMembers.id,
            groupId: serenataGroupMembers.groupId,
            status: serenataGroupMembers.status,
            instrument: serenataGroupMembers.instrument,
            message: serenataGroupMembers.message,
            groupName: serenataGroups.name,
            groupDate: serenataGroups.date,
        }).from(serenataGroupMembers)
            .innerJoin(serenataGroups, eq(serenataGroups.id, serenataGroupMembers.groupId))
            .where(eq(serenataGroupMembers.musicianId, required.musician.id))
            .orderBy(desc(serenataGroups.date));
        return c.json({ ok: true, items: rows });
    });

    app.post('/invitations/:id/respond', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireMusician(c, user.id);
        if (!required.ok) return required.response;
        const parsed = z.object({ status: z.enum(['accepted', 'rejected']) }).safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return jsonError(c, 'Respuesta inválida');
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
        c.req.query('date');
        const { coordinator, musician } = await getProfiles(user.id);
        if (coordinator) {
            const items = await db.select().from(serenatas)
                .where(and(eq(serenatas.coordinatorId, coordinator.id), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
                .orderBy(asc(serenatas.eventTime));
            return c.json({ ok: true, items });
        }
        if (musician) {
            const memberRows = await db.select({ groupId: serenataGroupMembers.groupId }).from(serenataGroupMembers)
                .where(and(eq(serenataGroupMembers.musicianId, musician.id), eq(serenataGroupMembers.status, 'accepted')));
            const groupIds = memberRows.map((row) => row.groupId);
            if (groupIds.length === 0) return c.json({ ok: true, items: [] });
            const items = await db.select().from(serenatas)
                .where(and(inArray(serenatas.groupId, groupIds), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
                .orderBy(asc(serenatas.eventTime));
            return c.json({ ok: true, items });
        }
        return c.json({ ok: true, items: [] });
    });

    app.get('/route', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return jsonError(c, 'No autenticado', 401);
        const required = await requireCoordinator(c, user.id);
        if (!required.ok) return required.response;
        const range = toDateRange(c.req.query('date') ?? new Date().toISOString().slice(0, 10));
        if (!range) return jsonError(c, 'Fecha inválida');
        const rows = await db.select().from(serenatas)
            .where(and(eq(serenatas.coordinatorId, required.coordinator.id), inArray(serenatas.status, ['accepted_pending_group', 'scheduled']), gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end)))
            .orderBy(asc(serenatas.eventTime));
        const pending = rows
            .map((item) => ({ item, lat: toNumber(item.lat), lng: toNumber(item.lng) }))
            .filter((entry): entry is { item: typeof rows[number]; lat: number; lng: number } => entry.lat != null && entry.lng != null);
        const ordered: typeof pending = [];
        let current = pending[0] ? { lat: pending[0].lat, lng: pending[0].lng } : null;
        const queue = pending.slice();
        while (current && queue.length > 0) {
            let bestIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;
            queue.forEach((entry, index) => {
                const nextDistance = distanceKm(current!, entry);
                if (nextDistance < bestDistance) {
                    bestDistance = nextDistance;
                    bestIndex = index;
                }
            });
            const [next] = queue.splice(bestIndex, 1);
            ordered.push(next);
            current = { lat: next.lat, lng: next.lng };
        }
        const orderedIds = new Set(ordered.map((entry) => entry.item.id));
        const withoutCoordinates = rows.filter((item) => !orderedIds.has(item.id));
        return c.json({ ok: true, items: [...ordered.map((entry) => entry.item), ...withoutCoordinates] });
    });

    return app;
}
