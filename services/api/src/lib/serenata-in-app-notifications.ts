import { db } from '../db/index.js';
import { serenataNotifications } from '../db/schema.js';
import {
    getUserNotificationPrefsBatch,
    shouldCreateInAppNotification,
} from './user-notification-prefs.js';

export type SerenataNotificationInsert = {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown> | null;
};

type DbExecutor = Pick<typeof db, 'insert'>;

export async function insertSerenataNotifications(
    values: SerenataNotificationInsert | SerenataNotificationInsert[],
    options?: { onConflictDoNothing?: boolean; tx?: DbExecutor },
): Promise<void> {
    const list = Array.isArray(values) ? values : [values];
    if (list.length === 0) return;

    const prefsMap = await getUserNotificationPrefsBatch(list.map((row) => row.userId));
    const allowed = list.filter((row) => shouldCreateInAppNotification(prefsMap.get(row.userId)));

    if (allowed.length === 0) return;

    const executor = options?.tx ?? db;
    const query = executor.insert(serenataNotifications).values(
        allowed.map((row) => ({
            userId: row.userId,
            type: row.type,
            title: row.title,
            message: row.message,
            metadata: row.metadata ?? null,
        })),
    );

    if (options?.onConflictDoNothing) {
        await query.onConflictDoNothing();
    } else {
        await query;
    }
}
