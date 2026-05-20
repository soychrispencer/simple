import { describe, expect, it } from 'vitest';
import {
    isSerenatasWhatsAppQuietHours,
    resolveNotificationPrefs,
    shouldCreateInAppNotification,
    shouldSendAccountEmail,
    shouldSendAccountWhatsApp,
    shouldSendAgendaEmail,
    shouldSendAgendaWhatsApp,
    shouldSendInvitationEmail,
    shouldSendRequestsEmail,
    shouldSendInvitationWhatsApp,
    shouldSendRequestsWhatsApp,
    shouldSendSerenatasWhatsApp,
    shouldDeferSerenatasEmailForDigest,
} from './user-notification-prefs-policy.js';

const baseRow = {
    id: 'u1',
    email: 'a@test.com',
    phone: '+56912345678',
    emailNotifyAccount: true,
    emailNotifyInvitations: true,
    emailNotifyRequests: true,
    emailNotifyAgenda: true,
    whatsappNotifyInvitations: false,
    whatsappNotifyRequests: false,
    whatsappNotifyAgenda: false,
    whatsappNotifyAccount: false,
    whatsappEnabled: false,
    inAppNotificationsEnabled: true,
    emailDigestFrequency: 'off',
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

    it('shouldCreateInAppNotification siempre permite avisos en panel', () => {
        const prefs = resolveNotificationPrefs({ ...baseRow, inAppNotificationsEnabled: false });
        expect(shouldCreateInAppNotification(prefs)).toBe(true);
        expect(shouldCreateInAppNotification(resolveNotificationPrefs(baseRow))).toBe(true);
        expect(shouldCreateInAppNotification(null)).toBe(true);
    });

    it('WhatsApp por categoría requiere flag y teléfono', () => {
        expect(shouldSendInvitationWhatsApp(resolveNotificationPrefs(baseRow))).toBe(false);
        expect(shouldSendRequestsWhatsApp(resolveNotificationPrefs(baseRow))).toBe(false);
        expect(shouldSendAgendaWhatsApp(resolveNotificationPrefs(baseRow))).toBe(false);

        const requestsOnly = resolveNotificationPrefs({
            ...baseRow,
            whatsappNotifyRequests: true,
        });
        expect(shouldSendRequestsWhatsApp(requestsOnly)).toBe(true);
        expect(shouldSendSerenatasWhatsApp(requestsOnly, 'requests')).toBe(true);
        expect(shouldSendSerenatasWhatsApp(requestsOnly, 'agenda')).toBe(false);

        expect(shouldSendSerenatasWhatsApp(resolveNotificationPrefs({
            ...baseRow,
            whatsappNotifyAgenda: true,
            phone: '  ',
        }), 'agenda')).toBe(false);
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

    it('shouldSendRequestsWhatsApp requiere flag y teléfono', () => {
        expect(shouldSendRequestsWhatsApp(resolveNotificationPrefs(baseRow))).toBe(false);

        const withFlag = resolveNotificationPrefs({
            ...baseRow,
            whatsappNotifyRequests: true,
        });
        expect(shouldSendRequestsWhatsApp(withFlag)).toBe(true);
        expect(shouldSendSerenatasWhatsApp(withFlag, 'requests')).toBe(true);

        const noPhone = resolveNotificationPrefs({
            ...baseRow,
            whatsappNotifyRequests: true,
            phone: null,
        });
        expect(shouldSendRequestsWhatsApp(noPhone)).toBe(false);
    });

    it('shouldSendAccountWhatsApp respeta whatsappNotifyAccount', () => {
        expect(shouldSendAccountWhatsApp(resolveNotificationPrefs(baseRow))).toBe(false);
        const enabled = resolveNotificationPrefs({
            ...baseRow,
            whatsappNotifyAccount: true,
        });
        expect(shouldSendAccountWhatsApp(enabled)).toBe(true);
        expect(shouldSendAccountEmail(enabled)).toBe(true);
        expect(shouldSendAccountEmail(resolveNotificationPrefs({
            ...baseRow,
            emailNotifyAccount: false,
        }))).toBe(false);
    });

    it('resolveNotificationPrefs: legacy whatsappEnabled activa solicitudes', () => {
        const prefs = resolveNotificationPrefs({
            ...baseRow,
            whatsappEnabled: true,
            whatsappNotifyRequests: null,
            whatsappNotifyInvitations: null,
        });
        expect(prefs.whatsappNotifyRequests).toBe(true);
        expect(shouldSendRequestsWhatsApp(prefs)).toBe(true);
    });

    it('shouldDeferSerenatasEmailForDigest no aplaza hasta tener job de resumen', () => {
        const prefs = resolveNotificationPrefs({ ...baseRow, emailDigestFrequency: 'daily' });
        expect(shouldDeferSerenatasEmailForDigest(prefs, 'invitation')).toBe(false);
        expect(shouldDeferSerenatasEmailForDigest(prefs, 'agenda')).toBe(false);
        expect(shouldDeferSerenatasEmailForDigest(resolveNotificationPrefs(baseRow), 'agenda')).toBe(false);
    });

    it('isSerenatasWhatsAppQuietHours detecta franja 22-08 Chile', () => {
        const quiet = new Date('2026-05-19T02:00:00.000Z');
        const active = new Date('2026-05-19T16:00:00.000Z');
        expect(isSerenatasWhatsAppQuietHours(quiet)).toBe(true);
        expect(isSerenatasWhatsAppQuietHours(active)).toBe(false);
    });
});
