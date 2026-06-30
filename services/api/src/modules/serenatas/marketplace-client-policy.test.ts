import { describe, expect, it, vi, beforeEach } from 'vitest';
import { validateMarketplaceClientRequest } from './marketplace-client-policy.js';

const mockFindFirst = vi.fn();

vi.mock('../../db/index.js', () => ({
    db: {
        query: {
            serenataOwners: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            serenataMusicians: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
        },
    },
}));

describe('validateMarketplaceClientRequest', () => {
    beforeEach(() => {
        mockFindFirst.mockReset();
    });

    it('rechaza cuentas con perfil de dueño', async () => {
        mockFindFirst
            .mockResolvedValueOnce({ id: 'o1', userId: 'u1' })
            .mockResolvedValueOnce(null);

        const result = await validateMarketplaceClientRequest('u1');
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.status).toBe(403);
            expect(result.error).toMatch(/dueño/i);
        }
    });

    it('rechaza cuentas con perfil de músico', async () => {
        mockFindFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'm1', userId: 'u2' });

        const result = await validateMarketplaceClientRequest('u2');
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toMatch(/músico/i);
        }
    });

    it('rechaza solicitar el propio mariachi', async () => {
        mockFindFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        const result = await validateMarketplaceClientRequest('u-owner', {
            ownerUserId: 'u-owner',
            ownerId: 'o1',
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toMatch(/propio mariachi/i);
        }
    });

    it('permite cliente sin perfil de operación', async () => {
        mockFindFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        const result = await validateMarketplaceClientRequest('u-client', {
            ownerUserId: 'u-other',
            ownerId: 'o9',
        });
        expect(result.ok).toBe(true);
    });
});
