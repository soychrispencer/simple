import type { VerticalType } from '@simple/types';
import { asString } from '../shared/helpers.js';

export type MercadoPagoCheckoutOrderStatus = 'pending' | 'approved' | 'authorized' | 'rejected' | 'cancelled';
export type MercadoPagoCheckoutVertical = VerticalType | 'serenatas';

export function parseMercadoPagoPaymentStatus(status: string): MercadoPagoCheckoutOrderStatus {
    if (status === 'approved') return 'approved';
    if (status === 'authorized') return 'authorized';
    if (status === 'cancelled' || status === 'cancelled_by_user') return 'cancelled';
    if (status === 'rejected' || status === 'refunded' || status === 'charged_back') return 'rejected';
    return 'pending';
}

export function parseMercadoPagoPreapprovalStatus(status: string): MercadoPagoCheckoutOrderStatus {
    if (status === 'authorized') return 'authorized';
    if (status === 'paused') return 'pending';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

export function appendCheckoutParams(url: string, params: Record<string, string>): string {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        target.searchParams.set(key, value);
    }
    return target.toString();
}

export function isLocalHostname(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    return normalized === 'localhost'
        || normalized === '127.0.0.1'
        || normalized === '0.0.0.0'
        || normalized === '::1'
        || normalized.endsWith('.local');
}

export function getMercadoPagoPublicOrigin(vertical: MercadoPagoCheckoutVertical): string {
    if (vertical === 'autos') {
        return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
    }
    if (vertical === 'agenda') {
        return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_AGENDA) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
    }
    if (vertical === 'serenatas') {
        return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
    }
    return asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN);
}

export function resolveMercadoPagoReturnUrl(vertical: MercadoPagoCheckoutVertical, rawReturnUrl: string): string {
    const target = new URL(rawReturnUrl);
    const overrideOrigin = getMercadoPagoPublicOrigin(vertical);
    if (!overrideOrigin) return target.toString();

    const publicOrigin = new URL(overrideOrigin);
    target.protocol = publicOrigin.protocol;
    target.host = publicOrigin.host;
    return target.toString();
}

export function buildMercadoPagoCheckoutBackUrls(
    appendCheckoutParams: (url: string, params: Record<string, string>) => string,
    returnUrl: string,
    orderId: string,
    kind: string,
): { success: string; failure: string; pending: string } {
    return {
        success: appendCheckoutParams(returnUrl, { checkout: 'success', purchaseId: orderId, kind }),
        failure: appendCheckoutParams(returnUrl, { checkout: 'failure', purchaseId: orderId, kind }),
        pending: appendCheckoutParams(returnUrl, { checkout: 'pending', purchaseId: orderId, kind }),
    };
}

export function resolveMercadoPagoPreferenceCheckoutUrl(
    preference: { initPoint?: string | null; sandboxInitPoint?: string | null } | null | undefined,
): string | null {
    return preference?.initPoint ?? preference?.sandboxInitPoint ?? null;
}

export function mercadoPagoDevCheckoutFallbackEnabled(): boolean {
    return process.env.NODE_ENV !== 'production'
        && process.env.MERCADO_PAGO_DEV_CHECKOUT_FALLBACK !== 'false';
}

export function mercadoPagoSubscriptionOriginEnvName(vertical: MercadoPagoCheckoutVertical): string {
    if (vertical === 'autos') return 'MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS';
    if (vertical === 'agenda') return 'MERCADO_PAGO_PUBLIC_ORIGIN_AGENDA';
    if (vertical === 'serenatas') return 'MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS';
    return 'MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES';
}

export function isDevMercadoPagoPreapprovalId(preapprovalId: string): boolean {
    return preapprovalId.startsWith('dev-preapproval-');
}

export function ensureMercadoPagoSubscriptionReturnUrl(vertical: MercadoPagoCheckoutVertical, rawReturnUrl: string): string {
    const resolved = resolveMercadoPagoReturnUrl(vertical, rawReturnUrl);
    if (mercadoPagoDevCheckoutFallbackEnabled()) {
        return resolved;
    }

    const target = new URL(resolved);
    if (target.protocol !== 'https:' || isLocalHostname(target.hostname)) {
        const envName = mercadoPagoSubscriptionOriginEnvName(vertical);
        throw new Error(
            `Mercado Pago suscripciones requiere una URL publica HTTPS. `
            + `Configura ${envName} en services/api/.env con tu URL publica (por ejemplo ngrok o Cloudflare Tunnel).`,
        );
    }

    return resolved;
}
