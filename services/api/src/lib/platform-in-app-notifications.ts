import { insertPlatformNotifications, type PlatformNotificationInsert } from '../modules/platform/notifications-service.js';

export type InAppNotificationInsert = PlatformNotificationInsert;

export async function insertInAppNotifications(
    values: InAppNotificationInsert | InAppNotificationInsert[],
    options?: Parameters<typeof insertPlatformNotifications>[1],
): Promise<void> {
    await insertPlatformNotifications(values, options);
}
