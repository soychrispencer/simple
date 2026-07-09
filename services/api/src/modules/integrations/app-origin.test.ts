import { describe, expect, it } from 'vitest';
import {
    getIntegrationFallbackReturn,
    getMarketplaceAppOrigin,
    resolveInstagramOAuthState,
} from './app-origin.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from '../instagram/oauth-state.js';

const parseState = (raw: string) => parseInstagramStatePayload(raw, {
    asString: (value) => (typeof value === 'string' ? value : ''),
    parseVertical: (raw) => (raw === 'propiedades' ? 'propiedades' : 'autos'),
});

describe('integration app-origin', () => {
    it('usa simpleautos.app como fallback de produccion', () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        expect(getIntegrationFallbackReturn('autos')).toContain('https://simpleautos.app/panel/mi-cuenta/integraciones');
        process.env.NODE_ENV = previous;
    });

    it('resuelve estado oauth desde el parametro state', () => {
        const payload = makeInstagramStatePayload({
            nonce: 'nonce-1',
            userId: 'user-1',
            vertical: 'autos',
            returnTo: 'https://simpleautos.app/panel/mi-cuenta/integraciones',
        });

        const resolved = resolveInstagramOAuthState(payload, '', parseState, (a, b) => a === b);
        expect(resolved?.userId).toBe('user-1');
        expect(resolved?.returnTo).toContain('simpleautos.app');
    });

    it('mantiene compatibilidad con cookie + nonce corto', () => {
        const payload = makeInstagramStatePayload({
            nonce: 'nonce-legacy',
            userId: 'user-2',
            vertical: 'propiedades',
            returnTo: 'https://simplepropiedades.app/panel/mi-cuenta/integraciones',
        });

        const resolved = resolveInstagramOAuthState(
            'nonce-legacy',
            payload,
            parseState,
            (a, b) => a === b,
        );

        expect(resolved?.vertical).toBe('propiedades');
        expect(getMarketplaceAppOrigin('propiedades')).toContain('simplepropiedades.app');
    });
});
