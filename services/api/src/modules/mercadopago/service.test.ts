import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
    verifyMercadoPagoWebhookSignature,
    verifyMercadoPagoWebhookSignatureWithSecret,
} from './service.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

function buildSignature(secret: string, dataId: string, requestId: string, ts = '1700000000') {
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
    return { xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, ts };
}

describe('verifyMercadoPagoWebhookSignatureWithSecret', () => {
    it('acepta firma HMAC válida', () => {
        const secret = 'test-webhook-secret';
        const { xSignature, xRequestId, dataId } = buildSignature(secret, '12345', 'req-abc');

        expect(verifyMercadoPagoWebhookSignatureWithSecret(secret, {
            xSignature,
            xRequestId,
            dataId,
        })).toBe(true);
    });

    it('rechaza firma inválida', () => {
        expect(verifyMercadoPagoWebhookSignatureWithSecret('secret', {
            xSignature: 'ts=1,v1=deadbeef',
            xRequestId: 'req',
            dataId: '99',
        })).toBe(false);
    });
});

describe('verifyMercadoPagoWebhookSignature', () => {
    it('rechaza en producción sin secret', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        delete process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED;

        expect(verifyMercadoPagoWebhookSignature({
            xSignature: 'ts=1,v1=abc',
            xRequestId: 'r',
            dataId: '1',
        })).toBe(false);
    });

    it('permite unsigned en dev solo con flag explícita', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        delete process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED;

        expect(verifyMercadoPagoWebhookSignature({
            xSignature: null,
            xRequestId: 'r',
            dataId: '1',
        })).toBe(false);

        process.env.MERCADO_PAGO_WEBHOOK_ALLOW_UNSIGNED = 'true';
        expect(verifyMercadoPagoWebhookSignature({
            xSignature: null,
            xRequestId: 'r',
            dataId: '1',
        })).toBe('unsigned');
    });

    it('usa secret de entorno cuando está configurado', () => {
        const secret = 'env-secret';
        process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
        const { xSignature, xRequestId, dataId } = buildSignature(secret, '42', 'req-42');

        expect(verifyMercadoPagoWebhookSignature({
            xSignature,
            xRequestId,
            dataId,
        })).toBe(true);
    });
});
