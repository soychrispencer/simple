import { describe, expect, it } from 'vitest';
import type { PaidSubscriptionPlanRecord } from '../../lib/domain-types.js';
import { getSubscriptionBillingCharge } from './subscription-billing.js';

const agendaPro = {
    id: 'pro',
    name: 'Pro',
    description: 'Agenda Pro',
    priceMonthly: 9990,
    currency: 'CLP',
    maxListings: 0,
    maxFeaturedListings: 0,
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
});
