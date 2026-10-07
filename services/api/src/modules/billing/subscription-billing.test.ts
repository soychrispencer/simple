import { describe, expect, it } from 'vitest';
import type { PaidSubscriptionPlanRecord } from '../../lib/domain-types.js';
import { getSubscriptionBillingCharge } from './subscription-billing.js';

const agendaPro = {
    id: 'pro',
    name: 'Pro',
    description: 'Agenda Pro',
    priceMonthly: 19990,
    currency: 'CLP',
    maxListings: 0,
    maxFeaturedListings: 0,
    maxImagesPerListing: 0,
    analyticsEnabled: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    maxFreeBoostsPerMonth: 2,
    features: [],
    promotion: { priceMonthly: 9990, durationMonths: 6 },
} satisfies PaidSubscriptionPlanRecord;

describe('subscription billing promotion', () => {
    it('charges the promotional net price plus VAT for the first six months', () => {
        expect(getSubscriptionBillingCharge('mercadopago', 'agenda', agendaPro)).toEqual({
            amount: 11888,
            currency: 'CLP',
        });
    });

    it('keeps the regular price for other verticals', () => {
        expect(getSubscriptionBillingCharge('mercadopago', 'serenatas', agendaPro)).toEqual({
            amount: 23788,
            currency: 'CLP',
        });
    });
});
