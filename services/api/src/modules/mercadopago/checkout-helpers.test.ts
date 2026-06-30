import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    ensureMercadoPagoSubscriptionReturnUrl,
    isDevMercadoPagoPreapprovalId,
    mercadoPagoDevCheckoutFallbackAllowedForKind,
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

    it('en dev conserva el origin del cliente aunque exista MERCADO_PAGO_PUBLIC_ORIGIN_*', () => {
        const url = ensureMercadoPagoSubscriptionReturnUrl(
            'autos',
            'http://localhost:3002/panel/mi-cuenta/suscripcion',
        );
        expect(url).toBe('http://localhost:3002/panel/mi-cuenta/suscripcion');
    });

    it('en dev no reescribe serenatas hacia otro puerto', () => {
        const url = ensureMercadoPagoSubscriptionReturnUrl(
            'serenatas',
            'http://127.0.0.1:3005/panel/mi-cuenta?account_tab=subscription',
        );
        expect(url).toBe('http://127.0.0.1:3005/panel/mi-cuenta?account_tab=subscription');
    });

    it('nombra el env correcto para serenatas', () => {
        expect(mercadoPagoSubscriptionOriginEnvName('serenatas')).toBe('MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS');
    });

    it('detecta preapproval de desarrollo', () => {
        expect(isDevMercadoPagoPreapprovalId('dev-preapproval-ord_123')).toBe(true);
        expect(isDevMercadoPagoPreapprovalId('abc123')).toBe(false);
    });

    it('permite fallback dev para suscripciones en marketplace', () => {
        expect(mercadoPagoDevCheckoutFallbackAllowedForKind('subscription')).toBe(true);
        expect(mercadoPagoDevCheckoutFallbackAllowedForKind('boost')).toBe(true);
        expect(mercadoPagoDevCheckoutFallbackAllowedForKind('unknown')).toBe(false);
    });
});
