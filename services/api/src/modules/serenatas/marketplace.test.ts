import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
    filterMarketplaceProviderGroups,
    parseMarketplaceCatalogDate,
    parseMarketplaceGroupSort,
    parseMarketplaceGroupsPagination,
    registerMarketplaceRoutes,
    sortMarketplaceProviderGroupRows,
} from './marketplace.js';

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

const marketplaceGroupRow = (overrides: Record<string, unknown>) => ({
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

describe('filterMarketplaceProviderGroups', () => {
    it('filtra por comuna listada', () => {
        const items = filterMarketplaceProviderGroups([marketplaceGroupRow({})], { comuna: 'Providencia' });
        expect(items).toHaveLength(1);
        expect(filterMarketplaceProviderGroups([marketplaceGroupRow({})], { comuna: 'Maipú' })).toHaveLength(0);
    });

    it('filtra por nombre parcial sin distinguir mayúsculas ni tildes', () => {
        const items = filterMarketplaceProviderGroups([
            marketplaceGroupRow({ name: 'Mariachi Los Charros', slug: 'los-charros' }),
            marketplaceGroupRow({ id: 'g2', name: 'Trío Central', slug: 'trio-central' }),
        ], { q: 'charro' });
        expect(items).toHaveLength(1);
        expect(items[0]?.name).toBe('Mariachi Los Charros');
        expect(filterMarketplaceProviderGroups([
            marketplaceGroupRow({ name: 'Mariachi Los Charros' }),
        ], { q: 'mariachi central' })).toHaveLength(0);
    });

    it('usa comuna base cuando no hay zonas publicadas', () => {
        const items = filterMarketplaceProviderGroups([
            marketplaceGroupRow({ serviceComunas: [], comunaBase: 'Santiago' }),
        ], { comuna: 'Santiago' });
        expect(items).toHaveLength(1);
        expect(filterMarketplaceProviderGroups([
            marketplaceGroupRow({ serviceComunas: [], comunaBase: 'Santiago' }),
        ], { comuna: 'Maipú' })).toHaveLength(0);
    });
});

describe('sortMarketplaceProviderGroupRows', () => {
    it('ordena por precio mínimo y luego por nombre', () => {
        const rows = [
            marketplaceGroupRow({ id: 'g1', name: 'Zeta', isVerified: false }),
            marketplaceGroupRow({ id: 'g2', name: 'Alfa', isVerified: false }),
            marketplaceGroupRow({ id: 'g3', name: 'Beta', isVerified: false }),
        ];
        const prices = new Map<string, number | null>([
            ['g1', 120_000],
            ['g2', 80_000],
            ['g3', 80_000],
        ]);
        const sorted = sortMarketplaceProviderGroupRows(rows, 'price_asc', prices);
        expect(sorted.map((row) => row.id)).toEqual(['g2', 'g3', 'g1']);
    });
});

describe('parseMarketplaceGroupSort', () => {
    it('usa recommended por defecto', () => {
        expect(parseMarketplaceGroupSort(undefined)).toBe('recommended');
        expect(parseMarketplaceGroupSort('invalid')).toBe('recommended');
    });
});

describe('parseMarketplaceCatalogDate', () => {
    it('rechaza fechas pasadas o inválidas', () => {
        expect(parseMarketplaceCatalogDate('')).toBeNull();
        expect(parseMarketplaceCatalogDate('1999-01-01')).toBeNull();
        expect(parseMarketplaceCatalogDate('no-es-fecha')).toBeNull();
    });

    it('acepta fechas futuras en formato YYYY-MM-DD', () => {
        expect(parseMarketplaceCatalogDate('2099-12-31')).toBe('2099-12-31');
    });
});

describe('parseMarketplaceGroupsPagination', () => {
    it('usa offset 0 y sin límite cuando no hay query', () => {
        expect(parseMarketplaceGroupsPagination({})).toEqual({ limit: null, offset: 0 });
    });

    it('acota el límite al máximo permitido', () => {
        expect(parseMarketplaceGroupsPagination({ limit: '999', offset: '5' })).toEqual({
            limit: 48,
            offset: 5,
        });
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
        const body = await response.json() as {
            ok: boolean;
            items: unknown[];
            total: number;
            hasMore: boolean;
            nextOffset: number | null;
        };

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.items).toEqual([]);
        expect(body.total).toBe(0);
        expect(body.hasMore).toBe(false);
        expect(body.nextOffset).toBeNull();
    });

    it('pagina con limit y offset', async () => {
        const rows = [
            marketplaceGroupRow({ id: 'g1', name: 'A', slug: 'a' }),
            marketplaceGroupRow({ id: 'g2', name: 'B', slug: 'b' }),
            marketplaceGroupRow({ id: 'g3', name: 'C', slug: 'c' }),
        ];
        mockSelectChain.orderBy
            .mockResolvedValueOnce(rows)
            .mockResolvedValueOnce([]);

        const app = new Hono();
        registerMarketplaceRoutes(app, {
            authUser: async () => null,
            jsonError: (c, error, status = 400) => c.json({ ok: false, error }, status),
            ensureClientProfile: async () => ({ id: 'c1', userId: 'u1' }),
            requireOwner: async () => ({ ok: false, response: new Response() }),
            validateOwnerAvailability: async () => null,
        });

        const response = await app.request('/marketplace/groups?limit=2&offset=0');
        const body = await response.json() as {
            ok: boolean;
            items: unknown[];
            total: number;
            hasMore: boolean;
            nextOffset: number | null;
        };

        expect(response.status).toBe(200);
        expect(body.items).toHaveLength(2);
        expect(body.total).toBe(3);
        expect(body.hasMore).toBe(true);
        expect(body.nextOffset).toBe(2);
    });
});
