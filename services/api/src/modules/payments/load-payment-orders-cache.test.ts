import { describe, expect, it } from 'vitest';
import { mapPaymentOrderRowToHydrated } from './queries.js';

describe('loadPaymentOrdersCache filtering', () => {
    it('mapea filas recientes al shape del Map en memoria', () => {
        const row = {
            id: 'uuid-1',
            accountId: null,
            userId: 'user-a',
            subscriptionId: null,
            vertical: 'autos',
            kind: 'subscription',
            title: 'Plan Pro',
            amount: '14990',
            currency: 'CLP',
            status: 'pending',
            provider: 'mercadopago',
            providerOrderId: 'pref-1',
            providerStatus: 'pending',
            providerResponse: {},
            metadata: { orderExternalId: 'sub-order-1', kind: 'subscription', planId: 'pro' },
            returnUrl: null,
            webhookUrl: null,
            paidAt: null,
            refundedAt: null,
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mapped = mapPaymentOrderRowToHydrated(row as never);
        expect(mapped.id).toBe('sub-order-1');
        expect(mapped.userId).toBe('user-a');
        expect(mapped.status).toBe('pending');
    });
});
