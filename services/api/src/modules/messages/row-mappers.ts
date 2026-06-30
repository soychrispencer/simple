import { messageEntries, messageThreads } from '../../db/schema.js';

export type MessageSenderRole = 'buyer' | 'seller' | 'system';

export type MessageThreadRecord = {
    id: string;
    accountId?: string | null;
    vertical: string;
    contextType: string | null;
    contextId: string | null;
    listingId: string | null;
    ownerUserId: string;
    buyerUserId: string;
    ownerUnreadCount: number;
    buyerUnreadCount: number;
    ownerArchivedAt: number | null;
    buyerArchivedAt: number | null;
    ownerSpamAt: number | null;
    buyerSpamAt: number | null;
    lastMessageAt: number;
    createdAt: number;
    updatedAt: number;
};

export type MessageEntryRecord = {
    id: string;
    threadId: string;
    senderUserId: string;
    senderRole: MessageSenderRole;
    body: string;
    createdAt: number;
};

export function mapMessageThreadRow(thread: typeof messageThreads.$inferSelect): MessageThreadRecord {
    return {
        id: thread.id,
        accountId: thread.accountId ?? null,
        vertical: thread.vertical,
        contextType: thread.contextType ?? null,
        contextId: thread.contextId ?? null,
        listingId: thread.listingId ?? null,
        ownerUserId: thread.ownerUserId,
        buyerUserId: thread.buyerUserId,
        ownerUnreadCount: thread.ownerUnreadCount,
        buyerUnreadCount: thread.buyerUnreadCount,
        ownerArchivedAt: thread.ownerArchivedAt?.getTime() ?? null,
        buyerArchivedAt: thread.buyerArchivedAt?.getTime() ?? null,
        ownerSpamAt: thread.ownerSpamAt?.getTime() ?? null,
        buyerSpamAt: thread.buyerSpamAt?.getTime() ?? null,
        lastMessageAt: thread.lastMessageAt.getTime(),
        createdAt: thread.createdAt.getTime(),
        updatedAt: thread.updatedAt.getTime(),
    };
}

export function mapMessageEntryRow(entry: typeof messageEntries.$inferSelect): MessageEntryRecord {
    return {
        id: entry.id,
        threadId: entry.threadId,
        senderUserId: entry.senderUserId,
        senderRole: entry.senderRole as MessageSenderRole,
        body: entry.body,
        createdAt: entry.createdAt.getTime(),
    };
}
