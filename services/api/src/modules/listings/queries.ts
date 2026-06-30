import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { listings } from '../../db/schema.js';
import type { PublicListingSearchQuery } from '../public/listing-search.js';
import { buildPublicListingSearchSqlConditions } from './public-search-sql.js';
import { extractListingSlugCandidate } from './public-present.js';

/**
 * Lectura de listing por ID directamente desde PostgreSQL (sin Map en memoria).
 * El caller debe mapear la fila a ListingRecord si necesita el modelo en caché.
 */
export async function fetchListingRowById(listingId: string) {
    const rows = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    return rows[0] ?? null;
}

/**
 * Listado panel — fuente primaria PostgreSQL (sin iterar listingsById).
 */
export async function fetchListingRowsForPanel(input: {
    vertical: string;
    ownerId: string;
    includeAllInVertical: boolean;
}) {
    const conditions = [eq(listings.vertical, input.vertical)];
    if (!input.includeAllInVertical) {
        conditions.push(eq(listings.ownerId, input.ownerId));
    }
    return db
        .select()
        .from(listings)
        .where(and(...conditions))
        .orderBy(desc(listings.updatedAt));
}

/** Slug público — `listings.href_slug` en PostgreSQL. */
export async function fetchListingRowByHrefSlug(slugLike: string) {
    const slug = extractListingSlugCandidate(slugLike);
    if (!slug) return null;
    const rows = await db.select().from(listings).where(eq(listings.hrefSlug, slug)).limit(1);
    return rows[0] ?? null;
}

/** Listado marketplace público — PostgreSQL primero; filtros marca/modelo/región en SQL cuando vienen en query. */
export async function fetchActivePublicListingRowsForMarketplace(input: {
    vertical: string;
    section?: string | null;
    fetchLimit: number;
    searchQuery?: PublicListingSearchQuery;
}) {
    const conditions = [
        eq(listings.vertical, input.vertical),
        eq(listings.status, 'active'),
        ...buildPublicListingSearchSqlConditions(input.searchQuery ?? {}),
    ];
    if (input.section) {
        conditions.push(eq(listings.section, input.section));
    }
    return db
        .select()
        .from(listings)
        .where(and(...conditions))
        .orderBy(desc(listings.updatedAt))
        .limit(input.fetchLimit);
}

/** Listings activos de un vendedor para perfil público (sin iterar Map). */
export async function fetchActivePublicListingRowsForOwner(ownerId: string, vertical: string) {
    return db
        .select()
        .from(listings)
        .where(and(
            eq(listings.ownerId, ownerId),
            eq(listings.vertical, vertical),
            eq(listings.status, 'active'),
        ))
        .orderBy(desc(listings.updatedAt));
}
