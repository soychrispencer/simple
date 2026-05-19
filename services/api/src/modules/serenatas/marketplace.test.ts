import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { registerMarketplaceRoutes } from './marketplace.js';

const mockSelectChain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
};

vi.mock('../../db/index.js', () => ({
    db: {
        select: vi.fn(() => mockSelectChain),
        query: {
            serenataProviderGroups: {
                findFirst: vi.fn(),
            },
        },
    },
}));

describe('GET /marketplace/groups', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSelectChain.from.mockReturnValue(mockSelectChain);
        mockSelectChain.where.mockReturnValue(mockSelectChain);
        mockSelectChain.orderBy.mockResolvedValue([]);
    });

    it('devuelve lista vacía cuando no hay grupos activos', async () => {
        const app = new Hono();
        registerMarketplaceRoutes(app, {
            authUser: async () => null,
            jsonError: (c, error, status = 400) => c.json({ ok: false, error }, status),
            ensureClientProfile: async () => ({ id: 'c1', userId: 'u1' }),
            requireOwner: async () => ({ ok: false, response: new Response() }),
            validateOwnerAvailability: async () => null,
        });

        const response = await app.request('/marketplace/groups');
        const body = await response.json() as { ok: boolean; items: unknown[] };

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.items).toEqual([]);
    });
});
