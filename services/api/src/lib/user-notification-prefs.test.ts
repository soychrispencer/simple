import { describe, expect, it } from 'vitest';
import {
    resolveNotificationPrefs,
    shouldCreateInAppNotification,
    shouldSendAccountEmail,
    shouldSendAgendaEmail,
    shouldSendInvitationEmail,
    shouldSendRequestsEmail,
} from './user-notification-prefs-policy.js';

const baseRow = {
    id: 'u1',
    email: 'a@test.com',
    phone: '+56912345678',
    emailNotifyAccount: true,
    emailNotifyInvitations: true,
    emailNotifyRequests: true,
    emailNotifyAgenda: true,
    inAppNotificationsEnabled: true,
};

describe('user-notification-prefs', () => {
    it('shouldSend* respeta false explícito', () => {
        const prefs = resolveNotificationPrefs({
            ...baseRow,
            emailNotifyAccount: false,
            emailNotifyInvitations: false,
            emailNotifyAgenda: false,
        });
        expect(shouldSendAccountEmail(prefs)).toBe(false);
        expect(shouldSendInvitationEmail(prefs)).toBe(false);
        expect(shouldSendAgendaEmail(prefs)).toBe(false);
    });

    it('shouldSend* permite cuando flags están en true', () => {
        const prefs = resolveNotificationPrefs(baseRow);
        expect(shouldSendAccountEmail(prefs)).toBe(true);
        expect(shouldSendInvitationEmail(prefs)).toBe(true);
        expect(shouldSendAgendaEmail(prefs)).toBe(true);
    });

    it('shouldCreateInAppNotification respeta inAppNotificationsEnabled', () => {
        const disabled = resolveNotificationPrefs({ ...baseRow, inAppNotificationsEnabled: false });
        expect(shouldCreateInAppNotification(disabled)).toBe(false);
        expect(shouldCreateInAppNotification(resolveNotificationPrefs(baseRow))).toBe(true);
        expect(shouldCreateInAppNotification(null)).toBe(true);
    });

    it('shouldSendRequestsEmail es independiente de agenda', () => {
        const prefs = resolveNotificationPrefs({
            ...baseRow,
            emailNotifyRequests: false,
            emailNotifyAgenda: true,
        });
        expect(shouldSendRequestsEmail(prefs)).toBe(false);
        expect(shouldSendAgendaEmail(prefs)).toBe(true);
    });

    it('resolveNotificationPrefs: emailNotifyRequests null hereda emailNotifyAgenda', () => {
        const prefs = resolveNotificationPrefs({
            ...baseRow,
            emailNotifyRequests: null,
            emailNotifyAgenda: false,
        });
        expect(prefs.emailNotifyRequests).toBe(false);
        expect(shouldSendRequestsEmail(prefs)).toBe(false);
        expect(shouldSendAgendaEmail(prefs)).toBe(false);
    });

    it('resolveNotificationPrefs: defaults en correo cuando columnas son null', () => {
        const prefs = resolveNotificationPrefs({
            ...baseRow,
            emailNotifyAccount: null as unknown as boolean,
            emailNotifyInvitations: null as unknown as boolean,
            emailNotifyRequests: null,
            emailNotifyAgenda: null as unknown as boolean,
        });
        expect(prefs.emailNotifyAccount).toBe(true);
        expect(prefs.emailNotifyInvitations).toBe(true);
        expect(prefs.emailNotifyRequests).toBe(true);
        expect(prefs.emailNotifyAgenda).toBe(true);
        expect(shouldSendRequestsEmail(prefs)).toBe(true);
    });
});
