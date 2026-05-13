import {
    fetchMessageThreadDetail as fetchMessageThreadDetailForVertical,
    fetchMessageThreads as fetchMessageThreadsForVertical,
    sendThreadMessage as sendThreadMessageForVertical,
    updateMessageThreadState as updateMessageThreadStateForVertical,
    type MessageEntry,
    type MessageThread,
    type ThreadLead,
} from '@simple/utils';

const VERTICAL = 'autos';

export type { MessageEntry, MessageThread, ThreadLead };

export function fetchMessageThreads(folder: MessageThread['folder'] = 'inbox'): Promise<MessageThread[]> {
    return fetchMessageThreadsForVertical(VERTICAL, folder);
}

export function fetchMessageThreadDetail(
    threadId: string
): Promise<{ item: MessageThread; entries: MessageEntry[]; lead: ThreadLead | null } | null> {
    return fetchMessageThreadDetailForVertical(VERTICAL, threadId);
}

export function sendThreadMessage(
    threadId: string,
    body: string
): Promise<{ ok: boolean; item?: MessageThread; entry?: MessageEntry; lead?: ThreadLead | null; error?: string }> {
    return sendThreadMessageForVertical(VERTICAL, threadId, body);
}

export function updateMessageThreadState(
    threadId: string,
    action: 'read' | 'archive' | 'unarchive' | 'spam' | 'unspam'
): Promise<{ ok: boolean; item?: MessageThread; error?: string }> {
    return updateMessageThreadStateForVertical(VERTICAL, threadId, action);
}
