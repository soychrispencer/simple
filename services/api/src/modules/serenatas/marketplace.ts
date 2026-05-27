import { Hono, type Context } from 'hono';
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import {
    DEFAULT_WEEKLY_RULES,
    generateMarketplaceTimeSlots,
    getProviderGroupSlotOptions,
    listProviderGroupAvailabilityRules,
    listProviderGroupBlockedSlots,
    listProviderGroupBusySerenatas,
    replaceProviderGroupAvailabilityRules,
    resolveBufferMinutes,
    resolveSlaHours,
    type SerenataAvailabilityRuleInput,
    ownerCalendarIsClear,
    validateMarketplaceEventLead,
    validateProviderGroupSlot,
    countOwnerBlockingSerenatas,
    filterProviderGroupsAvailableOnDate,
} from './availability.js';
import { cleanupReplacedMediaUrl } from '../media/stored-object.js';
import { eventDateYmd, todayYmdInChile } from './lifecycle.js';
import {
    deliverSerenataInvitation,
    deliverSerenataRequestNotification,
} from '../../lib/serenatas-notification-delivery.js';
import { insertSerenataNotifications } from '../../lib/serenata-in-app-notifications.js';
import {
    serenataAvailabilityRules,
    serenataProviderGroupBlockedSlots,
    serenataClients,
    serenataOwners,
    serenataGroupServices,
    serenataRepertoireSongs,
    serenataServiceSongs,
    serenataMusicians,
    serenataProviderGroupApplications,
    serenataProviderGroupMemberInvites,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenatas,
    users,
} from '../../db/schema.js';
import { sendSerenataGuestGroupInviteEmail } from '../../lib/serenatas-email.js';
import {
    applyClientSongSelectionsWithAutoSetlist,
    listActiveSongsForService,
    validateClientSongSelections,
} from './repertoire.js';
import {
    buildGroupInviteSignupUrl,
    buildGroupInviteWhatsAppMessage,
    buildGroupInviteWhatsAppUrl,
    createGroupInviteToken,
    normalizeChileWhatsAppNumber,
} from '../../lib/serenata-group-invite.js';
import { enrichProviderGroupsForMarketplace, mapProviderGroup, mapPublicProviderGroup } from './marketplace-enrich.js';
import { validateMarketplaceClientRequest } from './marketplace-client-policy.js';
import {
    listSavedMariachisForUser,
    removeSavedMariachiForUser,
    toggleSavedMariachiForUser,
    toggleSavedMariachiSchema,
} from './saved-provider-groups.js';
import { listProviderGroupReviews, recomputeProviderGroupRatings } from './provider-group-ratings.js';

export { recomputeProviderGroupRatings, listProviderGroupReviews } from './provider-group-ratings.js';

type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
};

export type MarketplaceDeps = {
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

const AUTO_BOOKING_BLOCKED_MESSAGE =
    'No puedes activar la aceptación automática mientras tengas serenatas confirmadas o pendientes de asignar en tu calendario.';

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

const bankTransferDataSchema = z.object({
    bank: z.string().min(1).max(80),
    accountType: z.string().min(1).max(40),
    accountNumber: z.string().min(1).max(40),
    holderName: z.string().min(1).max(120),
    holderRut: z.string().min(1).max(20),
    holderEmail: z.string().max(120).default(''),
    alias: z.string().max(80).optional(),
}).nullable();

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
    requiresAdvancePayment: z.boolean().optional(),
    advancePaymentInstructions: emptyStringToNull,
    acceptsCash: z.boolean().optional(),
    acceptsTransfer: z.boolean().optional(),
    acceptsMp: z.boolean().optional(),
    acceptsPaymentLink: z.boolean().optional(),
    paymentLinkUrl: emptyStringToNull,
    bankTransferData: bankTransferDataSchema.optional(),
});

export const providerGroupPatchSchema = providerGroupWriteSchema.partial();

function providerPublicMediaMissing(input: {
    logoUrl?: string | null;
    coverUrl?: string | null;
}) {
    const missing: string[] = [];
    if (!input.logoUrl?.trim()) missing.push('logo');
    if (!input.coverUrl?.trim()) missing.push('portada');
    return missing;
}

function providerGroupPublishMissing(
    group: {
        name?: string | null;
        logoUrl?: string | null;
        coverUrl?: string | null;
        region?: string | null;
        comunaBase?: string | null;
        serviceComunas?: string[] | null;
    },
    activeServiceCount: number,
) {
    const missing: string[] = [];
    if (!group.name?.trim() || group.name.trim().length < 2) {
        missing.push('nombre del mariachi');
    }
    missing.push(...providerPublicMediaMissing(group));
    if (!group.region?.trim()) missing.push('región');
    if (!group.comunaBase?.trim()) missing.push('comuna base');
    if (!group.serviceComunas?.length) missing.push('zonas de trabajo');
    if (activeServiceCount < 1) missing.push('al menos un servicio con precio');
    return missing;
}

function publishBlockersErrorMessage(missing: string[]) {
    return `Antes de publicar completa: ${missing.join(', ')}.`;
}

async function countPricedActiveServices(providerGroupId: string) {
    const rows = await db
        .select({ id: serenataGroupServices.id })
        .from(serenataGroupServices)
        .where(and(
            eq(serenataGroupServices.providerGroupId, providerGroupId),
            eq(serenataGroupServices.isActive, true),
            gt(serenataGroupServices.price, 0),
        ));
    return rows.length;
}

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
    rules: z.array(providerAvailabilityRuleSchema).max(14).optional(),
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
    songsIncluded: z.number().int().min(0).max(30).optional(),
    repertoirePolicy: z.enum(['any_active', 'curated_only']).optional(),
    curatedSongIds: z.array(z.string().uuid()).max(100).optional(),
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
    status: z.enum(['invited', 'active', 'removed', 'rejected']).optional(),
    message: emptyStringToNull,
});

export const providerGroupExternalMemberInviteSchema = z.object({
    displayName: emptyStringToNull,
    message: emptyStringToNull,
    email: z.preprocess((value) => {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed.toLowerCase();
    }, z.string().email('Correo inválido').nullable().optional()),
    phone: z.preprocess((value) => {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed;
    }, z.string().nullable().optional()),
}).superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
        ctx.addIssue({
            code: 'custom',
            message: 'Indica al menos correo o WhatsApp para contactar al músico.',
            path: ['email'],
        });
    }
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
    songSelections: z.array(z.object({
        repertoireSongId: z.string().uuid(),
        clientNote: emptyStringToNull,
    })).max(30).optional(),
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

/** Mantiene `serenata_owners.working_comunas` alineado con el grupo (ofertas marketplace + banner perfil). */
async function syncOwnerOperatingZonesFromGroup(
    ownerId: string,
    input: { serviceComunas?: string[]; region?: string | null; comunaBase?: string | null },
) {
    const patch: {
        workingComunas?: string[];
        region?: string | null;
        comuna?: string | null;
        updatedAt: Date;
    } = { updatedAt: new Date() };
    if (input.serviceComunas !== undefined) patch.workingComunas = input.serviceComunas;
    if (input.region !== undefined) patch.region = input.region;
    if (input.comunaBase !== undefined) patch.comuna = input.comunaBase;
    if (input.serviceComunas === undefined && input.region === undefined && input.comunaBase === undefined) return;
    await db.update(serenataOwners).set(patch).where(eq(serenataOwners.id, ownerId));
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

function mapBlockedSlot(row: typeof serenataProviderGroupBlockedSlots.$inferSelect) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
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
        songsIncluded: row.songsIncluded ?? 0,
        repertoirePolicy: (row.repertoirePolicy ?? 'any_active') as 'any_active' | 'curated_only',
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

async function syncServiceCuratedSongs(serviceId: string, providerGroupId: string, songIds: string[] | undefined) {
    await db.delete(serenataServiceSongs).where(eq(serenataServiceSongs.serviceId, serviceId));
    if (!songIds?.length) return;
    const valid = await db
        .select({ id: serenataRepertoireSongs.id })
        .from(serenataRepertoireSongs)
        .where(and(
            eq(serenataRepertoireSongs.providerGroupId, providerGroupId),
            inArray(serenataRepertoireSongs.id, songIds),
        ));
    if (valid.length > 0) {
        await db.insert(serenataServiceSongs).values(
            valid.map((row) => ({ serviceId, repertoireSongId: row.id })),
        );
    }
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
    musicianInstruments?: string[];
    avatarUrl?: string | null;
    bio?: string | null;
    experienceYears?: number | null;
    workZones?: string[];
    availableNow?: boolean | null;
    comuna?: string | null;
    region?: string | null;
}) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        musicianId: row.musicianId,
        role: row.role,
        instruments: row.instruments?.length ? row.instruments : row.musicianInstruments ?? [],
        status: row.status,
        message: row.message,
        invitedByUserId: row.invitedByUserId,
        respondedAt: row.respondedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        musicianName: row.musicianName ?? null,
        instrument: row.instrument ?? null,
        avatarUrl: row.avatarUrl ?? null,
        bio: row.bio ?? null,
        experienceYears: row.experienceYears ?? 0,
        workZones: row.workZones ?? [],
        availableNow: row.availableNow ?? false,
        comuna: row.comuna ?? null,
        region: row.region ?? null,
    };
}

function mapProviderGroupMemberInvite(row: typeof serenataProviderGroupMemberInvites.$inferSelect) {
    return {
        id: row.id,
        providerGroupId: row.providerGroupId,
        invitedByUserId: row.invitedByUserId,
        displayName: row.displayName,
        email: row.email,
        phone: row.phone,
        status: row.status,
        musicianId: row.musicianId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
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

export const MARKETPLACE_GROUPS_DEFAULT_PAGE_SIZE = 12;
export const MARKETPLACE_GROUPS_MAX_PAGE_SIZE = 48;

export function parseMarketplaceGroupsPagination(query: {
    limit?: string;
    offset?: string;
}): { limit: number | null; offset: number } {
    const limitRaw = Number(query.limit);
    const offsetRaw = Number(query.offset);
    const limit =
        Number.isFinite(limitRaw) && limitRaw > 0
            ? Math.min(Math.floor(limitRaw), MARKETPLACE_GROUPS_MAX_PAGE_SIZE)
            : null;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
    return { limit, offset };
}

export function normalizeMarketplaceSearchText(value: string) {
    return value
        .trim()
        .toLocaleLowerCase('es-CL')
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

export const MARKETPLACE_GROUP_SORTS = ['recommended', 'price_asc', 'name_asc'] as const;
export type MarketplaceGroupSort = typeof MARKETPLACE_GROUP_SORTS[number];

export function parseMarketplaceGroupSort(raw?: string): MarketplaceGroupSort {
    if (raw === 'price_asc' || raw === 'name_asc') return raw;
    return 'recommended';
}

async function loadStartingPricesForGroups(groupIds: string[]) {
    const prices = new Map<string, number | null>();
    if (groupIds.length === 0) return prices;
    for (const id of groupIds) prices.set(id, null);
    const services = await db
        .select({
            providerGroupId: serenataGroupServices.providerGroupId,
            price: serenataGroupServices.price,
        })
        .from(serenataGroupServices)
        .where(and(
            inArray(serenataGroupServices.providerGroupId, groupIds),
            eq(serenataGroupServices.isActive, true),
        ));
    for (const service of services) {
        if (!Number.isFinite(service.price)) continue;
        const current = prices.get(service.providerGroupId);
        if (current == null || service.price < current) {
            prices.set(service.providerGroupId, service.price);
        }
    }
    return prices;
}

export function sortMarketplaceProviderGroupRows(
    rows: (typeof serenataProviderGroups.$inferSelect)[],
    sort: MarketplaceGroupSort,
    startingPrices: Map<string, number | null>,
) {
    const copy = [...rows];
    if (sort === 'name_asc') {
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    if (sort === 'price_asc') {
        return copy.sort((a, b) => {
            const priceA = startingPrices.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const priceB = startingPrices.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            if (priceA !== priceB) return priceA - priceB;
            return a.name.localeCompare(b.name, 'es');
        });
    }
    return copy.sort((a, b) => {
        const ratingDiff = (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        const avgDiff = Number(b.ratingAverage ?? 0) - Number(a.ratingAverage ?? 0);
        if (avgDiff !== 0) return avgDiff;
        return a.name.localeCompare(b.name, 'es');
    });
}

export function parseMarketplaceCatalogDate(raw?: string): string | null {
    if (!raw?.trim()) return null;
    const value = raw.trim();
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : eventDateYmd(new Date(value));
    if (!ymd || ymd < todayYmdInChile()) return null;
    return ymd;
}

export async function listMarketplaceProviderGroupsPage(input: {
    comuna?: string;
    region?: string;
    q?: string;
    date?: string;
    sort?: string;
    limit?: number | null;
    offset?: number;
}) {
    const rows = await db
        .select()
        .from(serenataProviderGroups)
        .where(and(
            eq(serenataProviderGroups.status, 'active'),
            isNotNull(serenataProviderGroups.logoUrl),
            isNotNull(serenataProviderGroups.coverUrl),
        ))
        .orderBy(desc(serenataProviderGroups.ratingCount), asc(serenataProviderGroups.name));

    const filtered = filterMarketplaceProviderGroups(rows, {
        comuna: input.comuna,
        region: input.region,
        q: input.q,
    });
    const dayYmd = parseMarketplaceCatalogDate(input.date);
    let candidates = dayYmd
        ? await filterProviderGroupsAvailableOnDate(filtered, dayYmd)
        : filtered;
    const sort = parseMarketplaceGroupSort(input.sort);
    const startingPrices = sort === 'price_asc'
        ? await loadStartingPricesForGroups(candidates.map((row) => row.id))
        : new Map<string, number | null>();
    candidates = sortMarketplaceProviderGroupRows(candidates, sort, startingPrices);
    const total = candidates.length;
    const offset = input.offset ?? 0;

    if (input.limit == null) {
        const items = await enrichProviderGroupsForMarketplace(candidates);
        return { items, total, hasMore: false, nextOffset: null };
    }

    const pageSlice = candidates.slice(offset, offset + input.limit);
    const items = await enrichProviderGroupsForMarketplace(pageSlice);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < total;
    return {
        items,
        total,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
    };
}

export function filterMarketplaceProviderGroups(
    rows: (typeof serenataProviderGroups.$inferSelect)[],
    query: { comuna?: string; region?: string; q?: string },
) {
    const comuna = query.comuna?.trim();
    const region = query.region?.trim();
    const q = query.q?.trim();
    const qNormalized = q ? normalizeMarketplaceSearchText(q) : '';
    return rows.filter((row) => {
        const comunas = Array.isArray(row.serviceComunas) ? row.serviceComunas : [];
        if (comuna) {
            const matchesListed = comunas.length > 0 && comunas.includes(comuna);
            const matchesBase = row.comunaBase === comuna;
            if (comunas.length > 0) {
                if (!matchesListed) return false;
            } else if (!matchesBase) {
                return false;
            }
        }
        if (region && row.region && row.region !== region) return false;
        if (qNormalized) {
            const haystack = normalizeMarketplaceSearchText(
                [row.name, row.slug, row.description ?? ''].filter(Boolean).join(' '),
            );
            if (!haystack.includes(qNormalized)) return false;
        }
        return true;
    });
}

export async function recordProviderGroupRating(providerGroupId: string) {
    await recomputeProviderGroupRatings(providerGroupId);
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
        const q = c.req.query('q')?.trim();
        const date = c.req.query('date')?.trim() || c.req.query('fecha')?.trim();
        const sort = c.req.query('sort')?.trim();
        const { limit, offset } = parseMarketplaceGroupsPagination({
            limit: c.req.query('limit'),
            offset: c.req.query('offset'),
        });
        const page = await listMarketplaceProviderGroupsPage({
            comuna,
            region,
            q,
            date,
            sort,
            limit,
            offset,
        });
        return c.json({ ok: true, ...page });
    });

    app.get('/marketplace/favorites', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const items = await listSavedMariachisForUser(user.id);
        return c.json({ ok: true, items });
    });

    app.post('/marketplace/favorites/toggle', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = toggleSavedMariachiSchema.safeParse(payload);
        if (!parsed.success) return deps.jsonError(c, 'Payload inválido', 400);

        try {
            const result = await toggleSavedMariachiForUser(user.id, parsed.data.providerGroupId);
            return c.json({ ok: true, saved: result.saved, items: result.items });
        } catch (error) {
            if (error instanceof Error && error.message === 'NOT_FOUND') {
                return deps.jsonError(c, 'Este mariachi no está disponible.', 404);
            }
            throw error;
        }
    });

    app.delete('/marketplace/favorites/:providerGroupId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);

        const providerGroupId = c.req.param('providerGroupId') ?? '';
        if (!toggleSavedMariachiSchema.shape.providerGroupId.safeParse(providerGroupId).success) {
            return deps.jsonError(c, 'Identificador inválido', 400);
        }

        const items = await removeSavedMariachiForUser(user.id, providerGroupId);
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
                isNotNull(serenataProviderGroups.logoUrl),
                isNotNull(serenataProviderGroups.coverUrl),
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

        const [busy, blockedSlots, slotOptions] = await Promise.all([
            listProviderGroupBusySerenatas(group.id, dayYmd, true),
            listProviderGroupBlockedSlots(group.id),
            getProviderGroupSlotOptions(group.id, dayYmd),
        ]);
        const slots = generateMarketplaceTimeSlots(
            service.durationMinutes,
            dayYmd,
            busy,
            slotOptions
                ? { ...slotOptions, blockedSlots }
                : { blockedSlots },
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
            where: and(
                eq(serenataProviderGroups.slug, slug),
                eq(serenataProviderGroups.status, 'active'),
                isNotNull(serenataProviderGroups.logoUrl),
                isNotNull(serenataProviderGroups.coverUrl),
            ),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const [item] = await enrichProviderGroupsForMarketplace([group]);
        return c.json({ ok: true, item: item ?? mapPublicProviderGroup(group) });
    });

    app.get('/marketplace/groups/:slug/reviews', async (c) => {
        const slug = c.req.param('slug');
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(
                eq(serenataProviderGroups.slug, slug),
                eq(serenataProviderGroups.status, 'active'),
                isNotNull(serenataProviderGroups.logoUrl),
                isNotNull(serenataProviderGroups.coverUrl),
            ),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const items = await listProviderGroupReviews(group.id);
        return c.json({
            ok: true,
            summary: {
                average: Number(group.ratingAverage ?? 0),
                count: group.ratingCount ?? 0,
            },
            items,
        });
    });

    app.get('/marketplace/groups/:id/services', async (c) => {
        const id = c.req.param('id');
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(
                eq(serenataProviderGroups.id, id),
                eq(serenataProviderGroups.status, 'active'),
                isNotNull(serenataProviderGroups.logoUrl),
                isNotNull(serenataProviderGroups.coverUrl),
            ),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const services = await db
            .select()
            .from(serenataGroupServices)
            .where(and(eq(serenataGroupServices.providerGroupId, id), eq(serenataGroupServices.isActive, true)))
            .orderBy(asc(serenataGroupServices.sortOrder), asc(serenataGroupServices.name));
        return c.json({ ok: true, items: services.map(mapGroupService) });
    });

    app.get('/marketplace/groups/:groupId/services/:serviceId/repertoire', async (c) => {
        const group = await db.query.serenataProviderGroups.findFirst({
            where: and(
                eq(serenataProviderGroups.id, c.req.param('groupId')),
                eq(serenataProviderGroups.status, 'active'),
                isNotNull(serenataProviderGroups.logoUrl),
                isNotNull(serenataProviderGroups.coverUrl),
            ),
        });
        if (!group) return deps.jsonError(c, 'Grupo no encontrado', 404);
        const service = await db.query.serenataGroupServices.findFirst({
            where: and(
                eq(serenataGroupServices.id, c.req.param('serviceId')),
                eq(serenataGroupServices.providerGroupId, group.id),
                eq(serenataGroupServices.isActive, true),
            ),
        });
        if (!service) return deps.jsonError(c, 'Servicio no disponible', 404);
        const items = await listActiveSongsForService(group.id, service);
        const tagSet = new Set<string>();
        for (const song of items) {
            for (const tag of song.tags) tagSet.add(tag);
        }
        return c.json({
            ok: true,
            songsIncluded: service.songsIncluded ?? 0,
            tags: [...tagSet].sort((a, b) => a.localeCompare(b, 'es')),
            items,
        });
    });

    app.get('/provider-groups/me', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const owner = await db.query.serenataOwners.findFirst({
            where: eq(serenataOwners.userId, user.id),
        });
        if (owner) {
            const owned = await db
                .select()
                .from(serenataProviderGroups)
                .where(eq(serenataProviderGroups.ownerUserId, user.id))
                .orderBy(desc(serenataProviderGroups.updatedAt));
            const ownerLinked = await db
                .select()
                .from(serenataProviderGroups)
                .where(eq(serenataProviderGroups.ownerId, owner.id))
                .orderBy(desc(serenataProviderGroups.updatedAt));
            const byId = new Map<string, typeof serenataProviderGroups.$inferSelect>();
            for (const row of [...owned, ...ownerLinked]) byId.set(row.id, row);
            return c.json({ ok: true, items: [...byId.values()].map(mapProviderGroup) });
        }
        const rows = await db
            .select()
            .from(serenataProviderGroups)
            .where(eq(serenataProviderGroups.ownerUserId, user.id))
            .orderBy(desc(serenataProviderGroups.updatedAt));
        return c.json({ ok: true, items: rows.map(mapProviderGroup) });
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
            const owner = existingOwner ?? (await tx.insert(serenataOwners).values({
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
                ownerId: owner.id,
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
            await insertSerenataNotifications({
                userId: application.userId,
                type: 'provider_group_application_approved',
                title: 'Grupo aprobado',
                message: `${group.name} ya está listo para configurar servicios e integrantes.`,
                metadata: { providerGroupId: group.id },
            }, { tx });
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
        await insertSerenataNotifications({
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
        const existingGroup = await db.query.serenataProviderGroups.findFirst({
            where: eq(serenataProviderGroups.ownerUserId, user.id),
        });
        if (existingGroup) {
            return deps.jsonError(c, 'Ya tienes un mariachi registrado. Solo puedes ser dueño de uno.', 409);
        }
        if (parsed.data.status === 'active') {
            const missing = providerGroupPublishMissing(parsed.data, 0);
            if (missing.length > 0) {
                return deps.jsonError(c, publishBlockersErrorMessage(missing), 400);
            }
        }
        const initialStatus = 'draft';
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
            status: initialStatus,
        }).returning();
        await syncOwnerOperatingZonesFromGroup(required.owner.id, {
            serviceComunas: item.serviceComunas ?? [],
            region: item.region,
            comunaBase: item.comunaBase,
        });
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
        const group = access.group;
        if (patch.bookingMode === 'auto_if_available' && group.ownerId) {
            const eligible = await ownerCalendarIsClear(group.ownerId);
            if (!eligible) {
                return deps.jsonError(c, AUTO_BOOKING_BLOCKED_MESSAGE, 400);
            }
        }
        if (patch.status === 'active') {
            const merged = {
                name: patch.name ?? group.name,
                logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : group.logoUrl,
                coverUrl: patch.coverUrl !== undefined ? patch.coverUrl : group.coverUrl,
                region: patch.region !== undefined ? patch.region : group.region,
                comunaBase: patch.comunaBase !== undefined ? patch.comunaBase : group.comunaBase,
                serviceComunas: patch.serviceComunas !== undefined ? patch.serviceComunas : group.serviceComunas,
            };
            const activeServiceCount = await countPricedActiveServices(group.id);
            const missing = providerGroupPublishMissing(merged, activeServiceCount);
            if (missing.length > 0) {
                return deps.jsonError(c, publishBlockersErrorMessage(missing), 400);
            }
        }
        if (patch.logoUrl !== undefined) {
            await cleanupReplacedMediaUrl(group.logoUrl, patch.logoUrl);
        }
        if (patch.coverUrl !== undefined) {
            await cleanupReplacedMediaUrl(group.coverUrl, patch.coverUrl);
        }
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
            ...(patch.requiresAdvancePayment !== undefined ? { requiresAdvancePayment: patch.requiresAdvancePayment } : {}),
            ...(patch.advancePaymentInstructions !== undefined ? { advancePaymentInstructions: patch.advancePaymentInstructions } : {}),
            ...(patch.acceptsCash !== undefined ? { acceptsCash: patch.acceptsCash } : {}),
            ...(patch.acceptsTransfer !== undefined ? { acceptsTransfer: patch.acceptsTransfer } : {}),
            ...(patch.acceptsMp !== undefined ? { acceptsMp: patch.acceptsMp } : {}),
            ...(patch.acceptsPaymentLink !== undefined ? { acceptsPaymentLink: patch.acceptsPaymentLink } : {}),
            ...(patch.paymentLinkUrl !== undefined ? { paymentLinkUrl: patch.paymentLinkUrl } : {}),
            ...(patch.bankTransferData !== undefined ? { bankTransferData: patch.bankTransferData } : {}),
            ...(patch.name !== undefined ? { slug: await uniqueSlug(patch.name, access.group.id) } : {}),
            updatedAt: new Date(),
        }).where(eq(serenataProviderGroups.id, access.group.id)).returning();
        if (access.owner) {
            await syncOwnerOperatingZonesFromGroup(access.owner.id, {
                ...(patch.serviceComunas !== undefined ? { serviceComunas: item.serviceComunas ?? [] } : {}),
                ...(patch.region !== undefined ? { region: item.region } : {}),
                ...(patch.comunaBase !== undefined ? { comunaBase: item.comunaBase } : {}),
            });
        }
        return c.json({ ok: true, item: mapProviderGroup(item) });
    });

    app.get('/provider-groups/:id/auto-accept-eligibility', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const ownerId = access.group.ownerId;
        if (!ownerId) {
            return c.json({ ok: true, eligible: false, blockingCount: 0 });
        }
        const blockingCount = await countOwnerBlockingSerenatas(ownerId);
        return c.json({
            ok: true,
            eligible: blockingCount === 0,
            blockingCount,
        });
    });

    app.get('/provider-groups/:id/availability', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const [rules, blockedSlots] = await Promise.all([
            listProviderGroupAvailabilityRules(access.group.id),
            listProviderGroupBlockedSlots(access.group.id),
        ]);
        return c.json({
            ok: true,
            item: {
                providerGroupId: access.group.id,
                slaHours: access.group.slaHours,
                bookingMode: access.group.bookingMode,
                bufferMinutes: access.group.bufferMinutes,
                rules: rules.length > 0 ? rules.map(mapAvailabilityRule) : DEFAULT_WEEKLY_RULES,
                blockedSlots: blockedSlots.map(mapBlockedSlot),
            },
        });
    });

    app.post('/provider-groups/:id/availability/blocked-slots', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const startsAt = new Date(String(body.startsAt ?? ''));
        const endsAt = new Date(String(body.endsAt ?? ''));
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
            return deps.jsonError(c, 'Fechas de bloqueo inválidas.', 400);
        }
        if (endsAt <= startsAt) {
            return deps.jsonError(c, 'La fecha de fin debe ser posterior a la de inicio.', 400);
        }
        const [slot] = await db.insert(serenataProviderGroupBlockedSlots).values({
            providerGroupId: access.group.id,
            startsAt,
            endsAt,
            reason: typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 255) : null,
        }).returning();
        return c.json({ ok: true, slot: mapBlockedSlot(slot) });
    });

    app.delete('/provider-groups/:id/availability/blocked-slots/:slotId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const slotId = c.req.param('slotId') ?? '';
        await db.delete(serenataProviderGroupBlockedSlots).where(and(
            eq(serenataProviderGroupBlockedSlots.id, slotId),
            eq(serenataProviderGroupBlockedSlots.providerGroupId, access.group.id),
        ));
        return c.json({ ok: true });
    });

    app.put('/provider-groups/:id/availability', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = providerAvailabilityPutSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return deps.jsonError(c, 'Configuración de disponibilidad inválida');

        const patch = parsed.data;
        if (patch.bookingMode === 'auto_if_available' && access.group.ownerId) {
            const eligible = await ownerCalendarIsClear(access.group.ownerId);
            if (!eligible) {
                return deps.jsonError(c, AUTO_BOOKING_BLOCKED_MESSAGE, 400);
            }
        }
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

        const [rules, blockedSlots] = await Promise.all([
            listProviderGroupAvailabilityRules(access.group.id),
            listProviderGroupBlockedSlots(access.group.id),
        ]);
        return c.json({
            ok: true,
            item: {
                providerGroupId: group.id,
                slaHours: group.slaHours,
                bookingMode: group.bookingMode,
                bufferMinutes: group.bufferMinutes,
                rules: rules.length > 0 ? rules.map(mapAvailabilityRule) : DEFAULT_WEEKLY_RULES,
                blockedSlots: blockedSlots.map(mapBlockedSlot),
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
                musicianInstruments: serenataMusicians.instruments,
                avatarUrl: users.avatarUrl,
                bio: serenataMusicians.bio,
                experienceYears: serenataMusicians.experienceYears,
                workZones: serenataMusicians.workZones,
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

    app.get('/provider-groups/:id/member-invites', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const rows = await db
            .select()
            .from(serenataProviderGroupMemberInvites)
            .where(and(
                eq(serenataProviderGroupMemberInvites.providerGroupId, access.group.id),
                eq(serenataProviderGroupMemberInvites.status, 'pending'),
            ))
            .orderBy(desc(serenataProviderGroupMemberInvites.createdAt));
        return c.json({ ok: true, items: rows.map(mapProviderGroupMemberInvite) });
    });

    app.post('/provider-groups/:id/member-invites', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('id'), deps);
        if (!access.ok) return access.response;
        const parsed = providerGroupExternalMemberInviteSchema.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            return deps.jsonError(c, issue?.message ?? 'Invitación inválida', 400);
        }

        const email = parsed.data.email ?? null;
        const phoneRaw = parsed.data.phone ?? null;
        let phoneDigits: string | null = null;
        if (phoneRaw) {
            phoneDigits = normalizeChileWhatsAppNumber(phoneRaw);
            if (!phoneDigits) return deps.jsonError(c, 'Número de WhatsApp inválido. Usa un móvil chileno.', 400);
        }

        const token = createGroupInviteToken();
        const signupUrl = buildGroupInviteSignupUrl(token);
        const ownerName = user.name?.trim() || 'El dueño del mariachi';
        const musicianName = parsed.data.displayName?.trim() || email?.split('@')[0] || 'Músico';

        const [invite] = await db.insert(serenataProviderGroupMemberInvites).values({
            providerGroupId: access.group.id,
            invitedByUserId: user.id,
            displayName: parsed.data.displayName ?? null,
            email,
            phone: phoneDigits,
            token,
            status: 'pending',
        }).returning();

        let emailDelivery: 'sent' | 'skipped_dev' | null = null;
        if (email) {
            try {
                emailDelivery = await sendSerenataGuestGroupInviteEmail(email, {
                    musicianName,
                    groupName: access.group.name,
                    ownerName,
                    signupUrl,
                    message: parsed.data.message ?? null,
                });
            } catch (error) {
                await db.delete(serenataProviderGroupMemberInvites).where(eq(serenataProviderGroupMemberInvites.id, invite.id));
                console.error('[serenatas] provider group member invite email failed', { email, error });
                const detail = error instanceof Error ? error.message : '';
                const message = detail && (detail.includes('SMTP') || detail.includes('rechazado') || detail.includes('configured'))
                    ? detail
                    : 'No pudimos enviar el correo de invitación. Revisa la dirección o intenta más tarde.';
                return deps.jsonError(c, message, 500);
            }
        }

        let whatsappUrl: string | undefined;
        if (phoneRaw && phoneDigits) {
            const waMessage = [
                buildGroupInviteWhatsAppMessage({ groupName: access.group.name, ownerName, signupUrl }),
                parsed.data.message?.trim() ? `Mensaje: ${parsed.data.message.trim()}` : null,
            ].filter(Boolean).join('\n\n');
            whatsappUrl = buildGroupInviteWhatsAppUrl(phoneRaw, waMessage) ?? undefined;
            if (!whatsappUrl) {
                if (!email) {
                    await db.delete(serenataProviderGroupMemberInvites).where(eq(serenataProviderGroupMemberInvites.id, invite.id));
                }
                return deps.jsonError(c, 'No pudimos armar el enlace de WhatsApp.', 400);
            }
        }

        return c.json({
            ok: true,
            invite: mapProviderGroupMemberInvite(invite),
            emailSent: email ? emailDelivery === 'sent' : undefined,
            signupUrl: email && emailDelivery === 'skipped_dev' ? signupUrl : undefined,
            whatsappUrl,
        });
    });

    app.delete('/provider-groups/:groupId/member-invites/:inviteId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return deps.jsonError(c, 'No autenticado', 401);
        const access = await requireProviderGroupAccess(c, user.id, c.req.param('groupId'), deps);
        if (!access.ok) return access.response;
        const [invite] = await db.update(serenataProviderGroupMemberInvites).set({
            status: 'cancelled',
            updatedAt: new Date(),
        }).where(and(
            eq(serenataProviderGroupMemberInvites.id, c.req.param('inviteId')),
            eq(serenataProviderGroupMemberInvites.providerGroupId, access.group.id),
            eq(serenataProviderGroupMemberInvites.status, 'pending'),
        )).returning();
        if (!invite) return deps.jsonError(c, 'Invitación no encontrada', 404);
        return c.json({ ok: true });
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
        await insertSerenataNotifications({
            userId: musician.userId,
            type: 'provider_group_invitation',
            title: 'Nueva invitación de grupo',
            message: `Te invitaron a ${access.group.name}.`,
            metadata: { providerGroupId: access.group.id, providerGroupMemberId: member.id },
        });
        void deliverSerenataInvitation(musician.userId, {
            title: 'Nueva invitación de grupo',
            message: `Te invitaron a ${access.group.name}.`,
            groupName: access.group.name,
            panelPath: '/panel/invitations',
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
        const { curatedSongIds, ...patch } = parsed.data;
        const [item] = await db.update(serenataGroupServices).set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            ...(patch.musiciansCount !== undefined ? { musiciansCount: patch.musiciansCount } : {}),
            ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
            ...(patch.price !== undefined ? { price: patch.price } : {}),
            ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
            ...(patch.eventType !== undefined ? { eventType: patch.eventType } : {}),
            ...(patch.songsIncluded !== undefined ? { songsIncluded: patch.songsIncluded } : {}),
            ...(patch.repertoirePolicy !== undefined ? { repertoirePolicy: patch.repertoirePolicy } : {}),
            ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
            ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
            updatedAt: new Date(),
        }).where(eq(serenataGroupServices.id, serviceId)).returning();
        if (curatedSongIds !== undefined || patch.repertoirePolicy === 'curated_only') {
            await syncServiceCuratedSongs(item.id, access.group.id, curatedSongIds);
        }
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
            isNotNull(serenataProviderGroups.logoUrl),
            isNotNull(serenataProviderGroups.coverUrl),
        ),
    });
    if (!group || !group.ownerId) {
        return { ok: false as const, error: 'Este grupo no está disponible para solicitudes.' };
    }

    const clientPolicy = await validateMarketplaceClientRequest(user.id, {
        ownerUserId: group.ownerUserId,
        ownerId: group.ownerId,
    });
    if (!clientPolicy.ok) {
        return { ok: false as const, error: clientPolicy.error, status: clientPolicy.status };
    }

    const service = await db.query.serenataGroupServices.findFirst({
        where: and(
            eq(serenataGroupServices.id, payload.serviceId),
            eq(serenataGroupServices.providerGroupId, group.id),
            eq(serenataGroupServices.isActive, true),
        ),
    });
    if (!service) return { ok: false as const, error: 'Servicio no disponible.' };
    const songSelections = payload.songSelections ?? [];
    const songsValidation = await validateClientSongSelections(group.id, service, songSelections);
    if (!songsValidation.ok) {
        return { ok: false as const, error: songsValidation.error, status: 400 as const };
    }
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
        const dayYmd = eventDateYmd(payload.eventDate);
        if (!dayYmd) {
            return { ok: false as const, error: 'Fecha inválida.', status: 400 as const };
        }
        const [busy, blockedSlots, slotOptions] = await Promise.all([
            listProviderGroupBusySerenatas(group.id, dayYmd, true),
            listProviderGroupBlockedSlots(group.id),
            getProviderGroupSlotOptions(group.id, dayYmd),
        ]);
        const availableSlots = generateMarketplaceTimeSlots(
            service.durationMinutes,
            dayYmd,
            busy,
            slotOptions
                ? { ...slotOptions, blockedSlots }
                : { blockedSlots },
        );
        if (!availableSlots.includes(eventTime)) {
            return {
                ok: false as const,
                error: 'Ese horario no está disponible para este servicio. Elige un horario sugerido o marca horario por definir.',
                status: 409 as const,
            };
        }

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

    const client = await deps.ensureClientProfile(user, {
        phone: payload.clientPhone,
        comuna: payload.comuna,
        region: payload.region,
    });

    const status = 'payment_pending';

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
        paymentStatus: 'pending',
        responseDueAt: null,
        setlistStatus: 'confirmed',
        songsIncludedAtBooking: Math.max(service.songsIncluded ?? 0, songSelections.length),
        setlistConfirmedAt: new Date(),
    }).returning();

    if (item && songSelections.length > 0) {
        await applyClientSongSelectionsWithAutoSetlist(item.id, group.id, service, songSelections);
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
            const acceptedTitle = 'Solicitud aceptada';
            const acceptedMessage = 'El grupo aceptó tu serenata y está asignando músicos.';
            await insertSerenataNotifications({
                userId: client.userId,
                type: 'client_serenata_accepted',
                title: acceptedTitle,
                message: acceptedMessage,
                metadata: { serenataId: item.id },
            });
            void deliverSerenataRequestNotification(client.userId, {
                title: acceptedTitle,
                message: acceptedMessage,
                panelPath: '/panel/serenatas',
                eventDate: item.eventDate,
                eventLabel: item.recipientName,
            });
        }
    }

    return { ok: true as const, item };
}

export async function rejectMarketplaceSerenata(ownerId: string, serenataId: string, reason?: string | null) {
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

    const rejectReason = reason?.trim() || null;
    const [item] = await db.update(serenatas).set({
        status: 'rejected',
        cancelReason: rejectReason,
        updatedAt: new Date(),
    }).where(and(
        eq(serenatas.id, serenataId),
        inArray(serenatas.status, ['pending', 'pending_open']),
    )).returning();
    if (!item) return { ok: false as const, error: 'Esta solicitud ya no está disponible.' };

    if (item.clientId) {
        const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
        if (client) {
            const rejectedTitle = 'Solicitud no disponible';
            const rejectedMessage = rejectReason
                ? `El grupo no pudo aceptar tu solicitud: ${rejectReason}`
                : 'El grupo no pudo aceptar tu solicitud en este momento.';
            await insertSerenataNotifications({
                userId: client.userId,
                type: 'client_serenata_rejected',
                title: rejectedTitle,
                message: rejectedMessage,
                metadata: { serenataId: item.id },
            });
            void deliverSerenataRequestNotification(client.userId, {
                title: rejectedTitle,
                message: rejectedMessage,
                panelPath: '/panel/serenatas',
            });
        }
    }

    return { ok: true as const, item };
}
