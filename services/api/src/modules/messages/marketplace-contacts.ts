import { and, desc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { follows, listings, savedListings, timelineEvents } from '../../db/schema.js';
import type { MessageServiceDeps, MessageThreadRecord } from './service.js';
import { getMessageThreadFolder } from './service.js';

export type MarketplaceContactSource = 'message' | 'saved' | 'follow';

export type MarketplaceContact = {
    id: string;
    buyerUserId: string;
    displayName: string;
    email: string | null;
    threadCount: number;
    unreadCount: number;
    lastMessageAt: number | null;
    lastListingTitle: string | null;
    lastThreadId: string | null;
    sources: MarketplaceContactSource[];
};

export type MarketplaceContactLead = {
    threadId: string;
    listingId: string | null;
    listingTitle: string | null;
    listingHref: string | null;
    unreadCount: number;
    lastMessageAt: number | null;
    lastMessagePreview: string | null;
    folder: 'inbox' | 'archived' | 'spam';
};

export type MarketplaceContactTimelineEvent = {
    id: string;
    type: string;
    occurredAt: string;
    actor: string;
    subjectKind: string;
    subjectId: string;
    payload: Record<string, unknown> | null;
};

export type MarketplaceContactDetail = {
    contact: MarketplaceContact;
    leads: MarketplaceContactLead[];
    events: MarketplaceContactTimelineEvent[];
};

type ContactAccumulator = {
    buyerUserId: string;
    threads: MessageThreadRecord[];
    sources: Set<MarketplaceContactSource>;
    lastActivityAt: number;
    lastListingTitle: string | null;
    lastThreadId: string | null;
    unreadCount: number;
};

function isListingThread(thread: MessageThreadRecord): boolean {
    return thread.contextType === 'listing' || Boolean(thread.listingId);
}

function toMs(raw: unknown): number {
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

async function loadOwnerListingThreads(
    deps: MessageServiceDeps,
    ownerUserId: string,
    vertical: string,
): Promise<MessageThreadRecord[]> {
    const rows = await deps.db
        .select()
        .from(deps.tables.messageThreads)
        .where(and(
            deps.eq(deps.tables.messageThreads.ownerUserId, ownerUserId),
            deps.eq(deps.tables.messageThreads.vertical, vertical),
            or(
                deps.eq(deps.tables.messageThreads.contextType, 'listing'),
                isNotNull(deps.tables.messageThreads.listingId),
            ),
        ))
        .orderBy(desc(deps.tables.messageThreads.lastMessageAt));

    return rows
        .map(deps.mapMessageThreadRow)
        .filter((thread: MessageThreadRecord) => isListingThread(thread));
}

function listingTitle(deps: MessageServiceDeps, thread: MessageThreadRecord): string | null {
    if (!thread.listingId) return null;
    return deps.listingsById.get(thread.listingId)?.title ?? null;
}

function listingHref(deps: MessageServiceDeps, thread: MessageThreadRecord): string | null {
    if (!thread.listingId) return null;
    return deps.listingsById.get(thread.listingId)?.href ?? null;
}

function ensureAcc(
    map: Map<string, ContactAccumulator>,
    buyerUserId: string,
): ContactAccumulator {
    const existing = map.get(buyerUserId);
    if (existing) return existing;
    const created: ContactAccumulator = {
        buyerUserId,
        threads: [],
        sources: new Set(),
        lastActivityAt: 0,
        lastListingTitle: null,
        lastThreadId: null,
        unreadCount: 0,
    };
    map.set(buyerUserId, created);
    return created;
}

function toContact(deps: MessageServiceDeps, acc: ContactAccumulator): MarketplaceContact {
    const buyer = deps.usersById.get(acc.buyerUserId) ?? null;
    return {
        id: acc.buyerUserId,
        buyerUserId: acc.buyerUserId,
        displayName: buyer?.name?.trim() || buyer?.email || 'Interesado',
        email: buyer?.email ?? null,
        threadCount: acc.threads.length,
        unreadCount: acc.unreadCount,
        lastMessageAt: acc.lastActivityAt || null,
        lastListingTitle: acc.lastListingTitle,
        lastThreadId: acc.lastThreadId,
        sources: Array.from(acc.sources),
    };
}

async function loadEngagementIntoMap(
    deps: MessageServiceDeps,
    ownerUserId: string,
    vertical: 'autos' | 'propiedades',
    map: Map<string, ContactAccumulator>,
): Promise<void> {
    const savedRows = await deps.db
        .select({
            userId: savedListings.userId,
            listingId: savedListings.listingId,
            savedAt: savedListings.savedAt,
            title: listings.title,
        })
        .from(savedListings)
        .innerJoin(listings, eq(listings.id, savedListings.listingId))
        .where(and(
            eq(listings.ownerId, ownerUserId),
            eq(listings.vertical, vertical),
        ))
        .orderBy(desc(savedListings.savedAt));

    for (const row of savedRows) {
        if (!row.userId || row.userId === ownerUserId) continue;
        const acc = ensureAcc(map, row.userId);
        acc.sources.add('saved');
        const at = toMs(row.savedAt);
        if (at >= acc.lastActivityAt) {
            acc.lastActivityAt = at;
            acc.lastListingTitle = row.title ?? acc.lastListingTitle;
        }
    }

    const followRows = await deps.db
        .select({
            followerId: follows.followerId,
            followedAt: follows.followedAt,
        })
        .from(follows)
        .where(and(
            eq(follows.followeeId, ownerUserId),
            eq(follows.vertical, vertical),
        ))
        .orderBy(desc(follows.followedAt));

    for (const row of followRows) {
        if (!row.followerId || row.followerId === ownerUserId) continue;
        const acc = ensureAcc(map, row.followerId);
        acc.sources.add('follow');
        const at = toMs(row.followedAt);
        if (at >= acc.lastActivityAt) {
            acc.lastActivityAt = at;
        }
    }
}

/** Contactos = mensajes + guardados + follows hacia el anunciante. */
export async function listMarketplaceContacts(
    deps: MessageServiceDeps,
    ownerUserId: string,
    vertical: 'autos' | 'propiedades',
    q = '',
): Promise<MarketplaceContact[]> {
    const map = new Map<string, ContactAccumulator>();
    const threads = await loadOwnerListingThreads(deps, ownerUserId, vertical);

    for (const thread of threads) {
        const acc = ensureAcc(map, thread.buyerUserId);
        acc.threads.push(thread);
        acc.sources.add('message');
        if (getMessageThreadFolder(thread, ownerUserId) === 'inbox') {
            acc.unreadCount += Math.max(0, thread.ownerUnreadCount);
        }
        if (thread.lastMessageAt >= acc.lastActivityAt) {
            acc.lastActivityAt = thread.lastMessageAt;
            acc.lastThreadId = thread.id;
            acc.lastListingTitle = listingTitle(deps, thread) ?? acc.lastListingTitle;
        }
    }

    await loadEngagementIntoMap(deps, ownerUserId, vertical, map);

    let items = Array.from(map.values()).map((acc) => toContact(deps, acc));
    items.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));

    const needle = q.trim().toLowerCase();
    if (needle) {
        items = items.filter((item) => {
            const hay = [
                item.displayName,
                item.email ?? '',
                item.lastListingTitle ?? '',
                ...item.sources,
            ].join(' ').toLowerCase();
            return hay.includes(needle);
        });
    }

    return items;
}

async function engagementTableEvents(
    deps: MessageServiceDeps,
    ownerUserId: string,
    vertical: 'autos' | 'propiedades',
    buyerUserId: string,
): Promise<MarketplaceContactTimelineEvent[]> {
    const events: MarketplaceContactTimelineEvent[] = [];

    const savedRows = await deps.db
        .select({
            id: savedListings.id,
            listingId: savedListings.listingId,
            savedAt: savedListings.savedAt,
            title: listings.title,
        })
        .from(savedListings)
        .innerJoin(listings, eq(listings.id, savedListings.listingId))
        .where(and(
            eq(listings.ownerId, ownerUserId),
            eq(listings.vertical, vertical),
            eq(savedListings.userId, buyerUserId),
        ))
        .orderBy(desc(savedListings.savedAt))
        .limit(50);

    for (const row of savedRows) {
        events.push({
            id: `saved:${row.id}`,
            type: 'engagement.saved',
            occurredAt: new Date(toMs(row.savedAt)).toISOString(),
            actor: 'buyer',
            subjectKind: 'listing',
            subjectId: row.listingId,
            payload: { listingId: row.listingId, listingTitle: row.title ?? null, source: 'table' },
        });
    }

    const followRows = await deps.db
        .select({
            id: follows.id,
            followedAt: follows.followedAt,
        })
        .from(follows)
        .where(and(
            eq(follows.followeeId, ownerUserId),
            eq(follows.vertical, vertical),
            eq(follows.followerId, buyerUserId),
        ))
        .limit(5);

    for (const row of followRows) {
        events.push({
            id: `follow:${row.id}`,
            type: 'engagement.followed',
            occurredAt: new Date(toMs(row.followedAt)).toISOString(),
            actor: 'buyer',
            subjectKind: 'public_profile',
            subjectId: ownerUserId,
            payload: { source: 'table' },
        });
    }

    return events;
}

export async function getMarketplaceContactDetail(
    deps: MessageServiceDeps,
    ownerUserId: string,
    vertical: 'autos' | 'propiedades',
    buyerUserId: string,
): Promise<MarketplaceContactDetail | null> {
    const id = decodeURIComponent(buyerUserId).trim();
    if (!id) return null;

    const map = new Map<string, ContactAccumulator>();
    const threads = (await loadOwnerListingThreads(deps, ownerUserId, vertical))
        .filter((thread) => thread.buyerUserId === id);

    for (const thread of threads) {
        const acc = ensureAcc(map, id);
        acc.threads.push(thread);
        acc.sources.add('message');
        if (getMessageThreadFolder(thread, ownerUserId) === 'inbox') {
            acc.unreadCount += Math.max(0, thread.ownerUnreadCount);
        }
        if (thread.lastMessageAt >= acc.lastActivityAt) {
            acc.lastActivityAt = thread.lastMessageAt;
            acc.lastThreadId = thread.id;
            acc.lastListingTitle = listingTitle(deps, thread) ?? acc.lastListingTitle;
        }
    }

    await loadEngagementIntoMap(deps, ownerUserId, vertical, map);
    const acc = map.get(id);
    if (!acc) return null;

    const contact = toContact(deps, acc);

    const leads: MarketplaceContactLead[] = [];
    for (const thread of threads) {
        const entries = await deps.db
            .select()
            .from(deps.tables.messageEntries)
            .where(deps.eq(deps.tables.messageEntries.threadId, thread.id))
            .orderBy(desc(deps.tables.messageEntries.createdAt))
            .limit(1);
        const last = entries[0] ? deps.mapMessageEntryRow(entries[0]) : null;
        leads.push({
            threadId: thread.id,
            listingId: thread.listingId,
            listingTitle: listingTitle(deps, thread),
            listingHref: listingHref(deps, thread),
            unreadCount: Math.max(0, thread.ownerUnreadCount),
            lastMessageAt: thread.lastMessageAt ?? null,
            lastMessagePreview: last?.body?.slice(0, 140) ?? null,
            folder: getMessageThreadFolder(thread, ownerUserId),
        });
    }

    const threadIds = threads.map((thread) => thread.id);
    const subjectFilter = threadIds.length > 0
        ? and(
            eq(timelineEvents.vertical, vertical),
            eq(timelineEvents.subjectKind, 'message_thread'),
            inArray(timelineEvents.subjectId, threadIds),
        )
        : null;
    const personFilter = and(
        eq(timelineEvents.vertical, vertical),
        eq(timelineEvents.personId, id),
    );

    const eventRows = await deps.db
        .select()
        .from(timelineEvents)
        .where(subjectFilter ? or(subjectFilter, personFilter)! : personFilter!)
        .orderBy(desc(timelineEvents.occurredAt))
        .limit(100);

    const seen = new Set<string>();
    const events: MarketplaceContactTimelineEvent[] = [];
    for (const event of eventRows) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        events.push({
            id: event.id,
            type: event.type,
            occurredAt: event.occurredAt instanceof Date
                ? event.occurredAt.toISOString()
                : String(event.occurredAt),
            actor: event.actor,
            subjectKind: event.subjectKind,
            subjectId: event.subjectId,
            payload: event.payload ?? null,
        });
    }

    // Table-backed engagement fills historial even before timeline emits existed.
    for (const event of await engagementTableEvents(deps, ownerUserId, vertical, id)) {
        const dedupeKey = `${event.type}:${event.subjectId}:${event.occurredAt.slice(0, 16)}`;
        if (seen.has(dedupeKey) || seen.has(event.id)) continue;
        // Skip table row if a real timeline event of same type+subject already exists
        const hasTimelineTwin = events.some((existing) => (
            existing.type === event.type
            && existing.subjectId === event.subjectId
        ));
        if (hasTimelineTwin) continue;
        seen.add(event.id);
        events.push(event);
    }

    events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

    return { contact, leads, events };
}
