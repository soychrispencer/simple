import type {
    MessageEntryRecord,
    MessageSenderRole,
    MessageThreadRecord,
} from './row-mappers.js';
import type { MessageFolder } from './service.js';
import {
    type MessageServiceDeps,
    buildMessageThreadNotification as buildMessageThreadNotificationFromMessages,
    createMessageEntry as createMessageEntryFromMessages,
    createMessageThread as createMessageThreadFromMessages,
    getMessageThreadById as getMessageThreadByIdFromMessages,
    getMessageThreadByListingAndBuyer as getMessageThreadByListingAndBuyerFromMessages,
    isThreadParticipant as isThreadParticipantFromMessages,
    listMessageEntries as listMessageEntriesFromMessages,
    listMessageThreadsForUser as listMessageThreadsForUserFromMessages,
    markMessageThreadRead as markMessageThreadReadFromMessages,
    messageEntryToResponse as messageEntryToResponseFromMessages,
    messageThreadToResponse as messageThreadToResponseFromMessages,
    touchMessageThreadAfterIncomingMessage as touchMessageThreadAfterIncomingMessageFromMessages,
    updateMessageThreadViewerState as updateMessageThreadViewerStateFromMessages,
} from './service.js';

export function createMessageRuntimeBindings(deps: MessageServiceDeps) {
    return {
        messageDeps: deps,
        messageThreadToResponse: (
            thread: MessageThreadRecord,
            viewerUserId: string,
            entries: MessageEntryRecord[] = [],
        ) => messageThreadToResponseFromMessages(deps, thread, viewerUserId, entries),
        messageEntryToResponse: (entry: MessageEntryRecord, viewerUserId: string) =>
            messageEntryToResponseFromMessages(deps, entry, viewerUserId),
        buildMessageThreadNotification: (thread: MessageThreadRecord, viewerUserId: string) =>
            buildMessageThreadNotificationFromMessages(deps, thread, viewerUserId),
        getMessageThreadById: (id: string) => getMessageThreadByIdFromMessages(deps, id),
        getMessageThreadByListingAndBuyer: (listingId: string, buyerUserId: string) =>
            getMessageThreadByListingAndBuyerFromMessages(deps, listingId, buyerUserId),
        listMessageThreadsForUser: (
            userId: string,
            vertical?: string,
            folder: MessageFolder = 'inbox',
        ) => listMessageThreadsForUserFromMessages(deps, userId, vertical, folder),
        listMessageEntries: (threadId: string) => listMessageEntriesFromMessages(deps, threadId),
        createMessageThread: (input: Parameters<typeof createMessageThreadFromMessages>[1]) =>
            createMessageThreadFromMessages(deps, input),
        createMessageEntry: (input: Parameters<typeof createMessageEntryFromMessages>[1]) =>
            createMessageEntryFromMessages(deps, input),
        touchMessageThreadAfterIncomingMessage: (
            thread: MessageThreadRecord,
            senderRole: MessageSenderRole,
            timestamp?: number,
        ) => touchMessageThreadAfterIncomingMessageFromMessages(deps, thread, senderRole, timestamp),
        markMessageThreadRead: (thread: MessageThreadRecord, viewerUserId: string) =>
            markMessageThreadReadFromMessages(deps, thread, viewerUserId),
        updateMessageThreadViewerState: (
            thread: MessageThreadRecord,
            viewerUserId: string,
            action: Parameters<typeof updateMessageThreadViewerStateFromMessages>[3],
        ) => updateMessageThreadViewerStateFromMessages(deps, thread, viewerUserId, action),
        isThreadParticipant: (userId: string, thread: MessageThreadRecord) =>
            isThreadParticipantFromMessages(userId, thread),
    };
}
