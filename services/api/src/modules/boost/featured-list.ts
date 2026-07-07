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
    toPublicMediaUrl: (value: unknown) => string;
    getPublishedSellerProfile: (
        userId: string,
        vertical: string,
    ) => { avatarImageUrl?: string | null } | null;
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
    function resolveOwnerAvatar(owner: { id: string; avatar?: string }, vertical: string): string | undefined {
        const profile = deps.getPublishedSellerProfile(owner.id, vertical);
        const profileAvatar = deps.toPublicMediaUrl(profile?.avatarImageUrl);
        if (profileAvatar) return profileAvatar;
        const accountAvatar = deps.toPublicMediaUrl(owner.avatar);
        return accountAvatar || undefined;
    }

    function buildOwnerPayload(owner: { id: string; avatar?: string }, vertical: string) {
        const sanitized = deps.sanitizeUser(owner) as { avatar?: string } & Record<string, unknown>;
        const avatar = resolveOwnerAvatar(owner, vertical) ?? sanitized.avatar;
        return { ...sanitized, avatar };
    }

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
                        owner: owner ? buildOwnerPayload(owner as { id: string; avatar?: string }, order.vertical) : null,
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

        return uniqueBoosted.slice(0, limit);
    };
}
