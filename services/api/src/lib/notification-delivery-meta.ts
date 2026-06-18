import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export type NotificationDeliveryChannel = 'email';

export async function touchUserLastNotificationAt(
    userId: string,
    channel: NotificationDeliveryChannel,
    at = new Date(),
): Promise<void> {
    if (channel !== 'email') return;
    await db.update(users).set({ lastNotificationEmailAt: at, updatedAt: at }).where(eq(users.id, userId));
}
