import { describe, expect, it, vi } from 'vitest';
import { createPaymentOrderStore } from './order-cache.js';

describe('createPaymentOrderStore', () => {
    const sampleOrder = {
        id: 'boost-1',
        userId: 'user-1',
        vertical: 'autos',
        kind: 'boost',
        title: 'Test',
        amount: 1000,
        currency: 'CLP',
        status: 'pending',
        providerStatus: null,
        providerReferenceId: null,
        preferenceId: null,
        checkoutUrl: null,
        createdAt: 1,
        updatedAt: 2,
        appliedAt: null,
        appliedResourceId: null,
        metadata: {},
    };

    it('updatePaymentOrder hidrata desde DB si falta en Map', async () => {
        const paymentOrdersByUser = new Map<string, typeof sampleOrder[]>();
        const loadPaymentOrderFromDb = vi.fn().mockResolvedValue({ ...sampleOrder, status: 'approved' });
        const store = createPaymentOrderStore({ paymentOrdersByUser, loadPaymentOrderFromDb });

        const updated = await store.updatePaymentOrder('user-1', 'boost-1', (current) => ({
            ...current,
            status: 'approved',
        }));

        expect(loadPaymentOrderFromDb).toHaveBeenCalledWith('boost-1');
        expect(updated?.status).toBe('approved');
        expect(paymentOrdersByUser.get('user-1')?.[0]?.status).toBe('approved');
    });
});
