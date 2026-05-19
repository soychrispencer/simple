import { describe, expect, it } from 'vitest';
import { buildPaymentOrderMetadata, resolveProviderOrderId } from './persist.js';
import { mapPaymentOrderRowToHydrated } from './queries.js';

describe('payment order persist helpers', () => {
    const sampleOrder = {
        id: 'boost-1710000000000-12345',
        userId: 'user-uuid',
        vertical: 'autos',
        kind: 'boost',
        title: 'Boost test',
        amount: 19990,
        currency: 'CLP',
        status: 'pending',
        providerStatus: 'created',
        providerReferenceId: null,
        preferenceId: 'pref-abc',
        checkoutUrl: 'https://mp.test/checkout',
        createdAt: 1710000000000,
        updatedAt: 1710000001000,
        appliedAt: null,
        appliedResourceId: null,
        metadata: { kind: 'boost', listingId: 'listing-1' },
    };

    it('incluye orderExternalId en metadata para round-trip hydrate', () => {
        const meta = buildPaymentOrderMetadata(sampleOrder);
        expect(meta.orderExternalId).toBe(sampleOrder.id);
        expect(meta.preferenceId).toBe('pref-abc');
        expect(meta.checkoutUrl).toBe(sampleOrder.checkoutUrl);

        const mapped = mapPaymentOrderRowToHydrated({
            id: 'internal-db-uuid',
            accountId: null,
            userId: sampleOrder.userId,
            subscriptionId: null,
            vertical: sampleOrder.vertical,
            kind: sampleOrder.kind,
            title: sampleOrder.title,
            amount: '19990',
            currency: 'CLP',
            status: 'pending',
            provider: 'mercadopago',
            providerOrderId: 'pref-abc',
            providerStatus: 'created',
            providerResponse: {},
            metadata: meta,
            returnUrl: sampleOrder.checkoutUrl,
            webhookUrl: null,
            paidAt: null,
            refundedAt: null,
            expiresAt: null,
            createdAt: new Date(sampleOrder.createdAt),
            updatedAt: new Date(sampleOrder.updatedAt),
        } as never);

        expect(mapped.id).toBe(sampleOrder.id);
        expect(mapped.preferenceId).toBe('pref-abc');
        expect(mapped.checkoutUrl).toBe(sampleOrder.checkoutUrl);
    });

    it('prioriza preferenceId como providerOrderId', () => {
        expect(resolveProviderOrderId(sampleOrder)).toBe('pref-abc');
        expect(resolveProviderOrderId({ ...sampleOrder, preferenceId: null, providerReferenceId: 'pay-99' })).toBe('pay-99');
    });
});
