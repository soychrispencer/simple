import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userNotificationLog } from '../db/schema.js';

export type UserNotificationLogChannel = 'email' | 'whatsapp';

export async function logUserNotificationDelivery(
    userId: string,
    channel: UserNotificationLogChannel,
    eventType: string,
    summary: string,
): Promise<void> {
    try {
        await db.insert(userNotificationLog).values({
            userId,
            channel,
            eventType: eventType.slice(0, 60),
            summary: summary.slice(0, 255),
        });
    } catch (error) {
        console.error('[user-notification-log] insert failed', { userId, channel, eventType, error });
    }
}

export async function getRecentUserNotificationLogs(userId: string, limit = 5) {
    return db
        .select({
            id: userNotificationLog.id,
            channel: userNotificationLog.channel,
            eventType: userNotificationLog.eventType,
            summary: userNotificationLog.summary,
            createdAt: userNotificationLog.createdAt,
        })
        .from(userNotificationLog)
        .where(eq(userNotificationLog.userId, userId))
        .orderBy(desc(userNotificationLog.createdAt))
        .limit(limit);
}
