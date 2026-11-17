import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import {
    insertPlatformNotifications,
    resolveActiveAccountNotificationRecipient,
} from '../platform/notifications-service.js';

async function userLabel(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true, email: true },
    });
    return row?.name?.trim() || row?.email || 'Contacto';
}

export async function notifyMessageThreadActivity(input: {
    recipientUserId: string;
    vertical: string;
    threadId: string;
    senderUserId: string;
    contextTitle: string;
    preview: string;
    isNewThread: boolean;
    accountId?: string | null;
}): Promise<void> {
    const senderName = await userLabel(input.senderUserId);
    const threadUrl = `/panel/mensajes?thread=${encodeURIComponent(input.threadId)}`;
    const notification = {
        userId: input.recipientUserId,
        vertical: input.vertical,
        type: input.isNewThread ? 'message_thread.created' : 'message_thread.message',
        title: input.isNewThread
            ? `${senderName} inició una conversación por ${input.contextTitle}.`
            : `${senderName} escribió por ${input.contextTitle}.`,
        body: input.preview.slice(0, 120),
        actionUrl: threadUrl,
        entityType: 'message_thread',
        entityId: input.threadId,
        metadata: input.accountId ? { accountId: input.accountId } : null,
    };

    if (!input.accountId) {
        await insertPlatformNotifications(notification);
        return;
    }

    await db.transaction(async (tx) => {
        const userId = await resolveActiveAccountNotificationRecipient(
            tx,
            input.accountId!,
            [input.recipientUserId],
        );
        if (!userId) return;
        await insertPlatformNotifications({ ...notification, userId }, { tx });
    });
}
