import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    agendaProfessionalProfiles,
    listings,
    serenataOwners,
    serenataClients,
    serenataMusicians,
    subscriptionPlans,
    subscriptions,
    userPlatformAccess,
    users,
} from '../../db/schema.js';

type UserRole = 'user' | 'admin' | 'superadmin';
type UserStatus = 'active' | 'verified' | 'suspended';
type VerticalType = 'autos' | 'propiedades' | 'agenda';
type AdminVertical = VerticalType | 'serenatas';
type BoostSection = 'sale' | 'rent' | 'auction' | 'project';
type ListingStatus = 'draft' | 'published' | 'paused' | 'archived' | 'sold' | 'rented';
type VerticalSignalSource =
    | 'primary_vertical'
    | 'signup_app'
    | 'listing'
    | 'subscription'
    | 'agenda_profile'
    | 'serenata_client'
    | 'serenata_musician'
    | 'serenata_owner';

export type AdminVerticalSignal = {
    vertical: AdminVertical;
    source: VerticalSignalSource;
    label: string;
    count: number;
    firstSeenAt: number | null;
    lastSeenAt: number | null;
};

export type AdminPlatformAccess = {
    app: 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas';
    label: string;
    vertical: AdminVertical;
    role: string;
    status: string;
    origin: string | null;
    firstSeenAt: number | null;
    activatedAt: number | null;
    lastLoginAt: number | null;
};

export type AdminUserSnapshot = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    primaryVertical: VerticalType | null;
    provider: string | null;
    signupApp: string | null;
    signupOrigin: string | null;
    signupSourceLabel: string;
    createdAt: number;
    lastLoginAt: number | null;
    totalListings: number;
    agendaListings: number;
    autosListings: number;
    propiedadesListings: number;
    likelySignupVertical: AdminVertical | null;
    verticalConfidence: 'direct' | 'inferred' | 'unknown';
    verticalSignals: AdminVerticalSignal[];
    platformAccesses: AdminPlatformAccess[];
    primaryPlatform: AdminPlatformAccess | null;
    realness: {
        label: 'Cuenta interna/admin' | 'Cuenta real activa' | 'Registro real sin actividad' | 'Registro sin plataforma';
        score: number;
        reasons: string[];
    };
    subscriptions?: {
        agenda?: { plan: 'free' | 'pro'; status: 'active' | 'expired' | 'free'; expiresAt: string | null };
        autos?: { planId: string | null; planName: string | null; status: string; expiresAt: string | null };
        propiedades?: { planId: string | null; planName: string | null; status: string; expiresAt: string | null };
        serenatas?: { planId: string | null; planName: string | null; status: string; expiresAt: string | null };
    };
    serenatas?: {
        client: boolean;
        musician: boolean;
        owner: boolean;
        instrument: string | null;
        ownerStatus: string | null;
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

function timeOrNull(value: Date | null | undefined): number | null {
    return value ? value.getTime() : null;
}

function minTime(values: Array<number | null | undefined>): number | null {
    const clean = values.filter((value): value is number => typeof value === 'number');
    return clean.length ? Math.min(...clean) : null;
}

function maxTime(values: Array<number | null | undefined>): number | null {
    const clean = values.filter((value): value is number => typeof value === 'number');
    return clean.length ? Math.max(...clean) : null;
}

function verticalFromSignupApp(signupApp: string | null | undefined): AdminVertical | null {
    if (signupApp === 'simpleautos') return 'autos';
    if (signupApp === 'simplepropiedades') return 'propiedades';
    if (signupApp === 'simpleagenda') return 'agenda';
    if (signupApp === 'simpleserenatas') return 'serenatas';
    return null;
}

function verticalFromPlatformApp(app: string | null | undefined): AdminVertical | null {
    if (app === 'simpleautos') return 'autos';
    if (app === 'simplepropiedades') return 'propiedades';
    if (app === 'simpleagenda') return 'agenda';
    if (app === 'simpleserenatas') return 'serenatas';
    return null;
}

function platformLabel(app: string | null | undefined): string {
    const labels: Record<string, string> = {
        simpleagenda: 'SimpleAgenda',
        simpleautos: 'SimpleAutos',
        simplepropiedades: 'SimplePropiedades',
        simpleserenatas: 'SimpleSerenatas',
    };
    return app ? labels[app] ?? app : 'Sin plataforma';
}

function signupSourceLabel(signupApp: string | null | undefined, signupOrigin: string | null | undefined): string {
    const labels: Record<string, string> = {
        simpleadmin: 'SimpleAdmin',
        simpleplataforma: 'SimplePlataforma',
        simpleagenda: 'SimpleAgenda',
        simpleautos: 'SimpleAutos',
        simplepropiedades: 'SimplePropiedades',
        simpleserenatas: 'SimpleSerenatas',
        unknown: 'Sin origen histórico',
    };
    if (signupApp && labels[signupApp]) return labels[signupApp];
    if (!signupOrigin) return 'No registrado historicamente';
    try {
        return new URL(signupOrigin).hostname;
    } catch {
        return signupOrigin;
    }
}

function buildRealness(input: {
    role: string;
    status: string;
    provider: string | null;
    lastLoginAt: Date | null | undefined;
    signals: AdminVerticalSignal[];
    platformAccesses: AdminPlatformAccess[];
}): AdminUserSnapshot['realness'] {
    if (input.role === 'admin' || input.role === 'superadmin') {
        return { label: 'Cuenta interna/admin', score: 100, reasons: ['Rol administrativo'] };
    }

    const reasons: string[] = [];
    let score = 0;
    if (input.provider === 'google') {
        score += 35;
        reasons.push('Entró con Google');
    }
    if (input.status === 'verified') {
        score += 25;
        reasons.push('Cuenta verificada');
    }
    if (input.lastLoginAt) {
        score += 20;
        reasons.push('Tiene inicio de sesión');
    }
    if (input.platformAccesses.length > 0) {
        score += 30;
        reasons.push('Tiene plataforma activada');
    } else if (input.signals.length > 0) {
        score += 15;
        reasons.push('Tiene actividad detectada');
    }

    const capped = Math.min(score, 100);
    if (capped >= 65) return { label: 'Cuenta real activa', score: capped, reasons };
    if (capped >= 35) return { label: 'Registro real sin actividad', score: capped, reasons };
    return { label: 'Registro sin plataforma', score: capped, reasons: reasons.length ? reasons : ['Sin actividad asociada'] };
}

export async function listAdminUsersSnapshot(vertical?: AdminVertical | null): Promise<AdminUserSnapshot[]> {
    const [userRows, platformRows, listingRows, agendaProfiles, serenataClientRows, serenataMusicianRows, serenataOwnerRows] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select().from(userPlatformAccess),
        db.select({
            ownerId: listings.ownerId,
            vertical: listings.vertical,
            createdAt: listings.createdAt,
            updatedAt: listings.updatedAt,
        }).from(listings),
        db.select({
            userId: agendaProfessionalProfiles.userId,
            plan: agendaProfessionalProfiles.plan,
            planExpiresAt: agendaProfessionalProfiles.planExpiresAt,
            createdAt: agendaProfessionalProfiles.createdAt,
            updatedAt: agendaProfessionalProfiles.updatedAt,
        }).from(agendaProfessionalProfiles),
        db.select({
            userId: serenataClients.userId,
            createdAt: serenataClients.createdAt,
            updatedAt: serenataClients.updatedAt,
        }).from(serenataClients),
        db.select({
            userId: serenataMusicians.userId,
            instrument: serenataMusicians.instrument,
            createdAt: serenataMusicians.createdAt,
            updatedAt: serenataMusicians.updatedAt,
        }).from(serenataMusicians),
        db.select({
            userId: serenataOwners.userId,
            subscriptionStatus: serenataOwners.subscriptionStatus,
            trialEndsAt: serenataOwners.trialEndsAt,
            createdAt: serenataOwners.createdAt,
            updatedAt: serenataOwners.updatedAt,
        }).from(serenataOwners),
    ]);

    const userIds = userRows.map((user) => user.id);
    const subscriptionRows = userIds.length > 0
        ? await db.select({
            userId: subscriptions.userId,
            vertical: subscriptions.vertical,
            planSlug: subscriptionPlans.planId,
            planName: subscriptionPlans.name,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
            createdAt: subscriptions.createdAt,
            updatedAt: subscriptions.updatedAt,
        })
            .from(subscriptions)
            .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
            .where(inArray(subscriptions.userId, userIds))
        : [];

    const listingCounters = new Map<string, { total: number; autos: number; propiedades: number; rows: typeof listingRows }>();
    for (const listing of listingRows) {
        const current = listingCounters.get(listing.ownerId) ?? { total: 0, autos: 0, propiedades: 0, rows: [] as typeof listingRows };
        current.total += 1;
        current.rows.push(listing);
        if (listing.vertical === 'autos') current.autos += 1;
        if (listing.vertical === 'propiedades') current.propiedades += 1;
        listingCounters.set(listing.ownerId, current);
    }

    const ownersWithVerticalListings = new Set(
        vertical === 'autos' || vertical === 'propiedades'
            ? listingRows.filter((l) => l.vertical === vertical).map((l) => l.ownerId)
            : [],
    );
    const agendaProfilesByUser = new Map(agendaProfiles.map((row) => [row.userId, row]));
    const platformsByUser = new Map<string, AdminPlatformAccess[]>();
    for (const row of platformRows) {
        const v = verticalFromPlatformApp(row.app);
        if (!v) continue;
        const access: AdminPlatformAccess = {
            app: row.app as AdminPlatformAccess['app'],
            label: platformLabel(row.app),
            vertical: v,
            role: row.role,
            status: row.status,
            origin: row.origin ?? null,
            firstSeenAt: timeOrNull(row.firstSeenAt),
            activatedAt: timeOrNull(row.activatedAt),
            lastLoginAt: timeOrNull(row.lastLoginAt),
        };
        const bucket = platformsByUser.get(row.userId) ?? [];
        bucket.push(access);
        platformsByUser.set(row.userId, bucket);
    }
    for (const bucket of platformsByUser.values()) {
        bucket.sort((a, b) => {
            const aTime = a.activatedAt ?? a.firstSeenAt ?? Number.MAX_SAFE_INTEGER;
            const bTime = b.activatedAt ?? b.firstSeenAt ?? Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    }
    const serenataClientsByUser = new Map(serenataClientRows.map((row) => [row.userId, row]));
    const serenataMusiciansByUser = new Map(serenataMusicianRows.map((row) => [row.userId, row]));
    const serenataOwnersByUser = new Map(serenataOwnerRows.map((row) => [row.userId, row]));
    const subscriptionsByUser = new Map<string, Record<string, {
        planId: string;
        planName: string;
        status: string;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>>();
    for (const row of subscriptionRows) {
        const bucket = subscriptionsByUser.get(row.userId) ?? {};
        bucket[row.vertical] = {
            planId: row.planSlug,
            planName: row.planName,
            status: row.status,
            expiresAt: row.expiresAt ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
        subscriptionsByUser.set(row.userId, bucket);
    }

    return userRows
        .filter((user) => {
            const platformAccesses = platformsByUser.get(user.id) ?? [];
            if (!vertical) return true;
            if (platformAccesses.some((access) => access.vertical === vertical)) return true;
            const userVertical = user.primaryVertical ?? null;
            if (userVertical === vertical) return true;
            if (ownersWithVerticalListings.has(user.id)) return true;
            if (vertical === 'agenda' && agendaProfilesByUser.has(user.id)) return true;
            if (
                vertical === 'serenatas'
                && (
                    verticalFromSignupApp(user.signupApp) === 'serenatas'
                    || serenataClientsByUser.has(user.id)
                    || serenataMusiciansByUser.has(user.id)
                    || serenataOwnersByUser.has(user.id)
                    || subscriptionsByUser.get(user.id)?.serenatas
                )
            ) return true;
            return false;
        })
        .map((user) => {
            const counters = listingCounters.get(user.id) ?? { total: 0, autos: 0, propiedades: 0, rows: [] as typeof listingRows };
            const agendaProfile = agendaProfilesByUser.get(user.id);
            const serenataClient = serenataClientsByUser.get(user.id);
            const serenataMusician = serenataMusiciansByUser.get(user.id);
            const serenataOwner = serenataOwnersByUser.get(user.id);
            const sub = subscriptionsByUser.get(user.id);
            const platformAccesses = platformsByUser.get(user.id) ?? [];
            const primaryPlatform = platformAccesses.find((access) => access.status === 'active') ?? platformAccesses[0] ?? null;
            const signals: AdminVerticalSignal[] = [];
            const directSignupVertical = verticalFromSignupApp(user.signupApp);

            if (directSignupVertical) {
                signals.push({
                    vertical: directSignupVertical,
                    source: 'signup_app',
                    label: `Alta desde ${signupSourceLabel(user.signupApp, user.signupOrigin)}`,
                    count: 1,
                    firstSeenAt: user.createdAt.getTime(),
                    lastSeenAt: user.createdAt.getTime(),
                });
            }
            if (user.primaryVertical) {
                signals.push({
                    vertical: user.primaryVertical as VerticalType,
                    source: 'primary_vertical',
                    label: 'Plataforma base guardada',
                    count: 1,
                    firstSeenAt: user.createdAt.getTime(),
                    lastSeenAt: user.updatedAt.getTime(),
                });
            }
            for (const listingVertical of ['autos', 'propiedades'] as const) {
                const rows = counters.rows.filter((row) => row.vertical === listingVertical);
                if (rows.length > 0) {
                    signals.push({
                        vertical: listingVertical,
                        source: 'listing',
                        label: `${listingVertical === 'autos' ? 'Autos' : 'Propiedades'}: publicaciones`,
                        count: rows.length,
                        firstSeenAt: minTime(rows.map((row) => timeOrNull(row.createdAt))),
                        lastSeenAt: maxTime(rows.map((row) => timeOrNull(row.updatedAt))),
                    });
                }
                if (sub?.[listingVertical]) {
                    signals.push({
                        vertical: listingVertical,
                        source: 'subscription',
                        label: `${listingVertical === 'autos' ? 'Autos' : 'Propiedades'}: suscripcion`,
                        count: 1,
                        firstSeenAt: timeOrNull(sub[listingVertical].createdAt),
                        lastSeenAt: timeOrNull(sub[listingVertical].updatedAt),
                    });
                }
            }
            if (agendaProfile) {
                signals.push({
                    vertical: 'agenda',
                    source: 'agenda_profile',
                    label: 'Agenda: perfil profesional',
                    count: 1,
                    firstSeenAt: timeOrNull(agendaProfile.createdAt),
                    lastSeenAt: timeOrNull(agendaProfile.updatedAt),
                });
            }
            if (serenataClient) {
                signals.push({
                    vertical: 'serenatas',
                    source: 'serenata_client',
                    label: 'Serenatas: cliente',
                    count: 1,
                    firstSeenAt: timeOrNull(serenataClient.createdAt),
                    lastSeenAt: timeOrNull(serenataClient.updatedAt),
                });
            }
            if (serenataMusician) {
                signals.push({
                    vertical: 'serenatas',
                    source: 'serenata_musician',
                    label: 'Serenatas: musico',
                    count: 1,
                    firstSeenAt: timeOrNull(serenataMusician.createdAt),
                    lastSeenAt: timeOrNull(serenataMusician.updatedAt),
                });
            }
            if (serenataOwner) {
                signals.push({
                    vertical: 'serenatas',
                    source: 'serenata_owner',
                    label: 'Serenatas: dueño',
                    count: 1,
                    firstSeenAt: timeOrNull(serenataOwner.createdAt),
                    lastSeenAt: timeOrNull(serenataOwner.updatedAt),
                });
            }

            signals.sort((a, b) => {
                if (a.source === 'signup_app' && b.source !== 'signup_app') return -1;
                if (b.source === 'signup_app' && a.source !== 'signup_app') return 1;
                return (a.firstSeenAt ?? Number.MAX_SAFE_INTEGER) - (b.firstSeenAt ?? Number.MAX_SAFE_INTEGER);
            });

            const likelySignupVertical = primaryPlatform?.vertical
                ?? directSignupVertical
                ?? (user.primaryVertical as VerticalType | null)
                ?? signals[0]?.vertical
                ?? null;
            const verticalConfidence = primaryPlatform || directSignupVertical || user.primaryVertical
                ? 'direct'
                : signals.length > 0
                    ? 'inferred'
                    : 'unknown';
            const hasSerenataProfile = Boolean(serenataClient || serenataMusician || serenataOwner);

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone ?? null,
                role: user.role as UserRole,
                status: user.status as UserStatus,
                primaryVertical: (user.primaryVertical as VerticalType | null) ?? null,
                provider: user.provider ?? null,
                signupApp: user.signupApp ?? null,
                signupOrigin: user.signupOrigin ?? null,
                signupSourceLabel: signupSourceLabel(user.signupApp, user.signupOrigin),
                createdAt: user.createdAt.getTime(),
                lastLoginAt: user.lastLoginAt?.getTime() ?? null,
                totalListings: counters.total,
                agendaListings: agendaProfile ? 1 : 0,
                autosListings: counters.autos,
                propiedadesListings: counters.propiedades,
                likelySignupVertical,
                verticalConfidence,
                verticalSignals: signals,
                platformAccesses,
                primaryPlatform,
                realness: buildRealness({
                    role: user.role,
                    status: user.status,
                    provider: user.provider ?? null,
                    lastLoginAt: user.lastLoginAt,
                    signals,
                    platformAccesses,
                }),
                      serenatas: hasSerenataProfile
                    ? {
                          client: Boolean(serenataClient),
                          musician: Boolean(serenataMusician),
                          owner: Boolean(serenataOwner),
                          instrument: serenataMusician?.instrument ?? null,
                          ownerStatus: serenataOwner?.subscriptionStatus ?? null,
                          trialEndsAt: serenataOwner?.trialEndsAt?.toISOString() ?? null,
                      }
                    : undefined,
                subscriptions: (() => {
                    if (!sub && !agendaProfile) return undefined;
                    const agendaPlan = agendaProfile?.plan === 'pro' ? 'pro' : 'free';
                    const agendaExpired = Boolean(agendaProfile?.planExpiresAt && agendaProfile.planExpiresAt < new Date());
                    return {
                        agenda: agendaProfile
                            ? {
                                  plan: agendaPlan,
                                  status: agendaPlan === 'free' ? 'free' : agendaExpired ? 'expired' : 'active',
                                  expiresAt: agendaProfile.planExpiresAt?.toISOString() ?? null,
                              }
                            : undefined,
                        autos: sub?.autos
                            ? {
                                  planId: sub.autos.planId,
                                  planName: sub.autos.planName,
                                  status: sub.autos.status,
                                  expiresAt: sub.autos.expiresAt?.toISOString() ?? null,
                              }
                            : undefined,
                        propiedades: sub?.propiedades
                            ? {
                                  planId: sub.propiedades.planId,
                                  planName: sub.propiedades.planName,
                                  status: sub.propiedades.status,
                                  expiresAt: sub.propiedades.expiresAt?.toISOString() ?? null,
                              }
                            : undefined,
                        serenatas: sub?.serenatas
                            ? {
                                  planId: sub.serenatas.planId,
                                  planName: sub.serenatas.planName,
                                  status: sub.serenatas.status,
                                  expiresAt: sub.serenatas.expiresAt?.toISOString() ?? null,
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
