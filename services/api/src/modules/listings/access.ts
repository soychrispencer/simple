import { canManageAccountRole } from '../accounts/permissions.js';

export type ListingAccessUser = { id: string };

export type ListingAccessRecord = {
    id: string;
    ownerId: string;
    accountId?: string | null;
};

export type ListingAccessControl = {
    canAccessListingWorkspace: (user: ListingAccessUser, listing: ListingAccessRecord) => Promise<boolean>;
    canManageListing: (user: ListingAccessUser, listing: ListingAccessRecord) => Promise<boolean>;
    canDeleteListing: (user: ListingAccessUser, listing: ListingAccessRecord) => Promise<boolean>;
};

export function createListingAccessControl(deps: {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => Array<{ accountId: string; role: string }>;
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    isPersonalAccountForUser: (userId: string, accountId: string) => boolean;
    isListingAssignedToUser: (accountId: string, listingId: string, userId: string) => Promise<boolean>;
}): ListingAccessControl {
    async function getCurrentMembership(userId: string) {
        if (deps.getAccountMembershipFromDb) return deps.getAccountMembershipFromDb(userId);
        const accountId = await deps.getPrimaryAccountIdForUser(userId);
        return accountId
            ? deps.getAccountMembershipsForUser(userId).find((item) => item.accountId === accountId) ?? null
            : null;
    }

    async function canAccessListingWorkspace(user: ListingAccessUser, listing: ListingAccessRecord): Promise<boolean> {
        const membership = await getCurrentMembership(user.id);
        const activeAccountId = membership?.accountId ?? null;
        if (listing.accountId) return listing.accountId === activeAccountId;
        return Boolean(
            activeAccountId
            && listing.ownerId === user.id
            && deps.isPersonalAccountForUser(user.id, activeAccountId),
        );
    }

    async function canManageListing(user: ListingAccessUser, listing: ListingAccessRecord): Promise<boolean> {
        const membership = await getCurrentMembership(user.id);
        const activeAccountId = membership?.accountId ?? null;
        if (listing.accountId ? listing.accountId !== activeAccountId : !(
            activeAccountId
            && listing.ownerId === user.id
            && deps.isPersonalAccountForUser(user.id, activeAccountId)
        )) return false;
        if (!listing.accountId) return listing.ownerId === user.id;

        if (!membership) return false;
        if (canManageAccountRole(membership.role)) return true;
        if (membership.role !== 'agent') return false;
        if (listing.ownerId === user.id) return true;
        return deps.isListingAssignedToUser(listing.accountId, listing.id, user.id);
    }

    async function canDeleteListing(user: ListingAccessUser, listing: ListingAccessRecord): Promise<boolean> {
        const membership = await getCurrentMembership(user.id);
        const activeAccountId = membership?.accountId ?? null;
        if (listing.accountId ? listing.accountId !== activeAccountId : !(
            activeAccountId
            && listing.ownerId === user.id
            && deps.isPersonalAccountForUser(user.id, activeAccountId)
        )) return false;
        if (!listing.accountId) return listing.ownerId === user.id;

        return canManageAccountRole(membership?.role);
    }

    return { canAccessListingWorkspace, canManageListing, canDeleteListing };
}
