import { describe, expect, it } from 'vitest';
import {
    buildNotificationSaveMessage,
    categoryNotificationPrefsFromUser,
    DEFAULT_CATEGORY_NOTIFICATION_PREFS,
    getNotificationCategoryRowsForContext,
    getOwnerBusinessNotificationRows,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
} from './account-notification-prefs';

describe('categoryNotificationPrefsFromUser', () => {
    it('usa defaults cuando no hay usuario', () => {
        expect(categoryNotificationPrefsFromUser(null)).toEqual(DEFAULT_CATEGORY_NOTIFICATION_PREFS);
    });

    it('mapea correo por categoría', () => {
        expect(
            categoryNotificationPrefsFromUser({
                id: 'u1',
                email: 'a@b.com',
                name: 'Test',
                status: 'verified',
                emailNotifyInvitations: false,
                emailNotifyRequests: true,
                emailNotifyAgenda: false,
                emailNotifyAccount: false,
            }),
        ).toEqual({
            invitations: { email: false },
            requests: { email: true },
            agenda: { email: false },
            account: { email: false },
        });
    });
});

describe('getNotificationCategoryRowsForContext', () => {
    it('cliente: serenatas y día del evento por separado', () => {
        expect(
            getNotificationCategoryRowsForContext('client', {
                client: { id: 'c1' } as never,
                musician: null,
                owner: null,
            }).map((r) => r.key),
        ).toEqual(['requests', 'agenda']);
    });

    it('dueño en Mi cuenta: sin filas de negocio', () => {
        expect(
            getNotificationCategoryRowsForContext('work', {
                client: null,
                musician: null,
                owner: { id: 'o1' } as never,
            }).map((r) => r.key),
        ).toEqual([]);
    });

    it('músico: invitaciones sin fila agenda', () => {
        expect(
            getNotificationCategoryRowsForContext('work', {
                client: null,
                musician: { id: 'm1' } as never,
                owner: null,
            }).map((r) => r.key),
        ).toEqual(['invitations']);
    });
});

describe('getOwnerBusinessNotificationRows', () => {
    it('incluye solicitudes y cierre para Mi negocio', () => {
        expect(getOwnerBusinessNotificationRows().map((r) => r.key)).toEqual(['requests', 'agenda']);
    });
});

describe('notificationPrefsToApiPayload', () => {
    it('envía solo flags de correo e in-app', () => {
        const snapshot = notificationPrefsSnapshotFromUser({
            id: 'u1',
            email: 'a@b.com',
            name: 'Test',
            status: 'verified',
            emailNotifyInvitations: true,
            emailNotifyRequests: false,
            emailNotifyAgenda: true,
            emailNotifyAccount: false,
            inAppNotificationsEnabled: true,
        });
        expect(notificationPrefsToApiPayload(snapshot, '+56912345678', true)).toEqual({
            emailNotifyInvitations: true,
            emailNotifyRequests: false,
            emailNotifyAgenda: true,
            emailNotifyAccount: false,
            inAppNotificationsEnabled: true,
            phone: '+56912345678',
        });
    });
});

describe('notificationPrefsSnapshotsEqual', () => {
    it('detecta cambios en correo por categoría', () => {
        const before = notificationPrefsSnapshotFromUser(null);
        const after = {
            categoryPrefs: {
                ...before.categoryPrefs,
                requests: { email: false },
            },
        };
        expect(notificationPrefsSnapshotsEqual(before, before)).toBe(true);
        expect(notificationPrefsSnapshotsEqual(before, after)).toBe(false);
    });
});

describe('buildNotificationSaveMessage', () => {
    it('resume cambios de correo', () => {
        const before = notificationPrefsSnapshotFromUser(null);
        const after = {
            categoryPrefs: {
                ...before.categoryPrefs,
                requests: { email: false },
            },
        };
        expect(buildNotificationSaveMessage(before, after)).toContain('correo desactivado');
    });
});
