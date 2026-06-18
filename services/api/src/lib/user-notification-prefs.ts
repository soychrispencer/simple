import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
    resolveNotificationPrefs,
    shouldCreateInAppNotification,
    shouldSendAccountEmail,
    shouldSendAgendaEmail,
    shouldSendInvitationEmail,
    shouldSendRequestsEmail,
    type UserNotificationPrefs,
} from './user-notification-prefs-policy.js';

export {
    resolveNotificationPrefs,
    shouldSendAccountEmail,
    shouldSendInvitationEmail,
    shouldSendRequestsEmail,
    shouldSendAgendaEmail,
    shouldCreateInAppNotification,
    type UserNotificationPrefs,
};

const PREFS_COLUMNS = {
    id: true,
    email: true,
    phone: true,
    emailNotifyAccount: true,
    emailNotifyInvitations: true,
    emailNotifyRequests: true,
    emailNotifyAgenda: true,
    inAppNotificationsEnabled: true,
} as const;

export async function getUserNotificationPrefs(userId: string): Promise<UserNotificationPrefs | null> {
    const row = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: PREFS_COLUMNS,
    });
    return row ? resolveNotificationPrefs(row) : null;
}

export async function getUserNotificationPrefsByEmail(email: string): Promise<UserNotificationPrefs | null> {
    const normalized = email.trim().toLowerCase();
    const row = await db.query.users.findFirst({
        where: eq(users.email, normalized),
        columns: PREFS_COLUMNS,
    });
    return row ? resolveNotificationPrefs(row) : null;
}

export async function getUserNotificationPrefsBatch(
    userIds: string[],
): Promise<Map<string, UserNotificationPrefs>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return new Map();

    const rows = await db
        .select({
            id: users.id,
            email: users.email,
            phone: users.phone,
            emailNotifyAccount: users.emailNotifyAccount,
            emailNotifyInvitations: users.emailNotifyInvitations,
            emailNotifyRequests: users.emailNotifyRequests,
            emailNotifyAgenda: users.emailNotifyAgenda,
            inAppNotificationsEnabled: users.inAppNotificationsEnabled,
        })
        .from(users)
        .where(inArray(users.id, unique));

    const map = new Map<string, UserNotificationPrefs>();
    for (const row of rows) {
        map.set(row.id, resolveNotificationPrefs(row));
    }
    return map;
}
