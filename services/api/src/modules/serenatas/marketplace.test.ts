import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { filterMarketplaceProviderGroups, registerMarketplaceRoutes } from './marketplace.js';

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

describe('filterMarketplaceProviderGroups', () => {
    const row = (overrides: Record<string, unknown>) => ({
        id: 'g1',
        ownerUserId: 'u1',
        ownerId: null,
        name: 'Test',
        slug: 'test',
        description: null,
        logoUrl: null,
        coverUrl: null,
        phone: null,
        whatsapp: null,
        region: 'Región Metropolitana',
        comunaBase: 'Santiago',
        serviceComunas: ['Providencia'],
        status: 'active',
        isVerified: false,
        ratingAverage: '0',
        ratingCount: 0,
        slaHours: 24,
        bookingMode: 'manual',
        bufferMinutes: 0,
        requiresAdvancePayment: false,
        advancePaymentInstructions: null,
        acceptsCash: true,
        acceptsTransfer: false,
        acceptsMp: false,
        acceptsPaymentLink: false,
        paymentLinkUrl: null,
        bankTransferData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    }) as Parameters<typeof filterMarketplaceProviderGroups>[0][number];

    it('filtra por comuna listada', () => {
        const items = filterMarketplaceProviderGroups([row({})], { comuna: 'Providencia' });
        expect(items).toHaveLength(1);
        expect(filterMarketplaceProviderGroups([row({})], { comuna: 'Maipú' })).toHaveLength(0);
    });

    it('usa comuna base cuando no hay zonas publicadas', () => {
        const items = filterMarketplaceProviderGroups([
            row({ serviceComunas: [], comunaBase: 'Santiago' }),
        ], { comuna: 'Santiago' });
        expect(items).toHaveLength(1);
        expect(filterMarketplaceProviderGroups([
            row({ serviceComunas: [], comunaBase: 'Santiago' }),
        ], { comuna: 'Maipú' })).toHaveLength(0);
    });
});

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
