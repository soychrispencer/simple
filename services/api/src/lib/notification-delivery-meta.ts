import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export type NotificationDeliveryChannel = 'email' | 'whatsapp';

export async function touchUserLastNotificationAt(
    userId: string,
    channel: NotificationDeliveryChannel,
    at = new Date(),
): Promise<void> {
    const patch =
        channel === 'email'
            ? { lastNotificationEmailAt: at, updatedAt: at }
            : { lastNotificationWhatsappAt: at, updatedAt: at };
    await db.update(users).set(patch).where(eq(users.id, userId));
}
