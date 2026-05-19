import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { listingLeads, listings } from '../../db/schema.js';

/** Máximo de listings activos cuyo leadCount se sincroniza al arranque. */
export const STARTUP_ACTIVE_LISTING_LEAD_COUNT_LIMIT = 10_000;
/** Tamaño de lote para `fetchLeadCountsForListingIds` en arranque. */
export const STARTUP_LEAD_COUNT_BATCH_SIZE = 500;

/** Conteo de leads por listing desde PostgreSQL (fuente de verdad). */
export async function fetchLeadCountByListingId(listingId: string): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(listingLeads)
        .where(eq(listingLeads.listingId, listingId));
    return Number(rows[0]?.count ?? 0);
}

/** Batch de conteos para rutas panel DB-first. */
export async function fetchLeadCountsForListingIds(listingIds: string[]): Promise<Map<string, number>> {
    if (listingIds.length === 0) return new Map();

    const rows = await db
        .select({
            listingId: listingLeads.listingId,
            count: sql<number>`count(*)::int`,
        })
        .from(listingLeads)
        .where(inArray(listingLeads.listingId, listingIds))
        .groupBy(listingLeads.listingId);

    return new Map(rows.map((row) => [row.listingId, Number(row.count)]));
}

/** IDs de listings activos en PostgreSQL (fuente de verdad al arranque). */
export async function fetchActiveListingIdsForLeadCountSync(
    limit = STARTUP_ACTIVE_LISTING_LEAD_COUNT_LIMIT,
): Promise<string[]> {
    const rows = await db
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.status, 'active'))
        .limit(limit);
    return rows.map((row) => row.id);
}

/** Conteos agregados por lotes; listings sin filas en `listing_leads` quedan en 0. */
export async function fetchLeadCountsForListingIdsBatched(
    listingIds: string[],
    batchSize = STARTUP_LEAD_COUNT_BATCH_SIZE,
): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (listingIds.length === 0) return result;

    for (let offset = 0; offset < listingIds.length; offset += batchSize) {
        const chunk = listingIds.slice(offset, offset + batchSize);
        const counts = await fetchLeadCountsForListingIds(chunk);
        for (const listingId of chunk) {
            result.set(listingId, counts.get(listingId) ?? 0);
        }
    }
    return result;
}

/** Aplica conteos al Map de caché y a registros en memoria (`listing.leads`). */
export function applyLeadCountsToListingCache<T extends { leads?: number }>(
    listingsById: Map<string, T>,
    listingLeadCountsByListing: Map<string, number>,
    counts: Map<string, number>,
    listingIds: string[],
): void {
    for (const listingId of listingIds) {
        const count = counts.get(listingId) ?? 0;
        listingLeadCountsByListing.set(listingId, count);
        const listing = listingsById.get(listingId);
        if (listing) {
            listing.leads = count;
            listingsById.set(listingId, listing);
        }
    }
}
