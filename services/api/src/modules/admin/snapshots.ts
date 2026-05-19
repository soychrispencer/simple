import { desc, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    agendaProfessionalProfiles,
    listings,
    serenataOwners,
    serenataClients,
    serenataMusicians,
    subscriptions,
    users,
} from '../../db/schema.js';

type UserRole = 'user' | 'admin' | 'superadmin';
type UserStatus = 'active' | 'verified' | 'suspended';
type VerticalType = 'autos' | 'propiedades' | 'agenda';
type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
type ListingStatus = 'draft' | 'published' | 'paused' | 'archived' | 'sold' | 'rented';

export type AdminUserSnapshot = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    primaryVertical: VerticalType | null;
    provider: string | null;
    createdAt: number;
    lastLoginAt: number | null;
    totalListings: number;
    agendaListings: number;
    autosListings: number;
    propiedadesListings: number;
    subscriptions?: {
        autos?: { planId: string | null; planName: string | null; status: string; expiresAt: string | null };
        propiedades?: { planId: string | null; planName: string | null; status: string; expiresAt: string | null };
    };
    serenatas?: {
        client: boolean;
        musician: boolean;
        coordinator: boolean;
        instrument: string | null;
        coordinatorStatus: string | null;
        trialEndsAt: string | null;
    };
};

export type AdminListingSnapshot = {
    id: string;
    title: string;
    vertical: VerticalType;
    section: BoostSection;
    status: ListingStatus;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    price: string | null;
    href: string | null;
    createdAt: number;
    updatedAt: number;
};

export async function listAdminUsersSnapshot(vertical?: VerticalType | null): Promise<AdminUserSnapshot[]> {
    const [userRows, listingRows, agendaProfiles, serenataClientRows, serenataMusicianRows, serenataAdminRows] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select({
            ownerId: listings.ownerId,
            vertical: listings.vertical,
        }).from(listings),
        db.select({ userId: agendaProfessionalProfiles.userId }).from(agendaProfessionalProfiles),
        db.select({ userId: serenataClients.userId }).from(serenataClients),
        db.select({ userId: serenataMusicians.userId, instrument: serenataMusicians.instrument }).from(serenataMusicians),
        db.select({
            userId: serenataOwners.userId,
            subscriptionStatus: serenataOwners.subscriptionStatus,
            trialEndsAt: serenataOwners.trialEndsAt,
        }).from(serenataOwners),
    ]);

    const userIds = userRows.map((user) => user.id);
    const subscriptionRows = userIds.length > 0
        ? await db.select({
            userId: subscriptions.userId,
            vertical: subscriptions.vertical,
            planId: subscriptions.planId,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
        }).from(subscriptions).where(inArray(subscriptions.userId, userIds))
        : [];

    const listingCounters = new Map<string, { total: number; autos: number; propiedades: number }>();
    for (const listing of listingRows) {
        const current = listingCounters.get(listing.ownerId) ?? { total: 0, autos: 0, propiedades: 0 };
        current.total += 1;
        if (listing.vertical === 'autos') current.autos += 1;
        if (listing.vertical === 'propiedades') current.propiedades += 1;
        listingCounters.set(listing.ownerId, current);
    }

    const ownersWithVerticalListings = new Set(
        vertical ? listingRows.filter((l) => l.vertical === vertical).map((l) => l.ownerId) : [],
    );
    const agendaUsers = new Set(agendaProfiles.map((row) => row.userId));
    const serenataClientsByUser = new Set(serenataClientRows.map((row) => row.userId));
    const serenataMusiciansByUser = new Map(serenataMusicianRows.map((row) => [row.userId, row]));
    const serenataAdminsByUser = new Map(serenataAdminRows.map((row) => [row.userId, row]));
    const subscriptionsByUser = new Map<string, Record<string, {
        planId: string | null;
        status: string;
        expiresAt: Date | null;
    }>>();
    for (const row of subscriptionRows) {
        const bucket = subscriptionsByUser.get(row.userId) ?? {};
        bucket[row.vertical] = {
            planId: row.planId,
            status: row.status,
            expiresAt: row.expiresAt ?? null,
        };
        subscriptionsByUser.set(row.userId, bucket);
    }

    return userRows
        .filter((user) => {
            if (!vertical) return true;
            const userVertical = user.primaryVertical ?? null;
            if (userVertical === vertical) return true;
            if (ownersWithVerticalListings.has(user.id)) return true;
            return false;
        })
        .map((user) => {
            const counters = listingCounters.get(user.id) ?? { total: 0, autos: 0, propiedades: 0 };
            const serenataMusician = serenataMusiciansByUser.get(user.id);
            const serenataAdmin = serenataAdminsByUser.get(user.id);
            const hasSerenataProfile = serenataClientsByUser.has(user.id) || Boolean(serenataMusician) || Boolean(serenataAdmin);
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role as UserRole,
                status: user.status as UserStatus,
                primaryVertical: (user.primaryVertical as VerticalType | null) ?? null,
                provider: user.provider ?? null,
                createdAt: user.createdAt.getTime(),
                lastLoginAt: user.lastLoginAt?.getTime() ?? null,
                totalListings: counters.total,
                agendaListings: agendaUsers.has(user.id) ? 1 : 0,
                autosListings: counters.autos,
                propiedadesListings: counters.propiedades,
                serenatas: hasSerenataProfile
                    ? {
                          client: serenataClientsByUser.has(user.id),
                          musician: Boolean(serenataMusician),
                          coordinator: Boolean(serenataAdmin),
                          instrument: serenataMusician?.instrument ?? null,
                          coordinatorStatus: serenataAdmin?.subscriptionStatus ?? null,
                          trialEndsAt: serenataAdmin?.trialEndsAt?.toISOString() ?? null,
                      }
                    : undefined,
                subscriptions: (() => {
                    const sub = subscriptionsByUser.get(user.id);
                    if (!sub) return undefined;
                    return {
                        autos: sub?.autos
                            ? {
                                  planId: sub.autos.planId,
                                  planName: sub.autos.planId,
                                  status: sub.autos.status,
                                  expiresAt: sub.autos.expiresAt?.toISOString() ?? null,
                              }
                            : undefined,
                        propiedades: sub?.propiedades
                            ? {
                                  planId: sub.propiedades.planId,
                                  planName: sub.propiedades.planId,
                                  status: sub.propiedades.status,
                                  expiresAt: sub.propiedades.expiresAt?.toISOString() ?? null,
                              }
                            : undefined,
                    };
                })(),
            };
        });
}

export async function listAdminListingsSnapshot(vertical?: VerticalType | null): Promise<AdminListingSnapshot[]> {
    const [listingRows, userRows] = await Promise.all([
        db.select().from(listings).orderBy(desc(listings.updatedAt)),
        db.select({
            id: users.id,
            name: users.name,
            email: users.email,
        }).from(users),
    ]);
    const userMap = new Map(userRows.map((user) => [user.id, user]));

    return listingRows
        .filter((listing) => !vertical || listing.vertical === vertical)
        .map((listing) => {
            const owner = userMap.get(listing.ownerId);
            return {
                id: listing.id,
                title: listing.title,
                vertical: listing.vertical as VerticalType,
                section: listing.section as BoostSection,
                status: listing.status as ListingStatus,
                ownerId: listing.ownerId,
                ownerName: owner?.name ?? 'Cuenta desconocida',
                ownerEmail: owner?.email ?? '',
                price: listing.priceLabel ?? null,
                href: listing.hrefSlug ?? null,
                createdAt: listing.createdAt.getTime(),
                updatedAt: listing.updatedAt.getTime(),
            };
        });
}
