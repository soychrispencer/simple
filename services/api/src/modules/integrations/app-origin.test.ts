import { describe, expect, it } from 'vitest';
import {
    getIntegrationFallbackReturn,
    isProductionDeployment,
    normalizeIntegrationReturnUrl,
    resolveInstagramOAuthState,
    resolveIntegrationConnectOrigin,
} from './app-origin.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from '../instagram/oauth-state.js';

const parseState = (raw: string) => parseInstagramStatePayload(raw, {
    asString: (value) => (typeof value === 'string' ? value : ''),
    parseVertical: (raw) => (raw === 'propiedades' ? 'propiedades' : 'autos'),
});

describe('integration app-origin', () => {
    it('detecta produccion por redirect uri del api', () => {
        const previous = process.env.INSTAGRAM_REDIRECT_URI;
        process.env.INSTAGRAM_REDIRECT_URI = 'https://api.simpleplataforma.app/api/integrations/instagram/callback';
        expect(isProductionDeployment()).toBe(true);
        process.env.INSTAGRAM_REDIRECT_URI = previous;
    });

    it('reemplaza localhost por dominio de produccion en returnTo', () => {
        const previous = process.env.INSTAGRAM_REDIRECT_URI;
        process.env.INSTAGRAM_REDIRECT_URI = 'https://api.simpleplataforma.app/api/integrations/instagram/callback';
        const normalized = normalizeIntegrationReturnUrl(
            'http://localhost:3000/panel/mi-cuenta/integraciones?instagram=error',
            'autos',
        );
        expect(normalized).toContain('https://simpleautos.app/panel/mi-cuenta/integraciones');
        expect(normalized).not.toContain('localhost');
        process.env.INSTAGRAM_REDIRECT_URI = previous;
    });

    it('usa returnTo del parametro state', () => {
        const payload = makeInstagramStatePayload({
            nonce: 'nonce-1',
            userId: 'user-1',
            vertical: 'autos',
            returnTo: 'https://simpleautos.app/panel/mi-cuenta/integraciones',
        });

        const resolved = resolveInstagramOAuthState(payload, '', parseState, (a, b) => a === b);
        expect(resolved?.returnTo).toContain('simpleautos.app');
    });

    it('deriva origin desde returnTo cuando no hay referer', () => {
        const origin = resolveIntegrationConnectOrigin(
            'https://simpleautos.app/panel/mi-cuenta/integraciones',
            'autos',
            null,
        );
        expect(origin).toBe('https://simpleautos.app');
        expect(getIntegrationFallbackReturn('autos')).toContain('simpleautos.app');
    });
});
