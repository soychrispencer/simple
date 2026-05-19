import { describe, expect, it, vi, beforeEach } from 'vitest';
import { acceptMarketplaceSerenata, rejectMarketplaceSerenata } from './marketplace.js';

const mockFindFirst = vi.fn();
const mockClientFindFirst = vi.fn();
const mockReturning = vi.fn();
const mockInsertValues = vi.fn();

vi.mock('../../db/index.js', () => ({
    db: {
        query: {
            serenatas: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            serenataClients: { findFirst: (...args: unknown[]) => mockClientFindFirst(...args) },
        },
        update: () => ({
            set: () => ({
                where: () => ({
                    returning: () => mockReturning(),
                }),
            }),
        }),
        insert: () => ({
            values: (...args: unknown[]) => mockInsertValues(...args),
        }),
    },
}));

const pendingSerenata = {
    id: 'ser-1',
    ownerId: 'admin-1',
    providerGroupId: 'group-uuid-1',
    status: 'pending',
    source: 'platform_lead',
    clientId: 'client-1',
    eventDate: new Date('2026-06-01'),
    eventTime: '20:00',
};

describe('acceptMarketplaceSerenata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReturning.mockResolvedValue([{ ...pendingSerenata, status: 'accepted_pending_group' }]);
        mockClientFindFirst.mockResolvedValue({ id: 'client-1', userId: 'user-1' });
        mockInsertValues.mockResolvedValue(undefined);
    });

    it('acepta solicitud con providerGroupId y notifica al cliente', async () => {
        mockFindFirst.mockResolvedValue(pendingSerenata);
        const validateAvailability = vi.fn().mockResolvedValue(null);

        const result = await acceptMarketplaceSerenata('admin-1', 'ser-1', validateAvailability);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.item.providerGroupId).toBe('group-uuid-1');
            expect(result.item.status).toBe('accepted_pending_group');
        }
        expect(validateAvailability).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalled();
    });

    it('rechaza si la solicitud no tiene providerGroupId en query', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await acceptMarketplaceSerenata('admin-1', 'ser-legacy', async () => null);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('no está disponible');
        }
    });
});

describe('rejectMarketplaceSerenata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReturning.mockResolvedValue([{ ...pendingSerenata, status: 'rejected' }]);
        mockClientFindFirst.mockResolvedValue({ id: 'client-1', userId: 'user-1' });
        mockInsertValues.mockResolvedValue(undefined);
    });

    it('rechaza solicitud marketplace con providerGroupId', async () => {
        mockFindFirst.mockResolvedValue(pendingSerenata);

        const result = await rejectMarketplaceSerenata('admin-1', 'ser-1');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.item.status).toBe('rejected');
            expect(result.item.providerGroupId).toBe('group-uuid-1');
        }
        expect(mockInsertValues).toHaveBeenCalled();
    });

    it('falla si ya no está pending', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await rejectMarketplaceSerenata('admin-1', 'ser-taken');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('no está disponible');
        }
    });
});
