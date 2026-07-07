import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { listings } from '../../db/schema.js';
import { extractListingSlugCandidate } from './public-present.js';
import { listingDefaultHref } from './row-mapper.js';

export function listingHrefPrefix(vertical: VerticalType): string {
    return vertical === 'autos' ? '/vehiculo/' : '/propiedad/';
}

export function normalizeListingHref(
    vertical: VerticalType,
    listingId: string,
    href?: string | null,
): string {
    const trimmed = href?.trim();
    if (!trimmed) return listingDefaultHref(vertical, listingId);
    if (trimmed.startsWith('/')) return trimmed;
    return `${listingHrefPrefix(vertical)}${trimmed}`;
}

export function buildListingHrefCandidates(slugLike: string): string[] {
    const trimmed = slugLike.trim();
    if (!trimmed) return [];

    const segment = extractListingSlugCandidate(trimmed);
    const candidates = new Set<string>([trimmed]);
    if (segment) {
        candidates.add(segment);
        candidates.add(`/propiedad/${segment}`);
        candidates.add(`/vehiculo/${segment}`);
    }
    return [...candidates];
}

async function isListingHrefTaken(hrefSlug: string, excludeListingId?: string): Promise<boolean> {
    for (const candidate of buildListingHrefCandidates(hrefSlug)) {
        const rows = await db
            .select({ id: listings.id })
            .from(listings)
            .where(eq(listings.hrefSlug, candidate))
            .limit(1);
        if (rows.length === 0) continue;
        if (rows[0].id !== excludeListingId) return true;
    }
    return false;
}

/** Garantiza un `href_slug` único; si el enlace pedido ya existe, agrega sufijo `-2`, `-3`, etc. */
export async function resolveUniqueListingHref(input: {
    vertical: VerticalType;
    listingId: string;
    href?: string | null;
    excludeListingId?: string;
}): Promise<string> {
    const normalized = normalizeListingHref(input.vertical, input.listingId, input.href);
    const prefix = listingHrefPrefix(input.vertical);
    const baseSegment = extractListingSlugCandidate(normalized) || input.listingId;

    for (let suffix = 0; suffix < 200; suffix += 1) {
        const segment = suffix === 0 ? baseSegment : `${baseSegment}-${suffix}`;
        const candidate = `${prefix}${segment}`;
        if (!(await isListingHrefTaken(candidate, input.excludeListingId))) {
            return candidate;
        }
    }

    return listingDefaultHref(input.vertical, input.listingId);
}
