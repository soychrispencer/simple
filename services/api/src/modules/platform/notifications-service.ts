import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { platformNotifications } from '../../db/schema.js';
import {
    getUserNotificationPrefsBatch,
    shouldCreateInAppNotification,
} from '../../lib/user-notification-prefs.js';

export type PlatformNotificationInsert = {
    userId: string;
    vertical?: string | null;
    type: string;
    title: string;
    body?: string | null;
    /** @deprecated Use `body` */
    message?: string | null;
    actionUrl?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
};

type DbExecutor = Pick<typeof db, 'insert'>;

export async function insertPlatformNotifications(
    values: PlatformNotificationInsert | PlatformNotificationInsert[],
    options?: { onConflictDoNothing?: boolean; tx?: DbExecutor },
): Promise<void> {
    const list = Array.isArray(values) ? values : [values];
    if (list.length === 0) return;

    const prefsMap = await getUserNotificationPrefsBatch(list.map((row) => row.userId));
    const allowed = list.filter((row) => shouldCreateInAppNotification(prefsMap.get(row.userId)));
    if (allowed.length === 0) return;

    const executor = options?.tx ?? db;
    const query = executor.insert(platformNotifications).values(
        allowed.map((row) => ({
            userId: row.userId,
            vertical: row.vertical ?? null,
            type: row.type,
            title: row.title,
            body: row.body ?? row.message ?? null,
            actionUrl: row.actionUrl ?? null,
            entityType: row.entityType ?? null,
            entityId: row.entityId ?? null,
            metadata: row.metadata ?? null,
        })),
    );

    if (options?.onConflictDoNothing) {
        await query.onConflictDoNothing();
    } else {
        await query;
    }
}

export async function listPlatformNotificationsForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; vertical?: string | null },
) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
    const conditions = [eq(platformNotifications.userId, userId)];
    if (options?.unreadOnly) {
        conditions.push(eq(platformNotifications.isRead, false));
    }
    if (options?.vertical) {
        conditions.push(eq(platformNotifications.vertical, options.vertical));
    }

    return db
        .select()
        .from(platformNotifications)
        .where(and(...conditions))
        .orderBy(desc(platformNotifications.createdAt))
        .limit(limit);
}

export async function markPlatformNotificationRead(userId: string, notificationId: string): Promise<boolean> {
    const rows = await db
        .update(platformNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(platformNotifications.id, notificationId), eq(platformNotifications.userId, userId)))
        .returning({ id: platformNotifications.id });
    return rows.length > 0;
}

export async function markAllPlatformNotificationsRead(userId: string): Promise<number> {
    const rows = await db
        .update(platformNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(platformNotifications.userId, userId), eq(platformNotifications.isRead, false)))
        .returning({ id: platformNotifications.id });
    return rows.length;
}

export async function countUnreadPlatformNotifications(userId: string): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(platformNotifications)
        .where(and(eq(platformNotifications.userId, userId), eq(platformNotifications.isRead, false)));
    return result[0]?.count ?? 0;
}
