import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    chileWallClockToMs,
    generateMarketplaceTimeSlots,
    validateMarketplaceEventLead,
} from './availability.js';
import { expirePendingSerenatas, maybeSendPendingSlaReminders } from './lifecycle.js';
import { createMarketplaceSerenata } from './marketplace.js';

const mockFindFirst = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

function selectRows(rows: unknown[]) {
    return {
        from: () => ({
            where: async () => rows,
        }),
    };
}

function selectOrderedRows(rows: unknown[]) {
    return {
        from: () => ({
            where: () => ({
                orderBy: async () => rows,
            }),
        }),
    };
}

function mockMarketplaceSlotSelects(providerExisting: unknown[] = [], blocked: unknown[] = [], ownerExisting: unknown[] = []) {
    mockSelect
        .mockReturnValueOnce(selectRows(providerExisting))
        .mockReturnValueOnce(selectOrderedRows(blocked))
        .mockReturnValueOnce(selectRows(ownerExisting))
        .mockReturnValueOnce(selectRows(providerExisting))
        .mockReturnValueOnce(selectOrderedRows(blocked));
}

vi.mock('../../db/index.js', () => ({
    db: {
        query: {
            serenataProviderGroups: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            serenataGroupServices: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            serenataOwners: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            serenataClients: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
        },
        select: (...args: unknown[]) => mockSelect(...args),
        insert: (...args: unknown[]) => mockInsert(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
    },
}));

describe('validateMarketplaceEventLead', () => {
    it('rechaza eventos con menos de 2h de anticipación', () => {
        const now = Date.now();
        const inOneHour = new Date(now + 60 * 60 * 1000);
        const ymd = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santiago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(inOneHour);
        const mins = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Santiago',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(inOneHour);
        const [hh, mm] = mins.split(':');
        const eventTime = `${hh}:${mm}`;

        const error = validateMarketplaceEventLead(new Date(`${ymd}T12:00:00.000Z`), eventTime);
        expect(error).toMatch(/anticipación/i);
    });
});

describe('generateMarketplaceTimeSlots', () => {
    it('excluye horarios que se solapan con serenatas ocupadas', () => {
        const slots = generateMarketplaceTimeSlots(60, '2099-06-15', [
            { eventTime: '20:00', duration: 60, status: 'scheduled' },
        ]);
        expect(slots).not.toContain('20:00');
        expect(slots.length).toBeGreaterThan(0);
    });
});

describe('expirePendingSerenatas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marca pending vencidas como expired', async () => {
        const overdue = {
            id: 's1',
            status: 'pending',
            source: 'platform_lead',
            responseDueAt: new Date('2020-01-01'),
            clientId: null,
            ownerId: null,
            recipientName: 'Ana',
            providerGroupId: 'g1',
        };
        mockSelect.mockReturnValue({
            from: () => ({
                where: async () => [overdue],
            }),
        });
        mockUpdate.mockReturnValue({
            set: () => ({
                where: () => ({
                    returning: async () => [{ ...overdue, status: 'expired' }],
                }),
            }),
        });

        const count = await expirePendingSerenatas(new Date('2026-01-01'));
        expect(count).toBe(1);
    });
});

describe('createMarketplaceSerenata', () => {
    beforeEach(() => {
        mockFindFirst.mockReset();
        mockSelect.mockReset();
        mockInsert.mockReset();
        mockUpdate.mockReset();
        mockSelect.mockImplementation(() => selectRows([]));
        mockInsert.mockReturnValue({
            values: () => ({
                returning: async () => [{
                    id: 's-new',
                    status: 'payment_pending',
                    clientId: 'c1',
                    providerGroupId: 'g1',
                }],
            }),
        });
    });

    it('crea solicitud pendiente de pago cuando el slot está libre', async () => {
        mockFindFirst
            .mockResolvedValueOnce({
                id: 'g1',
                ownerId: 'a1',
                status: 'active',
                serviceComunas: [],
                slaHours: 24,
                bookingMode: 'auto_if_available',
            })
            .mockResolvedValueOnce({
                id: 'svc1',
                providerGroupId: 'g1',
                durationMinutes: 30,
                price: 50000,
                isActive: true,
                eventType: 'Serenata',
                name: 'Trío',
            });

        mockMarketplaceSlotSelects();

        const result = await createMarketplaceSerenata(
            { id: 'u1', email: 'a@b.c', name: 'U', role: 'user', status: 'active' },
            {
                providerGroupId: 'g1',
                serviceId: 'svc1',
                recipientName: 'María',
                clientPhone: '+569',
                address: 'Calle 1',
                comuna: 'Santiago',
                region: 'RM',
                eventDate: new Date('2099-06-15T12:00:00.000Z'),
                eventTime: '20:00',
            },
            { ensureClientProfile: async () => ({ id: 'c1', userId: 'u1' }) },
        );

        expect(result.ok).toBe(true);
        expect(mockInsert).toHaveBeenCalled();
    });

    it('rechaza 409 cuando hay conflicto de horario', async () => {
        mockFindFirst
            .mockResolvedValueOnce({
                id: 'g1',
                ownerId: 'a1',
                status: 'active',
                serviceComunas: [],
                slaHours: 24,
                bookingMode: 'manual',
            })
            .mockResolvedValueOnce({
                id: 'svc1',
                providerGroupId: 'g1',
                durationMinutes: 30,
                price: 50000,
                isActive: true,
                eventType: 'Serenata',
                name: 'Trío',
            });

        mockMarketplaceSlotSelects([{
            id: 'other',
            eventTime: '20:00',
            duration: 30,
            status: 'scheduled',
            ownerId: 'a1',
            providerGroupId: 'g1',
            lat: null,
            lng: null,
        }]);

        const result = await createMarketplaceSerenata(
            { id: 'u1', email: 'a@b.c', name: 'U', role: 'user', status: 'active' },
            {
                providerGroupId: 'g1',
                serviceId: 'svc1',
                recipientName: 'María',
                clientPhone: '+569',
                address: 'Calle 1',
                comuna: 'Santiago',
                region: 'RM',
                eventDate: new Date('2099-06-15T12:00:00.000Z'),
                eventTime: '20:00',
            },
            { ensureClientProfile: async () => ({ id: 'c1', userId: 'u1' }) },
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.status).toBe(409);
            expect(result.error).toMatch(/disponible|solapa|tiempo suficiente/i);
        }
    });
});

describe('chileWallClockToMs', () => {
    it('resuelve instante para fecha/hora Chile', () => {
        const ms = chileWallClockToMs('2099-06-15', 20 * 60);
        expect(ms).not.toBeNull();
    });
});
