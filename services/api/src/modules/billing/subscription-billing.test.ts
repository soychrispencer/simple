import { describe, expect, it } from 'vitest';
import type { PaidSubscriptionPlanRecord } from '../../lib/domain-types.js';
import { getSubscriptionBillingCharge } from './subscription-billing.js';
import { SUBSCRIPTION_PLANS_BY_VERTICAL } from '../advertising/types.js';

const agendaPro = {
    id: 'pro',
    name: 'Pro',
    description: 'Agenda Pro',
    priceMonthly: 9990,
    currency: 'CLP',
    maxListings: 0,
    maxImagesPerListing: 0,
    analyticsEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    maxFreeBoostsPerMonth: 0,
    features: [],
} satisfies PaidSubscriptionPlanRecord;

describe('subscription billing', () => {
    it('charges the Agenda Pro price plus VAT without a temporary promotion', () => {
        expect(getSubscriptionBillingCharge('mercadopago', 'agenda', agendaPro)).toEqual({
            amount: 11888,
            currency: 'CLP',
        });
    });

    it('uses the selected plan price for other verticals', () => {
        expect(getSubscriptionBillingCharge('mercadopago', 'serenatas', { ...agendaPro, priceMonthly: 19990 })).toEqual({
            amount: 23788,
            currency: 'CLP',
        });
    });

    it.each([
        { vertical: 'autos' as const, expectedAmount: 47588 },
        { vertical: 'propiedades' as const, expectedAmount: 47588 },
    ])('charges the $vertical Pro catalog price plus 19% VAT', ({ vertical, expectedAmount }) => {
        const plan = SUBSCRIPTION_PLANS_BY_VERTICAL[vertical].find((candidate) => candidate.id === 'pro') as PaidSubscriptionPlanRecord | undefined;
        expect(plan).toBeDefined();
        expect(getSubscriptionBillingCharge('mercadopago', vertical, plan!)).toEqual({
            amount: expectedAmount,
            currency: 'CLP',
        });
    });

    it.each([
        { vertical: 'autos' as const, expectedAmount: 118988 },
        { vertical: 'propiedades' as const, expectedAmount: 118988 },
    ])('charges the $vertical Enterprise catalog price plus 19% VAT', ({ vertical, expectedAmount }) => {
        const plan = SUBSCRIPTION_PLANS_BY_VERTICAL[vertical].find((candidate) => candidate.id === 'enterprise') as PaidSubscriptionPlanRecord | undefined;
        expect(plan).toBeDefined();
        expect(getSubscriptionBillingCharge('mercadopago', vertical, plan!)).toEqual({
            amount: expectedAmount,
            currency: 'CLP',
        });
    });
});
