import type { VerticalType } from '@simple/types';

function normalizeOrigin(value: string | undefined, fallback: string): string {
    return (value?.trim() || fallback).replace(/\/$/, '');
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

export function getIntegrationFallbackReturn(vertical?: VerticalType): string {
    const origin = vertical ? getMarketplaceAppOrigin(vertical) : getDefaultIntegrationOrigin();
    return `${origin}/panel/mi-cuenta/integraciones#integraciones`;
}

export function getDefaultIntegrationOrigin(): string {
    if (process.env.NODE_ENV === 'production') {
        return getMarketplaceAppOrigin('autos');
    }
    return normalizeOrigin(process.env.AUTOS_APP_URL, 'http://localhost:3002');
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
    const fromQuery = parseState(stateParam);
    if (fromQuery) return fromQuery;

    const fromCookie = parseState(cookieRaw);
    if (fromCookie && stateParam && safeEqualStrings(fromCookie.nonce, stateParam)) {
        return fromCookie;
    }

    return fromCookie;
}
