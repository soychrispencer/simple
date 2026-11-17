import type { ListingVerticalType } from '@simple/types';
import { notifyMessageThreadActivity } from './thread-notifications.js';
import type { MessageEntryRecord, MessageThreadRecord } from './row-mappers.js';
import type { MessageServiceDeps } from './service.js';
import {
    createMessageEntry,
    createMessageThread,
    getMessageThreadByListingAndBuyer,
    touchMessageThreadAfterIncomingMessage,
} from './service.js';

type ListingRef = {
    id: string;
    accountId?: string | null;
    ownerId: string;
    vertical: ListingVerticalType;
    title: string;
};

type BuyerRef = {
    id: string;
    name: string;
};

export async function createOrAppendListingConversation(
    deps: MessageServiceDeps,
    input: {
        listing: ListingRef;
        buyer: BuyerRef;
        message: string;
    },
): Promise<{
    thread: MessageThreadRecord;
    entry: MessageEntryRecord;
    createdThread: boolean;
}> {
    const body = input.message.trim();
    if (!body) {
        throw new Error('El mensaje no puede estar vacío.');
    }

    const existingThread = await getMessageThreadByListingAndBuyer(deps, input.listing.id, input.buyer.id);
    const now = Date.now();

    if (existingThread) {
        const entry = await createMessageEntry(deps, {
            threadId: existingThread.id,
            senderUserId: input.buyer.id,
            senderRole: 'buyer',
            body,
            createdAt: now,
        });
        const thread = await touchMessageThreadAfterIncomingMessage(deps, existingThread, 'buyer', now);
        void notifyListingMessage(input, thread, body, false);
        return { thread, entry, createdThread: false };
    }

    const thread = await createMessageThread(deps, {
        vertical: input.listing.vertical,
        listingId: input.listing.id,
        accountId: input.listing.accountId,
        ownerUserId: input.listing.ownerId,
        buyerUserId: input.buyer.id,
        ownerUnreadCount: 1,
        buyerUnreadCount: 0,
        lastMessageAt: now,
    });
    const entry = await createMessageEntry(deps, {
        threadId: thread.id,
        senderUserId: input.buyer.id,
        senderRole: 'buyer',
        body,
        createdAt: now,
    });
    void notifyListingMessage(input, thread, body, true);
    return { thread, entry, createdThread: true };
}

async function notifyListingMessage(
    input: { listing: ListingRef; buyer: BuyerRef },
    thread: MessageThreadRecord,
    message: string,
    isNew: boolean,
) {
    await notifyMessageThreadActivity({
        recipientUserId: input.listing.ownerId,
        vertical: input.listing.vertical,
        threadId: thread.id,
        senderUserId: input.buyer.id,
        contextTitle: input.listing.title,
        preview: message,
        isNewThread: isNew,
        accountId: input.listing.accountId ?? null,
    });
}
