import { logger } from '@simple/logger';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import {
    users,
    accounts,
    accountUsers,
    listings,
    savedListings,
    follows,
    boostOrders,
    instagramAccounts,
    instagramPublications,
    publicProfiles,
    publicProfileTeamMembers,
    addressBook,
} from '../../db/schema.js';
import {
    applyLeadCountsToListingCache,
    fetchActiveListingIdsForLeadCountSync,
    fetchLeadCountsForListingIdsBatched,
} from '../listings/lead-count.js';
import { loadPaymentOrdersCache } from '../payments/load-payment-orders-cache.js';
import { makeGeoPoint, type GeoPoint } from '../listings/location.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export type StartupCacheMaps = {
    usersById: Map<string, AnyRecord>;
    accountsById: Map<string, AnyRecord>;
    accountUsersByUserId: Map<string, AnyRecord[]>;
    defaultAccountIdByUserId: Map<string, string>;
    savedByUser: Map<string, AnyRecord[]>;
    followsByUser: Map<string, AnyRecord[]>;
    boostOrdersByUser: Map<string, AnyRecord[]>;
    listingsById: Map<string, AnyRecord>;
    addressBookByUser: Map<string, AnyRecord[]>;
    paymentOrdersByUser: Map<string, AnyRecord[]>;
    instagramAccountByUserVertical: Map<string, AnyRecord>;
    instagramPublicationsByUser: Map<string, AnyRecord[]>;
    publicProfilesByUserVertical: Map<string, AnyRecord>;
    publicProfilesByVerticalSlug: Map<string, AnyRecord>;
    publicProfileTeamMembersByUserVertical: Map<string, AnyRecord[]>;
    listingLeadCountsByListing: Map<string, number>;
};

export type StartupLoadDeps = {
    maps: StartupCacheMaps;
    boostListingsSeed: AnyRecord[];
    mapUserRowToAppUser: (row: typeof users.$inferSelect) => AnyRecord;
    mapAccountRow: (row: typeof accounts.$inferSelect) => AnyRecord;
    mapAccountUserRow: (row: typeof accountUsers.$inferSelect) => AnyRecord;
    upsertAccountUserCache: (membership: AnyRecord) => AnyRecord;
    mapPublicProfileRow: (row: typeof publicProfiles.$inferSelect) => AnyRecord;
    upsertPublicProfileCache: (profile: AnyRecord) => AnyRecord;
    mapPublicProfileTeamMemberRow: (row: typeof publicProfileTeamMembers.$inferSelect) => AnyRecord;
    upsertPublicProfileTeamMemberCache: (member: AnyRecord) => AnyRecord;
    mapListingRowToRecord: (row: typeof listings.$inferSelect) => AnyRecord;
    upsertBoostListingFromListing: (listing: AnyRecord) => void;
    instagramAccountKey: (userId: string, vertical: VerticalType) => string;
    mapInstagramAccountRow: (row: typeof instagramAccounts.$inferSelect) => AnyRecord;
    mapInstagramPublicationRow: (row: typeof instagramPublications.$inferSelect) => AnyRecord;
};

export function createStartupDataLoader(deps: StartupLoadDeps) {
    const {
        maps,
        boostListingsSeed,
        mapUserRowToAppUser,
        mapAccountRow,
        mapAccountUserRow,
        upsertAccountUserCache,
        mapPublicProfileRow,
        upsertPublicProfileCache,
        mapPublicProfileTeamMemberRow,
        upsertPublicProfileTeamMemberCache,
        mapListingRowToRecord,
        upsertBoostListingFromListing,
        instagramAccountKey,
        mapInstagramAccountRow,
        mapInstagramPublicationRow,
    } = deps;

    return async function loadDataFromDB() {
        logger.info('Loading data from database');

        const userResults = await db.select().from(users);
        maps.usersById.clear();
        for (const user of userResults) {
            maps.usersById.set(user.id, mapUserRowToAppUser(user));
        }
        logger.info('Loaded users', { count: userResults.length });

        const accountResults = await db.select().from(accounts);
        maps.accountsById.clear();
        for (const account of accountResults) {
            maps.accountsById.set(account.id, mapAccountRow(account));
        }

        const accountUserResults = await db.select().from(accountUsers);
        maps.accountUsersByUserId.clear();
        maps.defaultAccountIdByUserId.clear();
        for (const membership of accountUserResults) {
            upsertAccountUserCache(mapAccountUserRow(membership));
        }
        logger.info('Loaded accounts and memberships', { accounts: accountResults.length, memberships: accountUserResults.length });

        const publicProfileResults = await db.select().from(publicProfiles);
        maps.publicProfilesByUserVertical.clear();
        maps.publicProfilesByVerticalSlug.clear();
        for (const profile of publicProfileResults) {
            upsertPublicProfileCache(mapPublicProfileRow(profile));
        }
        logger.info('Loaded public profiles', { count: publicProfileResults.length });

        const publicProfileTeamMemberResults = await db.select().from(publicProfileTeamMembers);
        maps.publicProfileTeamMembersByUserVertical.clear();
        for (const member of publicProfileTeamMemberResults) {
            upsertPublicProfileTeamMemberCache(mapPublicProfileTeamMemberRow(member));
        }
        logger.info('Loaded public profile team members', { count: publicProfileTeamMemberResults.length });

        const listingResults = await db.select().from(listings);
        maps.listingsById.clear();
        for (const listing of listingResults) {
            maps.listingsById.set(listing.id, mapListingRowToRecord(listing));
        }
        logger.info('Loaded listings', { count: listingResults.length });

        boostListingsSeed.length = 0;
        for (const listing of maps.listingsById.values()) {
            if (listing.status === 'active') {
                upsertBoostListingFromListing(listing);
            }
        }
        logger.info('Synced boost listings from DB', { count: boostListingsSeed.length });

        maps.listingLeadCountsByListing.clear();
        const activeListingIdsForLeads = await fetchActiveListingIdsForLeadCountSync();
        const leadCountsByListing = await fetchLeadCountsForListingIdsBatched(activeListingIdsForLeads);
        applyLeadCountsToListingCache(
            maps.listingsById,
            maps.listingLeadCountsByListing,
            leadCountsByListing,
            activeListingIdsForLeads,
        );
        logger.info('Synced listing lead counts from DB', {
            activeListings: activeListingIdsForLeads.length,
            withLeads: [...leadCountsByListing.values()].filter((count) => count > 0).length,
        });

        const savedResults = await db.select().from(savedListings);
        const savedByUserMap = new Map<string, AnyRecord[]>();
        for (const saved of savedResults) {
            const list = savedByUserMap.get(saved.userId) || [];
            list.push({
                id: saved.id,
                href: '',
                title: '',
                price: '',
                location: undefined,
                savedAt: saved.savedAt.getTime(),
            });
            savedByUserMap.set(saved.userId, list);
        }
        for (const [userId, list] of savedByUserMap) {
            maps.savedByUser.set(userId, list);
        }
        logger.info('Loaded saved listings', { count: savedResults.length });

        const followResults = await db.select().from(follows);
        const followsByUserMap = new Map<string, AnyRecord[]>();
        for (const follow of followResults) {
            const list = followsByUserMap.get(follow.followerId) || [];
            list.push({
                followeeUserId: follow.followeeId,
                vertical: follow.vertical as VerticalType,
                followedAt: follow.followedAt.getTime(),
            });
            followsByUserMap.set(follow.followerId, list);
        }
        for (const [userId, list] of followsByUserMap) {
            maps.followsByUser.set(userId, list);
        }
        logger.info('Loaded follows', { count: followResults.length });

        const boostResults = await db.select().from(boostOrders);
        const boostOrdersByUserMap = new Map<string, AnyRecord[]>();
        for (const boost of boostResults) {
            const list = boostOrdersByUserMap.get(boost.userId) || [];
            list.push({
                id: boost.id,
                userId: boost.userId,
                listingId: boost.listingId || '',
                vertical: boost.vertical as VerticalType,
                section: boost.section as string,
                planId: boost.planId as string,
                planName: boost.planId,
                days: boost.days,
                price: Number(boost.price),
                startAt: boost.startsAt?.getTime() || 0,
                endAt: boost.endsAt?.getTime() || 0,
                status: boost.status as string,
                createdAt: boost.createdAt.getTime(),
                updatedAt: boost.updatedAt.getTime(),
            });
            boostOrdersByUserMap.set(boost.userId, list);
        }
        for (const [userId, list] of boostOrdersByUserMap) {
            maps.boostOrdersByUser.set(userId, list);
        }
        logger.info('Loaded boost orders', { count: boostResults.length });

        const instagramAccountResults = await db.select().from(instagramAccounts);
        for (const account of instagramAccountResults) {
            const mapped = mapInstagramAccountRow(account);
            maps.instagramAccountByUserVertical.set(
                instagramAccountKey(mapped.userId, mapped.vertical),
                mapped,
            );
        }
        logger.info('Loaded Instagram accounts', { count: instagramAccountResults.length });

        const instagramPublicationResults = await db.select().from(instagramPublications);
        const instagramPublicationsByUserMap = new Map<string, AnyRecord[]>();
        for (const publication of instagramPublicationResults) {
            const mapped = mapInstagramPublicationRow(publication);
            const current = instagramPublicationsByUserMap.get(mapped.userId) ?? [];
            current.push(mapped);
            instagramPublicationsByUserMap.set(mapped.userId, current);
        }
        for (const [userId, list] of instagramPublicationsByUserMap) {
            maps.instagramPublicationsByUser.set(userId, list.sort((a, b) => b.createdAt - a.createdAt));
        }
        logger.info('Loaded Instagram publications', { count: instagramPublicationResults.length });

        const addressBookResults = await db.select().from(addressBook);
        const addressBookByUserMap = new Map<string, AnyRecord[]>();
        for (const entry of addressBookResults) {
            const current = addressBookByUserMap.get(entry.userId) ?? [];
            current.push({
                id: entry.id,
                kind: entry.kind,
                label: entry.label,
                countryCode: entry.countryCode,
                regionId: entry.regionId,
                regionName: entry.regionName,
                communeId: entry.communeId,
                communeName: entry.communeName,
                neighborhood: entry.neighborhood,
                addressLine1: entry.addressLine1,
                addressLine2: entry.addressLine2,
                postalCode: entry.postalCode,
                arrivalInstructions: entry.arrivalInstructions ?? null,
                isDefault: entry.isDefault,
                geoPoint: (entry.geoPoint as GeoPoint) || makeGeoPoint(null, null, 'none'),
                createdAt: entry.createdAt.getTime(),
                updatedAt: entry.updatedAt.getTime(),
            });
            addressBookByUserMap.set(entry.userId, current);
        }
        for (const [userId, list] of addressBookByUserMap) {
            maps.addressBookByUser.set(userId, list);
        }
        logger.info('Loaded address book entries', { count: addressBookResults.length });

        const paymentOrderCache = await loadPaymentOrdersCache();
        maps.paymentOrdersByUser.clear();
        let paymentOrderCount = 0;
        for (const [userId, orders] of paymentOrderCache) {
            maps.paymentOrdersByUser.set(
                userId,
                orders.map((order) => ({
                    ...order,
                    vertical: order.vertical,
                    kind: order.kind,
                    status: order.status,
                    metadata: order.metadata,
                })),
            );
            paymentOrderCount += orders.length;
        }
        logger.info('Loaded payment orders', { users: paymentOrderCache.size, orders: paymentOrderCount });

        logger.info('Data loading complete');
    };
}
