import { describe, expect, it } from 'vitest';
import { mapPaymentOrderRowToHydrated } from './queries.js';

describe('listPaymentOrdersForUserFromDb (mapper)', () => {
    it('mapea filas para listado por usuario', () => {
        const mapped = mapPaymentOrderRowToHydrated({
            id: 'uuid-1',
            accountId: null,
            userId: 'user-uuid',
            subscriptionId: null,
            vertical: 'serenatas',
            kind: 'serenata_booking',
            title: 'Serenata',
            amount: '50000',
            currency: 'CLP',
            status: 'pending',
            provider: 'mercadopago',
            providerOrderId: 'pref-1',
            providerStatus: 'created',
            providerResponse: {},
            metadata: { orderExternalId: 'serenata-1', kind: 'serenata_booking' },
            returnUrl: null,
            webhookUrl: null,
            paidAt: null,
            refundedAt: null,
            expiresAt: null,
            createdAt: new Date('2026-05-01T10:00:00Z'),
            updatedAt: new Date('2026-05-01T11:00:00Z'),
        } as never);

        expect(mapped.userId).toBe('user-uuid');
        expect(mapped.id).toBe('serenata-1');
        expect(mapped.vertical).toBe('serenatas');
    });
});
