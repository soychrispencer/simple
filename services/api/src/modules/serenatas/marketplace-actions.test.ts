import { describe, expect, it, vi, beforeEach } from 'vitest';
import { acceptMarketplaceSerenata, rejectMarketplaceSerenata } from './marketplace.js';

const mockFindFirst = vi.fn();
const mockClientFindFirst = vi.fn();
const mockUserFindFirst = vi.fn();
const mockReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockSelectRows = vi.fn();

vi.mock('../../db/index.js', () => ({
    db: {
        query: {
            users: { findFirst: (...args: unknown[]) => mockUserFindFirst(...args) },
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
        select: () => ({
            from: () => ({
                where: () => mockSelectRows(),
            }),
        }),
        insert: () => ({
            values: (...args: unknown[]) => mockInsertValues(...args),
        }),
    },
}));

const pendingSerenata = {
    id: 'ser-1',
    ownerId: 'owner-1',
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
        mockUserFindFirst.mockResolvedValue({ id: 'user-1', inAppNotificationsEnabled: true });
        mockSelectRows.mockResolvedValue([{ id: 'user-1', inAppNotificationsEnabled: true }]);
        mockInsertValues.mockResolvedValue(undefined);
    });

    it('acepta solicitud con providerGroupId y notifica al cliente', async () => {
        mockFindFirst.mockResolvedValue(pendingSerenata);
        const validateAvailability = vi.fn().mockResolvedValue(null);

        const result = await acceptMarketplaceSerenata('owner-1', 'ser-1', validateAvailability);

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

        const result = await acceptMarketplaceSerenata('owner-1', 'ser-legacy', async () => null);

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
        mockUserFindFirst.mockResolvedValue({ id: 'user-1', inAppNotificationsEnabled: true });
        mockSelectRows.mockResolvedValue([{ id: 'user-1', inAppNotificationsEnabled: true }]);
        mockInsertValues.mockResolvedValue(undefined);
    });

    it('rechaza solicitud marketplace con providerGroupId', async () => {
        mockFindFirst.mockResolvedValue(pendingSerenata);

        const result = await rejectMarketplaceSerenata('owner-1', 'ser-1');

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.item.status).toBe('rejected');
            expect(result.item.providerGroupId).toBe('group-uuid-1');
        }
        expect(mockInsertValues).toHaveBeenCalled();
    });

    it('incluye motivo en notificación al cliente', async () => {
        mockFindFirst.mockResolvedValue(pendingSerenata);
        const reason = 'No tenemos disponibilidad para la fecha y hora solicitadas.';

        await rejectMarketplaceSerenata('owner-1', 'ser-1', reason);

        const payloads = mockInsertValues.mock.calls.map((call) => call[0]) as Array<{ body?: string } | Array<{ body?: string }>>;
        const messages = payloads.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]).map((row) => row.body ?? ''));
        expect(messages.some((message) => message.includes(reason))).toBe(true);
    });

    it('falla si ya no está pending', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await rejectMarketplaceSerenata('owner-1', 'ser-taken');

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('no está disponible');
        }
    });
});
