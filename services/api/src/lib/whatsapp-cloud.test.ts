import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    extractWhatsAppButtonActions,
    extractWhatsAppOptOuts,
    isWhatsAppCloudConfigured,
    isWhatsAppWebhookForConfiguredPhoneNumber,
    normalizeWhatsAppRecipient,
    verifyWhatsAppWebhookSignature,
} from './whatsapp-cloud.js';

describe('whatsapp-cloud helpers', () => {
    const envKeys = [
        'WHATSAPP_CLOUD_APP_SECRET',
        'WHATSAPP_APP_SECRET',
        'META_APP_SECRET',
        'WHATSAPP_APP_SECRET_AGENDA',
        'META_APP_SECRET_AGENDA',
        'WHATSAPP_VERIFY_TOKEN',
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
        'WHATSAPP_CLOUD_VERIFY_TOKEN',
        'WHATSAPP_VERIFY_TOKEN_AGENDA',
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN_AGENDA',
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_CLOUD_ACCESS_TOKEN',
        'WHATSAPP_PHONE_NUMBER_ID_AGENDA',
        'WHATSAPP_PHONE_NUMBER_ID',
        'WHATSAPP_CLOUD_PHONE_NUMBER_ID',
        'WHATSAPP_AGENDA_ENABLED',
    ];
    const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

    beforeEach(() => {
        for (const key of envKeys) delete process.env[key];
    });

    afterEach(() => {
        for (const key of envKeys) {
            const value = originalEnv[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('normalizes Chilean and international phone numbers', () => {
        expect(normalizeWhatsAppRecipient('+56 9 8765 4321')).toBe('56987654321');
        expect(normalizeWhatsAppRecipient('987654321')).toBe('56987654321');
        expect(normalizeWhatsAppRecipient('15551234567')).toBe('15551234567');
        expect(normalizeWhatsAppRecipient('123')).toBeNull();
    });

    it('verifies Meta webhook HMAC signature when secret is configured', () => {
        expect(verifyWhatsAppWebhookSignature('{}', 'sha256=' + 'a'.repeat(64))).toBe(false);
        process.env.WHATSAPP_CLOUD_APP_SECRET = 'test-secret-123';
        const payload = '{"object":"whatsapp_business_account"}';
        const sig = `sha256=${createHmac('sha256', 'test-secret-123').update(payload, 'utf8').digest('hex')}`;

        expect(verifyWhatsAppWebhookSignature(payload, sig)).toBe(true);
        expect(verifyWhatsAppWebhookSignature(payload, 'sha256=deadbeef')).toBe(false);
        expect(verifyWhatsAppWebhookSignature(payload, null)).toBe(false);
    });

    it('enables automatic sends only with a feature flag and secure webhook credentials', () => {
        process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
        process.env.WHATSAPP_PHONE_NUMBER_ID_AGENDA = '12345';
        process.env.WHATSAPP_VERIFY_TOKEN_AGENDA = 'verify-test';
        process.env.WHATSAPP_APP_SECRET_AGENDA = 'app-secret-test';

        expect(isWhatsAppCloudConfigured()).toBe(false);
        process.env.WHATSAPP_AGENDA_ENABLED = 'true';
        expect(isWhatsAppCloudConfigured()).toBe(true);
        delete process.env.WHATSAPP_APP_SECRET_AGENDA;
        expect(isWhatsAppCloudConfigured()).toBe(false);
    });

    it('extracts explicit opt-out words without matching ordinary messages', () => {
        const optOuts = extractWhatsAppOptOuts({
            entry: [{ changes: [{ value: { messages: [
                { id: 'wamid.stop', from: '56987654321', type: 'text', text: { body: 'BAJA' } },
                { id: 'wamid.hello', from: '56911112222', type: 'text', text: { body: 'Hola' } },
                { id: 'wamid.free', from: '56933334444', type: 'text', text: { body: 'No quiero recibir más' } },
            ] } }] }],
        });

        expect(optOuts).toEqual([
            { from: '56987654321', messageId: 'wamid.stop' },
            { from: '56933334444', messageId: 'wamid.free' },
        ]);
    });

    it('only accepts webhook events for the configured Agenda sender', () => {
        process.env.WHATSAPP_PHONE_NUMBER_ID_AGENDA = 'agenda-sender';
        const payload = (phoneNumberId: string) => ({
            entry: [{ changes: [{ value: { metadata: { phone_number_id: phoneNumberId } } }] }],
        });

        expect(isWhatsAppWebhookForConfiguredPhoneNumber(payload('agenda-sender'))).toBe(true);
        expect(isWhatsAppWebhookForConfiguredPhoneNumber(payload('other-vertical-sender'))).toBe(false);
        expect(isWhatsAppWebhookForConfiguredPhoneNumber({ entry: [] })).toBe(false);
    });

    it('extracts confirm and cancel quick-reply button payloads', () => {
        const confirmId = '11111111-1111-4111-8111-111111111111';
        const cancelId = '22222222-2222-4222-8222-222222222222';
        const actions = extractWhatsAppButtonActions({
            entry: [
                {
                    changes: [
                        {
                            value: {
                                messages: [
                                    {
                                        id: 'wamid.1',
                                        from: '56987654321',
                                        type: 'button',
                                        button: { payload: `CONFIRM_APPT:${confirmId}` },
                                    },
                                    {
                                        id: 'wamid.2',
                                        from: '56911112222',
                                        type: 'interactive',
                                        interactive: { button_reply: { id: `CANCEL_APPT:${cancelId}` } },
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        });

        expect(actions).toEqual([
            { action: 'confirm', appointmentId: confirmId, from: '56987654321', messageId: 'wamid.1' },
            { action: 'cancel', appointmentId: cancelId, from: '56911112222', messageId: 'wamid.2' },
        ]);
    });
});
