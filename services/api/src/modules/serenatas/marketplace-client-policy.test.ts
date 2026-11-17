import { describe, expect, it } from 'vitest';
import { validateMarketplaceClientRequest } from './marketplace-client-policy.js';

describe('validateMarketplaceClientRequest', () => {
    it('permite contratar a otro mariachi aunque la persona tenga perfil profesional', async () => {
        const result = await validateMarketplaceClientRequest('u-professional', {
            ownerUserId: 'u-other',
            ownerId: 'o-other',
        });

        expect(result).toEqual({ ok: true });
    });

    it('rechaza solicitar el propio mariachi', async () => {
        const result = await validateMarketplaceClientRequest('u-owner', {
            ownerUserId: 'u-owner',
            ownerId: 'o1',
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.status).toBe(403);
            expect(result.error).toMatch(/propio mariachi/i);
        }
    });

    it('permite iniciar una solicitud antes de resolver el grupo', async () => {
        const result = await validateMarketplaceClientRequest('u-client');
        expect(result).toEqual({ ok: true });
    });
});
