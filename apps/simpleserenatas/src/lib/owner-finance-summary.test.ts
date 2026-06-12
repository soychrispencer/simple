import { describe, expect, it } from 'vitest';
import type { MusicianPayout, Serenata } from '@/lib/serenatas-api';
import { buildOwnerFinanceSummary } from './owner-finance-summary';

function serenata(partial: Partial<Serenata>): Serenata {
    return {
        id: 's1',
        clientId: null,
        ownerId: 'o1',
        providerGroupId: null,
        selectedServiceId: null,
        groupId: 'g1',
        source: 'own_lead',
        status: 'scheduled',
        recipientName: 'Ana',
        clientPhone: null,
        address: 'Calle 1',
        comuna: 'Santiago',
        region: 'RM',
        lat: null,
        lng: null,
        eventDate: '2026-05-10',
        eventTime: '20:00',
        duration: 45,
        price: 100000,
        packageCode: null,
        eventType: 'Serenata',
        message: null,
        ...partial,
    };
}

describe('owner-finance-summary', () => {
    it('mantiene costo Simple en cero y descuenta pagos músicos', () => {
        const items: Serenata[] = [
            serenata({ id: 'own', source: 'own_lead', price: 100000, eventDate: '2026-05-10' }),
            serenata({ id: 'app', source: 'platform_lead', price: 100000, eventDate: '2026-05-11' }),
        ];
        const payouts: MusicianPayout[] = [
            {
                id: 'p1',
                serenataId: 'own',
                musicianId: 'm1',
                musicianName: 'Luis',
                amount: 30000,
                status: 'paid',
                paymentMethod: 'cash',
                paidAt: null,
                notes: null,
                eventDate: '2026-05-10',
            },
            {
                id: 'p2',
                serenataId: 'app',
                musicianId: 'm2',
                musicianName: 'Eva',
                amount: 20000,
                status: 'pending',
                paymentMethod: 'transfer',
                paidAt: null,
                notes: null,
                eventDate: '2026-05-11',
            },
        ];
        const summary = buildOwnerFinanceSummary(
            items,
            {
                plan: 'free',
                planLabel: 'Prueba gratis',
                trialDays: 14,
                trialEndsAt: '2026-05-15T00:00:00.000Z',
                trialActive: true,
                subscriptionRequired: false,
                profileVisibilityStatus: 'trial',
                alwaysFreeMonthly: true,
                ownerOwnSerenataCommissionPercent: 0,
                commissionAppBps: 1500,
                commissionAppPercent: 15,
                commissionVatBps: 1900,
                commissionVatPercent: 19,
                essentialPriceMonthly: 9990,
                essentialPriceMonthlyNet: 9990,
                essentialPriceMonthlyWithVat: Math.round(9990 * 1.19),
                essentialCheckoutAvailable: false,
                proPriceMonthly: 0,
                proPriceMonthlyNet: 0,
                proPriceMonthlyWithVat: 0,
                proCheckoutAvailable: false,
                exampleGrossClp: 0,
                example: {
                    grossClp: 0,
                    commissionClp: 0,
                    vatOnCommissionClp: 0,
                    totalDeductionClp: 0,
                },
                constants: {
                    APP_COMMISSION_FREE_BPS: 1500,
                    APP_COMMISSION_PRO_BPS: 800,
                    COMMISSION_VAT_BPS: 1900,
                },
            },
            { from: '2026-05-01', to: '2026-05-31' },
            payouts,
        );

        expect(summary.grossClp).toBe(200000);
        expect(summary.commissionClp).toBe(0);
        expect(summary.netEstimatedClp).toBe(200000);
        expect(summary.pendingMusicianPayoutsClp).toBe(20000);
        expect(summary.paidMusicianPayoutsClp).toBe(30000);
        expect(summary.netAfterMusiciansClp).toBe(170000);
    });
});
