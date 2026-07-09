import type { VerticalType } from '@simple/types';
import { isLocalOrigin } from '../../lib/cors.js';

function normalizeOrigin(value: string | undefined, fallback: string): string {
    return (value?.trim() || fallback).replace(/\/$/, '');
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
        case 'serenatas':
            return normalizeOrigin(process.env.SERENATAS_APP_URL, 'https://simpleserenatas.app');
        case 'autos':
        default:
            return normalizeOrigin(process.env.AUTOS_APP_URL, 'https://simpleautos.app');
    }
}

export function getDefaultIntegrationOrigin(): string {
    if (isProductionDeployment()) {
        return getMarketplaceAppOrigin('autos');
    }
    return normalizeOrigin(process.env.AUTOS_APP_URL, 'http://localhost:3002');
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

export function normalizeIntegrationReturnUrl(
    returnTo: string | undefined,
    vertical: VerticalType,
): string {
    const fallback = getIntegrationFallbackReturn(vertical);
    if (!returnTo?.trim()) return fallback;

    try {
        const url = new URL(returnTo);
        if (isLocalOrigin(url.origin) && isProductionDeployment()) {
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

export function resolveIntegrationConnectOrigin(
    returnToRaw: string | undefined,
    vertical: VerticalType,
    browserOrigin: string | null,
): string {
    if (browserOrigin && (!isLocalOrigin(browserOrigin) || !isProductionDeployment())) {
        return browserOrigin;
    }

    if (returnToRaw) {
        try {
            const parsed = new URL(returnToRaw);
            if (!isLocalOrigin(parsed.origin) || !isProductionDeployment()) {
                return parsed.origin;
            }
        } catch {
            // ignore malformed returnTo
        }
    }

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
