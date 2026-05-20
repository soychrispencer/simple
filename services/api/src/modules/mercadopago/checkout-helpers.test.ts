import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    ensureMercadoPagoSubscriptionReturnUrl,
    isDevMercadoPagoPreapprovalId,
    mercadoPagoSubscriptionOriginEnvName,
} from './checkout-helpers.js';

describe('checkout-helpers subscriptions', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFallback = process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK;
    const originalSerenatasOrigin = process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK = 'true';
        process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS = 'http://localhost:3005';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK = originalFallback;
        process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS = originalSerenatasOrigin;
    });

    it('permite localhost en dev para serenatas', () => {
        const url = ensureMercadoPagoSubscriptionReturnUrl(
            'serenatas',
            'http://localhost:3005/panel/cuenta?account_tab=subscription',
        );
        expect(url).toBe('http://localhost:3005/panel/cuenta?account_tab=subscription');
    });

    it('nombra el env correcto para serenatas', () => {
        expect(mercadoPagoSubscriptionOriginEnvName('serenatas')).toBe('MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS');
    });

    it('detecta preapproval de desarrollo', () => {
        expect(isDevMercadoPagoPreapprovalId('dev-preapproval-ord_123')).toBe(true);
        expect(isDevMercadoPagoPreapprovalId('abc123')).toBe(false);
    });
});
