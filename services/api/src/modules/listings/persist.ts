import { and, eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { listingDrafts, listings } from '../../db/schema.js';
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
    async function insertListingRecord(record: ListingRecord): Promise<ListingRecord> {
        const accountId = record.accountId ?? await deps.getPrimaryAccountIdForUser(record.ownerId);
        const [row] = await db.insert(listings).values({
            id: record.id,
            ...listingToDbWrite({ ...record, accountId }, deps.listingDefaultHref),
        }).returning();
        return upsertListingCache(deps, deps.mapListingRowToRecord(row));
    }

    async function saveListingRecord(record: ListingRecord): Promise<ListingRecord> {
        const previous = deps.listingsById.get(record.id) ?? await deps.getListingById(record.id);
        const [row] = await db.update(listings).set({
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

        if (!row) {
            throw new Error('Publicación no encontrada');
        }

        const saved = upsertListingCache(deps, deps.mapListingRowToRecord(row));

        if (previous) {
            const prevUrls = listingMediaUrls(previous);
            const nextUrls = listingMediaUrls(saved);
            const removed = diffRemovedMediaUrls(prevUrls, nextUrls);
            if (removed.length > 0) {
                await deleteStoredMediaUrls(removed);
            }
        }

        return saved;
    }

    async function deleteListingRecord(listingId: string): Promise<void> {
        const record = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);

        await db.delete(listings).where(eq(listings.id, listingId));
        deps.listingsById.delete(listingId);
        for (const [userId, ids] of deps.listingIdsByUser.entries()) {
            deps.listingIdsByUser.set(userId, ids.filter((id) => id !== listingId));
        }

        if (record) {
            const mediaUrls = listingMediaUrls(record);
            if (mediaUrls.length > 0) {
                await deleteStoredMediaUrls(mediaUrls);
            }
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

    async function getListingDraftRecord(userId: string, vertical: VerticalType) {
        const rows = await db
            .select()
            .from(listingDrafts)
            .where(and(eq(listingDrafts.userId, userId), eq(listingDrafts.vertical, vertical)))
            .limit(1);
        if (rows.length === 0) return null;
        return mapListingDraftRow(rows[0]);
    }

    async function upsertListingDraftRecord(userId: string, vertical: VerticalType, draft: unknown) {
        const existing = await getListingDraftRecord(userId, vertical);
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
                vertical,
                draftData: draft,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
        return mapListingDraftRow(rows[0]);
    }

    async function deleteListingDraftRecord(userId: string, vertical: VerticalType) {
        await db
            .delete(listingDrafts)
            .where(and(eq(listingDrafts.userId, userId), eq(listingDrafts.vertical, vertical)));
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
