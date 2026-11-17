import type { VerticalType } from '@simple/types';
import type { SubscriptionPlanRecord } from '../advertising/types.js';

type ListingLike = {
    vertical: string;
    status: string;
    accountId?: string | null;
    ownerId?: string;
};

export function countUserListingsForVertical(
    listingIdsByUser: Map<string, string[]>,
    listingsById: Map<string, ListingLike>,
    userId: string,
    vertical: VerticalType,
): number {
    const ids = listingIdsByUser.get(userId) ?? [];
    return ids.filter((id) => {
        const listing = listingsById.get(id);
        if (!listing || listing.vertical !== vertical) return false;
        return listing.status === 'active' || listing.status === 'paused';
    }).length;
}

/** Count the account portfolio; unscoped legacy listings belong only to the owner's personal account. */
export function countAccountListingsForVertical(
    listingsById: Map<string, ListingLike>,
    accountId: string,
    ownerUserId: string,
    vertical: VerticalType,
    includeLegacyUnscopedOwnedListings = false,
): number {
    return [...listingsById.values()].filter((listing) => {
        if (listing.vertical !== vertical || (listing.status !== 'active' && listing.status !== 'paused')) return false;
        return listing.accountId === accountId
            || (includeLegacyUnscopedOwnedListings && !listing.accountId && listing.ownerId === ownerUserId);
    }).length;
}

export function getListingLimitError(
    plan: SubscriptionPlanRecord | undefined,
    currentCount: number,
): string | null {
    if (!plan || plan.maxListings < 0) return null;
    if (currentCount >= plan.maxListings) {
        return `Tu plan ${plan.name} permite hasta ${plan.maxListings} publicaciones activas. Mejora tu plan para publicar más.`;
    }
    return null;
}
