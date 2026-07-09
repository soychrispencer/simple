import { describe, expect, it } from 'vitest';
import {
    finalizeIntegrationReturnUrl,
    getIntegrationFallbackReturn,
    getMarketplaceAppOrigin,
    isProductionDeployment,
    resolveIntegrationRequestHost,
    shouldBlockLocalIntegrationRedirects,
} from './app-origin.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from '../instagram/oauth-state.js';

const parseState = (raw: string) => parseInstagramStatePayload(raw, {
    asString: (value) => (typeof value === 'string' ? value : ''),
    parseVertical: (raw) => (raw === 'propiedades' ? 'propiedades' : 'autos'),
});

describe('integration app-origin', () => {
    it('ignora AUTOS_APP_URL localhost en produccion', () => {
        const previous = process.env.AUTOS_APP_URL;
        process.env.AUTOS_APP_URL = 'http://localhost:3000';
        expect(getMarketplaceAppOrigin('autos')).toBe('https://simpleautos.app');
        process.env.AUTOS_APP_URL = previous;
    });

    it('bloquea redirect localhost cuando el api es publico', () => {
        const normalized = finalizeIntegrationReturnUrl(
            'http://localhost:3000/panel/mi-cuenta/integraciones?instagram=error',
            'autos',
            'api.simpleplataforma.app',
        );
        expect(normalized).toContain('https://simpleautos.app/panel/mi-cuenta/integraciones');
        expect(normalized).not.toContain('localhost');
    });

    it('usa host forwarded del request', () => {
        expect(resolveIntegrationRequestHost({
            host: 'api.simpleplataforma.app',
            forwardedHost: 'api.simpleplataforma.app',
        })).toBe('api.simpleplataforma.app');
        expect(shouldBlockLocalIntegrationRedirects('api.simpleplataforma.app')).toBe(true);
    });

    it('parsea state compacto de oauth', () => {
        const payload = makeInstagramStatePayload({
            nonce: 'nonce-1',
            userId: 'user-1',
            vertical: 'autos',
        });
        const parsed = parseState(payload);
        expect(parsed?.userId).toBe('user-1');
        expect(parsed?.returnTo).toBe(getIntegrationFallbackReturn('autos'));
    });

    it('detecta produccion por redirect uri del api', () => {
        const previous = process.env.INSTAGRAM_REDIRECT_URI;
        process.env.INSTAGRAM_REDIRECT_URI = 'https://api.simpleplataforma.app/api/integrations/instagram/callback';
        expect(isProductionDeployment()).toBe(true);
        process.env.INSTAGRAM_REDIRECT_URI = previous;
    });
});
