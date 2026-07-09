import type { VerticalType } from '@simple/types';
import { isLocalOrigin } from '../../lib/cors.js';

function normalizeOrigin(value: string | undefined, fallback: string): string {
    const candidate = value?.trim();
    const safeFallback = fallback.replace(/\/$/, '');

    if (!candidate || candidate === 'undefined' || candidate === 'null') {
        return safeFallback;
    }

    try {
        const origin = new URL(candidate).origin;
        if (isLocalOrigin(origin) && !isLocalOrigin(safeFallback)) {
            return safeFallback;
        }
        return origin;
    } catch {
        return safeFallback;
    }
}

export function isProductionDeployment(): boolean {
    if (process.env.NODE_ENV === 'production') return true;
    const hints = [
        process.env.INSTAGRAM_REDIRECT_URI,
        process.env.TIKTOK_REDIRECT_URI,
        process.env.API_PUBLIC_URL,
        process.env.API_BASE_URL,
    ].filter(Boolean).join(' ');
    return /simpleplataforma\.app/i.test(hints);
}

export function getMarketplaceAppOrigin(vertical: VerticalType): string {
    switch (vertical) {
        case 'propiedades':
            return normalizeOrigin(process.env.PROPIEDADES_APP_URL, 'https://simplepropiedades.app');
        case 'agenda':
            return normalizeOrigin(process.env.AGENDA_APP_URL, 'https://simpleagenda.app');
        case 'autos':
        default:
            return normalizeOrigin(process.env.AUTOS_APP_URL, 'https://simpleautos.app');
    }
}

export function getDefaultIntegrationOrigin(): string {
    return getMarketplaceAppOrigin('autos');
}

export function getIntegrationFallbackReturn(vertical: VerticalType = 'autos'): string {
    return `${getMarketplaceAppOrigin(vertical)}/panel/mi-cuenta/integraciones#integraciones`;
}

export function decodeOAuthStateParam(raw: string): string {
    if (!raw) return '';
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export function shouldBlockLocalIntegrationRedirects(requestHost: string): boolean {
    const host = requestHost.trim().toLowerCase().split(':')[0] ?? '';
    return host !== 'localhost' && host !== '127.0.0.1';
}

export function finalizeIntegrationReturnUrl(
    returnTo: string | undefined,
    vertical: VerticalType,
    requestHost: string,
): string {
    const fallback = getIntegrationFallbackReturn(vertical);
    const candidate = returnTo?.trim() || fallback;

    try {
        const url = new URL(candidate);
        if (shouldBlockLocalIntegrationRedirects(requestHost) && isLocalOrigin(url.origin)) {
            const canonical = new URL(fallback);
            canonical.pathname = url.pathname || canonical.pathname;
            canonical.search = url.search;
            canonical.hash = url.hash || '#integraciones';
            return canonical.toString();
        }
        if (!url.hash) url.hash = '#integraciones';
        return url.toString();
    } catch {
        return fallback;
    }
}

export function normalizeIntegrationReturnUrl(
    returnTo: string | undefined,
    vertical: VerticalType,
): string {
    return finalizeIntegrationReturnUrl(returnTo, vertical, isProductionDeployment() ? 'api.simpleplataforma.app' : 'localhost');
}

export function resolveIntegrationConnectOrigin(
    vertical: VerticalType,
): string {
    return getMarketplaceAppOrigin(vertical);
}

export function resolveInstagramOAuthState(
    stateParam: string,
    cookieRaw: string,
    parseState: (value: string) => {
        nonce: string;
        userId: string;
        vertical: VerticalType;
        returnTo: string;
    } | null,
    safeEqualStrings: (a: string, b: string) => boolean,
) {
    const decodedStateParam = decodeOAuthStateParam(stateParam);
    const fromQuery = parseState(decodedStateParam);
    if (fromQuery) return fromQuery;

    const fromCookie = parseState(cookieRaw);
    if (fromCookie && decodedStateParam && safeEqualStrings(fromCookie.nonce, decodedStateParam)) {
        return fromCookie;
    }

    return fromCookie;
}

export function resolveIntegrationRequestHost(headers: {
    host?: string | null;
    forwardedHost?: string | null;
}): string {
    return (headers.forwardedHost || headers.host || '').trim();
}
