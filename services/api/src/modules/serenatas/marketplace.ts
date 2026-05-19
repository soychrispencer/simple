import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import {
    DEFAULT_WEEKLY_RULES,
    generateMarketplaceTimeSlots,
    getProviderGroupSlotOptions,
    listProviderGroupAvailabilityRules,
    listProviderGroupBusySerenatas,
    replaceProviderGroupAvailabilityRules,
    resolveBufferMinutes,
    resolveSlaHours,
    type SerenataAvailabilityRuleInput,
    validateMarketplaceEventLead,
    validateProviderGroupSlot,
} from './availability.js';
import { eventDateYmd } from './lifecycle.js';
import {
    serenataAvailabilityRules,
    serenataClients,
    serenataOwners,
    serenataGroupServices,
    serenataMusicians,
    serenataNotifications,
    serenataProviderGroupApplications,
    serenataProviderGroupMembers,
    serenataProviderGroups,
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

type MarketplaceDeps = {
    authUser: (c: Context) => Promise<AuthUser | null>;
    jsonError: (c: Context, error: string, status?: 400 | 401 | 403 | 404 | 409 | 500) => Response;
    ensureClientProfile: (
        user: AuthUser,
        fallback?: { phone?: string | null; comuna?: string | null; region?: string | null },
    ) => Promise<{ id: string; userId: string }>;
    requireOwner: (c: Context, userId: string) => Promise<
        | { ok: false; response: Response }
        | { ok: true; owner: typeof serenataOwners.$inferSelect }
    >;
    validateOwnerAvailability: (
        client: Pick<typeof db, 'select'>,
        input: {
            ownerId: string;
            serenata: typeof serenatas.$inferSelect;
            excludeId?: string;
        },
    ) => Promise<string | null>;
};

const emptyStringToNull = z.preprocess((value) => value === '' ? null : value, z.string().nullable().optional());
const optionalNumber = z.preprocess((value) => value === '' || value == null ? null : Number(value), z.number().finite().nullable().optional());
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

export const BOOKING_MODES = ['manual', 'auto_if_available', 'auto_decline'] as const;

const timeHm = z.string().regex(/^\d{2}:\d{2}$/);

export const providerGroupWriteSchema = z.object({
    name: z.string().min(2).max(160),
    description: emptyStringToNull,
    logoUrl: emptyStringToNull,
    coverUrl: emptyStringToNull,
    phone: emptyStringToNull,
    whatsapp: emptyStringToNull,
    region: emptyStringToNull,
    comunaBase: emptyStringToNull,
    serviceComunas: z.array(z.string().min(1)).default([]),
    status: z.enum(['draft', 'active', 'paused', 'rejected']).optional(),
    slaHours: z.number().int().min(1).max(168).optional(),
    bookingMode: z.enum(BOOKING_MODES).optional(),
    bufferMinutes: z.number().int().min(0).max(120).optional(),
});

export const providerGroupPatchSchema = providerGroupWriteSchema.partial();

export const providerAvailabilityRuleSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeHm,
    endTime: timeHm,
    isActive: z.boolean().optional(),
});

export const providerAvailabilityPutSchema = z.object({
    bufferMinutes: z.number().int().min(0).max(120).optional(),
    slaHours: z.number().int().min(1).max(168).optional(),
    bookingMode: z.enum(BOOKING_MODES).optional(),
    rules: z.array(providerAvailabilityRuleSchema).min(1).max(14).optional(),
});

export const providerGroupApplicationSchema = providerGroupWriteSchema.omit({ status: true, logoUrl: true, coverUrl: true });

export const groupServiceWriteSchema = z.object({
    name: z.string().min(2).max(160),
    description: emptyStringToNull,
    musiciansCount: z.number().int().min(1).max(20).default(3),
    durationMinutes: z.number().int().min(15).max(240).default(45),
    price: z.number().int().min(1000),
    currency: z.string().min(3).max(8).default('CLP'),
    eventType: emptyStringToNull,
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

export const groupServicePatchSchema = groupServiceWriteSchema.partial();

export const providerGroupMemberWriteSchema = z.object({
    musicianId: z.string().uuid(),
    role: z.enum(['owner', 'musician', 'admin']).default('musician').transform((v) => (v === 'admin' ? 'owner' : v)),
    instruments: z.array(z.string().min(1)).default([]),
    message: emptyStringToNull,
});

export const providerGroupMemberPatchSchema = z.object({
    role: z.enum(['owner', 'musician', 'admin']).optional().transform((v) => (v === 'admin' ? 'owner' : v)),
    instruments: z.array(z.string().min(1)).optional(),
    status: z.enum(['invited', 'active', 'inactive', 'removed', 'rejected']).optional(),
    message: emptyStringToNull,
});

export const marketplaceSerenataSchema = z.object({
    providerGroupId: z.string().uuid(),
    serviceId: z.string().uuid(),
    recipientName: z.string().min(2),
    clientPhone: emptyStringToNull,
    address: z.string().min(4),
    comuna: z.string().min(1),
    region: z.string().min(1),
    lat: optionalNumber,
    lng: optionalNumber,
    eventDate: dateString,
    eventTime: z.string().min(4).max(10).nullable().optional(),
    flexibleSchedule: z.boolean().optional(),
    message: emptyStringToNull,
}).superRefine((data, ctx) => {
    if (data.flexibleSchedule) return;
    if (!data.eventTime?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Indica la hora del evento o marca horario flexible.', path: ['eventTime'] });
    }
});

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 150);
}

async function uniqueSlug(base: string, excludeId?: string) {
    let slug = slugify(base) || 'grupo';
    let suffix = 0;
    while (true) {
        const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
        const existing = await db.query.serenataProviderGroups.findFirst({
            where: eq(serenataProviderGroups.slug, candidate),
        });
        if (!existing || existing.id === excludeId) return candidate;
        suffix += 1;
    }
}

function mapProviderGroup(row: typeof serenataProviderGroups.$inferSelect) {
    return {
        id: row.id,
        ownerUserId: row.ownerUserId,
        ownerId: row.ownerId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        logoUrl: row.logoUrl,
        coverUrl: row.coverUrl,
        phone: row.phone,
        whatsapp: row.whatsapp,
        region: row.region,
        comunaBase: row.comunaBase,
        serviceComunas: row.serviceComunas ?? [],
        status: row.status,
        isVerified: row.isVerified,
        ratingAverage: Number(row.ratingAverage ?? 0),
        ratingCount: row.ratingCount,
        slaHours: row.slaHours,
        bookingMode: row.bookingMode,
        bufferMinutes: row.bufferMinutes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function mapAvailabilityRule(row: typeof serenataAvailabilityRules.$inferSelect) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function mapGroupService(row: typeof serenataGroupServices.$inferSelect) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        name: row.name,
        description: row.description,
        musiciansCount: row.musiciansCount,
        durationMinutes: row.durationMinutes,
        price: row.price,
        currency: row.currency,
        eventType: row.eventType,
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function mapProviderGroupMember(row: {
    id: string;
    providerGroupId: string;
    musicianId: string;
    role: string;
    instruments: string[];
    status: string;
    message: string | null;
    invitedByUserId: string | null;
    respondedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    musicianName?: string | null;
    instrument?: string | null;
    availableNow?: boolean | null;
    comuna?: string | null;
    region?: string | null;
}) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        musicianId: row.musicianId,
        role: row.role,
        instruments: row.instruments ?? [],
        status: row.status,
        message: row.message,
        invitedByUserId: row.invitedByUserId,
        respondedAt: row.respondedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        musicianName: row.musicianName ?? null,
        instrument: row.instrument ?? null,
        availableNow: row.availableNow ?? false,
        comuna: row.comuna ?? null,
        region: row.region ?? null,
    };
}

function mapProviderGroupApplication(row: typeof serenataProviderGroupApplications.$inferSelect) {
    return {
        id: row.id,
        userId: row.userId,
        providerGroupId: row.providerGroupId,
        name: row.name,
        description: row.description,
        phone: row.phone,
        whatsapp: row.whatsapp,
        region: row.region,
        comunaBase: row.comunaBase,
        serviceComunas: row.serviceComunas ?? [],
        status: row.status,
        reviewNotes: row.reviewNotes,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

async function enrichProviderGroupsForMarketplace(groups: (typeof serenataProviderGroups.$inferSelect)[]) {
    if (groups.length === 0) return [];
    const groupIds = groups.map((group) => group.id);
    const services = await db
        .select()
        .from(serenataGroupServices)
        .where(and(inArray(serenataGroupServices.providerGroupId, groupIds), eq(serenataGroupServices.isActive, true)))
        .orderBy(asc(serenataGroupServices.sortOrder), asc(serenataGroupServices.price));

    return groups.map((group) => {
        const groupServices = services.filter((service) => service.providerGroupId === group.id);
        const prices = groupServices.map((service) => service.price).filter((price) => Number.isFinite(price));
        return {
            ...mapProviderGroup(group),
            startingPrice: prices.length > 0 ? Math.min(...prices) : null,
            activeServicesCount: groupServices.length,
            servicesPreview: groupServices.slice(0, 3).map((service) => ({
                id: service.id,
                name: service.name,
                price: service.price,
                musiciansCount: service.musiciansCount,
                durationMinutes: service.durationMinutes,
            })),
        };
    });
}

async function requireProviderGroupAccess(
    c: Context,
    userId: string,
    groupId: string,
    deps: MarketplaceDeps,
) {
    const required = await deps.requireOwner(c, userId);
    if (!required.ok) return required;
    const owner = required.owner;
    const group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.id, groupId),
    });
    if (!group) {
        return { ok: false as const, response: deps.jsonError(c, 'Grupo no encontrado', 404) };
    }
    const isOwnerUser = group.ownerUserId === userId;
    const isLinkedOwnerProfile = group.ownerId === owner.id;
    if (!isOwnerUser && !isLinkedOwnerProfile) {
        return { ok: false as const, response: deps.jsonError(c, 'No autorizado', 403) };
    }
    return { ok: true as const, group, owner };
}

/** Estados de marketplace visibles en Solicitudes (no en Agenda). */
export const ADMIN_MARKETPLACE_INBOX_STATUSES = [
    'pending',
    'pending_open',
    'accepted_pending_group',
] as const;

export async function listOwnerMarketplaceSerenatas(
    ownerId: string,
    range: { start: Date; end: Date } | null,
) {
    const conditions = [
        eq(serenatas.ownerId, ownerId),
        isNotNull(serenatas.providerGroupId),
        inArray(serenatas.status, [...ADMIN_MARKETPLACE_INBOX_STATUSES]),
    ];
    if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
    return db
        .select()
        .from(serenatas)
        .where(and(...conditions))
        .orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));
}

export function registerMarketplaceRoutes(app: Hono, deps: MarketplaceDeps) {
    app.get('/marketplace/groups', async (c) => {
        const comuna = c.req.query('comuna')?.trim();
        const region = c.req.query('region')?.trim();
        const rows = await db
            .select()
            .from(serenataProviderGroups)
            .where(eq(serenataProviderGroups.status, 'active'))
            .orderBy(desc(serenataProviderGroups.isVerified), asc(serenataProviderGroups.name));

        const filtered = rows
            .filter((row) => {
                const comunas = Array.isArray(row.serviceComunas) ? row.serviceComunas : [];
                if (comuna && comunas.length > 0 && !comunas.includes(comuna)) return false;
                if (region && row.region && row.region !== region) return false;
                return true;
            });
        const items = await enrichProviderGroupsForMarketplace(filtered);

        return c.json({ ok: true, items });
    });

    app.get('/marketplace/groups/:slug/availability', async (c) => {
        const date = c.req.query('date');
        const serviceId = c.req.query('serviceId');
        if (!date || !serviceId) return deps.jsonError(c, 'Indica fecha y servicio.', 400);
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(
                eq(serenataProviderGroups.slug, c.req.param('slug')),
                eq(serenataProviderGroups.status, 'active'),
            ),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const service = await db.query.serenataGroupServices.findFirst({
            where: and(
                eq(serenataGroupServices.id, serviceId),
                eq(serenataGroupServices.providerGroupId, group.id),
                eq(serenataGroupServices.isActive, true),
            ),
        });
        if (!service) return deps.jsonError(c, 'Servicio no disponible', 404);

        const dayYmd = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : eventDateYmd(new Date(date));
        if (!dayYmd) return deps.jsonError(c, 'Fecha inválida', 400);

        const busy = await listProviderGroupBusySerenatas(group.id, dayYmd, true);
        const slotOptions = await getProviderGroupSlotOptions(group.id, dayYmd);
        const slots = generateMarketplaceTimeSlots(
            service.durationMinutes,
            dayYmd,
            busy,
            slotOptions ?? undefined,
        );
        return c.json({
            ok: true,
            date: dayYmd,
            serviceId: service.id,
            slots,
            dayStart: slotOptions?.dayStart ?? null,
            dayEnd: slotOptions?.dayEnd ?? null,
            bufferMinutes: slotOptions?.bufferMinutes ?? 0,
        });
    });

    app.get('/marketplace/groups/:slug', async (c) => {
        const slug = c.req.param('slug');
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(eq(serenataProviderGroups.slug, slug), eq(serenataProviderGroups.status, 'active')),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        return c.json({ ok: true, item: mapProviderGroup(group) });
    });

    app.get('/marketplace/groups/:id/services', async (c) => {
        const id = c.req.param('id');
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(eq(serenataProviderGroups.id, id), eq(serenataProviderGroups.status, 'active')),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const services = await db
            .select()
            .from(serenataGroupServices)
            .where(and(eq(serenataGroupServices.providerGroupId, id), eq(serenataGroupServices.isActive, true)))
            .orderBy(asc(serenataGroupServices.sortOrder), asc(serenataGroupServices.name));
        return c.json({ ok: true, items: services.map(mapGroupService) });
    });

    app.get('/provider-groups/me', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const admin = await db.query.serenataOwners.findFirst({
            where: eq(serenataOwners.userId, user.id),
        });
        if (admin) {
            const owned = await db
                .select()
                .from(serenataProviderGroups)
                .where(eq(serenataProviderGroups.ownerUserId, user.id))
                .orderBy(desc(serenataProviderGroups.updatedAt));
            const administered = admin
                ? await db
                    .select()
                    .from(serenataProviderGroups)
                    .where(eq(serenataProviderGroups.ownerId, admin.id))
                    .orderBy(desc(serenataProviderGroups.updatedAt))
                : [];
            const byId = new Map<string, typeof serenataProviderGroups.$inferSelect>();
            for (const row of [...owned, ...administered]) byId.set(row.id, row);
            return c.json({ ok: true, items: [...byId.values()].map(mapProviderGroup) });
        }
        const rows = await db
            .select()
            .from(serenataProviderGroups)
            .where(eq(serenataProviderGroups.ownerUserId, user.id))
            .orderBy(desc(serenataProviderGroups.updatedAt));
        return c.json({ ok: true, items: rows.map(mapProviderGroup) });
    });

    app.get('/provider-groups/applications/me', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const rows = await db
            .select()
            .from(serenataProviderGroupApplications)
            .where(eq(serenataProviderGroupApplications.userId, user.id))
            .orderBy(desc(serenataProviderGroupApplications.createdAt));
        return c.json({ ok: true, items: rows.map(mapProviderGroupApplication) });
    });

    app.post('/provider-groups/applications', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const parsed = providerGroupApplicationSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Solicitud inválida');
        const [item] = await db.insert(serenataProviderGroupApplications).values({
            userId: user.id,
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            phone: parsed.data.phone ?? null,
            whatsapp: parsed.data.whatsapp ?? null,
            region: parsed.data.region ?? null,
            comunaBase: parsed.data.comunaBase ?? null,
            serviceComunas: parsed.data.serviceComunas,
            status: 'pending',
        }).returning();
        return c.json({ ok: true, item: mapProviderGroupApplication(item) }, 201);
    });

    app.post('/provider-groups/applications/:id/approve', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        if (!['admin', 'superadmin'].includes(user.role)) return deps.jsonError(c, 'No autorizado', 403);
        const application = await db.query.serenataProviderGroupApplications.findFirst({
            where: eq(serenataProviderGroupApplications.id, c.req.param('id')),
        });
        if (!application) return deps.jsonError(c, 'Solicitud no encontrada', 404);
        if (application.status !== 'pending') return deps.jsonError(c, 'Esta solicitud ya fue revisada', 409);

        const result = await db.transaction(async (tx) => {
            const existingOwner = await tx.query.serenataOwners.findFirst({
                where: eq(serenataOwners.userId, application.userId),
            });
            const admin = existingOwner ?? (await tx.insert(serenataOwners).values({
                userId: application.userId,
                bio: application.description,
                comuna: application.comunaBase,
                region: application.region,
                workingComunas: application.serviceComunas,
                subscriptionStatus: 'active',
                subscriptionPrice: 0,
                trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
            }).returning())[0];
            const slug = await uniqueSlug(application.name);
            const [group] = await tx.insert(serenataProviderGroups).values({
                ownerUserId: application.userId,
                ownerId: admin.id,
                name: application.name,
                slug,
                description: application.description,
                phone: application.phone,
                whatsapp: application.whatsapp,
                region: application.region,
                comunaBase: application.comunaBase,
                serviceComunas: application.serviceComunas,
                status: 'draft',
                isVerified: true,
            }).returning();
            const [reviewed] = await tx.update(serenataProviderGroupApplications).set({
                status: 'approved',
                providerGroupId: group.id,
                reviewedAt: new Date(),
                updatedAt: new Date(),
            }).where(eq(serenataProviderGroupApplications.id, application.id)).returning();
            await tx.insert(serenataNotifications).values({
                userId: application.userId,
                type: 'provider_group_application_approved',
                title: 'Grupo aprobado',
                message: `${group.name} ya está listo para configurar servicios e integrantes.`,
                metadata: { providerGroupId: group.id },
            });
            return { group, application: reviewed };
        });

        return c.json({
            ok: true,
            item: mapProviderGroupApplication(result.application),
            group: mapProviderGroup(result.group),
        });
    });

    app.post('/provider-groups/applications/:id/reject', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        if (!['admin', 'superadmin'].includes(user.role)) return deps.jsonError(c, 'No autorizado', 403);
        const parsed = z.object({ reason: emptyStringToNull }).safeParse(await c.req.json().catch(() => ({})));
        const [item] = await db.update(serenataProviderGroupApplications).set({
            status: 'rejected',
            reviewNotes: parsed.success ? parsed.data.reason ?? null : null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
        }).where(and(
            eq(serenataProviderGroupApplications.id, c.req.param('id')),
            eq(serenataProviderGroupApplications.status, 'pending'),
        )).returning();
        if (!item) return deps.jsonError(c, 'Solicitud no encontrada o ya revisada', 404);
        await db.insert(serenataNotifications).values({
            userId: item.userId,
            type: 'provider_group_application_rejected',
            title: 'Solicitud revisada',
            message: item.reviewNotes ?? 'Tu solicitud no fue aprobada por ahora.',
            metadata: { applicationId: item.id },
        });
        return c.json({ ok: true, item: mapProviderGroupApplication(item) });
    });

    app.post('/provider-groups', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const required = await deps.requireOwner(c, user.id);
        if (!required.ok) return required.response;
        const parsed = providerGroupWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Datos del grupo inválidos');
        const slug = await uniqueSlug(parsed.data.name);
        const [item] = await db.insert(serenataProviderGroups).values({
            ownerUserId: user.id,
            ownerId: required.owner.id,
            name: parsed.data.name,
            slug,
            description: parsed.data.description ?? null,
            logoUrl: parsed.data.logoUrl ?? null,
            coverUrl: parsed.data.coverUrl ?? null,
            phone: parsed.data.phone ?? null,
            whatsapp: parsed.data.whatsapp ?? null,
            region: parsed.data.region ?? null,
            comunaBase: parsed.data.comunaBase ?? null,
            serviceComunas: parsed.data.serviceComunas,
            status: parsed.data.status ?? 'draft',
        }).returning();
        return c.json({ ok: true, item: mapProviderGroup(item) }, 201);
    });

    app.patch('/provider-groups/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = providerGroupPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Datos del grupo inválidos');
        const patch = parsed.data;
        const [item] = await db.update(serenataProviderGroups).set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
            ...(patch.coverUrl !== undefined ? { coverUrl: patch.coverUrl } : {}),
            ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
            ...(patch.whatsapp !== undefined ? { whatsapp: patch.whatsapp } : {}),
            ...(patch.region !== undefined ? { region: patch.region } : {}),
            ...(patch.comunaBase !== undefined ? { comunaBase: patch.comunaBase } : {}),
            ...(patch.serviceComunas !== undefined ? { serviceComunas: patch.serviceComunas } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.slaHours !== undefined ? { slaHours: resolveSlaHours(patch.slaHours) } : {}),
            ...(patch.bookingMode !== undefined ? { bookingMode: patch.bookingMode } : {}),
            ...(patch.bufferMinutes !== undefined ? { bufferMinutes: resolveBufferMinutes(patch.bufferMinutes) } : {}),
            ...(patch.name !== undefined ? { slug: await uniqueSlug(patch.name, access.group.id) } : {}),
            updatedAt: new Date(),
        }).where(eq(serenataProviderGroups.id, access.group.id)).returning();
        return c.json({ ok: true, item: mapProviderGroup(item) });
    });

    app.get('/provider-groups/:id/availability', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const rules = await listProviderGroupAvailabilityRules(access.group.id);
        return c.json({
            ok: true,
            item: {
                providerGroupId: access.group.id,
                slaHours: access.group.slaHours,
                bookingMode: access.group.bookingMode,
                bufferMinutes: access.group.bufferMinutes,
                rules: rules.length > 0 ? rules.map(mapAvailabilityRule) : DEFAULT_WEEKLY_RULES,
            },
        });
    });

    app.put('/provider-groups/:id/availability', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = providerAvailabilityPutSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Configuración de disponibilidad inválida');

        const patch = parsed.data;
        if (patch.rules) {
            for (const rule of patch.rules) {
                const start = rule.startTime.split(':').map(Number);
                const end = rule.endTime.split(':').map(Number);
                const startM = start[0] * 60 + start[1];
                const endM = end[0] * 60 + end[1];
                if (endM <= startM) {
                    return deps.jsonError(c, 'La hora de fin debe ser posterior al inicio en cada día.', 400);
                }
            }
            await replaceProviderGroupAvailabilityRules(
                access.group.id,
                patch.rules as SerenataAvailabilityRuleInput[],
            );
        }

        const groupPatch: Partial<typeof serenataProviderGroups.$inferInsert> = { updatedAt: new Date() };
        if (patch.slaHours !== undefined) groupPatch.slaHours = resolveSlaHours(patch.slaHours);
        if (patch.bookingMode !== undefined) groupPatch.bookingMode = patch.bookingMode;
        if (patch.bufferMinutes !== undefined) groupPatch.bufferMinutes = resolveBufferMinutes(patch.bufferMinutes);

        const [group] = Object.keys(groupPatch).length > 1
            ? await db.update(serenataProviderGroups).set(groupPatch).where(eq(serenataProviderGroups.id, access.group.id)).returning()
            : [access.group];

        const rules = await listProviderGroupAvailabilityRules(access.group.id);
        return c.json({
            ok: true,
            item: {
                providerGroupId: group.id,
                slaHours: group.slaHours,
                bookingMode: group.bookingMode,
                bufferMinutes: group.bufferMinutes,
                rules: rules.length > 0 ? rules.map(mapAvailabilityRule) : DEFAULT_WEEKLY_RULES,
            },
        });
    });

    app.get('/provider-groups/:id/members', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const rows = await db
            .select({
                id: serenataProviderGroupMembers.id,
                providerGroupId: serenataProviderGroupMembers.providerGroupId,
                musicianId: serenataProviderGroupMembers.musicianId,
                role: serenataProviderGroupMembers.role,
                instruments: serenataProviderGroupMembers.instruments,
                status: serenataProviderGroupMembers.status,
                message: serenataProviderGroupMembers.message,
                invitedByUserId: serenataProviderGroupMembers.invitedByUserId,
                respondedAt: serenataProviderGroupMembers.respondedAt,
                createdAt: serenataProviderGroupMembers.createdAt,
                updatedAt: serenataProviderGroupMembers.updatedAt,
                musicianName: users.name,
                instrument: serenataMusicians.instrument,
                availableNow: serenataMusicians.availableNow,
                comuna: serenataMusicians.comuna,
                region: serenataMusicians.region,
            })
            .from(serenataProviderGroupMembers)
            .innerJoin(serenataMusicians, eq(serenataMusicians.id, serenataProviderGroupMembers.musicianId))
            .innerJoin(users, eq(users.id, serenataMusicians.userId))
            .where(eq(serenataProviderGroupMembers.providerGroupId, access.group.id))
            .orderBy(asc(users.name));
        return c.json({ ok: true, items: rows.map(mapProviderGroupMember) });
    });

    app.post('/provider-groups/:id/members', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = providerGroupMemberWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Integrante inválido');
        const musician = await db.query.serenataMusicians.findFirst({
            where: eq(serenataMusicians.id, parsed.data.musicianId),
        });
        if (!musician) return deps.jsonError(c, 'Músico no encontrado', 404);
        const [member] = await db.insert(serenataProviderGroupMembers).values({
            providerGroupId: access.group.id,
            musicianId: musician.id,
            role: parsed.data.role,
            instruments: parsed.data.instruments.length > 0 ? parsed.data.instruments : (musician.instrument ? [musician.instrument] : []),
            message: parsed.data.message ?? null,
            status: 'invited',
            invitedByUserId: user.id,
        }).onConflictDoUpdate({
            target: [serenataProviderGroupMembers.providerGroupId, serenataProviderGroupMembers.musicianId],
            set: {
                role: parsed.data.role,
                instruments: parsed.data.instruments.length > 0 ? parsed.data.instruments : (musician.instrument ? [musician.instrument] : []),
                message: parsed.data.message ?? null,
                status: 'invited',
                invitedByUserId: user.id,
                updatedAt: new Date(),
            },
        }).returning();
        await db.insert(serenataNotifications).values({
            userId: musician.userId,
            type: 'provider_group_invitation',
            title: 'Nueva invitación de grupo',
            message: `Te invitaron a ${access.group.name}.`,
            metadata: { providerGroupId: access.group.id, providerGroupMemberId: member.id },
        });
        return c.json({ ok: true, member: mapProviderGroupMember(member) }, 201);
    });

    app.patch('/provider-groups/:groupId/members/:memberId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const parsed = providerGroupMemberPatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Integrante inválido');
        const patch = parsed.data;
        const [member] = await db.update(serenataProviderGroupMembers).set({
            ...(patch.role !== undefined ? { role: patch.role } : {}),
            ...(patch.instruments !== undefined ? { instruments: patch.instruments } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.message !== undefined ? { message: patch.message } : {}),
            updatedAt: new Date(),
        }).where(and(
            eq(serenataProviderGroupMembers.id, c.req.param('memberId')),
            eq(serenataProviderGroupMembers.providerGroupId, access.group.id),
        )).returning();
        if (!member) return deps.jsonError(c, 'Integrante no encontrado', 404);
        return c.json({ ok: true, member: mapProviderGroupMember(member) });
    });

    app.get('/provider-groups/:id/services', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const services = await db
            .select()
            .from(serenataGroupServices)
            .where(eq(serenataGroupServices.providerGroupId, access.group.id))
            .orderBy(asc(serenataGroupServices.sortOrder), asc(serenataGroupServices.name));
        return c.json({ ok: true, items: services.map(mapGroupService) });
    });

    app.post('/provider-groups/:id/services', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = groupServiceWriteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Servicio inválido');
        const [item] = await db.insert(serenataGroupServices).values({
            providerGroupId: access.group.id,
            ...parsed.data,
            description: parsed.data.description ?? null,
            eventType: parsed.data.eventType ?? null,
            isActive: parsed.data.isActive ?? true,
            sortOrder: parsed.data.sortOrder ?? 0,
        }).returning();
        return c.json({ ok: true, item: mapGroupService(item) }, 201);
    });

    app.patch('/provider-groups/:groupId/services/:serviceId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const parsed = groupServicePatchSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Servicio inválido');
        const serviceId = c.req.param('serviceId');
        const existing = await db.query.serenataGroupServices.findFirst({
            where: and(
                eq(serenataGroupServices.id, serviceId),
                eq(serenataGroupServices.providerGroupId, access.group.id),
            ),
        });
        if (!existing) return deps.jsonError(c, 'Servicio no encontrado', 404);
        const patch = parsed.data;
        const [item] = await db.update(serenataGroupServices).set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.musiciansCount !== undefined ? { musiciansCount: patch.musiciansCount } : {}),
            ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
            ...(patch.price !== undefined ? { price: patch.price } : {}),
            ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
            ...(patch.eventType !== undefined ? { eventType: patch.eventType } : {}),
            ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
            ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
            updatedAt: new Date(),
        }).where(eq(serenataGroupServices.id, serviceId)).returning();
        return c.json({ ok: true, item: mapGroupService(item) });
    });

    app.delete('/provider-groups/:groupId/services/:serviceId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const serviceId = c.req.param('serviceId');
        await db.update(serenataGroupServices).set({ isActive: false, updatedAt: new Date() }).where(and(
            eq(serenataGroupServices.id, serviceId),
            eq(serenataGroupServices.providerGroupId, access.group.id),
        ));
        return c.json({ ok: true });
    });

    app.get('/provider-groups/:id/requests', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const items = await db
            .select()
            .from(serenatas)
            .where(eq(serenatas.providerGroupId, access.group.id))
            .orderBy(desc(serenatas.createdAt));
        return c.json({ ok: true, items });
    });
}

export async function createMarketplaceSerenata(
    user: AuthUser,
    payload: z.infer<typeof marketplaceSerenataSchema>,
    deps: Pick<MarketplaceDeps, 'ensureClientProfile'>,
) {
    const group = await db.query.serenataProviderGroups.findFirst({
        where: and(
            eq(serenataProviderGroups.id, payload.providerGroupId),
            eq(serenataProviderGroups.status, 'active'),
        ),
    });
    if (!group || !group.ownerId) {
        return { ok: false as const, error: 'Este grupo no está disponible para solicitudes.' };
    }
    const service = await db.query.serenataGroupServices.findFirst({
        where: and(
            eq(serenataGroupServices.id, payload.serviceId),
            eq(serenataGroupServices.providerGroupId, group.id),
            eq(serenataGroupServices.isActive, true),
        ),
    });
    if (!service) return { ok: false as const, error: 'Servicio no disponible.' };
    const comunas = Array.isArray(group.serviceComunas) ? group.serviceComunas : [];
    if (comunas.length > 0 && !comunas.includes(payload.comuna)) {
        return { ok: false as const, error: 'Este grupo no atiende la comuna seleccionada.' };
    }

    const flexibleSchedule = payload.flexibleSchedule === true;
    const eventTime = flexibleSchedule ? null : (payload.eventTime?.trim() || null);

    const leadError = validateMarketplaceEventLead(payload.eventDate, eventTime);
    if (leadError) {
        return { ok: false as const, error: leadError, status: 400 as const };
    }

    if (!flexibleSchedule && eventTime) {
        // Anti-doble-booking: rechaza si ya hay pending/confirmada en el mismo slot del grupo.
        const slotConflict = await validateProviderGroupSlot(db, {
            ownerId: group.ownerId,
            providerGroupId: group.id,
            eventDate: payload.eventDate,
            eventTime,
            duration: service.durationMinutes,
            includePending: true,
        });
        if (slotConflict) {
            return { ok: false as const, error: slotConflict, status: 409 as const };
        }
    }

    const bookingMode = BOOKING_MODES.includes(group.bookingMode as typeof BOOKING_MODES[number])
        ? group.bookingMode
        : 'manual';

    const client = await deps.ensureClientProfile(user, {
        phone: payload.clientPhone,
        comuna: payload.comuna,
        region: payload.region,
    });

    const slaHours = resolveSlaHours(group.slaHours);
    const now = new Date();
    const responseDueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    let status: string = 'pending';
    if (flexibleSchedule) {
        status = 'pending_open';
    } else if (bookingMode === 'auto_if_available' || bookingMode === 'auto_decline') {
        status = 'accepted_pending_group';
    }

    const [item] = await db.insert(serenatas).values({
        clientId: client.id,
        ownerId: group.ownerId,
        providerGroupId: group.id,
        selectedServiceId: service.id,
        groupId: null,
        recipientName: payload.recipientName,
        clientPhone: payload.clientPhone ?? null,
        address: payload.address,
        comuna: payload.comuna,
        region: payload.region,
        lat: payload.lat == null ? null : String(payload.lat),
        lng: payload.lng == null ? null : String(payload.lng),
        eventDate: payload.eventDate,
        eventTime,
        flexibleSchedule,
        duration: service.durationMinutes,
        price: service.price,
        packageCode: null,
        eventType: service.eventType ?? service.name,
        message: payload.message ?? null,
        source: 'platform_lead',
        status,
        paymentStatus: 'not_required',
        responseDueAt,
    }).returning();

    const admin = await db.query.serenataOwners.findFirst({
        where: eq(serenataOwners.id, group.ownerId),
    });
    if (admin) {
        await db.insert(serenataNotifications).values({
            userId: admin.userId,
            type: 'provider_group_request',
            title: flexibleSchedule ? 'Solicitud sin hora definida' : 'Nueva solicitud para tu grupo',
            message: flexibleSchedule
                ? `${payload.recipientName} · fecha ${eventDateYmd(payload.eventDate)} (horario por confirmar)`
                : `${payload.comuna} · ${payload.recipientName}`,
            metadata: { serenataId: item.id, providerGroupId: group.id },
        });
    }

    if (item.clientId && status === 'accepted_pending_group') {
        const clientRow = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
        if (clientRow) {
            await db.insert(serenataNotifications).values({
                userId: clientRow.userId,
                type: 'client_serenata_accepted',
                title: 'Solicitud confirmada',
                message: 'Tu serenata fue aceptada automáticamente. El grupo está asignando músicos.',
                metadata: { serenataId: item.id, providerGroupId: group.id },
            });
        }
    }

    return { ok: true as const, item };
}

export async function acceptMarketplaceSerenata(
    ownerId: string,
    serenataId: string,
    validateAvailability: MarketplaceDeps['validateOwnerAvailability'],
) {
    const pending = await db.query.serenatas.findFirst({
        where: and(
            eq(serenatas.id, serenataId),
            eq(serenatas.ownerId, ownerId),
            isNotNull(serenatas.providerGroupId),
            inArray(serenatas.status, ['pending', 'pending_open']),
            eq(serenatas.source, 'platform_lead'),
        ),
    });
    if (!pending) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };
    if (!pending.eventTime) {
        return { ok: false as const, error: 'Define la hora del evento antes de aceptar esta solicitud.' };
    }
    const availabilityError = await validateAvailability(db, {
        ownerId,
        serenata: pending,
    });
    if (availabilityError) return { ok: false as const, error: availabilityError };

    const [item] = await db.update(serenatas).set({
        status: 'accepted_pending_group',
        updatedAt: new Date(),
    }).where(and(
        eq(serenatas.id, serenataId),
        inArray(serenatas.status, ['pending', 'pending_open']),
    )).returning();
    if (!item) return { ok: false as const, error: 'Esta solicitud ya fue tomada.' };

    if (item.clientId) {
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
        if (client) {
            await db.insert(serenataNotifications).values({
                userId: client.userId,
                type: 'client_serenata_accepted',
                title: 'Solicitud aceptada',
                message: 'El grupo aceptó tu serenata y está asignando músicos.',
                metadata: { serenataId: item.id },
            });
        }
    }

    return { ok: true as const, item };
}

export async function rejectMarketplaceSerenata(ownerId: string, serenataId: string) {
    const pending = await db.query.serenatas.findFirst({
        where: and(
            eq(serenatas.id, serenataId),
            eq(serenatas.ownerId, ownerId),
            isNotNull(serenatas.providerGroupId),
            inArray(serenatas.status, ['pending', 'pending_open']),
            eq(serenatas.source, 'platform_lead'),
        ),
    });
    if (!pending) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };

    const [item] = await db.update(serenatas).set({
        status: 'rejected',
        updatedAt: new Date(),
    }).where(and(
        eq(serenatas.id, serenataId),
        inArray(serenatas.status, ['pending', 'pending_open']),
    )).returning();
    if (!item) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };

    if (item.clientId) {
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
        if (client) {
            await db.insert(serenataNotifications).values({
                userId: client.userId,
                type: 'client_serenata_rejected',
                title: 'Solicitud no disponible',
                message: 'El grupo no pudo aceptar tu solicitud en este momento.',
                metadata: { serenataId: item.id },
            });
        }
    }

    return { ok: true as const, item };
}
