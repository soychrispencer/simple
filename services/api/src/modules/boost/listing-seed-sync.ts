import type { BoostListingRecord } from './types.js';

export type ListingSeedSyncInput = {
    id: string;
    vertical: BoostListingRecord['vertical'];
    section: BoostListingRecord['section'];
    ownerId: string;
    href: string;
    title: string;
    price: string;
    location?: string;
};

export function createBoostListingSeedSync(deps: {
    boostListingsSeed: BoostListingRecord[];
    extractListingSummary: (listing: ListingSeedSyncInput) => string[];
    extractListingMediaUrls: (listing: ListingSeedSyncInput) => string[];
}) {
    const { boostListingsSeed, extractListingSummary, extractListingMediaUrls } = deps;

    return function upsertBoostListingFromListing(listing: ListingSeedSyncInput): void {
        const summary = extractListingSummary(listing);
        const subtitle = summary.join(' • ');
        const imageUrls = extractListingMediaUrls(listing);
        const existing = boostListingsSeed.find((item) => item.id === listing.id && item.vertical === listing.vertical);
        if (existing) {
            existing.title = listing.title;
            existing.subtitle = subtitle;
            existing.price = listing.price;
            existing.location = listing.location || existing.location;
            existing.section = listing.section;
            existing.href = listing.href;
            existing.imageUrl = imageUrls[0] || existing.imageUrl;
            existing.imageUrls = imageUrls;
            return;
        }

        boostListingsSeed.unshift({
            id: listing.id,
            vertical: listing.vertical,
            section: listing.section,
            ownerId: listing.ownerId,
            href: listing.href,
            title: listing.title,
            subtitle,
            price: listing.price,
            location: listing.location || '',
            imageUrl: imageUrls[0],
            imageUrls,
        });
    };
}
