import { describe, expect, it, vi } from 'vitest';
import { listUserPaymentOrdersMerged } from './list-user-orders.js';
import type { PaymentOrderRecord } from './order-cache.js';

const baseOrder = (overrides: Partial<PaymentOrderRecord> = {}): PaymentOrderRecord => ({
    id: 'order-1',
    userId: 'user-1',
    vertical: 'autos',
    kind: 'boost',
    title: 'Boost',
    amount: 1000,
    currency: 'CLP',
    status: 'pending',
    providerStatus: null,
    providerReferenceId: null,
    preferenceId: null,
    checkoutUrl: null,
    createdAt: 1000,
    updatedAt: 1000,
    appliedAt: null,
    appliedResourceId: null,
    metadata: {},
    ...overrides,
});

describe('listUserPaymentOrdersMerged', () => {
    it('fusiona Map y DB priorizando updatedAt más reciente', async () => {
        const mapOrder = baseOrder({ updatedAt: 2000, status: 'pending' });
        const dbOrder = baseOrder({ updatedAt: 3000, status: 'approved' });

        const orders = await listUserPaymentOrdersMerged(
            {
                getPaymentOrdersForUser: () => [mapOrder],
                listPaymentOrdersForUserFromDb: vi.fn().mockResolvedValue([dbOrder]),
                upsertPaymentOrder: (order) => order,
            },
            'user-1',
        );

        expect(orders).toHaveLength(1);
        expect(orders[0]?.status).toBe('approved');
    });

    it('incluye órdenes solo en Map cuando no están en DB', async () => {
        const mapOnly = baseOrder({ id: 'map-only', updatedAt: 5000 });

        const orders = await listUserPaymentOrdersMerged(
            {
                getPaymentOrdersForUser: () => [mapOnly],
                listPaymentOrdersForUserFromDb: vi.fn().mockResolvedValue([]),
                upsertPaymentOrder: (order) => order,
            },
            'user-1',
        );

        expect(orders.map((o) => o.id)).toEqual(['map-only']);
    });

    it('sin DB delega al Map', async () => {
        const mapOrder = baseOrder();
        const orders = await listUserPaymentOrdersMerged(
            {
                getPaymentOrdersForUser: () => [mapOrder],
                upsertPaymentOrder: (order) => order,
            },
            'user-1',
        );
        expect(orders).toHaveLength(1);
    });
});
