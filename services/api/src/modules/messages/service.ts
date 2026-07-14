import { eq, and, or, desc, asc } from 'drizzle-orm';
import type { z } from 'zod';
import type { MessageThreadListingDisplay } from './message-thread-context.js';
import type { MessageEntryRecord, MessageSenderRole, MessageThreadRecord } from './row-mappers.js';
import { agendaAppointments, timelineEvents } from '../../db/schema.js';
import {
    agendaClientPerson,
    emitTimelineEvent,
} from '../platform/timeline-events.js';
import type { TimelineVertical } from '@simple/utils';

export type MessageFolder = 'inbox' | 'archived' | 'spam';
export type { MessageThreadRecord, MessageEntryRecord, MessageSenderRole };

async function resolveTimelineRefsForThread(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
): Promise<{
    businessId: string;
    person: ReturnType<typeof agendaClientPerson> | { id: string; kind: 'user' };
}> {
    if (
        thread.vertical === 'agenda'
        && thread.contextType === 'agenda_appointment'
        && thread.contextId
    ) {
        try {
            const appt = await deps.db.query.agendaAppointments.findFirst({
                where: deps.eq(agendaAppointments.id, thread.contextId),
            });
            if (appt?.professionalId) {
                return {
                    businessId: appt.professionalId,
                    person: agendaClientPerson(appt.clientId) ?? { id: thread.buyerUserId, kind: 'user' },
                };
            }
        } catch (error) {
            console.error('[timeline] resolve agenda message refs failed', error);
        }
    }
    return {
        businessId: thread.ownerUserId,
        person: { id: thread.buyerUserId, kind: 'user' },
    };
}

function emitMessageTimeline(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    type: 'conversation.started' | 'conversation.message_sent' | 'lead.opened',
    actor: 'professional' | 'buyer' | 'client',
    subjectId: string,
    payload?: Record<string, unknown>,
): void {
    void resolveTimelineRefsForThread(deps, thread).then((refs) => {
        const vertical = (['agenda', 'serenatas', 'autos', 'propiedades'].includes(thread.vertical)
            ? thread.vertical
            : 'platform') as TimelineVertical;
        emitTimelineEvent(deps.db, timelineEvents, {
            type,
            business: { vertical, id: refs.businessId },
            person: refs.person,
            subject: { kind: 'message_thread', id: subjectId },
            actor,
            payload: {
                contextType: thread.contextType,
                contextId: thread.contextId,
                listingId: thread.listingId,
                ...payload,
            },
        });
    }).catch((error: unknown) => {
        console.error('[timeline] message emit failed', type, error);
    });
}

export type MessageServiceDeps = {
    db: any;
    eq: typeof eq;
    and: typeof and;
    or: typeof or;
    desc: typeof desc;
    asc: typeof asc;
    tables: {
        messageThreads: any;
        messageEntries: any;
    };
    usersById: Map<string, { id: string; name: string; email: string }>;
    listingsById: Map<string, {
        id: string;
        title: string;
        href: string;
        section: string;
        price: unknown;
        location?: string | null;
    }>;
    formatAgo: (timestamp: number) => string;
    publicSectionLabel: (section: unknown) => string;
    resolveThreadListingDisplay: (thread: MessageThreadRecord) => Promise<MessageThreadListingDisplay | null>;
    mapMessageThreadRow: (row: any) => MessageThreadRecord;
    mapMessageEntryRow: (row: any) => MessageEntryRecord;
};

export function getMessageThreadViewerRole(
    thread: MessageThreadRecord,
    viewerUserId: string,
): 'seller' | 'buyer' {
    return viewerUserId === thread.ownerUserId ? 'seller' : 'buyer';
}

export function getMessageThreadUnreadCount(thread: MessageThreadRecord, viewerUserId: string): number {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerUnreadCount
        : thread.buyerUnreadCount;
}

function isMessageThreadArchived(thread: MessageThreadRecord, viewerUserId: string): boolean {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerArchivedAt != null
        : thread.buyerArchivedAt != null;
}

function isMessageThreadSpam(thread: MessageThreadRecord, viewerUserId: string): boolean {
    return getMessageThreadViewerRole(thread, viewerUserId) === 'seller'
        ? thread.ownerSpamAt != null
        : thread.buyerSpamAt != null;
}

export function getMessageThreadFolder(thread: MessageThreadRecord, viewerUserId: string): MessageFolder {
    if (isMessageThreadSpam(thread, viewerUserId)) return 'spam';
    if (isMessageThreadArchived(thread, viewerUserId)) return 'archived';
    return 'inbox';
}

export async function messageThreadToResponse(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    viewerUserId: string,
    entries: MessageEntryRecord[] = [],
) {
    const listing = thread.listingId
        ? (() => {
            const cached = deps.listingsById.get(thread.listingId!);
            if (!cached) return null;
            return {
                id: cached.id,
                title: cached.title,
                href: cached.href,
                section: cached.section as 'sale' | 'rent' | 'auction' | 'project',
                sectionLabel: deps.publicSectionLabel(cached.section),
                price: String(cached.price ?? ''),
                location: cached.location ?? '',
            };
        })()
        : await deps.resolveThreadListingDisplay(thread);
    const owner = deps.usersById.get(thread.ownerUserId) ?? null;
    const buyer = deps.usersById.get(thread.buyerUserId) ?? null;
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const counterpart = viewerRole === 'seller' ? buyer : owner;
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    const unreadCount = getMessageThreadUnreadCount(thread, viewerUserId);
    const archived = isMessageThreadArchived(thread, viewerUserId);
    const spam = isMessageThreadSpam(thread, viewerUserId);
    const folder = getMessageThreadFolder(thread, viewerUserId);

    return {
        id: thread.id,
        vertical: thread.vertical,
        viewerRole,
        listing: listing ? {
            id: listing.id,
            title: listing.title,
            href: listing.href,
            section: listing.section,
            sectionLabel: listing.sectionLabel,
            price: listing.price,
            location: listing.location ?? '',
        } : null,
        counterpart: counterpart ? {
            id: counterpart.id,
            name: counterpart.name,
            email: counterpart.email,
        } : null,
        unreadCount,
        archived,
        spam,
        folder,
        lastMessageAt: thread.lastMessageAt,
        lastMessageAgo: deps.formatAgo(thread.lastMessageAt),
        lastMessagePreview: lastEntry?.body ?? null,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
    };
}

export function messageEntryToResponse(
    deps: MessageServiceDeps,
    entry: MessageEntryRecord,
    viewerUserId: string,
) {
    const sender = deps.usersById.get(entry.senderUserId) ?? null;
    return {
        id: entry.id,
        threadId: entry.threadId,
        senderRole: entry.senderRole,
        body: entry.body,
        createdAt: entry.createdAt,
        createdAgo: deps.formatAgo(entry.createdAt),
        isMine: entry.senderUserId === viewerUserId,
        sender: sender ? {
            id: sender.id,
            name: sender.name,
            email: sender.email,
        } : null,
    };
}

export async function buildMessageThreadNotification(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    viewerUserId: string,
) {
    if (getMessageThreadFolder(thread, viewerUserId) !== 'inbox' || getMessageThreadUnreadCount(thread, viewerUserId) <= 0) {
        return null;
    }
    const entries = await listMessageEntries(deps, thread.id);
    const lastEntry = entries[entries.length - 1] ?? null;
    const listing = thread.listingId
        ? deps.listingsById.get(thread.listingId) ?? null
        : await deps.resolveThreadListingDisplay(thread);
    const counterpartId = viewerUserId === thread.ownerUserId ? thread.buyerUserId : thread.ownerUserId;
    const counterpart = deps.usersById.get(counterpartId) ?? null;
    return {
        id: `message-thread:${thread.id}`,
        type: 'message_thread' as const,
        title: lastEntry
            ? `${counterpart?.name ?? 'Contacto'} escribió por ${listing?.title ?? 'tu conversación'}.`
            : `Conversación activa por ${listing?.title ?? 'tu solicitud'}.`,
        time: deps.formatAgo(thread.lastMessageAt),
        href: `/panel/mensajes?thread=${encodeURIComponent(thread.id)}`,
        createdAt: thread.lastMessageAt,
    };
}

export async function getMessageThreadById(deps: MessageServiceDeps, id: string): Promise<MessageThreadRecord | null> {
    const rows = await deps.db.select().from(deps.tables.messageThreads).where(deps.eq(deps.tables.messageThreads.id, id)).limit(1);
    if (rows.length === 0) return null;
    return deps.mapMessageThreadRow(rows[0]);
}

export async function getMessageThreadByListingAndBuyer(
    deps: MessageServiceDeps,
    listingId: string,
    buyerUserId: string,
): Promise<MessageThreadRecord | null> {
    const rows = await deps.db
        .select()
        .from(deps.tables.messageThreads)
        .where(and(
            deps.eq(deps.tables.messageThreads.listingId, listingId),
            deps.eq(deps.tables.messageThreads.buyerUserId, buyerUserId),
        ))
        .limit(1);
    if (rows.length === 0) return null;
    return deps.mapMessageThreadRow(rows[0]);
}

export async function getMessageThreadByContext(
    deps: MessageServiceDeps,
    contextType: string,
    contextId: string,
    buyerUserId: string,
): Promise<MessageThreadRecord | null> {
    const rows = await deps.db
        .select()
        .from(deps.tables.messageThreads)
        .where(and(
            deps.eq(deps.tables.messageThreads.contextType, contextType),
            deps.eq(deps.tables.messageThreads.contextId, contextId),
            deps.eq(deps.tables.messageThreads.buyerUserId, buyerUserId),
        ))
        .limit(1);
    if (rows.length === 0) return null;
    return deps.mapMessageThreadRow(rows[0]);
}

export async function listMessageThreadsForUser(
    deps: MessageServiceDeps,
    userId: string,
    vertical?: string,
    folder: MessageFolder = 'inbox',
): Promise<MessageThreadRecord[]> {
    const conditions = [or(
        deps.eq(deps.tables.messageThreads.ownerUserId, userId),
        deps.eq(deps.tables.messageThreads.buyerUserId, userId),
    )];
    if (vertical) {
        conditions.push(deps.eq(deps.tables.messageThreads.vertical, vertical));
    }
    const rows = await deps.db
        .select()
        .from(deps.tables.messageThreads)
        .where(and(...conditions))
        .orderBy(desc(deps.tables.messageThreads.lastMessageAt));
    return rows
        .map(deps.mapMessageThreadRow)
        .filter((thread: MessageThreadRecord) => getMessageThreadFolder(thread, userId) === folder);
}

export async function listMessageEntries(deps: MessageServiceDeps, threadId: string): Promise<MessageEntryRecord[]> {
    const rows = await deps.db
        .select()
        .from(deps.tables.messageEntries)
        .where(deps.eq(deps.tables.messageEntries.threadId, threadId))
        .orderBy(asc(deps.tables.messageEntries.createdAt));
    return rows.map(deps.mapMessageEntryRow);
}

export async function createMessageThread(
    deps: MessageServiceDeps,
    input: {
        vertical: string;
        listingId: string;
        ownerUserId: string;
        buyerUserId: string;
        lastMessageAt?: number;
        ownerUnreadCount?: number;
        buyerUnreadCount?: number;
    },
): Promise<MessageThreadRecord> {
    const now = new Date(input.lastMessageAt ?? Date.now());
    const rows = await deps.db.insert(deps.tables.messageThreads).values({
        vertical: input.vertical,
        contextType: 'listing',
        contextId: input.listingId,
        listingId: input.listingId,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        ownerUnreadCount: input.ownerUnreadCount ?? 0,
        buyerUnreadCount: input.buyerUnreadCount ?? 0,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
    }).returning();
    const thread = deps.mapMessageThreadRow(rows[0]);
    emitMessageTimeline(deps, thread, 'conversation.started', 'buyer', thread.id, { source: 'listing' });
    if (thread.vertical === 'autos' || thread.vertical === 'propiedades') {
        emitMessageTimeline(deps, thread, 'lead.opened', 'buyer', thread.id, { source: 'listing' });
    }
    return thread;
}

export async function createContextMessageThread(
    deps: MessageServiceDeps,
    input: {
        vertical: string;
        contextType: string;
        contextId: string;
        ownerUserId: string;
        buyerUserId: string;
        lastMessageAt?: number;
        ownerUnreadCount?: number;
        buyerUnreadCount?: number;
    },
): Promise<MessageThreadRecord> {
    const now = new Date(input.lastMessageAt ?? Date.now());
    const rows = await deps.db.insert(deps.tables.messageThreads).values({
        vertical: input.vertical,
        contextType: input.contextType,
        contextId: input.contextId,
        listingId: null,
        ownerUserId: input.ownerUserId,
        buyerUserId: input.buyerUserId,
        ownerUnreadCount: input.ownerUnreadCount ?? 0,
        buyerUnreadCount: input.buyerUnreadCount ?? 0,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
    }).returning();
    const thread = deps.mapMessageThreadRow(rows[0]);
    emitMessageTimeline(deps, thread, 'conversation.started', 'buyer', thread.id, {
        source: 'context',
        contextType: input.contextType,
    });
    return thread;
}

export async function createMessageEntry(
    deps: MessageServiceDeps,
    input: {
        threadId: string;
        senderUserId: string;
        senderRole: MessageSenderRole;
        body: string;
        createdAt?: number;
    },
): Promise<MessageEntryRecord> {
    const createdAt = new Date(input.createdAt ?? Date.now());
    const rows = await deps.db.insert(deps.tables.messageEntries).values({
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        body: input.body,
        createdAt,
    }).returning();
    const entry = deps.mapMessageEntryRow(rows[0]);
    void deps.db.query.messageThreads.findFirst({
        where: deps.eq(deps.tables.messageThreads.id, input.threadId),
    }).then((row: any) => {
        if (!row) return;
        const thread = deps.mapMessageThreadRow(row);
        emitMessageTimeline(
            deps,
            thread,
            'conversation.message_sent',
            input.senderRole === 'seller' ? 'professional' : 'buyer',
            input.threadId,
            { entryId: entry.id, senderRole: input.senderRole },
        );
    }).catch((error: unknown) => {
        console.error('[timeline] message entry emit failed', error);
    });
    return entry;
}

async function updateMessageThreadRecord(
    deps: MessageServiceDeps,
    threadId: string,
    updates: Partial<typeof deps.tables.messageThreads.$inferInsert>,
): Promise<MessageThreadRecord> {
    const rows = await deps.db.update(deps.tables.messageThreads).set(updates).where(deps.eq(deps.tables.messageThreads.id, threadId)).returning();
    return deps.mapMessageThreadRow(rows[0]);
}

export async function touchMessageThreadAfterIncomingMessage(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    senderRole: MessageSenderRole,
    timestamp = Date.now(),
): Promise<MessageThreadRecord> {
    const updates: Partial<typeof deps.tables.messageThreads.$inferInsert> = {
        lastMessageAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
    };

    if (senderRole === 'seller') {
        updates.ownerUnreadCount = 0;
        updates.buyerUnreadCount = thread.buyerUnreadCount + 1;
        updates.ownerArchivedAt = null;
        updates.buyerArchivedAt = null;
        updates.ownerSpamAt = null;
    } else {
        updates.ownerUnreadCount = thread.ownerUnreadCount + 1;
        updates.buyerUnreadCount = 0;
        updates.ownerArchivedAt = null;
        updates.buyerArchivedAt = null;
        updates.buyerSpamAt = null;
    }

    return updateMessageThreadRecord(deps, thread.id, updates);
}

export async function markMessageThreadRead(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    viewerUserId: string,
): Promise<MessageThreadRecord> {
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const unreadCount = getMessageThreadUnreadCount(thread, viewerUserId);
    if (unreadCount <= 0) return thread;
    return updateMessageThreadRecord(deps, thread.id, viewerRole === 'seller'
        ? { ownerUnreadCount: 0, updatedAt: new Date() }
        : { buyerUnreadCount: 0, updatedAt: new Date() });
}

export async function updateMessageThreadViewerState(
    deps: MessageServiceDeps,
    thread: MessageThreadRecord,
    viewerUserId: string,
    action: 'read' | 'archive' | 'unarchive' | 'spam' | 'unspam',
): Promise<MessageThreadRecord> {
    const viewerRole = getMessageThreadViewerRole(thread, viewerUserId);
    const now = new Date();
    const updates: Partial<typeof deps.tables.messageThreads.$inferInsert> = {
        updatedAt: now,
    };

    if (viewerRole === 'seller') {
        if (action === 'read') updates.ownerUnreadCount = 0;
        if (action === 'archive') {
            updates.ownerArchivedAt = now;
            updates.ownerSpamAt = null;
        }
        if (action === 'unarchive') updates.ownerArchivedAt = null;
        if (action === 'spam') {
            updates.ownerSpamAt = now;
            updates.ownerArchivedAt = null;
        }
        if (action === 'unspam') updates.ownerSpamAt = null;
    } else {
        if (action === 'read') updates.buyerUnreadCount = 0;
        if (action === 'archive') {
            updates.buyerArchivedAt = now;
            updates.buyerSpamAt = null;
        }
        if (action === 'unarchive') updates.buyerArchivedAt = null;
        if (action === 'spam') {
            updates.buyerSpamAt = now;
            updates.buyerArchivedAt = null;
        }
        if (action === 'unspam') updates.buyerSpamAt = null;
    }

    return updateMessageThreadRecord(deps, thread.id, updates);
}

export function isThreadParticipant(userId: string, thread: MessageThreadRecord): boolean {
    return thread.ownerUserId === userId || thread.buyerUserId === userId;
}
