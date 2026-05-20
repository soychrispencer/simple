import { describe, expect, it } from 'vitest';
import {
    anyWhatsAppCategoryEnabled,
    buildNotificationSaveMessage,
    categoryNotificationPrefsFromUser,
    DEFAULT_CATEGORY_NOTIFICATION_PREFS,
    emailDigestFrequencyFromUser,
    getNotificationCategoryRowsForContext,
    notificationPrefsContextDescription,
    notificationPrefsSnapshotFromUser,
    notificationPrefsSnapshotsEqual,
    notificationPrefsToApiPayload,
    whatsappPhoneValidation,
} from './account-notification-prefs';

describe('categoryNotificationPrefsFromUser', () => {
    it('usa defaults cuando no hay usuario', () => {
        expect(categoryNotificationPrefsFromUser(null)).toEqual(DEFAULT_CATEGORY_NOTIFICATION_PREFS);
    });

    it('mapea correo y WhatsApp por categoría', () => {
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
                whatsappNotifyInvitations: true,
                whatsappNotifyRequests: false,
                whatsappNotifyAgenda: true,
                whatsappNotifyAccount: false,
            }),
        ).toEqual({
            invitations: { email: false, whatsapp: true },
            requests: { email: true, whatsapp: false },
            agenda: { email: false, whatsapp: true },
            account: { email: false, whatsapp: false },
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
        ).toEqual(['requests', 'agenda', 'account']);
    });

    it('dueño: solicitudes y cierre de serenatas por separado', () => {
        const rows = getNotificationCategoryRowsForContext('work', {
            client: null,
            musician: null,
            owner: { id: 'o1' } as never,
        });
        expect(rows.map((r) => r.key)).toEqual(['requests', 'agenda', 'account']);
        expect(rows.find((r) => r.key === 'requests')?.label).toMatch(/Solicitudes/i);
        expect(rows.find((r) => r.key === 'agenda')?.label).toMatch(/Cierre/i);
    });

    it('músico: invitaciones sin fila agenda', () => {
        expect(
            getNotificationCategoryRowsForContext('work', {
                client: null,
                musician: { id: 'm1' } as never,
                owner: null,
            }).map((r) => r.key),
        ).toEqual(['invitations', 'account']);
    });
});

describe('notificationPrefsToApiPayload', () => {
    it('serializa flags por categoría incluyendo solicitudes', () => {
        expect(
            notificationPrefsToApiPayload({
                emailDigestFrequency: 'off',
                categoryPrefs: {
                    invitations: { email: true, whatsapp: false },
                    requests: { email: false, whatsapp: true },
                    agenda: { email: true, whatsapp: false },
                    account: { email: true, whatsapp: false },
                },
            }),
        ).toMatchObject({
            emailNotifyRequests: false,
            whatsappNotifyRequests: true,
            emailNotifyAgenda: true,
        });
    });
});

describe('whatsappPhoneValidation', () => {
    it('exige teléfono si hay WhatsApp en solicitudes', () => {
        const prefs = {
            ...DEFAULT_CATEGORY_NOTIFICATION_PREFS,
            requests: { email: true, whatsapp: true },
        };
        expect(whatsappPhoneValidation(prefs, '')).toMatch(/teléfono/i);
    });
});

describe('getNotificationCategoryRowsForContext account hint', () => {
    it('aclara que verificación y reset siempre se envían', () => {
        const accountRow = getNotificationCategoryRowsForContext('client', {
            client: { id: 'c1' } as never,
            musician: null,
            owner: null,
        }).find((r) => r.key === 'account');
        expect(accountRow?.hint).toMatch(/siempre se envían/i);
        expect(accountRow?.hint).toMatch(/bienvenida/i);
    });
});

describe('notificationPrefsContextDescription', () => {
    it('dueño menciona separación solicitudes/agenda', () => {
        expect(
            notificationPrefsContextDescription('work', {
                client: null,
                musician: null,
                owner: { id: 'o1' } as never,
            }),
        ).toMatch(/independientes/i);
    });
});
