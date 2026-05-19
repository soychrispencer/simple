import type {
    ListingLeadRecord,
    MessageEntryRecord,
    MessageFolder,
    MessageSenderRole,
    MessageThreadRecord,
    ServiceLeadRecord,
    VerticalType,
} from '../../lib/domain-types.js';
import {
    type MessageServiceDeps,
    buildListingLeadNotification as buildListingLeadNotificationFromMessages,
    buildMessageThreadNotification as buildMessageThreadNotificationFromMessages,
    buildServiceLeadNotification as buildServiceLeadNotificationFromMessages,
    createMessageEntry as createMessageEntryFromMessages,
    createMessageThread as createMessageThreadFromMessages,
    getMessageThreadById as getMessageThreadByIdFromMessages,
    getMessageThreadByLeadId as getMessageThreadByLeadIdFromMessages,
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
        messageThreadToResponse: (
            thread: MessageThreadRecord,
            viewerUserId: string,
            entries: MessageEntryRecord[] = [],
        ) => messageThreadToResponseFromMessages(deps, thread, viewerUserId, entries),
        messageEntryToResponse: (entry: MessageEntryRecord, viewerUserId: string) =>
            messageEntryToResponseFromMessages(deps, entry, viewerUserId),
        buildListingLeadNotification: (record: ListingLeadRecord) =>
            buildListingLeadNotificationFromMessages(
                deps,
                record as Parameters<typeof buildListingLeadNotificationFromMessages>[1],
            ),
        buildMessageThreadNotification: (thread: MessageThreadRecord, viewerUserId: string) =>
            buildMessageThreadNotificationFromMessages(deps, thread, viewerUserId),
        buildServiceLeadNotification: (record: ServiceLeadRecord) =>
            buildServiceLeadNotificationFromMessages(
                deps,
                record as Parameters<typeof buildServiceLeadNotificationFromMessages>[1],
            ),
        getMessageThreadById: (id: string) => getMessageThreadByIdFromMessages(deps, id),
        getMessageThreadByLeadId: (leadId: string) => getMessageThreadByLeadIdFromMessages(deps, leadId),
        getMessageThreadByListingAndBuyer: (listingId: string, buyerUserId: string) =>
            getMessageThreadByListingAndBuyerFromMessages(deps, listingId, buyerUserId),
        listMessageThreadsForUser: (
            userId: string,
            vertical?: VerticalType,
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
