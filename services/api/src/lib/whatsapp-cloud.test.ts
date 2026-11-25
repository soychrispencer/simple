import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
    extractWhatsAppButtonActions,
    normalizeWhatsAppRecipient,
    verifyWhatsAppWebhookSignature,
} from './whatsapp-cloud.js';

describe('whatsapp-cloud helpers', () => {
    const originalSecret = process.env.WHATSAPP_CLOUD_APP_SECRET;

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.WHATSAPP_CLOUD_APP_SECRET;
        } else {
            process.env.WHATSAPP_CLOUD_APP_SECRET = originalSecret;
        }
    });

    it('normalizes Chilean and international phone numbers', () => {
        expect(normalizeWhatsAppRecipient('+56 9 8765 4321')).toBe('56987654321');
        expect(normalizeWhatsAppRecipient('987654321')).toBe('56987654321');
        expect(normalizeWhatsAppRecipient('15551234567')).toBe('15551234567');
        expect(normalizeWhatsAppRecipient('123')).toBeNull();
    });

    it('verifies Meta webhook HMAC signature when secret is configured', () => {
        process.env.WHATSAPP_CLOUD_APP_SECRET = 'test-secret-123';
        const payload = '{"object":"whatsapp_business_account"}';
        const sig = `sha256=${createHmac('sha256', 'test-secret-123').update(payload, 'utf8').digest('hex')}`;

        expect(verifyWhatsAppWebhookSignature(payload, sig)).toBe(true);
        expect(verifyWhatsAppWebhookSignature(payload, 'sha256=deadbeef')).toBe(false);
        expect(verifyWhatsAppWebhookSignature(payload, null)).toBe(false);
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
