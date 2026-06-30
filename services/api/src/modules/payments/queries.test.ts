import { describe, expect, it } from 'vitest';
import { mapPaymentOrderRowToHydrated } from './queries.js';

describe('mapPaymentOrderRowToHydrated', () => {
    const baseRow = {
        id: 'order-uuid',
        accountId: null,
        userId: 'user-uuid',
        subscriptionId: null,
        vertical: 'autos',
        kind: 'boost',
        title: 'Boost test',
        amount: '19990',
        currency: 'CLP',
        status: 'pending',
        provider: 'mercadopago',
        providerOrderId: 'pref-123',
        providerStatus: 'created',
        providerResponse: { id: 999 },
        metadata: {
            kind: 'boost',
            listingId: 'listing-1',
            preferenceId: 'pref-from-meta',
            checkoutUrl: 'https://mp.test/checkout',
            appliedResourceId: 'resource-1',
        },
        returnUrl: 'https://app.test/return',
        webhookUrl: null,
        paidAt: new Date('2026-05-01T12:00:00Z'),
        refundedAt: null,
        expiresAt: null,
        createdAt: new Date('2026-05-01T10:00:00Z'),
        updatedAt: new Date('2026-05-01T11:00:00Z'),
    };

    it('mapea campos MP y metadata a registro en memoria', () => {
        const mapped = mapPaymentOrderRowToHydrated(baseRow as never);
        expect(mapped.id).toBe('order-uuid');
        expect(mapped.userId).toBe('user-uuid');
        expect(mapped.amount).toBe(19990);
        expect(mapped.preferenceId).toBe('pref-from-meta');
        expect(mapped.checkoutUrl).toBe('https://mp.test/checkout');
        expect(mapped.appliedAt).toBe(baseRow.paidAt!.getTime());
        expect(mapped.appliedResourceId).toBe('resource-1');
        expect(mapped.metadata.kind).toBe('boost');
    });

    it('restaura id MP desde metadata.orderExternalId', () => {
        const mapped = mapPaymentOrderRowToHydrated({
            ...baseRow,
            id: '550e8400-e29b-41d4-a716-446655440000',
            metadata: { ...baseRow.metadata, orderExternalId: 'boost-1710000000000-99999' },
        } as never);
        expect(mapped.id).toBe('boost-1710000000000-99999');
    });

    it('usa providerOrderId numérico como referencia de pago', () => {
        const mapped = mapPaymentOrderRowToHydrated({
            ...baseRow,
            metadata: { kind: 'boost' },
            providerOrderId: '12345678',
        } as never);
        expect(mapped.providerReferenceId).toBe('12345678');
        expect(mapped.preferenceId).toBeNull();
    });
});
