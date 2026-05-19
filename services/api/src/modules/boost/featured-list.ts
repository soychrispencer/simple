import type { BoostSection } from './types.js';

export type ListFeaturedBoostedDeps = {
    getAllBoostOrdersNormalized: () => Array<{
        vertical: string;
        section: BoostSection;
        status: string;
        listingId: string;
        userId: string;
        planName: string;
        endAt: number;
        createdAt: number;
    }>;
    getBoostListingById: (vertical: string, listingId: string) => {
        id: string;
        href: string;
        title: string;
        subtitle: string;
        price: string;
        location: string;
        imageUrl?: string;
        section: BoostSection;
    } | null;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    listingsById: Map<string, { id: string; rawData?: unknown; locationData?: unknown; location?: string }>;
    extractListingMediaUrls: (record: { rawData?: unknown }) => string[];
    buildLocationPublicLabel: (locationData: unknown) => string;
    humanizePublicLocationFallback: (location: string) => string;
    sanitizeUser: (user: { id: string }) => unknown;
    usersById: Map<string, { id: string }>;
    boostListingsSeed: Array<{
        id: string;
        vertical: string;
        section: BoostSection;
        ownerId: string;
        href: string;
        title: string;
        subtitle: string;
        price: string;
        location: string;
        imageUrl?: string;
        imageUrls?: string[];
    }>;
};

export function createListFeaturedBoosted(deps: ListFeaturedBoostedDeps) {
    return async function listFeaturedBoosted(
        vertical: string,
        section: BoostSection,
        limit: number,
    ) {
        const boosted = deps
            .getAllBoostOrdersNormalized()
            .filter((order) => order.vertical === vertical && order.section === section && order.status === 'active')
            .sort((a, b) => b.createdAt - a.createdAt);

        const items = (
            await Promise.all(
                boosted.map(async (order) => {
                    const listing = deps.getBoostListingById(order.vertical, order.listingId);
                    if (!listing) return null;
                    const owner = await deps.getUserById(order.userId);
                    const sourceListing = deps.listingsById.get(listing.id);
                    const listingImageUrls = sourceListing
                        ? deps.extractListingMediaUrls(sourceListing)
                        : [];
                    const imageUrl = listingImageUrls.length > 0 ? listingImageUrls[0] : (listing.imageUrl ?? '');
                    const location = sourceListing
                        ? deps.buildLocationPublicLabel(sourceListing.locationData)
                            || deps.humanizePublicLocationFallback(sourceListing.location ?? '')
                            || deps.humanizePublicLocationFallback(listing.location)
                            || 'Chile'
                        : deps.humanizePublicLocationFallback(listing.location) || 'Chile';
                    return {
                        id: listing.id,
                        href: listing.href,
                        title: listing.title,
                        subtitle: listing.subtitle,
                        price: listing.price,
                        location,
                        imageUrl,
                        imageUrls: listingImageUrls,
                        section: listing.section,
                        boosted: true,
                        planName: order.planName,
                        boostEndsAt: order.endAt,
                        owner: owner ? deps.sanitizeUser(owner) : null,
                    };
                }),
            )
        ).filter((item) => item != null);

        const uniqueIds = new Set<string>();
        const uniqueBoosted = items.filter((item) => {
            if (uniqueIds.has(item.id)) return false;
            uniqueIds.add(item.id);
            return true;
        });

        if (uniqueBoosted.length >= limit) return uniqueBoosted.slice(0, limit);

        const fallback = deps.boostListingsSeed
            .filter((item) => item.vertical === vertical && item.section === section)
            .filter((item) => !uniqueIds.has(item.id))
            .slice(0, Math.max(0, limit - uniqueBoosted.length))
            .map((listing) => {
                const owner = deps.usersById.get(listing.ownerId);
                const sourceListing = deps.listingsById.get(listing.id);
                const listingImageUrls = sourceListing
                    ? deps.extractListingMediaUrls(sourceListing)
                    : (listing.imageUrls || []);
                const imageUrl = listingImageUrls.length > 0 ? listingImageUrls[0] : (listing.imageUrl ?? '');
                const location = sourceListing
                    ? deps.buildLocationPublicLabel(sourceListing.locationData)
                        || deps.humanizePublicLocationFallback(sourceListing.location ?? '')
                        || deps.humanizePublicLocationFallback(listing.location)
                        || 'Chile'
                    : deps.humanizePublicLocationFallback(listing.location) || 'Chile';
                return {
                    id: listing.id,
                    href: listing.href,
                    title: listing.title,
                    subtitle: listing.subtitle,
                    price: listing.price,
                    location,
                    imageUrl,
                    imageUrls: listingImageUrls,
                    section: listing.section,
                    boosted: false,
                    planName: 'Orgánico',
                    boostEndsAt: null,
                    owner: owner ? deps.sanitizeUser(owner) : null,
                };
            });

        return [...uniqueBoosted, ...fallback];
    };
}
