import type { VerticalType } from '@simple/types';
import { listings } from '../../db/schema.js';
import type {
    BoostSection,
    ListingLocation,
    ListingRecord,
    ListingStatus,
} from '../../lib/domain-types.js';
import { extractStoredListingIntegrations, stripStoredListingMetadata } from './portals.js';

type ListingRow = typeof listings.$inferSelect;

export function listingDefaultHref(vertical: VerticalType, listingId: string): string {
    return vertical === 'autos' ? `/vehiculo/${listingId}` : `/propiedad/${listingId}`;
}

export function parseNumberFromString(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/\./g, '').replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function createMapListingRowToRecord(getLeadCount: (listingId: string) => number) {
    return function mapListingRowToRecord(listing: ListingRow): ListingRecord {
        const integrations = extractStoredListingIntegrations(listing.rawData);
        const leadCount = getLeadCount(listing.id);
        return {
            id: listing.id,
            accountId: listing.accountId ?? null,
            ownerId: listing.ownerId,
            vertical: listing.vertical as VerticalType,
            section: listing.section as BoostSection,
            listingType: listing.section as BoostSection,
            title: listing.title,
            description: listing.description || '',
            price: listing.priceLabel || '',
            location: listing.location || '',
            locationData: listing.locationData as ListingLocation,
            href: listing.hrefSlug || listingDefaultHref(listing.vertical as VerticalType, listing.id),
            status: listing.status as ListingStatus,
            views: 0,
            favs: 0,
            leads: leadCount,
            rawData: stripStoredListingMetadata(listing.rawData),
            integrations,
            createdAt: listing.createdAt.getTime(),
            updatedAt: listing.updatedAt.getTime(),
        };
    };
}
