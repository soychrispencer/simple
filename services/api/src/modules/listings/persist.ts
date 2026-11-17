import { and, eq, isNull } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { accountListingAssignments, accountUsers, accounts, listingDrafts, listings } from '../../db/schema.js';
import { canManageAccountRole, isAccountMemberRole } from '../accounts/permissions.js';
import {
    deleteStoredMediaUrls,
    diffRemovedMediaUrls,
} from '../media/stored-object.js';
import { extractAllListingMediaUrls } from './media-delivery.js';
import { asObject } from '../shared/index.js';

const LISTING_INTEGRATIONS_STORAGE_KEY = '__simpleIntegrations';

export type ListingPortalSyncRecord = {
    portal: string;
    status: 'missing' | 'ready' | 'published' | 'failed';
    publishedAt: number | null;
    externalId: string | null;
    externalUrl: string | null;
    lastError: string | null;
    lastAttemptAt: number | null;
};

/** Registro de listing en memoria (estructuralmente compatible con `index.ts`). */
export type ListingRecord = {
    id: string;
    accountId?: string | null;
    ownerId: string;
    vertical: VerticalType;
    section: string;
    title: string;
    description: string;
    price: string;
    location?: string;
    locationData?: unknown;
    href: string;
    status: string;
    views: number;
    favs: number;
    leads: number;
    rawData: unknown;
    integrations: Partial<Record<string, ListingPortalSyncRecord>>;
    createdAt: number;
    updatedAt: number;
};

type ListingRow = typeof listings.$inferSelect;
type ListingDraftRow = typeof listingDrafts.$inferSelect;

export type ListingPersistDeps = {
    listingsById: Map<string, ListingRecord>;
    listingIdsByUser: Map<string, string[]>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string>;
    getListingById: (id: string) => Promise<ListingRecord | null>;
    mapListingRowToRecord: (row: ListingRow) => ListingRecord;
    listingDefaultHref: (vertical: VerticalType, listingId: string) => string;
    toPublicMediaUrl: (value: unknown) => string;
};

export class ListingWriteAuthorizationError extends Error {
    constructor(message: string, readonly status: 403 | 404 | 409) {
        super(message);
        this.name = 'ListingWriteAuthorizationError';
    }
}

type ListingWriteActor = { id: string };

async function lockListingActorMembership(tx: any, actor: ListingWriteActor) {
    const [membership] = await tx.select({
        accountId: accountUsers.accountId,
        role: accountUsers.role,
        isDefault: accountUsers.isDefault,
    })
        .from(accountUsers)
        .where(and(
            eq(accountUsers.userId, actor.id),
            eq(accountUsers.isDefault, true),
        ))
        .limit(1)
        .for('update');
    if (!membership || !isAccountMemberRole(membership.role)) {
        throw new ListingWriteAuthorizationError('No encontramos un espacio activo para guardar esta publicación.', 403);
    }
    return membership;
}

async function assertListingWriteAccess(
    tx: any,
    actor: ListingWriteActor,
    membership: { accountId: string; role: string },
    listing: ListingRow,
    deleting = false,
): Promise<void> {
    if (listing.accountId) {
        if (membership.accountId !== listing.accountId) {
            throw new ListingWriteAuthorizationError('El espacio activo cambió. Actualiza la página e inténtalo nuevamente.', 409);
        }
        if (canManageAccountRole(membership.role)) return;
        if (deleting || membership.role !== 'agent') {
            throw new ListingWriteAuthorizationError(
                deleting
                    ? 'Solo quien administra el espacio puede eliminar una publicación.'
                    : 'No tienes permisos sobre esta publicación.',
                403,
            );
        }
        if (listing.ownerId === actor.id) return;
        const [assignment] = await tx.select({ id: accountListingAssignments.id })
            .from(accountListingAssignments)
            .where(and(
                eq(accountListingAssignments.accountId, listing.accountId),
                eq(accountListingAssignments.listingId, listing.id),
                eq(accountListingAssignments.assignedUserId, actor.id),
            ))
            .limit(1)
            .for('update');
        if (!assignment) throw new ListingWriteAuthorizationError('No tienes permisos sobre esta publicación.', 403);
        return;
    }

    if (listing.ownerId !== actor.id) {
        throw new ListingWriteAuthorizationError('No tienes permisos sobre esta publicación.', 403);
    }
    const [activeAccount] = await tx.select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .where(eq(accounts.id, membership.accountId))
        .limit(1)
        .for('update');
    if (!activeAccount?.isPersonal || activeAccount.ownerUserId !== actor.id) {
        throw new ListingWriteAuthorizationError('Esta publicación personal no pertenece a tu espacio activo.', 403);
    }
}

function embedStoredListingMetadata(
    rawData: unknown,
    integrations: Partial<Record<string, ListingPortalSyncRecord>>,
): unknown {
    const base = { ...asObject(rawData) };
    delete base[LISTING_INTEGRATIONS_STORAGE_KEY];
    if (Object.keys(integrations).length === 0) return base;
    return {
        ...base,
        [LISTING_INTEGRATIONS_STORAGE_KEY]: integrations,
    };
}

function listingToDbWrite(record: ListingRecord, listingDefaultHref: ListingPersistDeps['listingDefaultHref']) {
    return {
        accountId: record.accountId,
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

function upsertListingCache(deps: ListingPersistDeps, record: ListingRecord): ListingRecord {
    deps.listingsById.set(record.id, record);
    const ownerIds = deps.listingIdsByUser.get(record.ownerId) ?? [];
    if (!ownerIds.includes(record.id)) {
        deps.listingIdsByUser.set(record.ownerId, [record.id, ...ownerIds]);
    }
    return record;
}

export function isListingSlugConflictError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('href_slug')
        || message.includes('listings_href_slug')
        || (message.includes('duplicate key') && message.includes('listings'));
}

function listingMediaUrls(record: ListingRecord): string[] {
    return extractAllListingMediaUrls(record);
}

export function createListingPersist(deps: ListingPersistDeps) {
    async function insertListingRecord(record: ListingRecord, actor: ListingWriteActor): Promise<ListingRecord> {
        const accountId = record.accountId ?? await deps.getPrimaryAccountIdForUser(record.ownerId);
        const row = await db.transaction(async (tx) => {
            if (actor.id !== record.ownerId) {
                throw new ListingWriteAuthorizationError('Solo puedes crear publicaciones para tu espacio de trabajo.', 403);
            }
            const membership = await lockListingActorMembership(tx, actor);
            if (membership.accountId !== accountId) {
                throw new ListingWriteAuthorizationError('El espacio activo cambió. Actualiza la página e inténtalo nuevamente.', 409);
            }
            const [inserted] = await tx.insert(listings).values({
                id: record.id,
                ...listingToDbWrite({ ...record, accountId }, deps.listingDefaultHref),
            }).returning();
            return inserted;
        });
        return upsertListingCache(deps, deps.mapListingRowToRecord(row));
    }

    async function saveListingRecord(record: ListingRecord, actor: ListingWriteActor): Promise<ListingRecord> {
        const result = await db.transaction(async (tx) => {
            const membership = await lockListingActorMembership(tx, actor);
            const [current] = await tx.select().from(listings)
                .where(eq(listings.id, record.id))
                .limit(1)
                .for('update');
            if (!current) throw new ListingWriteAuthorizationError('Publicación no encontrada.', 404);
            await assertListingWriteAccess(tx, actor, membership, current);
            if (current.accountId !== (record.accountId ?? null)
                || current.ownerId !== record.ownerId
                || current.vertical !== record.vertical) {
                throw new ListingWriteAuthorizationError('La publicación cambió de espacio. Actualiza la página e inténtalo nuevamente.', 409);
            }

            const [row] = await tx.update(listings).set({
                section: record.section,
                title: record.title,
                description: record.description || null,
                priceLabel: record.price,
                location: record.location || null,
                locationData: record.locationData ?? null,
                hrefSlug: record.href || deps.listingDefaultHref(record.vertical, record.id),
                status: record.status,
                rawData: embedStoredListingMetadata(record.rawData, record.integrations),
                updatedAt: new Date(record.updatedAt),
            }).where(eq(listings.id, record.id)).returning();
            return {
                row,
                previous: deps.mapListingRowToRecord(current),
            };
        });

        const saved = upsertListingCache(deps, deps.mapListingRowToRecord(result.row));
        const removed = diffRemovedMediaUrls(listingMediaUrls(result.previous), listingMediaUrls(saved));
        if (removed.length > 0) await deleteStoredMediaUrls(removed);
        return saved;
    }

    async function deleteListingRecord(listingId: string, actor: ListingWriteActor): Promise<void> {
        const record = await db.transaction(async (tx) => {
            const membership = await lockListingActorMembership(tx, actor);
            const [current] = await tx.select().from(listings)
                .where(eq(listings.id, listingId))
                .limit(1)
                .for('update');
            if (!current) throw new ListingWriteAuthorizationError('Publicación no encontrada.', 404);
            await assertListingWriteAccess(tx, actor, membership, current, true);
            await tx.delete(listings).where(eq(listings.id, listingId));
            return deps.mapListingRowToRecord(current);
        });
        deps.listingsById.delete(listingId);
        for (const [userId, ids] of deps.listingIdsByUser.entries()) {
            deps.listingIdsByUser.set(userId, ids.filter((id) => id !== listingId));
        }

        const mediaUrls = listingMediaUrls(record);
        if (mediaUrls.length > 0) {
            await deleteStoredMediaUrls(mediaUrls);
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

    async function getListingDraftRecord(userId: string, vertical: VerticalType, accountId: string | null = null) {
        const rows = await db
            .select()
            .from(listingDrafts)
            .where(and(
                eq(listingDrafts.userId, userId),
                eq(listingDrafts.vertical, vertical),
                accountId ? eq(listingDrafts.accountId, accountId) : isNull(listingDrafts.accountId),
            ))
            .limit(1);
        if (rows.length === 0) return null;
        return mapListingDraftRow(rows[0]);
    }

    async function upsertListingDraftRecord(userId: string, vertical: VerticalType, draft: unknown, accountId: string | null = null) {
        const existing = await getListingDraftRecord(userId, vertical, accountId);
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
                accountId,
                vertical,
                draftData: draft,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
        return mapListingDraftRow(rows[0]);
    }

    async function deleteListingDraftRecord(userId: string, vertical: VerticalType, accountId: string | null = null) {
        await db
            .delete(listingDrafts)
            .where(and(
                eq(listingDrafts.userId, userId),
                eq(listingDrafts.vertical, vertical),
                accountId ? eq(listingDrafts.accountId, accountId) : isNull(listingDrafts.accountId),
            ));
    }

    return {
        insertListingRecord,
        saveListingRecord,
        deleteListingRecord,
        getListingDraftRecord,
        upsertListingDraftRecord,
        deleteListingDraftRecord,
    };
}
